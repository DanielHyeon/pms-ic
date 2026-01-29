package com.insuretech.pms.task.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.task.dto.CreateUserStoryRequest;
import com.insuretech.pms.task.dto.UpdateUserStoryRequest;
import com.insuretech.pms.task.dto.UserStoryResponse;
import com.insuretech.pms.task.reactive.entity.R2dbcUserStory;
import com.insuretech.pms.task.reactive.repository.ReactiveUserStoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveUserStoryService {

    private final ReactiveUserStoryRepository userStoryRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<UserStoryResponse> getUserStoriesByProject(String projectId) {
        return userStoryRepository.findByProjectIdOrderByPriorityOrderAsc(projectId)
                .map(this::toResponse);
    }

    public Flux<UserStoryResponse> getUserStoriesByProjectAndStatus(String projectId, String status) {
        return userStoryRepository.findByProjectIdAndStatusOrderByPriorityOrderAsc(projectId, status)
                .map(this::toResponse);
    }

    public Flux<UserStoryResponse> getUserStoriesBySprint(String sprintId) {
        return userStoryRepository.findBySprintId(sprintId)
                .map(this::toResponse);
    }

    public Flux<UserStoryResponse> getUserStoriesByFeature(String featureId) {
        return userStoryRepository.findByFeatureId(featureId)
                .map(this::toResponse);
    }

    public Flux<UserStoryResponse> getUserStoriesByPart(String partId) {
        return userStoryRepository.findByPartId(partId)
                .map(this::toResponse);
    }

    public Flux<UserStoryResponse> getUnlinkedUserStories(String projectId) {
        return userStoryRepository.findByProjectIdAndWbsItemIdIsNull(projectId)
                .map(this::toResponse);
    }

    public Mono<UserStoryResponse> getUserStoryById(String storyId) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<UserStoryResponse> createUserStory(CreateUserStoryRequest request) {
        return projectRepository.findById(request.getProjectId())
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + request.getProjectId())))
                .flatMap(project -> userStoryRepository.findMaxPriorityOrderByProjectIdAndStatus(request.getProjectId(), "IDEA")
                        .defaultIfEmpty(0)
                        .flatMap(maxOrder -> {
                            String acceptanceCriteria = request.getAcceptanceCriteria() != null
                                    ? String.join("\n", request.getAcceptanceCriteria())
                                    : null;

                            R2dbcUserStory story = R2dbcUserStory.builder()
                                    .id(UUID.randomUUID().toString())
                                    .projectId(request.getProjectId())
                                    .title(request.getTitle())
                                    .description(request.getDescription())
                                    .acceptanceCriteria(acceptanceCriteria)
                                    .priority(request.getPriority() != null ? request.getPriority().name() : "MEDIUM")
                                    .storyPoints(request.getStoryPoints())
                                    .status("IDEA")
                                    .assigneeId(request.getAssignee())
                                    .epic(request.getEpic())
                                    .priorityOrder(maxOrder + 1)
                                    .build();
                            return userStoryRepository.save(story);
                        }))
                .map(this::toResponse)
                .doOnSuccess(dto -> log.info("Created user story: {} for project: {}", dto.getId(), request.getProjectId()));
    }

    @Transactional
    public Mono<UserStoryResponse> updateUserStory(String storyId, UpdateUserStoryRequest request) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .flatMap(story -> {
                    if (request.getTitle() != null) story.setTitle(request.getTitle());
                    if (request.getDescription() != null) story.setDescription(request.getDescription());
                    if (request.getAcceptanceCriteria() != null) {
                        story.setAcceptanceCriteria(String.join("\n", request.getAcceptanceCriteria()));
                    }
                    if (request.getPriority() != null) story.setPriority(request.getPriority().name());
                    if (request.getStoryPoints() != null) story.setStoryPoints(request.getStoryPoints());
                    if (request.getStatus() != null) story.setStatus(request.getStatus().name());
                    if (request.getAssignee() != null) story.setAssigneeId(request.getAssignee());
                    if (request.getEpic() != null) story.setEpic(request.getEpic());
                    if (request.getSprintId() != null) story.setSprintId(request.getSprintId());
                    return userStoryRepository.save(story);
                })
                .map(this::toResponse)
                .doOnSuccess(dto -> log.info("Updated user story: {}", storyId));
    }

    @Transactional
    public Mono<UserStoryResponse> assignToSprint(String storyId, String sprintId) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .flatMap(story -> {
                    story.setSprintId(sprintId);
                    story.setStatus("IN_SPRINT");
                    return userStoryRepository.save(story);
                })
                .map(this::toResponse)
                .doOnSuccess(dto -> log.info("Assigned user story {} to sprint {}", storyId, sprintId));
    }

    @Transactional
    public Mono<UserStoryResponse> removeFromSprint(String storyId) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .flatMap(story -> {
                    story.setSprintId(null);
                    story.setStatus("READY");
                    return userStoryRepository.save(story);
                })
                .map(this::toResponse)
                .doOnSuccess(dto -> log.info("Removed user story {} from sprint", storyId));
    }

    @Transactional
    public Mono<UserStoryResponse> updateStatus(String storyId, String status) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .flatMap(story -> {
                    story.setStatus(status);
                    return userStoryRepository.save(story);
                })
                .map(this::toResponse)
                .doOnSuccess(dto -> log.info("Updated user story {} status to {}", storyId, status));
    }

    @Transactional
    public Mono<UserStoryResponse> linkToWbsItem(String storyId, String wbsItemId) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .flatMap(story -> {
                    story.setWbsItemId(wbsItemId);
                    return userStoryRepository.save(story);
                })
                .map(this::toResponse)
                .doOnSuccess(dto -> log.info("Linked user story {} to WBS item {}", storyId, wbsItemId));
    }

    @Transactional
    public Mono<Void> deleteUserStory(String storyId) {
        return userStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(CustomException.notFound("User story not found: " + storyId)))
                .flatMap(story -> userStoryRepository.deleteById(storyId))
                .doOnSuccess(v -> log.info("Deleted user story: {}", storyId));
    }

    public Mono<Long> countByPart(String partId) {
        return userStoryRepository.countByPartId(partId);
    }

    public Mono<Integer> sumStoryPointsByPart(String partId) {
        return userStoryRepository.sumStoryPointsByPartId(partId);
    }

    private UserStoryResponse toResponse(R2dbcUserStory story) {
        List<String> acceptanceCriteriaList = story.getAcceptanceCriteria() != null
                ? Arrays.asList(story.getAcceptanceCriteria().split("\n"))
                : Collections.emptyList();
        return UserStoryResponse.fromEntity(story, acceptanceCriteriaList);
    }
}
