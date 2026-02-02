package com.insuretech.pms.task.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.task.dto.SprintDto;
import com.insuretech.pms.task.reactive.entity.R2dbcSprint;
import com.insuretech.pms.task.reactive.repository.ReactiveSprintRepository;
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
public class ReactiveSprintService {

    private final ReactiveSprintRepository sprintRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<SprintDto> getSprintsByProject(String projectId) {
        return sprintRepository.findByProjectIdOrderByStartDateDesc(projectId)
                .map(SprintDto::fromEntity);
    }

    public Flux<SprintDto> getSprintsByProjectAndStatus(String projectId, String status) {
        return sprintRepository.findByProjectIdAndStatus(projectId, status)
                .map(SprintDto::fromEntity);
    }

    public Mono<SprintDto> getActiveSprint(String projectId) {
        return sprintRepository.findByProjectIdAndStatusEquals(projectId, "ACTIVE")
                .map(SprintDto::fromEntity);
    }

    public Mono<SprintDto> getSprintById(String sprintId) {
        return sprintRepository.findById(sprintId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Sprint not found: " + sprintId)))
                .map(SprintDto::fromEntity);
    }

    @Transactional
    public Mono<SprintDto> createSprint(String projectId, SprintDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcSprint sprint = R2dbcSprint.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .name(request.getName())
                            .goal(request.getGoal())
                            .startDate(request.getStartDate())
                            .endDate(request.getEndDate())
                            .status(request.getStatus() != null ? request.getStatus() : "PLANNED")
                            .build();
                    return sprintRepository.save(sprint);
                })
                .map(SprintDto::fromEntity)
                .doOnSuccess(dto -> log.info("Created sprint: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<SprintDto> updateSprint(String sprintId, SprintDto request) {
        return sprintRepository.findById(sprintId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Sprint not found: " + sprintId)))
                .flatMap(sprint -> {
                    if (request.getName() != null) sprint.setName(request.getName());
                    if (request.getGoal() != null) sprint.setGoal(request.getGoal());
                    if (request.getStartDate() != null) sprint.setStartDate(request.getStartDate());
                    if (request.getEndDate() != null) sprint.setEndDate(request.getEndDate());
                    if (request.getStatus() != null) sprint.setStatus(request.getStatus());
                    return sprintRepository.save(sprint);
                })
                .map(SprintDto::fromEntity)
                .doOnSuccess(dto -> log.info("Updated sprint: {}", sprintId));
    }

    @Transactional
    public Mono<SprintDto> startSprint(String sprintId) {
        return sprintRepository.findById(sprintId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Sprint not found: " + sprintId)))
                .flatMap(sprint -> {
                    sprint.setStatus("ACTIVE");
                    return sprintRepository.save(sprint);
                })
                .map(SprintDto::fromEntity)
                .doOnSuccess(dto -> log.info("Started sprint: {}", sprintId));
    }

    @Transactional
    public Mono<SprintDto> completeSprint(String sprintId) {
        return sprintRepository.findById(sprintId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Sprint not found: " + sprintId)))
                .flatMap(sprint -> {
                    sprint.setStatus("COMPLETED");
                    return sprintRepository.save(sprint);
                })
                .map(SprintDto::fromEntity)
                .doOnSuccess(dto -> log.info("Completed sprint: {}", sprintId));
    }

    @Transactional
    public Mono<SprintDto> cancelSprint(String sprintId) {
        return sprintRepository.findById(sprintId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Sprint not found: " + sprintId)))
                .flatMap(sprint -> {
                    sprint.setStatus("CANCELLED");
                    return sprintRepository.save(sprint);
                })
                .map(SprintDto::fromEntity)
                .doOnSuccess(dto -> log.info("Cancelled sprint: {}", sprintId));
    }

    @Transactional
    public Mono<Void> deleteSprint(String sprintId) {
        return sprintRepository.findById(sprintId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Sprint not found: " + sprintId)))
                .flatMap(sprint -> sprintRepository.deleteById(sprintId))
                .doOnSuccess(v -> log.info("Deleted sprint: {}", sprintId));
    }
}
