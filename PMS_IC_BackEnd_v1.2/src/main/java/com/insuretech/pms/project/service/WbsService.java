package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.WbsGroupDto;
import com.insuretech.pms.project.dto.WbsItemDto;
import com.insuretech.pms.project.dto.WbsTaskDto;
import com.insuretech.pms.project.entity.Phase;
import com.insuretech.pms.project.entity.WbsGroup;
import com.insuretech.pms.project.entity.WbsItem;
import com.insuretech.pms.project.entity.WbsTask;
import com.insuretech.pms.project.repository.PhaseRepository;
import com.insuretech.pms.project.repository.WbsGroupRepository;
import com.insuretech.pms.project.repository.WbsItemRepository;
import com.insuretech.pms.project.repository.WbsTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WbsService {

    private final WbsGroupRepository wbsGroupRepository;
    private final WbsItemRepository wbsItemRepository;
    private final WbsTaskRepository wbsTaskRepository;
    private final PhaseRepository phaseRepository;

    // ============ WBS Group Operations ============

    @Transactional(readOnly = true)
    public List<WbsGroupDto> getGroupsByPhase(String phaseId) {
        return wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phaseId).stream()
                .map(WbsGroupDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WbsGroupDto getGroupById(String groupId) {
        WbsGroup group = wbsGroupRepository.findById(groupId)
                .orElseThrow(() -> CustomException.notFound("WBS Group not found: " + groupId));
        return WbsGroupDto.from(group);
    }

    @Transactional
    public WbsGroupDto createGroup(String phaseId, WbsGroupDto request) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + phaseId));

        int nextOrder = (int) wbsGroupRepository.countByPhaseId(phaseId);

        WbsGroup group = WbsGroup.builder()
                .phase(phase)
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .status(parseWbsStatus(request.getStatus()))
                .weight(request.getWeight() != null ? request.getWeight() : 100)
                .orderNum(request.getOrderNum() != null ? request.getOrderNum() : nextOrder)
                .plannedStartDate(request.getPlannedStartDate())
                .plannedEndDate(request.getPlannedEndDate())
                .linkedEpicId(request.getLinkedEpicId())
                .build();

        return WbsGroupDto.from(wbsGroupRepository.save(group));
    }

    @Transactional
    public WbsGroupDto updateGroup(String groupId, WbsGroupDto request) {
        WbsGroup group = wbsGroupRepository.findById(groupId)
                .orElseThrow(() -> CustomException.notFound("WBS Group not found: " + groupId));

        if (request.getName() != null) group.setName(request.getName());
        if (request.getCode() != null) group.setCode(request.getCode());
        if (request.getDescription() != null) group.setDescription(request.getDescription());
        if (request.getStatus() != null) group.setStatus(parseWbsStatus(request.getStatus()));
        if (request.getProgress() != null) group.setProgress(request.getProgress());
        if (request.getWeight() != null) group.setWeight(request.getWeight());
        if (request.getOrderNum() != null) group.setOrderNum(request.getOrderNum());
        if (request.getPlannedStartDate() != null) group.setPlannedStartDate(request.getPlannedStartDate());
        if (request.getPlannedEndDate() != null) group.setPlannedEndDate(request.getPlannedEndDate());
        if (request.getActualStartDate() != null) group.setActualStartDate(request.getActualStartDate());
        if (request.getActualEndDate() != null) group.setActualEndDate(request.getActualEndDate());
        if (request.getLinkedEpicId() != null) group.setLinkedEpicId(request.getLinkedEpicId());

        return WbsGroupDto.from(wbsGroupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(String groupId) {
        WbsGroup group = wbsGroupRepository.findById(groupId)
                .orElseThrow(() -> CustomException.notFound("WBS Group not found: " + groupId));
        wbsGroupRepository.delete(group);
    }

    // ============ WBS Item Operations ============

    @Transactional(readOnly = true)
    public List<WbsItemDto> getItemsByGroup(String groupId) {
        return wbsItemRepository.findByGroupIdOrderByOrderNumAsc(groupId).stream()
                .map(WbsItemDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WbsItemDto getItemById(String itemId) {
        WbsItem item = wbsItemRepository.findById(itemId)
                .orElseThrow(() -> CustomException.notFound("WBS Item not found: " + itemId));
        return WbsItemDto.from(item);
    }

    @Transactional
    public WbsItemDto createItem(String groupId, WbsItemDto request) {
        WbsGroup group = wbsGroupRepository.findById(groupId)
                .orElseThrow(() -> CustomException.notFound("WBS Group not found: " + groupId));

        int nextOrder = (int) wbsItemRepository.countByGroupId(groupId);

        WbsItem item = WbsItem.builder()
                .group(group)
                .phase(group.getPhase())
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .status(parseWbsStatus(request.getStatus()))
                .weight(request.getWeight() != null ? request.getWeight() : 100)
                .orderNum(request.getOrderNum() != null ? request.getOrderNum() : nextOrder)
                .plannedStartDate(request.getPlannedStartDate())
                .plannedEndDate(request.getPlannedEndDate())
                .estimatedHours(request.getEstimatedHours())
                .assigneeId(request.getAssigneeId())
                .build();

        return WbsItemDto.from(wbsItemRepository.save(item));
    }

    @Transactional
    public WbsItemDto updateItem(String itemId, WbsItemDto request) {
        WbsItem item = wbsItemRepository.findById(itemId)
                .orElseThrow(() -> CustomException.notFound("WBS Item not found: " + itemId));

        if (request.getName() != null) item.setName(request.getName());
        if (request.getCode() != null) item.setCode(request.getCode());
        if (request.getDescription() != null) item.setDescription(request.getDescription());
        if (request.getStatus() != null) item.setStatus(parseWbsStatus(request.getStatus()));
        if (request.getProgress() != null) item.setProgress(request.getProgress());
        if (request.getWeight() != null) item.setWeight(request.getWeight());
        if (request.getOrderNum() != null) item.setOrderNum(request.getOrderNum());
        if (request.getPlannedStartDate() != null) item.setPlannedStartDate(request.getPlannedStartDate());
        if (request.getPlannedEndDate() != null) item.setPlannedEndDate(request.getPlannedEndDate());
        if (request.getActualStartDate() != null) item.setActualStartDate(request.getActualStartDate());
        if (request.getActualEndDate() != null) item.setActualEndDate(request.getActualEndDate());
        if (request.getEstimatedHours() != null) item.setEstimatedHours(request.getEstimatedHours());
        if (request.getActualHours() != null) item.setActualHours(request.getActualHours());
        if (request.getAssigneeId() != null) item.setAssigneeId(request.getAssigneeId());

        return WbsItemDto.from(wbsItemRepository.save(item));
    }

    @Transactional
    public void deleteItem(String itemId) {
        WbsItem item = wbsItemRepository.findById(itemId)
                .orElseThrow(() -> CustomException.notFound("WBS Item not found: " + itemId));
        wbsItemRepository.delete(item);
    }

    // ============ WBS Task Operations ============

    @Transactional(readOnly = true)
    public List<WbsTaskDto> getTasksByItem(String itemId) {
        return wbsTaskRepository.findByItemIdOrderByOrderNumAsc(itemId).stream()
                .map(WbsTaskDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WbsTaskDto getTaskById(String taskId) {
        WbsTask task = wbsTaskRepository.findById(taskId)
                .orElseThrow(() -> CustomException.notFound("WBS Task not found: " + taskId));
        return WbsTaskDto.from(task);
    }

    @Transactional
    public WbsTaskDto createTask(String itemId, WbsTaskDto request) {
        WbsItem item = wbsItemRepository.findById(itemId)
                .orElseThrow(() -> CustomException.notFound("WBS Item not found: " + itemId));

        int nextOrder = (int) wbsTaskRepository.countByItemId(itemId);

        WbsTask task = WbsTask.builder()
                .item(item)
                .group(item.getGroup())
                .phase(item.getPhase())
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .status(parseWbsStatus(request.getStatus()))
                .weight(request.getWeight() != null ? request.getWeight() : 100)
                .orderNum(request.getOrderNum() != null ? request.getOrderNum() : nextOrder)
                .estimatedHours(request.getEstimatedHours())
                .assigneeId(request.getAssigneeId())
                .linkedTaskId(request.getLinkedTaskId())
                .build();

        return WbsTaskDto.from(wbsTaskRepository.save(task));
    }

    @Transactional
    public WbsTaskDto updateTask(String taskId, WbsTaskDto request) {
        WbsTask task = wbsTaskRepository.findById(taskId)
                .orElseThrow(() -> CustomException.notFound("WBS Task not found: " + taskId));

        if (request.getName() != null) task.setName(request.getName());
        if (request.getCode() != null) task.setCode(request.getCode());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getStatus() != null) task.setStatus(parseWbsStatus(request.getStatus()));
        if (request.getProgress() != null) task.setProgress(request.getProgress());
        if (request.getWeight() != null) task.setWeight(request.getWeight());
        if (request.getOrderNum() != null) task.setOrderNum(request.getOrderNum());
        if (request.getEstimatedHours() != null) task.setEstimatedHours(request.getEstimatedHours());
        if (request.getActualHours() != null) task.setActualHours(request.getActualHours());
        if (request.getAssigneeId() != null) task.setAssigneeId(request.getAssigneeId());
        if (request.getLinkedTaskId() != null) task.setLinkedTaskId(request.getLinkedTaskId());

        return WbsTaskDto.from(wbsTaskRepository.save(task));
    }

    @Transactional
    public void deleteTask(String taskId) {
        WbsTask task = wbsTaskRepository.findById(taskId)
                .orElseThrow(() -> CustomException.notFound("WBS Task not found: " + taskId));
        wbsTaskRepository.delete(task);
    }

    // ============ Helper Methods ============

    private WbsGroup.WbsStatus parseWbsStatus(String status) {
        if (status == null || status.isBlank()) {
            return WbsGroup.WbsStatus.NOT_STARTED;
        }
        return WbsGroup.WbsStatus.valueOf(status);
    }

    @Transactional
    public void recalculateGroupProgress(String groupId) {
        WbsGroup group = wbsGroupRepository.findById(groupId)
                .orElseThrow(() -> CustomException.notFound("WBS Group not found: " + groupId));

        List<WbsItem> items = wbsItemRepository.findByGroupIdOrderByOrderNumAsc(groupId);
        if (items.isEmpty()) {
            group.setProgress(0);
        } else {
            int totalWeight = items.stream().mapToInt(WbsItem::getWeight).sum();
            int weightedProgress = items.stream()
                    .mapToInt(item -> item.getProgress() * item.getWeight())
                    .sum();
            group.setProgress(totalWeight > 0 ? weightedProgress / totalWeight : 0);
        }
        wbsGroupRepository.save(group);
    }
}
