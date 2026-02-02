package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.CreateRequirementRequest;
import com.insuretech.pms.rfp.dto.RequirementDto;
import com.insuretech.pms.rfp.dto.UpdateRequirementRequest;
import com.insuretech.pms.rfp.enums.Priority;
import com.insuretech.pms.rfp.enums.RequirementCategory;
import com.insuretech.pms.rfp.enums.RequirementStatus;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirement;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveRequirementService {

    private final ReactiveRequirementRepository requirementRepository;

    public Flux<RequirementDto> getRequirementsByProject(String projectId) {
        return requirementRepository.findByProjectIdOrderByCodeAsc(projectId)
                .map(this::toDto);
    }

    public Flux<RequirementDto> getRequirementsByRfp(String rfpId) {
        return requirementRepository.findByRfpId(rfpId)
                .map(this::toDto);
    }

    public Mono<RequirementDto> getRequirementById(String id) {
        return requirementRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Requirement not found: " + id)))
                .map(this::toDto);
    }

    public Mono<RequirementDto> createRequirement(String projectId, CreateRequirementRequest request) {
        return generateRequirementCode(projectId)
                .flatMap(code -> {
                    R2dbcRequirement requirement = R2dbcRequirement.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .rfpId(request.getRfpId())
                            .code(code)
                            .title(request.getTitle())
                            .description(request.getDescription())
                            .category(request.getCategory() != null ? request.getCategory() : "FUNCTIONAL")
                            .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                            .status(request.getStatus() != null ? request.getStatus() : "IDENTIFIED")
                            .assigneeId(request.getAssigneeId())
                            .dueDate(request.getDueDate())
                            .acceptanceCriteria(request.getAcceptanceCriteria())
                            .estimatedEffort(request.getEstimatedEffort())
                            .progressPercentage(0)
                            .progressCalcMethod("STORY_POINT")
                            .tenantId(projectId)
                            .build();
                    return requirementRepository.save(requirement);
                })
                .map(this::toDto)
                .doOnSuccess(dto -> log.info("Created requirement: {} for project: {}", dto.getCode(), projectId));
    }

    public Mono<RequirementDto> updateRequirement(String id, UpdateRequirementRequest request) {
        return requirementRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Requirement not found: " + id)))
                .flatMap(req -> {
                    if (request.getTitle() != null) req.setTitle(request.getTitle());
                    if (request.getDescription() != null) req.setDescription(request.getDescription());
                    if (request.getCategory() != null) req.setCategory(request.getCategory());
                    if (request.getPriority() != null) req.setPriority(request.getPriority());
                    if (request.getStatus() != null) req.setStatus(request.getStatus());
                    if (request.getAssigneeId() != null) req.setAssigneeId(request.getAssigneeId());
                    if (request.getDueDate() != null) req.setDueDate(request.getDueDate());
                    if (request.getAcceptanceCriteria() != null) req.setAcceptanceCriteria(request.getAcceptanceCriteria());
                    if (request.getEstimatedEffort() != null) req.setEstimatedEffort(request.getEstimatedEffort());
                    if (request.getActualEffort() != null) req.setActualEffort(request.getActualEffort());
                    if (request.getProgress() != null) {
                        req.setProgressPercentage(request.getProgress());
                        req.setLastProgressUpdate(LocalDateTime.now());
                    }
                    return requirementRepository.save(req);
                })
                .map(this::toDto);
    }

    public Mono<Void> deleteRequirement(String id) {
        return requirementRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Requirement not found: " + id)))
                .flatMap(req -> requirementRepository.delete(req))
                .doOnSuccess(v -> log.info("Deleted requirement: {}", id));
    }

    public Mono<Void> updateProgress(String id, Integer progress) {
        return requirementRepository.updateProgress(id, progress);
    }

    public Mono<Double> getAverageProgress(String projectId) {
        return requirementRepository.getAverageProgressByProjectId(projectId)
                .defaultIfEmpty(0.0);
    }

    private Mono<String> generateRequirementCode(String projectId) {
        return requirementRepository.countByProjectId(projectId)
                .map(count -> String.format("REQ-%s-%04d", projectId.substring(0, Math.min(8, projectId.length())).toUpperCase(), count + 1));
    }

    private RequirementDto toDto(R2dbcRequirement entity) {
        return RequirementDto.builder()
                .id(entity.getId())
                .rfpId(entity.getRfpId())
                .projectId(entity.getProjectId())
                .code(entity.getCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .category(parseCategory(entity.getCategory()))
                .priority(parsePriority(entity.getPriority()))
                .status(parseStatus(entity.getStatus()))
                .progress(entity.getProgress())
                .sourceText(entity.getSourceText())
                .pageNumber(entity.getPageNumber())
                .assigneeId(entity.getAssigneeId())
                .dueDate(entity.getDueDate())
                .acceptanceCriteria(entity.getAcceptanceCriteria())
                .estimatedEffort(entity.getEstimatedEffort())
                .actualEffort(entity.getActualEffort())
                .storyPoints(entity.getStoryPoints())
                .estimatedEffortHours(entity.getEstimatedEffortHours())
                .actualEffortHours(entity.getActualEffortHours())
                .remainingEffortHours(entity.getRemainingEffortHours())
                .progressPercentage(entity.getProgressPercentage())
                .lastProgressUpdate(entity.getLastProgressUpdate())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private RequirementCategory parseCategory(String category) {
        try {
            return category != null ? RequirementCategory.valueOf(category) : RequirementCategory.FUNCTIONAL;
        } catch (IllegalArgumentException e) {
            return RequirementCategory.FUNCTIONAL;
        }
    }

    private Priority parsePriority(String priority) {
        try {
            return priority != null ? Priority.valueOf(priority) : Priority.MEDIUM;
        } catch (IllegalArgumentException e) {
            return Priority.MEDIUM;
        }
    }

    private RequirementStatus parseStatus(String status) {
        try {
            return status != null ? RequirementStatus.valueOf(status) : RequirementStatus.IDENTIFIED;
        } catch (IllegalArgumentException e) {
            return RequirementStatus.IDENTIFIED;
        }
    }
}
