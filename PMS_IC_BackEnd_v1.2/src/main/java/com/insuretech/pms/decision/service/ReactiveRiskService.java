package com.insuretech.pms.decision.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.decision.dto.*;
import com.insuretech.pms.decision.reactive.entity.R2dbcRisk;
import com.insuretech.pms.decision.reactive.entity.R2dbcRiskAssessment;
import com.insuretech.pms.decision.reactive.repository.ReactiveRiskAssessmentRepository;
import com.insuretech.pms.decision.reactive.repository.ReactiveRiskRepository;
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
public class ReactiveRiskService {

    private final ReactiveRiskRepository riskRepository;
    private final ReactiveRiskAssessmentRepository assessmentRepository;
    private final ReactiveDecisionRiskAuditService auditService;

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "IDENTIFIED", List.of("ASSESSED", "ACCEPTED"),
            "ASSESSED", List.of("MITIGATING", "ACCEPTED"),
            "MITIGATING", List.of("RESOLVED", "ACCEPTED"),
            "RESOLVED", List.of(),
            "ACCEPTED", List.of("MITIGATING")
    );

    public Flux<RiskSummaryDto> listRisks(String projectId) {
        return riskRepository.findByProjectIdOrderByScoreDesc(projectId)
                .map(RiskSummaryDto::from);
    }

    public Flux<RiskSummaryDto> listRisksByStatus(String projectId, String status) {
        return riskRepository.findByProjectIdAndStatusOrderByScoreDesc(projectId, status)
                .map(RiskSummaryDto::from);
    }

    public Mono<RiskDto> getRisk(String riskId) {
        return riskRepository.findById(riskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Risk not found: " + riskId)))
                .map(entity -> {
                    List<String> transitions = ALLOWED_TRANSITIONS.getOrDefault(entity.getStatus(), List.of());
                    return RiskDto.fromWithTransitions(entity, transitions);
                });
    }

    @Transactional
    public Mono<RiskDto> createRisk(String projectId, RiskDto request, String userId) {
        R2dbcRisk entity = R2dbcRisk.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .riskCode(request.getRiskCode())
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .impact(request.getImpact() != null ? request.getImpact() : 3)
                .probability(request.getProbability() != null ? request.getProbability() : 3)
                .ownerId(request.getOwnerId() != null ? request.getOwnerId() : userId)
                .partId(request.getPartId())
                .phaseId(request.getPhaseId())
                .mitigationPlan(request.getMitigationPlan())
                .contingencyPlan(request.getContingencyPlan())
                .dueDate(request.getDueDate())
                .escalatedFromId(request.getEscalatedFromId())
                .escalatedFromType(request.getEscalatedFromType())
                .etag(UUID.randomUUID().toString())
                .build();
        entity.setCreatedBy(userId);

        return riskRepository.save(entity)
                .flatMap(saved -> auditService.logAudit("RISK", saved.getId(), projectId,
                                "CREATED", null, "IDENTIFIED", userId, null)
                        .thenReturn(saved))
                .map(RiskDto::from)
                .doOnSuccess(dto -> log.info("Created risk: {} in project {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<RiskDto> updateRisk(String riskId, RiskDto request, String userId, String ifMatch) {
        return riskRepository.findById(riskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Risk not found: " + riskId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - risk was modified"));
                    }
                    if (request.getTitle() != null) entity.setTitle(request.getTitle());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getCategory() != null) entity.setCategory(request.getCategory());
                    if (request.getImpact() != null) entity.setImpact(request.getImpact());
                    if (request.getProbability() != null) entity.setProbability(request.getProbability());
                    if (request.getOwnerId() != null) entity.setOwnerId(request.getOwnerId());
                    if (request.getPartId() != null) entity.setPartId(request.getPartId());
                    if (request.getPhaseId() != null) entity.setPhaseId(request.getPhaseId());
                    if (request.getMitigationPlan() != null) entity.setMitigationPlan(request.getMitigationPlan());
                    if (request.getContingencyPlan() != null) entity.setContingencyPlan(request.getContingencyPlan());
                    if (request.getDueDate() != null) entity.setDueDate(request.getDueDate());

                    entity.setEtag(UUID.randomUUID().toString());
                    entity.setVersion(entity.getVersion() + 1);
                    entity.setUpdatedBy(userId);

                    return riskRepository.save(entity);
                })
                .map(RiskDto::from);
    }

    @Transactional
    public Mono<RiskDto> transitionRisk(String riskId, String targetStatus, String userId, String ifMatch) {
        return riskRepository.findById(riskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Risk not found: " + riskId)))
                .flatMap(entity -> {
                    if (ifMatch != null && !ifMatch.equals(entity.getEtag())) {
                        return Mono.error(CustomException.conflict("ETag mismatch - risk was modified"));
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

                    return riskRepository.save(entity)
                            .flatMap(saved -> auditService.logAudit("RISK", saved.getId(),
                                            saved.getProjectId(), "STATUS_CHANGED", fromStatus, targetStatus, userId, null)
                                    .thenReturn(saved));
                })
                .map(saved -> {
                    List<String> transitions = ALLOWED_TRANSITIONS.getOrDefault(saved.getStatus(), List.of());
                    return RiskDto.fromWithTransitions(saved, transitions);
                });
    }

    @Transactional
    public Mono<RiskAssessmentDto> assessRisk(String riskId, RiskAssessmentDto request, String userId) {
        return riskRepository.findById(riskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Risk not found: " + riskId)))
                .flatMap(risk -> {
                    R2dbcRiskAssessment assessment = R2dbcRiskAssessment.builder()
                            .id(UUID.randomUUID().toString())
                            .riskId(riskId)
                            .assessedBy(userId)
                            .impact(request.getImpact())
                            .probability(request.getProbability())
                            .justification(request.getJustification())
                            .aiAssisted(request.getAiAssisted() != null ? request.getAiAssisted() : false)
                            .aiConfidence(request.getAiConfidence())
                            .assessmentSource(request.getAssessmentSource() != null ? request.getAssessmentSource() : "MANUAL")
                            .createdAt(LocalDateTime.now())
                            .build();

                    // Update risk's impact/probability from latest assessment
                    risk.setImpact(request.getImpact());
                    risk.setProbability(request.getProbability());
                    risk.setEtag(UUID.randomUUID().toString());
                    risk.setVersion(risk.getVersion() + 1);
                    risk.setUpdatedBy(userId);

                    // Auto-transition to ASSESSED if currently IDENTIFIED
                    String fromStatus = risk.getStatus();
                    if ("IDENTIFIED".equals(fromStatus)) {
                        risk.setStatus("ASSESSED");
                    }

                    return riskRepository.save(risk)
                            .then(assessmentRepository.save(assessment))
                            .flatMap(saved -> auditService.logAudit("RISK", riskId, risk.getProjectId(),
                                            "ASSESSED", fromStatus, risk.getStatus(), userId, null)
                                    .thenReturn(saved));
                })
                .map(RiskAssessmentDto::from);
    }

    public Flux<RiskAssessmentDto> getAssessmentHistory(String riskId) {
        return assessmentRepository.findByRiskIdOrderByCreatedAtDesc(riskId)
                .map(RiskAssessmentDto::from);
    }

    public Mono<RiskMatrixDto> getRiskMatrix(String projectId) {
        return riskRepository.getRiskMatrix(projectId)
                .map(cell -> RiskMatrixDto.Cell.builder()
                        .impact(cell.getImpact())
                        .probability(cell.getProbability())
                        .count(cell.getCnt())
                        .severity(RiskDto.deriveSeverity(cell.getImpact() * cell.getProbability()))
                        .build())
                .collectList()
                .map(cells -> {
                    long total = cells.stream().mapToLong(RiskMatrixDto.Cell::getCount).sum();
                    return RiskMatrixDto.builder().cells(cells).totalRisks(total).build();
                });
    }

    @Transactional
    public Mono<Void> deleteRisk(String riskId, String userId) {
        return riskRepository.findById(riskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Risk not found: " + riskId)))
                .flatMap(entity -> {
                    if (!"IDENTIFIED".equals(entity.getStatus())) {
                        return Mono.error(CustomException.badRequest("Can only delete risks in IDENTIFIED status"));
                    }
                    return riskRepository.deleteById(riskId);
                });
    }
}
