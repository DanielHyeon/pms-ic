package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.PhaseDto;
import com.insuretech.pms.project.reactive.entity.R2dbcPhase;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
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
public class ReactivePhaseService {

    private final ReactivePhaseRepository phaseRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<PhaseDto> getPhases(String projectId) {
        if (projectId != null && !projectId.isBlank()) {
            return phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId)
                    .map(PhaseDto::from);
        }
        return phaseRepository.findAll().map(PhaseDto::from);
    }

    public Mono<PhaseDto> getPhaseById(String phaseId) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .map(PhaseDto::from);
    }

    @Transactional
    public Mono<PhaseDto> createPhase(String projectId, PhaseDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcPhase phase = R2dbcPhase.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .name(request.getName())
                            .orderNum(request.getOrderNum() != null ? request.getOrderNum() : 0)
                            .status(request.getStatus() != null ? request.getStatus() : "NOT_STARTED")
                            .gateStatus(request.getGateStatus())
                            .startDate(request.getStartDate())
                            .endDate(request.getEndDate())
                            .progress(request.getProgress() != null ? request.getProgress() : 0)
                            .description(request.getDescription())
                            .build();
                    return phaseRepository.save(phase);
                })
                .map(PhaseDto::from)
                .doOnSuccess(dto -> log.info("Created phase: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<PhaseDto> updatePhase(String phaseId, PhaseDto request) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .flatMap(phase -> {
                    if (request.getName() != null) phase.setName(request.getName());
                    if (request.getOrderNum() != null) phase.setOrderNum(request.getOrderNum());
                    if (request.getStatus() != null) phase.setStatus(request.getStatus());
                    if (request.getGateStatus() != null) phase.setGateStatus(request.getGateStatus());
                    if (request.getStartDate() != null) phase.setStartDate(request.getStartDate());
                    if (request.getEndDate() != null) phase.setEndDate(request.getEndDate());
                    if (request.getProgress() != null) phase.setProgress(request.getProgress());
                    if (request.getDescription() != null) phase.setDescription(request.getDescription());
                    return phaseRepository.save(phase);
                })
                .map(PhaseDto::from)
                .doOnSuccess(dto -> log.info("Updated phase: {}", phaseId));
    }

    @Transactional
    public Mono<Void> deletePhase(String phaseId) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .flatMap(phase -> phaseRepository.deleteById(phaseId))
                .doOnSuccess(v -> log.info("Deleted phase: {}", phaseId));
    }
}
