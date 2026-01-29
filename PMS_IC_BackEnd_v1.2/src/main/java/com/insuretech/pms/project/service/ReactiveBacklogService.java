package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.BacklogDto;
import com.insuretech.pms.project.dto.BacklogItemDto;
import com.insuretech.pms.project.reactive.entity.R2dbcBacklog;
import com.insuretech.pms.project.reactive.entity.R2dbcBacklogItem;
import com.insuretech.pms.project.reactive.repository.ReactiveBacklogItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveBacklogRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
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
public class ReactiveBacklogService {

    private final ReactiveBacklogRepository backlogRepository;
    private final ReactiveBacklogItemRepository backlogItemRepository;
    private final ReactiveProjectRepository projectRepository;

    // ========== Backlog Operations ==========

    public Flux<BacklogDto> getBacklogsByProject(String projectId) {
        return backlogRepository.findByProjectId(projectId)
                .map(BacklogDto::fromEntity);
    }

    public Mono<BacklogDto> getActiveBacklog(String projectId) {
        return backlogRepository.findActiveBacklogByProjectId(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("No active backlog for project: " + projectId)))
                .map(BacklogDto::fromEntity);
    }

    public Mono<BacklogDto> getBacklogById(String backlogId) {
        return backlogRepository.findById(backlogId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog not found: " + backlogId)))
                .map(BacklogDto::fromEntity);
    }

    @Transactional
    public Mono<BacklogDto> createBacklog(String projectId, BacklogDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcBacklog backlog = R2dbcBacklog.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .name(request.getName() != null ? request.getName() : "Product Backlog")
                            .description(request.getDescription())
                            .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                            .build();
                    return backlogRepository.save(backlog);
                })
                .map(BacklogDto::fromEntity)
                .doOnSuccess(dto -> log.info("Created backlog: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<BacklogDto> updateBacklog(String backlogId, BacklogDto request) {
        return backlogRepository.findById(backlogId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog not found: " + backlogId)))
                .flatMap(backlog -> {
                    if (request.getName() != null) backlog.setName(request.getName());
                    if (request.getDescription() != null) backlog.setDescription(request.getDescription());
                    if (request.getStatus() != null) backlog.setStatus(request.getStatus());
                    return backlogRepository.save(backlog);
                })
                .map(BacklogDto::fromEntity)
                .doOnSuccess(dto -> log.info("Updated backlog: {}", backlogId));
    }

    @Transactional
    public Mono<Void> deleteBacklog(String backlogId) {
        return backlogRepository.findById(backlogId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog not found: " + backlogId)))
                .flatMap(backlog -> backlogItemRepository.deleteByBacklogId(backlogId)
                        .then(backlogRepository.deleteById(backlogId)))
                .doOnSuccess(v -> log.info("Deleted backlog: {}", backlogId));
    }

    // ========== Backlog Item Operations ==========

    public Flux<BacklogItemDto> getItemsByBacklog(String backlogId) {
        return backlogItemRepository.findByBacklogIdOrderByPriorityOrderAsc(backlogId)
                .map(BacklogItemDto::fromEntity);
    }

    public Flux<BacklogItemDto> getItemsByBacklogAndStatus(String backlogId, String status) {
        return backlogItemRepository.findByBacklogIdAndStatus(backlogId, status)
                .map(BacklogItemDto::fromEntity);
    }

    public Flux<BacklogItemDto> getSelectedItemsForSprintPlanning(String backlogId) {
        return backlogItemRepository.findSelectedItemsForSprintPlanning(backlogId)
                .map(BacklogItemDto::fromEntity);
    }

    public Flux<BacklogItemDto> getItemsBySprint(String sprintId) {
        return backlogItemRepository.findBySprintId(sprintId)
                .map(BacklogItemDto::fromEntity);
    }

    public Mono<BacklogItemDto> getItemById(String itemId) {
        return backlogItemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog item not found: " + itemId)))
                .map(BacklogItemDto::fromEntity);
    }

    @Transactional
    public Mono<BacklogItemDto> createItem(String backlogId, BacklogItemDto request) {
        return backlogRepository.findById(backlogId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog not found: " + backlogId)))
                .flatMap(backlog -> backlogItemRepository.findMaxPriorityOrderByBacklogId(backlogId)
                        .defaultIfEmpty(0)
                        .flatMap(maxOrder -> {
                            R2dbcBacklogItem item = R2dbcBacklogItem.builder()
                                    .id(UUID.randomUUID().toString())
                                    .backlogId(backlogId)
                                    .requirementId(request.getRequirementId())
                                    .originType(request.getOriginType() != null ? request.getOriginType() : "MANUAL")
                                    .epicId(request.getEpicId())
                                    .epicIdRef(request.getEpicIdRef())
                                    .priorityOrder(request.getPriorityOrder() != null ? request.getPriorityOrder() : maxOrder + 1)
                                    .status(request.getStatus() != null ? request.getStatus() : "BACKLOG")
                                    .storyPoints(request.getStoryPoints())
                                    .estimatedEffortHours(request.getEstimatedEffortHours())
                                    .acceptanceCriteria(request.getAcceptanceCriteria())
                                    .sprintId(request.getSprintId())
                                    .build();
                            return backlogItemRepository.save(item);
                        }))
                .map(BacklogItemDto::fromEntity)
                .doOnSuccess(dto -> log.info("Created backlog item: {} for backlog: {}", dto.getId(), backlogId));
    }

    @Transactional
    public Mono<BacklogItemDto> updateItem(String itemId, BacklogItemDto request) {
        return backlogItemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog item not found: " + itemId)))
                .flatMap(item -> {
                    if (request.getPriorityOrder() != null) item.setPriorityOrder(request.getPriorityOrder());
                    if (request.getStatus() != null) item.setStatus(request.getStatus());
                    if (request.getStoryPoints() != null) item.setStoryPoints(request.getStoryPoints());
                    if (request.getEstimatedEffortHours() != null) item.setEstimatedEffortHours(request.getEstimatedEffortHours());
                    if (request.getAcceptanceCriteria() != null) item.setAcceptanceCriteria(request.getAcceptanceCriteria());
                    if (request.getSprintId() != null) item.setSprintId(request.getSprintId());
                    if (request.getEpicId() != null) item.setEpicId(request.getEpicId());
                    return backlogItemRepository.save(item);
                })
                .map(BacklogItemDto::fromEntity)
                .doOnSuccess(dto -> log.info("Updated backlog item: {}", itemId));
    }

    @Transactional
    public Mono<BacklogItemDto> selectItemForSprint(String itemId) {
        return backlogItemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog item not found: " + itemId)))
                .flatMap(item -> {
                    item.setStatus("SELECTED");
                    return backlogItemRepository.save(item);
                })
                .map(BacklogItemDto::fromEntity)
                .doOnSuccess(dto -> log.info("Selected backlog item {} for sprint", itemId));
    }

    @Transactional
    public Mono<BacklogItemDto> assignItemToSprint(String itemId, String sprintId) {
        return backlogItemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog item not found: " + itemId)))
                .flatMap(item -> {
                    item.setSprintId(sprintId);
                    item.setStatus("SPRINT");
                    return backlogItemRepository.save(item);
                })
                .map(BacklogItemDto::fromEntity)
                .doOnSuccess(dto -> log.info("Assigned backlog item {} to sprint {}", itemId, sprintId));
    }

    @Transactional
    public Mono<Void> deleteItem(String itemId) {
        return backlogItemRepository.findById(itemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Backlog item not found: " + itemId)))
                .flatMap(item -> backlogItemRepository.deleteById(itemId))
                .doOnSuccess(v -> log.info("Deleted backlog item: {}", itemId));
    }

    // ========== Statistics ==========

    public Mono<Long> countItemsByBacklog(String backlogId) {
        return backlogItemRepository.countByBacklogId(backlogId);
    }

    public Mono<Long> countItemsByBacklogAndStatus(String backlogId, String status) {
        return backlogItemRepository.countByBacklogIdAndStatus(backlogId, status);
    }

    public Mono<Integer> sumStoryPointsForSelectedItems(String backlogId) {
        return backlogItemRepository.sumStoryPointsForSelectedItems(backlogId);
    }
}
