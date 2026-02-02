package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.CreateWbsSnapshotRequest;
import com.insuretech.pms.project.dto.WbsSnapshotDto;
import com.insuretech.pms.project.reactive.entity.*;
import com.insuretech.pms.project.reactive.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Reactive Service for WBS snapshot (backup/restore) operations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReactiveWbsSnapshotService {

    private final ReactiveWbsSnapshotRepository snapshotRepository;
    private final ReactiveWbsGroupSnapshotRepository groupSnapshotRepository;
    private final ReactiveWbsItemSnapshotRepository itemSnapshotRepository;
    private final ReactiveWbsTaskSnapshotRepository taskSnapshotRepository;
    private final ReactiveWbsDependencySnapshotRepository dependencySnapshotRepository;

    private final ReactivePhaseRepository phaseRepository;
    private final ReactiveProjectRepository projectRepository;
    private final ReactiveWbsGroupRepository wbsGroupRepository;
    private final ReactiveWbsItemRepository wbsItemRepository;
    private final ReactiveWbsTaskRepository wbsTaskRepository;
    private final ReactiveWbsDependencyRepository wbsDependencyRepository;

    /**
     * Create a snapshot of all WBS data for a phase
     */
    @Transactional
    public Mono<WbsSnapshotDto> createSnapshot(CreateWbsSnapshotRequest request) {
        String snapshotId = UUID.randomUUID().toString();
        String snapshotName = request.getSnapshotName() != null && !request.getSnapshotName().isBlank()
                ? request.getSnapshotName()
                : "Snapshot_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

        String snapshotType = request.getSnapshotType() != null
                ? request.getSnapshotType()
                : "PRE_TEMPLATE";

        return phaseRepository.findById(request.getPhaseId())
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + request.getPhaseId())))
                .flatMap(phase -> {
                    // Capture groups
                    Mono<Integer> groupCountMono = wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId())
                            .flatMap(group -> {
                                R2dbcWbsGroupSnapshot snapshot = R2dbcWbsGroupSnapshot.fromEntity(group, snapshotId);
                                snapshot.setId(UUID.randomUUID().toString());
                                return groupSnapshotRepository.save(snapshot);
                            })
                            .count()
                            .map(Long::intValue);

                    // Capture items
                    Mono<Integer> itemCountMono = wbsItemRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId())
                            .flatMap(item -> {
                                R2dbcWbsItemSnapshot snapshot = R2dbcWbsItemSnapshot.fromEntity(item, snapshotId);
                                snapshot.setId(UUID.randomUUID().toString());
                                return itemSnapshotRepository.save(snapshot);
                            })
                            .count()
                            .map(Long::intValue);

                    // Capture tasks
                    Mono<Integer> taskCountMono = wbsTaskRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId())
                            .flatMap(task -> {
                                R2dbcWbsTaskSnapshot snapshot = R2dbcWbsTaskSnapshot.fromEntity(task, snapshotId);
                                snapshot.setId(UUID.randomUUID().toString());
                                return taskSnapshotRepository.save(snapshot);
                            })
                            .count()
                            .map(Long::intValue);

                    // Collect phase item IDs for filtering dependencies
                    Mono<Set<String>> phaseItemIdsMono = Flux.concat(
                            wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId()).map(R2dbcWbsGroup::getId),
                            wbsItemRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId()).map(R2dbcWbsItem::getId),
                            wbsTaskRepository.findByPhaseIdOrderByOrderNumAsc(phase.getId()).map(R2dbcWbsTask::getId)
                    ).collect(HashSet::new, Set::add);

                    // Capture dependencies
                    Mono<Integer> depCountMono = phaseItemIdsMono.flatMap(phaseItemIds ->
                            wbsDependencyRepository.findByProjectId(phase.getProjectId())
                                    .filter(dep -> phaseItemIds.contains(dep.getPredecessorId()) || phaseItemIds.contains(dep.getSuccessorId()))
                                    .flatMap(dep -> {
                                        R2dbcWbsDependencySnapshot snapshot = R2dbcWbsDependencySnapshot.fromEntity(dep, snapshotId);
                                        snapshot.setId(UUID.randomUUID().toString());
                                        return dependencySnapshotRepository.save(snapshot);
                                    })
                                    .count()
                                    .map(Long::intValue)
                    );

                    return Mono.zip(groupCountMono, itemCountMono, taskCountMono, depCountMono)
                            .flatMap(tuple -> {
                                R2dbcWbsSnapshot snapshot = R2dbcWbsSnapshot.builder()
                                        .id(snapshotId)
                                        .phaseId(phase.getId())
                                        .projectId(phase.getProjectId())
                                        .snapshotName(snapshotName)
                                        .description(request.getDescription())
                                        .snapshotType(snapshotType)
                                        .groupCount(tuple.getT1())
                                        .itemCount(tuple.getT2())
                                        .taskCount(tuple.getT3())
                                        .dependencyCount(tuple.getT4())
                                        .status("ACTIVE")
                                        .build();

                                return snapshotRepository.save(snapshot)
                                        .doOnSuccess(s -> log.info("Created WBS snapshot: {} for phase: {} with {} groups, {} items, {} tasks, {} dependencies",
                                                snapshotId, phase.getId(), tuple.getT1(), tuple.getT2(), tuple.getT3(), tuple.getT4()))
                                        .flatMap(savedSnapshot -> enrichWithNames(savedSnapshot));
                            });
                });
    }

    /**
     * Get snapshots by phase ID
     */
    public Flux<WbsSnapshotDto> getSnapshotsByPhase(String phaseId) {
        return snapshotRepository.findByPhaseIdAndStatusOrderByCreatedAtDesc(phaseId, "ACTIVE")
                .flatMap(this::enrichWithNames);
    }

    /**
     * Get snapshots by project ID
     */
    public Flux<WbsSnapshotDto> getSnapshotsByProject(String projectId) {
        return snapshotRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, "ACTIVE")
                .flatMap(this::enrichWithNames);
    }

    /**
     * Get a specific snapshot
     */
    public Mono<WbsSnapshotDto> getSnapshot(String snapshotId) {
        return snapshotRepository.findByIdAndStatus(snapshotId, "ACTIVE")
                .switchIfEmpty(Mono.error(CustomException.notFound("Snapshot not found: " + snapshotId)))
                .flatMap(this::enrichWithNames);
    }

    /**
     * Restore WBS data from a snapshot
     */
    @Transactional
    public Mono<Void> restoreSnapshot(String snapshotId, String username) {
        return snapshotRepository.findByIdAndStatus(snapshotId, "ACTIVE")
                .switchIfEmpty(Mono.error(CustomException.notFound("Snapshot not found or not available for restore")))
                .flatMap(snapshot -> phaseRepository.findById(snapshot.getPhaseId())
                        .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + snapshot.getPhaseId())))
                        .flatMap(phase -> {
                            log.info("Starting WBS restore from snapshot: {} for phase: {}", snapshotId, phase.getId());

                            // Delete current WBS data
                            Mono<Void> deleteCurrentData = wbsTaskRepository.deleteByPhaseId(phase.getId())
                                    .then(wbsItemRepository.deleteByPhaseId(phase.getId()))
                                    .then(wbsGroupRepository.deleteByPhaseId(phase.getId()));

                            // Restore groups
                            Mono<Long> restoreGroups = groupSnapshotRepository.findBySnapshotIdOrderByOrderNumAsc(snapshotId)
                                    .flatMap(gs -> {
                                        R2dbcWbsGroup group = R2dbcWbsGroup.builder()
                                                .id(gs.getOriginalId())
                                                .phaseId(gs.getPhaseId())
                                                .code(gs.getCode())
                                                .name(gs.getName())
                                                .description(gs.getDescription())
                                                .status(gs.getStatus())
                                                .progress(gs.getProgress())
                                                .plannedStartDate(gs.getPlannedStartDate())
                                                .plannedEndDate(gs.getPlannedEndDate())
                                                .actualStartDate(gs.getActualStartDate())
                                                .actualEndDate(gs.getActualEndDate())
                                                .weight(gs.getWeight())
                                                .orderNum(gs.getOrderNum())
                                                .linkedEpicId(gs.getLinkedEpicId())
                                                .build();
                                        return wbsGroupRepository.save(group);
                                    })
                                    .count();

                            // Restore items
                            Mono<Long> restoreItems = itemSnapshotRepository.findBySnapshotIdOrderByOrderNumAsc(snapshotId)
                                    .flatMap(is -> {
                                        R2dbcWbsItem item = R2dbcWbsItem.builder()
                                                .id(is.getOriginalId())
                                                .groupId(is.getOriginalGroupId())
                                                .phaseId(is.getPhaseId())
                                                .code(is.getCode())
                                                .name(is.getName())
                                                .description(is.getDescription())
                                                .status(is.getStatus())
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
                                        return wbsItemRepository.save(item);
                                    })
                                    .count();

                            // Restore tasks
                            Mono<Long> restoreTasks = taskSnapshotRepository.findBySnapshotIdOrderByOrderNumAsc(snapshotId)
                                    .flatMap(ts -> {
                                        R2dbcWbsTask task = R2dbcWbsTask.builder()
                                                .id(ts.getOriginalId())
                                                .itemId(ts.getOriginalItemId())
                                                .groupId(ts.getOriginalGroupId())
                                                .phaseId(ts.getPhaseId())
                                                .code(ts.getCode())
                                                .name(ts.getName())
                                                .description(ts.getDescription())
                                                .status(ts.getStatus())
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
                                        return wbsTaskRepository.save(task);
                                    })
                                    .count();

                            // Restore dependencies
                            Mono<Long> restoreDeps = dependencySnapshotRepository.findBySnapshotId(snapshotId)
                                    .flatMap(ds -> {
                                        R2dbcWbsDependency dep = R2dbcWbsDependency.builder()
                                                .id(ds.getOriginalId())
                                                .predecessorType(ds.getPredecessorType())
                                                .predecessorId(ds.getPredecessorId())
                                                .successorType(ds.getSuccessorType())
                                                .successorId(ds.getSuccessorId())
                                                .dependencyType(ds.getDependencyType())
                                                .lagDays(ds.getLagDays())
                                                .projectId(ds.getProjectId())
                                                .build();
                                        return wbsDependencyRepository.save(dep);
                                    })
                                    .count();

                            return deleteCurrentData
                                    .then(restoreGroups)
                                    .then(restoreItems)
                                    .then(restoreTasks)
                                    .then(restoreDeps)
                                    .then(snapshotRepository.markAsRestored(snapshotId, "RESTORED", username))
                                    .doOnSuccess(v -> log.info("Restored WBS from snapshot: {}", snapshotId));
                        }));
    }

    /**
     * Soft delete a snapshot
     */
    @Transactional
    public Mono<Void> deleteSnapshot(String snapshotId) {
        return snapshotRepository.findByIdAndStatus(snapshotId, "ACTIVE")
                .switchIfEmpty(Mono.error(CustomException.notFound("Snapshot not found: " + snapshotId)))
                .flatMap(snapshot -> snapshotRepository.updateStatus(snapshotId, "DELETED"))
                .doOnSuccess(v -> log.info("Soft deleted snapshot: {}", snapshotId));
    }

    /**
     * Hard delete a snapshot and all its data
     */
    @Transactional
    public Mono<Void> hardDeleteSnapshot(String snapshotId) {
        return snapshotRepository.findById(snapshotId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Snapshot not found: " + snapshotId)))
                .flatMap(snapshot -> groupSnapshotRepository.deleteBySnapshotId(snapshotId)
                        .then(itemSnapshotRepository.deleteBySnapshotId(snapshotId))
                        .then(taskSnapshotRepository.deleteBySnapshotId(snapshotId))
                        .then(dependencySnapshotRepository.deleteBySnapshotId(snapshotId))
                        .then(snapshotRepository.deleteById(snapshotId)))
                .doOnSuccess(v -> log.info("Hard deleted snapshot: {}", snapshotId));
    }

    /**
     * Enrich snapshot with phase and project names
     */
    private Mono<WbsSnapshotDto> enrichWithNames(R2dbcWbsSnapshot snapshot) {
        return Mono.zip(
                phaseRepository.findById(snapshot.getPhaseId()).map(R2dbcPhase::getName).defaultIfEmpty("Unknown"),
                projectRepository.findById(snapshot.getProjectId()).map(R2dbcProject::getName).defaultIfEmpty("Unknown")
        ).map(tuple -> WbsSnapshotDto.from(snapshot, tuple.getT1(), tuple.getT2()));
    }
}
