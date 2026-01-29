package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.WbsGroupDto;
import com.insuretech.pms.project.dto.WbsItemDto;
import com.insuretech.pms.project.dto.WbsTaskDto;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsGroup;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsItem;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsGroupRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveWbsService {

    private final ReactiveWbsGroupRepository groupRepository;
    private final ReactiveWbsItemRepository itemRepository;
    private final ReactiveWbsTaskRepository taskRepository;
    private final ReactivePhaseRepository phaseRepository;

    // ========== WBS Group Operations ==========

    public Flux<WbsGroupDto> getGroupsByPhase(String phaseId) {
        return groupRepository.findByPhaseIdOrderByOrderNumAsc(phaseId)
                .map(WbsGroupDto::from);
    }

    public Flux<WbsGroupDto> getGroupsByProject(String projectId) {
        return groupRepository.findByProjectIdOrdered(projectId)
                .map(WbsGroupDto::from);
    }

    public Mono<WbsGroupDto> getGroupById(String groupId) {
        return groupRepository.findById(groupId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Group not found: " + groupId)))
                .map(WbsGroupDto::from);
    }

    @Transactional
    public Mono<WbsGroupDto> createGroup(String phaseId, WbsGroupDto request) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .flatMap(phase -> groupRepository.countByPhaseId(phaseId)
                        .flatMap(count -> {
                            R2dbcWbsGroup group = R2dbcWbsGroup.builder()
                                    .id(UUID.randomUUID().toString())
                                    .phaseId(phaseId)
                                    .code(request.getCode())
                                    .name(request.getName())
                                    .description(request.getDescription())
                                    .status(request.getStatus() != null ? request.getStatus() : "NOT_STARTED")
                                    .progress(request.getProgress() != null ? request.getProgress() : 0)
                                    .plannedStartDate(request.getPlannedStartDate())
                                    .plannedEndDate(request.getPlannedEndDate())
                                    .weight(request.getWeight() != null ? request.getWeight() : 100)
                                    .orderNum(request.getOrderNum() != null ? request.getOrderNum() : count.intValue())
                                    .linkedEpicId(request.getLinkedEpicId())
                                    .build();
                            return groupRepository.save(group);
                        }))
                .map(WbsGroupDto::from)
                .doOnSuccess(dto -> log.info("Created WBS group: {} for phase: {}", dto.getId(), phaseId));
    }

    @Transactional
    public Mono<WbsGroupDto> updateGroup(String groupId, WbsGroupDto request) {
        return groupRepository.findById(groupId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Group not found: " + groupId)))
                .flatMap(group -> {
                    if (request.getCode() != null) group.setCode(request.getCode());
                    if (request.getName() != null) group.setName(request.getName());
                    if (request.getDescription() != null) group.setDescription(request.getDescription());
                    if (request.getStatus() != null) group.setStatus(request.getStatus());
                    if (request.getProgress() != null) group.setProgress(request.getProgress());
                    if (request.getPlannedStartDate() != null) group.setPlannedStartDate(request.getPlannedStartDate());
                    if (request.getPlannedEndDate() != null) group.setPlannedEndDate(request.getPlannedEndDate());
                    if (request.getActualStartDate() != null) group.setActualStartDate(request.getActualStartDate());
                    if (request.getActualEndDate() != null) group.setActualEndDate(request.getActualEndDate());
                    if (request.getWeight() != null) group.setWeight(request.getWeight());
                    if (request.getOrderNum() != null) group.setOrderNum(request.getOrderNum());
                    if (request.getLinkedEpicId() != null) group.setLinkedEpicId(request.getLinkedEpicId());
                    return groupRepository.save(group);
                })
                .map(WbsGroupDto::from)
                .doOnSuccess(dto -> log.info("Updated WBS group: {}", groupId));
    }

    @Transactional
    public Mono<Void> deleteGroup(String groupId) {
        return groupRepository.findById(groupId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Group not found: " + groupId)))
                .flatMap(group -> taskRepository.deleteByItemId(groupId)
                        .then(itemRepository.deleteByGroupId(groupId))
                        .then(groupRepository.deleteById(groupId)))
                .doOnSuccess(v -> log.info("Deleted WBS group: {}", groupId));
    }

    // ========== WBS Item Operations ==========

    public Flux<WbsItemDto> getItemsByGroup(String groupId) {
        return itemRepository.findByGroupIdOrderByOrderNumAsc(groupId)
                .map(WbsItemDto::from);
    }

    public Flux<WbsItemDto> getItemsByPhase(String phaseId) {
        return itemRepository.findByPhaseIdOrderByOrderNumAsc(phaseId)
                .map(WbsItemDto::from);
    }

    public Flux<WbsItemDto> getItemsByProject(String projectId) {
        return itemRepository.findByProjectIdOrdered(projectId)
                .map(WbsItemDto::from);
    }

    public Mono<WbsItemDto> getItemById(String itemId) {
        return itemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Item not found: " + itemId)))
                .map(WbsItemDto::from);
    }

    @Transactional
    public Mono<WbsItemDto> createItem(String groupId, WbsItemDto request) {
        return groupRepository.findById(groupId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Group not found: " + groupId)))
                .flatMap(group -> itemRepository.countByGroupId(groupId)
                        .flatMap(count -> {
                            R2dbcWbsItem item = R2dbcWbsItem.builder()
                                    .id(UUID.randomUUID().toString())
                                    .groupId(groupId)
                                    .phaseId(group.getPhaseId())
                                    .code(request.getCode())
                                    .name(request.getName())
                                    .description(request.getDescription())
                                    .status(request.getStatus() != null ? request.getStatus() : "NOT_STARTED")
                                    .progress(request.getProgress() != null ? request.getProgress() : 0)
                                    .plannedStartDate(request.getPlannedStartDate())
                                    .plannedEndDate(request.getPlannedEndDate())
                                    .weight(request.getWeight() != null ? request.getWeight() : 100)
                                    .orderNum(request.getOrderNum() != null ? request.getOrderNum() : count.intValue())
                                    .estimatedHours(request.getEstimatedHours())
                                    .assigneeId(request.getAssigneeId())
                                    .build();
                            return itemRepository.save(item);
                        }))
                .map(WbsItemDto::from)
                .doOnSuccess(dto -> log.info("Created WBS item: {} for group: {}", dto.getId(), groupId));
    }

    @Transactional
    public Mono<WbsItemDto> updateItem(String itemId, WbsItemDto request) {
        return itemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Item not found: " + itemId)))
                .flatMap(item -> {
                    if (request.getCode() != null) item.setCode(request.getCode());
                    if (request.getName() != null) item.setName(request.getName());
                    if (request.getDescription() != null) item.setDescription(request.getDescription());
                    if (request.getStatus() != null) item.setStatus(request.getStatus());
                    if (request.getProgress() != null) item.setProgress(request.getProgress());
                    if (request.getPlannedStartDate() != null) item.setPlannedStartDate(request.getPlannedStartDate());
                    if (request.getPlannedEndDate() != null) item.setPlannedEndDate(request.getPlannedEndDate());
                    if (request.getActualStartDate() != null) item.setActualStartDate(request.getActualStartDate());
                    if (request.getActualEndDate() != null) item.setActualEndDate(request.getActualEndDate());
                    if (request.getWeight() != null) item.setWeight(request.getWeight());
                    if (request.getOrderNum() != null) item.setOrderNum(request.getOrderNum());
                    if (request.getEstimatedHours() != null) item.setEstimatedHours(request.getEstimatedHours());
                    if (request.getActualHours() != null) item.setActualHours(request.getActualHours());
                    if (request.getAssigneeId() != null) item.setAssigneeId(request.getAssigneeId());
                    return itemRepository.save(item);
                })
                .map(WbsItemDto::from)
                .doOnSuccess(dto -> log.info("Updated WBS item: {}", itemId));
    }

    @Transactional
    public Mono<Void> deleteItem(String itemId) {
        return itemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Item not found: " + itemId)))
                .flatMap(item -> taskRepository.deleteByItemId(itemId)
                        .then(itemRepository.deleteById(itemId)))
                .doOnSuccess(v -> log.info("Deleted WBS item: {}", itemId));
    }

    // ========== WBS Task Operations ==========

    public Flux<WbsTaskDto> getTasksByItem(String itemId) {
        return taskRepository.findByItemIdOrderByOrderNumAsc(itemId)
                .map(WbsTaskDto::from);
    }

    public Flux<WbsTaskDto> getTasksByGroup(String groupId) {
        return taskRepository.findByGroupIdOrderByOrderNumAsc(groupId)
                .map(WbsTaskDto::from);
    }

    public Flux<WbsTaskDto> getTasksByPhase(String phaseId) {
        return taskRepository.findByPhaseIdOrderByOrderNumAsc(phaseId)
                .map(WbsTaskDto::from);
    }

    public Flux<WbsTaskDto> getTasksByProject(String projectId) {
        return taskRepository.findByProjectIdOrdered(projectId)
                .map(WbsTaskDto::from);
    }

    public Mono<WbsTaskDto> getTaskById(String taskId) {
        return taskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Task not found: " + taskId)))
                .map(WbsTaskDto::from);
    }

    @Transactional
    public Mono<WbsTaskDto> createTask(String itemId, WbsTaskDto request) {
        return itemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Item not found: " + itemId)))
                .flatMap(item -> taskRepository.countByItemId(itemId)
                        .flatMap(count -> {
                            R2dbcWbsTask task = R2dbcWbsTask.builder()
                                    .id(UUID.randomUUID().toString())
                                    .itemId(itemId)
                                    .groupId(item.getGroupId())
                                    .phaseId(item.getPhaseId())
                                    .code(request.getCode())
                                    .name(request.getName())
                                    .description(request.getDescription())
                                    .status(request.getStatus() != null ? request.getStatus() : "NOT_STARTED")
                                    .progress(request.getProgress() != null ? request.getProgress() : 0)
                                    .weight(request.getWeight() != null ? request.getWeight() : 100)
                                    .orderNum(request.getOrderNum() != null ? request.getOrderNum() : count.intValue())
                                    .estimatedHours(request.getEstimatedHours())
                                    .assigneeId(request.getAssigneeId())
                                    .linkedTaskId(request.getLinkedTaskId())
                                    .plannedStartDate(request.getPlannedStartDate())
                                    .plannedEndDate(request.getPlannedEndDate())
                                    .build();
                            return taskRepository.save(task);
                        }))
                .map(WbsTaskDto::from)
                .doOnSuccess(dto -> log.info("Created WBS task: {} for item: {}", dto.getId(), itemId));
    }

    @Transactional
    public Mono<WbsTaskDto> updateTask(String taskId, WbsTaskDto request) {
        return taskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Task not found: " + taskId)))
                .flatMap(task -> {
                    if (request.getCode() != null) task.setCode(request.getCode());
                    if (request.getName() != null) task.setName(request.getName());
                    if (request.getDescription() != null) task.setDescription(request.getDescription());
                    if (request.getStatus() != null) task.setStatus(request.getStatus());
                    if (request.getProgress() != null) task.setProgress(request.getProgress());
                    if (request.getWeight() != null) task.setWeight(request.getWeight());
                    if (request.getOrderNum() != null) task.setOrderNum(request.getOrderNum());
                    if (request.getEstimatedHours() != null) task.setEstimatedHours(request.getEstimatedHours());
                    if (request.getActualHours() != null) task.setActualHours(request.getActualHours());
                    if (request.getAssigneeId() != null) task.setAssigneeId(request.getAssigneeId());
                    if (request.getLinkedTaskId() != null) task.setLinkedTaskId(request.getLinkedTaskId());
                    if (request.getPlannedStartDate() != null) task.setPlannedStartDate(request.getPlannedStartDate());
                    if (request.getPlannedEndDate() != null) task.setPlannedEndDate(request.getPlannedEndDate());
                    if (request.getActualStartDate() != null) task.setActualStartDate(request.getActualStartDate());
                    if (request.getActualEndDate() != null) task.setActualEndDate(request.getActualEndDate());
                    return taskRepository.save(task);
                })
                .map(WbsTaskDto::from)
                .doOnSuccess(dto -> log.info("Updated WBS task: {}", taskId));
    }

    @Transactional
    public Mono<Void> deleteTask(String taskId) {
        return taskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("WBS Task not found: " + taskId)))
                .flatMap(task -> taskRepository.deleteById(taskId))
                .doOnSuccess(v -> log.info("Deleted WBS task: {}", taskId));
    }
}
