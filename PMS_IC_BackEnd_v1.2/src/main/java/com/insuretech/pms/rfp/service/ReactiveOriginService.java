package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.OriginPolicyDto;
import com.insuretech.pms.rfp.dto.OriginSummaryDto;
import com.insuretech.pms.rfp.dto.SetOriginRequest;
import com.insuretech.pms.rfp.reactive.entity.R2dbcOriginPolicy;
import com.insuretech.pms.rfp.reactive.repository.ReactiveOriginPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveOriginService {

    private final ReactiveOriginPolicyRepository policyRepository;
    private final DatabaseClient databaseClient;

    // Origin policy presets per design spec section 5.4
    private static final Map<String, OriginPreset> ORIGIN_PRESETS = Map.of(
            "EXTERNAL_RFP", new OriginPreset(true, "FULL", true, true, "STRICT"),
            "INTERNAL_INITIATIVE", new OriginPreset(false, "PARTIAL", false, false, "RELAXED"),
            "MODERNIZATION", new OriginPreset(true, "FULL", true, true, "STRICT"),
            "MIXED", new OriginPreset(false, "FULL", true, true, "STRICT")
    );

    @Transactional
    public Mono<OriginPolicyDto> setOrigin(String projectId, SetOriginRequest request, String userId) {
        // Dev 프로필에서 JWT 없이 호출 시 userId가 null → "dev-user"로 대체
        String safeActor = (userId != null && !userId.isBlank()) ? userId : "dev-user";
        return policyRepository.existsByProjectId(projectId)
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(CustomException.conflict(
                                "Origin already set for project: " + projectId +
                                ". Use PUT to change (requires approval)."));
                    }
                    OriginPreset preset = ORIGIN_PRESETS.getOrDefault(
                            request.getOriginType(),
                            ORIGIN_PRESETS.get("EXTERNAL_RFP"));

                    R2dbcOriginPolicy policy = R2dbcOriginPolicy.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .originType(request.getOriginType())
                            .requireSourceRfpId(preset.requireSourceRfpId)
                            .evidenceLevel(preset.evidenceLevel)
                            .changeApprovalRequired(preset.changeApprovalRequired)
                            .autoAnalysisEnabled(preset.autoAnalysisEnabled)
                            .lineageEnforcement(preset.lineageEnforcement)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .createdBy(safeActor)
                            .build();

                    return policyRepository.save(policy);
                })
                .map(OriginPolicyDto::from)
                .doOnSuccess(dto -> log.info("Origin set: project={} type={}", projectId, dto.getOriginType()));
    }

    public Mono<OriginPolicyDto> getOrigin(String projectId) {
        return policyRepository.findByProjectId(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound(
                        "Origin not set for project: " + projectId)))
                .map(OriginPolicyDto::from);
    }

    @Transactional
    public Mono<OriginPolicyDto> updateOrigin(String projectId, SetOriginRequest request, String userId) {
        String safeActor = (userId != null && !userId.isBlank()) ? userId : "dev-user";
        return policyRepository.findByProjectId(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound(
                        "Origin not set for project: " + projectId)))
                .flatMap(existing -> {
                    OriginPreset preset = ORIGIN_PRESETS.getOrDefault(
                            request.getOriginType(),
                            ORIGIN_PRESETS.get("EXTERNAL_RFP"));

                    existing.setOriginType(request.getOriginType());
                    existing.setRequireSourceRfpId(preset.requireSourceRfpId);
                    existing.setEvidenceLevel(preset.evidenceLevel);
                    existing.setChangeApprovalRequired(preset.changeApprovalRequired);
                    existing.setAutoAnalysisEnabled(preset.autoAnalysisEnabled);
                    existing.setLineageEnforcement(preset.lineageEnforcement);
                    existing.setUpdatedAt(LocalDateTime.now());
                    existing.setUpdatedBy(safeActor);

                    return policyRepository.save(existing);
                })
                .map(OriginPolicyDto::from)
                .doOnSuccess(dto -> log.info("Origin updated: project={} type={}", projectId, dto.getOriginType()));
    }

    public Mono<OriginSummaryDto> getOriginSummary(String projectId) {
        return policyRepository.findByProjectId(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound(
                        "Origin not set for project: " + projectId)))
                .flatMap(policy -> Mono.zip(
                        countActiveRfps(projectId),
                        countTotalRequirements(projectId),
                        countConfirmedRequirements(projectId)
                ).map(tuple -> OriginSummaryDto.builder()
                        .originType(policy.getOriginType())
                        .originTypeLabel(OriginPolicyDto.from(policy).getOriginTypeLabel())
                        .policy(OriginPolicyDto.from(policy).getPolicy())
                        .kpi(OriginSummaryDto.KpiDto.builder()
                                .activeRfpCount(tuple.getT1().intValue())
                                .totalRequirements(tuple.getT2().intValue())
                                .confirmedRequirements(tuple.getT3().intValue())
                                .epicLinkRate(0.0)
                                .lastChangeImpact(OriginSummaryDto.ChangeImpactDto.builder()
                                        .level("NONE")
                                        .impactedEpics(0)
                                        .impactedTasks(0)
                                        .build())
                                .build())
                        .asOf(LocalDateTime.now())
                        .build()));
    }

    private Mono<Long> countActiveRfps(String projectId) {
        return databaseClient.sql("SELECT COUNT(*) as cnt FROM project.rfps WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> ((Number) row.get("cnt")).longValue())
                .defaultIfEmpty(0L);
    }

    private Mono<Long> countTotalRequirements(String projectId) {
        return databaseClient.sql("SELECT COUNT(*) as cnt FROM project.requirements WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> ((Number) row.get("cnt")).longValue())
                .defaultIfEmpty(0L);
    }

    private Mono<Long> countConfirmedRequirements(String projectId) {
        return databaseClient.sql(
                "SELECT COUNT(*) as cnt FROM project.requirements WHERE project_id = :projectId AND status IN ('APPROVED','VERIFIED')")
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> ((Number) row.get("cnt")).longValue())
                .defaultIfEmpty(0L);
    }

    private record OriginPreset(
            boolean requireSourceRfpId,
            String evidenceLevel,
            boolean changeApprovalRequired,
            boolean autoAnalysisEnabled,
            String lineageEnforcement
    ) {}
}
