package com.insuretech.pms.decision.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.decision.dto.DecisionDto;
import com.insuretech.pms.decision.dto.DecisionSummaryDto;
import com.insuretech.pms.decision.reactive.entity.R2dbcDecision;
import com.insuretech.pms.decision.reactive.repository.ReactiveDecisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDecisionService {

    private final ReactiveDecisionRepository decisionRepository;
    private final ReactiveDecisionRiskAuditService auditService;

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "PROPOSED", List.of("UNDER_REVIEW"),
            "UNDER_REVIEW", List.of("APPROVED", "REJECTED", "DEFERRED"),
            "DEFERRED", List.of("UNDER_REVIEW"),
            "APPROVED", List.of(),
            "REJECTED", List.of("PROPOSED")
    );

    public Flux<DecisionSummaryDto> listDecisions(String projectId) {
        return decisionRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .map(DecisionSummaryDto::from);
    }

    public Flux<DecisionSummaryDto> listDecisionsByStatus(String projectId, String status) {
        return decisionRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, status)
                .map(DecisionSummaryDto::from);
    }

    public Mono<DecisionDto> getDecision(String decisionId) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .map(entity -> {
                    List<String> transitions = ALLOWED_TRANSITIONS.getOrDefault(entity.getStatus(), List.of());
                    return DecisionDto.fromWithTransitions(entity, transitions);
                });
    }

    @Transactional
    public Mono<DecisionDto> createDecision(String projectId, DecisionDto request, String userId) {
        R2dbcDecision entity = R2dbcDecision.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .decisionCode(request.getDecisionCode())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .category(request.getCategory())
                .ownerId(request.getOwnerId() != null ? request.getOwnerId() : userId)
                .partId(request.getPartId())
                .phaseId(request.getPhaseId())
                .optionsJson(request.getOptionsJson())
                .dueDate(request.getDueDate())
                .slaHours(request.getSlaHours() != null ? request.getSlaHours() : 168)
                .escalatedFromId(request.getEscalatedFromId())
                .escalatedFromType(request.getEscalatedFromType())
                .etag(UUID.randomUUID().toString())
                .build();
        entity.setCreatedBy(userId);

        return decisionRepository.save(entity)
                .flatMap(saved -> auditService.logAudit("DECISION", saved.getId(), projectId,
                                "CREATED", null, "PROPOSED", userId, null)
                        .thenReturn(saved))
                .map(DecisionDto::from)
                .doOnSuccess(dto -> log.info("Created decision: {} in project {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<DecisionDto> updateDecision(String decisionId, DecisionDto request, String userId, String ifMatch) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - decision was modified"));
                    }
                    if (request.getTitle() != null) entity.setTitle(request.getTitle());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getPriority() != null) entity.setPriority(request.getPriority());
                    if (request.getCategory() != null) entity.setCategory(request.getCategory());
                    if (request.getOwnerId() != null) entity.setOwnerId(request.getOwnerId());
                    if (request.getPartId() != null) entity.setPartId(request.getPartId());
                    if (request.getPhaseId() != null) entity.setPhaseId(request.getPhaseId());
                    if (request.getOptionsJson() != null) entity.setOptionsJson(request.getOptionsJson());
                    if (request.getDueDate() != null) entity.setDueDate(request.getDueDate());
                    if (request.getSlaHours() != null) entity.setSlaHours(request.getSlaHours());

                    entity.setEtag(UUID.randomUUID().toString());
                    entity.setVersion(entity.getVersion() + 1);
                    entity.setUpdatedBy(userId);

                    return decisionRepository.save(entity);
                })
                .map(DecisionDto::from);
    }

    @Transactional
    public Mono<DecisionDto> transitionDecision(String decisionId, String targetStatus, String userId, String ifMatch) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - decision was modified"));
                    }
                    List<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(entity.getStatus(), List.of());
                    if (!allowed.contains(targetStatus)) {
                        return Mono.error(CustomException.badRequest(
                                "Cannot transition from " + entity.getStatus() + " to " + targetStatus));
                    }

                    String fromStatus = entity.getStatus();
                    entity.setStatus(targetStatus);
                    entity.setEtag(UUID.randomUUID().toString());
                    entity.setVersion(entity.getVersion() + 1);
                    entity.setUpdatedBy(userId);

                    return decisionRepository.save(entity)
                            .flatMap(saved -> auditService.logAudit("DECISION", saved.getId(),
                                            saved.getProjectId(), "STATUS_CHANGED", fromStatus, targetStatus, userId, null)
                                    .thenReturn(saved));
                })
                .map(saved -> {
                    List<String> transitions = ALLOWED_TRANSITIONS.getOrDefault(saved.getStatus(), List.of());
                    return DecisionDto.fromWithTransitions(saved, transitions);
                });
    }

    @Transactional
    public Mono<DecisionDto> approveDecision(String decisionId, String selectedOption, String rationale,
                                              String userId, String ifMatch) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - decision was modified"));
                    }
                    if (!"UNDER_REVIEW".equals(entity.getStatus())) {
                        return Mono.error(CustomException.badRequest("Can only approve decisions in UNDER_REVIEW status"));
                    }
                    if (selectedOption == null || selectedOption.isBlank()) {
                        return Mono.error(CustomException.badRequest("selectedOption is required for approval"));
                    }
                    if (rationale == null || rationale.isBlank()) {
                        return Mono.error(CustomException.badRequest("rationale is required for approval"));
                    }

                    String fromStatus = entity.getStatus();
                    entity.setStatus("APPROVED");
                    entity.setSelectedOption(selectedOption);
                    entity.setRationale(rationale);
                    entity.setDecidedAt(LocalDateTime.now());
                    entity.setDecidedBy(userId);
                    entity.setEtag(UUID.randomUUID().toString());
                    entity.setVersion(entity.getVersion() + 1);
                    entity.setUpdatedBy(userId);

                    return decisionRepository.save(entity)
                            .flatMap(saved -> auditService.logAudit("DECISION", saved.getId(),
                                            saved.getProjectId(), "APPROVED", fromStatus, "APPROVED", userId, null)
                                    .thenReturn(saved));
                })
                .map(DecisionDto::from);
    }

    @Transactional
    public Mono<DecisionDto> rejectDecision(String decisionId, String rationale, String userId, String ifMatch) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - decision was modified"));
                    }
                    if (!"UNDER_REVIEW".equals(entity.getStatus())) {
                        return Mono.error(CustomException.badRequest("Can only reject decisions in UNDER_REVIEW status"));
                    }

                    String fromStatus = entity.getStatus();
                    entity.setStatus("REJECTED");
                    entity.setRationale(rationale);
                    entity.setDecidedAt(LocalDateTime.now());
                    entity.setDecidedBy(userId);
                    entity.setEtag(UUID.randomUUID().toString());
                    entity.setVersion(entity.getVersion() + 1);
                    entity.setUpdatedBy(userId);

                    return decisionRepository.save(entity)
                            .flatMap(saved -> auditService.logAudit("DECISION", saved.getId(),
                                            saved.getProjectId(), "REJECTED", fromStatus, "REJECTED", userId, null)
                                    .thenReturn(saved));
                })
                .map(DecisionDto::from);
    }

    @Transactional
    public Mono<DecisionDto> deferDecision(String decisionId, String rationale, String userId, String ifMatch) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - decision was modified"));
                    }
                    if (!"UNDER_REVIEW".equals(entity.getStatus())) {
                        return Mono.error(CustomException.badRequest("Can only defer decisions in UNDER_REVIEW status"));
                    }

                    String fromStatus = entity.getStatus();
                    entity.setStatus("DEFERRED");
                    entity.setRationale(rationale);
                    entity.setEtag(UUID.randomUUID().toString());
                    entity.setVersion(entity.getVersion() + 1);
                    entity.setUpdatedBy(userId);

                    return decisionRepository.save(entity)
                            .flatMap(saved -> auditService.logAudit("DECISION", saved.getId(),
                                            saved.getProjectId(), "DEFERRED", fromStatus, "DEFERRED", userId, null)
                                    .thenReturn(saved));
                })
                .map(DecisionDto::from);
    }

    @Transactional
    public Mono<Void> deleteDecision(String decisionId, String userId) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (!"PROPOSED".equals(entity.getStatus())) {
                        return Mono.error(CustomException.badRequest("Can only delete decisions in PROPOSED status"));
                    }
                    return decisionRepository.deleteById(decisionId);
                });
    }
}
