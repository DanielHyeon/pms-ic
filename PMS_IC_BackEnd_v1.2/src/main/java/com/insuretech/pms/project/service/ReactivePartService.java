package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.PartDto;
import com.insuretech.pms.project.reactive.entity.R2dbcPart;
import com.insuretech.pms.project.reactive.repository.ReactivePartRepository;
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
public class ReactivePartService {

    private final ReactivePartRepository partRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<PartDto> getPartsByProject(String projectId) {
        return partRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .map(PartDto::from);
    }

    public Mono<PartDto> getPartById(String partId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .map(PartDto::from);
    }

    @Transactional
    public Mono<PartDto> createPart(String projectId, PartDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcPart part = R2dbcPart.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .name(request.getName())
                            .description(request.getDescription())
                            .leaderId(request.getLeaderId())
                            .leaderName(request.getLeaderName())
                            .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                            .startDate(request.getStartDate())
                            .endDate(request.getEndDate())
                            .progress(request.getProgress() != null ? request.getProgress() : 0)
                            .build();
                    return partRepository.save(part);
                })
                .map(PartDto::from)
                .doOnSuccess(dto -> log.info("Created part: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<PartDto> updatePart(String partId, PartDto request) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if (request.getName() != null) part.setName(request.getName());
                    if (request.getDescription() != null) part.setDescription(request.getDescription());
                    if (request.getLeaderId() != null) part.setLeaderId(request.getLeaderId());
                    if (request.getLeaderName() != null) part.setLeaderName(request.getLeaderName());
                    if (request.getStatus() != null) part.setStatus(request.getStatus());
                    if (request.getStartDate() != null) part.setStartDate(request.getStartDate());
                    if (request.getEndDate() != null) part.setEndDate(request.getEndDate());
                    if (request.getProgress() != null) part.setProgress(request.getProgress());
                    return partRepository.save(part);
                })
                .map(PartDto::from)
                .doOnSuccess(dto -> log.info("Updated part: {}", partId));
    }

    @Transactional
    public Mono<Void> deletePart(String partId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> partRepository.deleteById(partId))
                .doOnSuccess(v -> log.info("Deleted part: {}", partId));
    }

    @Transactional
    public Mono<PartDto> assignLeader(String partId, String userId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    part.setLeaderId(userId);
                    return partRepository.save(part);
                })
                .map(PartDto::from)
                .doOnSuccess(dto -> log.info("Assigned leader {} to part {}", userId, partId));
    }
}
