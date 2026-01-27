package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.CreateWbsSnapshotRequest;
import com.insuretech.pms.project.dto.WbsSnapshotDto;
import com.insuretech.pms.project.entity.*;
import com.insuretech.pms.project.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for WBS snapshot (backup/restore) operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WbsSnapshotService {

    private final WbsSnapshotRepository snapshotRepository;
    private final WbsGroupSnapshotRepository groupSnapshotRepository;
    private final WbsItemSnapshotRepository itemSnapshotRepository;
    private final WbsTaskSnapshotRepository taskSnapshotRepository;
    private final WbsDependencySnapshotRepository dependencySnapshotRepository;

    private final PhaseRepository phaseRepository;
    private final WbsGroupRepository wbsGroupRepository;
    private final WbsItemRepository wbsItemRepository;
    private final WbsTaskRepository wbsTaskRepository;
    private final WbsDependencyRepository wbsDependencyRepository;

    /**
     * Create a snapshot of all WBS data for a phase
     */
    @Transactional
    public WbsSnapshotDto createSnapshot(CreateWbsSnapshotRequest request) {
        Phase phase = phaseRepository.findById(request.getPhaseId())
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + request.getPhaseId()));

        String snapshotId = UUID.randomUUID().toString();
        String snapshotName = request.getSnapshotName() != null && !request.getSnapshotName().isBlank()
                ? request.getSnapshotName()
                : "Snapshot_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

        WbsSnapshot.SnapshotType snapshotType = request.getSnapshotType() != null
                ? WbsSnapshot.SnapshotType.valueOf(request.getSnapshotType())
                : WbsSnapshot.SnapshotType.PRE_TEMPLATE;

        // 1. Capture WBS Groups
        List<WbsGroup> groups = wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());
        int groupCount = groups.size();

        for (WbsGroup group : groups) {
            WbsGroupSnapshot snapshot = WbsGroupSnapshot.fromEntity(group, snapshotId);
            groupSnapshotRepository.save(snapshot);
        }

        // 2. Capture WBS Items
        List<WbsItem> items = wbsItemRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());
        int itemCount = items.size();

        for (WbsItem item : items) {
            WbsItemSnapshot snapshot = WbsItemSnapshot.fromEntity(item, snapshotId);
            itemSnapshotRepository.save(snapshot);
        }

        // 3. Capture WBS Tasks
        List<WbsTask> tasks = wbsTaskRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());
        int taskCount = tasks.size();

        for (WbsTask task : tasks) {
            WbsTaskSnapshot snapshot = WbsTaskSnapshot.fromEntity(task, snapshotId);
            taskSnapshotRepository.save(snapshot);
        }

        // 4. Capture Dependencies (filter by items in this phase)
        Set<String> phaseItemIds = new HashSet<>();
        groups.forEach(g -> phaseItemIds.add(g.getId()));
        items.forEach(i -> phaseItemIds.add(i.getId()));
        tasks.forEach(t -> phaseItemIds.add(t.getId()));

        List<WbsDependency> dependencies = wbsDependencyRepository.findByProjectId(phase.getProject().getId())
                .stream()
                .filter(d -> phaseItemIds.contains(d.getPredecessorId()) || phaseItemIds.contains(d.getSuccessorId()))
                .collect(Collectors.toList());
        int dependencyCount = dependencies.size();

        for (WbsDependency dep : dependencies) {
            WbsDependencySnapshot snapshot = WbsDependencySnapshot.fromEntity(dep, snapshotId);
            dependencySnapshotRepository.save(snapshot);
        }

        // 5. Create snapshot metadata
        WbsSnapshot snapshot = WbsSnapshot.builder()
                .id(snapshotId)
                .phaseId(phase.getId())
                .projectId(phase.getProject().getId())
                .snapshotName(snapshotName)
                .description(request.getDescription())
                .snapshotType(snapshotType)
                .groupCount(groupCount)
                .itemCount(itemCount)
                .taskCount(taskCount)
                .dependencyCount(dependencyCount)
                .status(WbsSnapshot.SnapshotStatus.ACTIVE)
                .build();

        snapshotRepository.save(snapshot);

        log.info("Created WBS snapshot: {} for phase: {} with {} groups, {} items, {} tasks, {} dependencies",
                snapshotId, phase.getId(), groupCount, itemCount, taskCount, dependencyCount);

        return WbsSnapshotDto.from(snapshot, phase.getName(), phase.getProject().getName());
    }

    /**
     * Restore WBS data from a snapshot
     */
    @Transactional
    public void restoreSnapshot(String snapshotId) {
        WbsSnapshot snapshot = snapshotRepository.findByIdAndStatus(snapshotId, WbsSnapshot.SnapshotStatus.ACTIVE)
                .orElseThrow(() -> CustomException.notFound("Snapshot not found or not available for restore"));

        Phase phase = phaseRepository.findById(snapshot.getPhaseId())
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + snapshot.getPhaseId()));

        log.info("Starting WBS restore from snapshot: {} for phase: {}", snapshotId, phase.getId());

        // 1. Delete current WBS data for the phase (in reverse order: tasks -> items -> groups)
        List<WbsTask> currentTasks = wbsTaskRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());
        if (!currentTasks.isEmpty()) {
            wbsTaskRepository.deleteAll(currentTasks);
            log.info("Deleted {} existing tasks", currentTasks.size());
        }

        List<WbsItem> currentItems = wbsItemRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());
        if (!currentItems.isEmpty()) {
            wbsItemRepository.deleteAll(currentItems);
            log.info("Deleted {} existing items", currentItems.size());
        }

        List<WbsGroup> currentGroups = wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId());
        if (!currentGroups.isEmpty()) {
            wbsGroupRepository.deleteAll(currentGroups);
            log.info("Deleted {} existing groups", currentGroups.size());
        }

        // Delete dependencies that involve this phase's items
        Set<String> currentIds = new HashSet<>();
        currentGroups.forEach(g -> currentIds.add(g.getId()));
        currentItems.forEach(i -> currentIds.add(i.getId()));
        currentTasks.forEach(t -> currentIds.add(t.getId()));

        if (!currentIds.isEmpty()) {
            List<WbsDependency> depsToDelete = wbsDependencyRepository.findByProjectId(phase.getProject().getId())
                    .stream()
                    .filter(d -> currentIds.contains(d.getPredecessorId()) || currentIds.contains(d.getSuccessorId()))
                    .collect(Collectors.toList());
            if (!depsToDelete.isEmpty()) {
                wbsDependencyRepository.deleteAll(depsToDelete);
                log.info("Deleted {} existing dependencies", depsToDelete.size());
            }
        }

        // 2. Restore groups from snapshot
        List<WbsGroupSnapshot> groupSnapshots = groupSnapshotRepository.findBySnapshotIdOrderByOrderNumAsc(snapshotId);
        for (WbsGroupSnapshot gs : groupSnapshots) {
            WbsGroup group = WbsGroup.builder()
                    .id(gs.getOriginalId())
                    .phase(phase)
                    .code(gs.getCode())
                    .name(gs.getName())
                    .description(gs.getDescription())
                    .status(WbsGroup.WbsStatus.valueOf(gs.getStatus()))
                    .progress(gs.getProgress())
                    .plannedStartDate(gs.getPlannedStartDate())
                    .plannedEndDate(gs.getPlannedEndDate())
                    .actualStartDate(gs.getActualStartDate())
                    .actualEndDate(gs.getActualEndDate())
                    .weight(gs.getWeight())
                    .orderNum(gs.getOrderNum())
                    .linkedEpicId(gs.getLinkedEpicId())
                    .build();
            wbsGroupRepository.save(group);
        }
        log.info("Restored {} groups", groupSnapshots.size());

        // 3. Restore items from snapshot
        List<WbsItemSnapshot> itemSnapshots = itemSnapshotRepository.findBySnapshotIdOrderByOrderNumAsc(snapshotId);
        for (WbsItemSnapshot is : itemSnapshots) {
            WbsGroup group = wbsGroupRepository.findById(is.getOriginalGroupId())
                    .orElseThrow(() -> CustomException.internalError("Parent group not found during restore: " + is.getOriginalGroupId()));

            WbsItem item = WbsItem.builder()
                    .id(is.getOriginalId())
                    .group(group)
                    .phase(phase)
                    .code(is.getCode())
                    .name(is.getName())
                    .description(is.getDescription())
                    .status(WbsGroup.WbsStatus.valueOf(is.getStatus()))
                    .progress(is.getProgress())
                    .plannedStartDate(is.getPlannedStartDate())
                    .plannedEndDate(is.getPlannedEndDate())
                    .actualStartDate(is.getActualStartDate())
                    .actualEndDate(is.getActualEndDate())
                    .weight(is.getWeight())
                    .orderNum(is.getOrderNum())
                    .estimatedHours(is.getEstimatedHours())
                    .actualHours(is.getActualHours())
                    .assigneeId(is.getAssigneeId())
                    .build();
            wbsItemRepository.save(item);
        }
        log.info("Restored {} items", itemSnapshots.size());

        // 4. Restore tasks from snapshot
        List<WbsTaskSnapshot> taskSnapshots = taskSnapshotRepository.findBySnapshotIdOrderByOrderNumAsc(snapshotId);
        for (WbsTaskSnapshot ts : taskSnapshots) {
            WbsItem item = wbsItemRepository.findById(ts.getOriginalItemId())
                    .orElseThrow(() -> CustomException.internalError("Parent item not found during restore: " + ts.getOriginalItemId()));
            WbsGroup group = wbsGroupRepository.findById(ts.getOriginalGroupId())
                    .orElseThrow(() -> CustomException.internalError("Parent group not found during restore: " + ts.getOriginalGroupId()));

            WbsTask task = WbsTask.builder()
                    .id(ts.getOriginalId())
                    .item(item)
                    .group(group)
                    .phase(phase)
                    .code(ts.getCode())
                    .name(ts.getName())
                    .description(ts.getDescription())
                    .status(WbsGroup.WbsStatus.valueOf(ts.getStatus()))
                    .progress(ts.getProgress())
                    .weight(ts.getWeight())
                    .orderNum(ts.getOrderNum())
                    .estimatedHours(ts.getEstimatedHours())
                    .actualHours(ts.getActualHours())
                    .assigneeId(ts.getAssigneeId())
                    .linkedTaskId(ts.getLinkedTaskId())
                    .plannedStartDate(ts.getPlannedStartDate())
                    .plannedEndDate(ts.getPlannedEndDate())
                    .actualStartDate(ts.getActualStartDate())
                    .actualEndDate(ts.getActualEndDate())
                    .build();
            wbsTaskRepository.save(task);
        }
        log.info("Restored {} tasks", taskSnapshots.size());

        // 5. Restore dependencies from snapshot
        List<WbsDependencySnapshot> depSnapshots = dependencySnapshotRepository.findBySnapshotId(snapshotId);
        for (WbsDependencySnapshot ds : depSnapshots) {
            WbsDependency dep = WbsDependency.builder()
                    .id(ds.getOriginalId())
                    .predecessorType(WbsDependency.WbsItemType.valueOf(ds.getPredecessorType()))
                    .predecessorId(ds.getPredecessorId())
                    .successorType(WbsDependency.WbsItemType.valueOf(ds.getSuccessorType()))
                    .successorId(ds.getSuccessorId())
                    .dependencyType(WbsDependency.DependencyType.valueOf(ds.getDependencyType()))
                    .lagDays(ds.getLagDays())
                    .projectId(ds.getProjectId())
                    .build();
            wbsDependencyRepository.save(dep);
        }
        log.info("Restored {} dependencies", depSnapshots.size());

        // 6. Mark snapshot as restored
        snapshot.setStatus(WbsSnapshot.SnapshotStatus.RESTORED);
        snapshot.setRestoredAt(LocalDateTime.now());
        snapshotRepository.save(snapshot);

        log.info("Completed WBS restore from snapshot: {} for phase: {}", snapshotId, phase.getId());
    }

    /**
     * Get all active snapshots for a phase
     */
    @Transactional(readOnly = true)
    public List<WbsSnapshotDto> getSnapshotsByPhase(String phaseId) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + phaseId));

        return snapshotRepository.findByPhaseIdAndStatusOrderByCreatedAtDesc(phaseId, WbsSnapshot.SnapshotStatus.ACTIVE)
                .stream()
                .map(s -> WbsSnapshotDto.from(s, phase.getName(), phase.getProject().getName()))
                .collect(Collectors.toList());
    }

    /**
     * Get all active snapshots for a project
     */
    @Transactional(readOnly = true)
    public List<WbsSnapshotDto> getSnapshotsByProject(String projectId) {
        return snapshotRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, WbsSnapshot.SnapshotStatus.ACTIVE)
                .stream()
                .map(WbsSnapshotDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get a snapshot by ID
     */
    @Transactional(readOnly = true)
    public WbsSnapshotDto getSnapshot(String snapshotId) {
        WbsSnapshot snapshot = snapshotRepository.findById(snapshotId)
                .orElseThrow(() -> CustomException.notFound("Snapshot not found: " + snapshotId));

        Phase phase = phaseRepository.findById(snapshot.getPhaseId())
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + snapshot.getPhaseId()));

        return WbsSnapshotDto.from(snapshot, phase.getName(), phase.getProject().getName());
    }

    /**
     * Soft delete a snapshot
     */
    @Transactional
    public void deleteSnapshot(String snapshotId) {
        WbsSnapshot snapshot = snapshotRepository.findById(snapshotId)
                .orElseThrow(() -> CustomException.notFound("Snapshot not found: " + snapshotId));

        snapshot.setStatus(WbsSnapshot.SnapshotStatus.DELETED);
        snapshotRepository.save(snapshot);

        log.info("Soft deleted WBS snapshot: {}", snapshotId);
    }

    /**
     * Hard delete a snapshot and all its data
     */
    @Transactional
    public void hardDeleteSnapshot(String snapshotId) {
        WbsSnapshot snapshot = snapshotRepository.findById(snapshotId)
                .orElseThrow(() -> CustomException.notFound("Snapshot not found: " + snapshotId));

        // Delete snapshot data (will cascade via FK)
        snapshotRepository.delete(snapshot);

        log.info("Hard deleted WBS snapshot: {} and all associated data", snapshotId);
    }
}
