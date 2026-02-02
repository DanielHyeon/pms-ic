package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.EpicDto;
import com.insuretech.pms.project.reactive.entity.R2dbcEpic;
import com.insuretech.pms.project.reactive.repository.ReactiveEpicRepository;
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
public class ReactiveEpicService {

    private final ReactiveEpicRepository epicRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<EpicDto> getEpicsByProject(String projectId) {
        return epicRepository.findByProjectId(projectId)
                .map(EpicDto::from);
    }

    public Flux<EpicDto> getActiveEpicsByProject(String projectId) {
        return epicRepository.findActiveEpicsByProjectId(projectId)
                .map(EpicDto::from);
    }

    public Flux<EpicDto> getEpicsByProjectAndStatus(String projectId, String status) {
        return epicRepository.findByProjectIdAndStatus(projectId, status)
                .map(EpicDto::from);
    }

    public Flux<EpicDto> getEpicsByPhase(String phaseId) {
        return epicRepository.findByPhaseId(phaseId)
                .map(EpicDto::from);
    }

    public Flux<EpicDto> getUnlinkedEpics(String projectId) {
        return epicRepository.findUnlinkedByProjectId(projectId)
                .map(EpicDto::from);
    }

    public Mono<EpicDto> getEpicById(String epicId) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .map(EpicDto::from);
    }

    @Transactional
    public Mono<EpicDto> createEpic(String projectId, EpicDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcEpic epic = R2dbcEpic.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .name(request.getName())
                            .description(request.getDescription())
                            .status(request.getStatus() != null ? request.getStatus() : "DRAFT")
                            .goal(request.getGoal())
                            .ownerId(request.getOwnerId())
                            .targetCompletionDate(request.getTargetCompletionDate())
                            .businessValue(request.getBusinessValue())
                            .totalStoryPoints(0)
                            .itemCount(0)
                            .phaseId(request.getPhaseId())
                            .color(request.getColor())
                            .progress(0)
                            .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                            .build();
                    return epicRepository.save(epic);
                })
                .map(EpicDto::from)
                .doOnSuccess(dto -> log.info("Created epic: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<EpicDto> updateEpic(String epicId, EpicDto request) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> {
                    if (request.getName() != null) epic.setName(request.getName());
                    if (request.getDescription() != null) epic.setDescription(request.getDescription());
                    if (request.getStatus() != null) epic.setStatus(request.getStatus());
                    if (request.getGoal() != null) epic.setGoal(request.getGoal());
                    if (request.getOwnerId() != null) epic.setOwnerId(request.getOwnerId());
                    if (request.getTargetCompletionDate() != null) epic.setTargetCompletionDate(request.getTargetCompletionDate());
                    if (request.getBusinessValue() != null) epic.setBusinessValue(request.getBusinessValue());
                    if (request.getPhaseId() != null) epic.setPhaseId(request.getPhaseId());
                    if (request.getColor() != null) epic.setColor(request.getColor());
                    if (request.getProgress() != null) epic.setProgress(request.getProgress());
                    if (request.getPriority() != null) epic.setPriority(request.getPriority());
                    return epicRepository.save(epic);
                })
                .map(EpicDto::from)
                .doOnSuccess(dto -> log.info("Updated epic: {}", epicId));
    }

    @Transactional
    public Mono<EpicDto> linkEpicToPhase(String epicId, String phaseId) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> {
                    epic.setPhaseId(phaseId);
                    return epicRepository.save(epic);
                })
                .map(EpicDto::from)
                .doOnSuccess(dto -> log.info("Linked epic {} to phase {}", epicId, phaseId));
    }

    @Transactional
    public Mono<EpicDto> unlinkEpicFromPhase(String epicId) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> {
                    epic.setPhaseId(null);
                    return epicRepository.save(epic);
                })
                .map(EpicDto::from)
                .doOnSuccess(dto -> log.info("Unlinked epic {} from phase", epicId));
    }

    @Transactional
    public Mono<EpicDto> updateEpicStatus(String epicId, String status) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> {
                    epic.setStatus(status);
                    return epicRepository.save(epic);
                })
                .map(EpicDto::from)
                .doOnSuccess(dto -> log.info("Updated epic {} status to {}", epicId, status));
    }

    @Transactional
    public Mono<EpicDto> updateEpicProgress(String epicId, Integer progress) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> {
                    epic.setProgress(progress);
                    return epicRepository.save(epic);
                })
                .map(EpicDto::from)
                .doOnSuccess(dto -> log.info("Updated epic {} progress to {}%", epicId, progress));
    }

    @Transactional
    public Mono<Void> deleteEpic(String epicId) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> epicRepository.deleteById(epicId))
                .doOnSuccess(v -> log.info("Deleted epic: {}", epicId));
    }

    public Mono<Long> countEpicsByPhase(String phaseId) {
        return epicRepository.countByPhaseId(phaseId);
    }
}
