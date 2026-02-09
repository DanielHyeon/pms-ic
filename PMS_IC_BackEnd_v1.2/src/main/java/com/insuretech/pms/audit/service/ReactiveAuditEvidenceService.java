package com.insuretech.pms.audit.service;

import com.insuretech.pms.audit.dto.*;
import com.insuretech.pms.audit.reactive.entity.R2dbcEvidenceAuditTrail;
import com.insuretech.pms.audit.reactive.entity.R2dbcEvidencePackage;
import com.insuretech.pms.audit.reactive.repository.ReactiveEvidenceAuditTrailRepository;
import com.insuretech.pms.audit.reactive.repository.ReactiveEvidencePackageRepository;
import com.insuretech.pms.common.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveAuditEvidenceService {

    private final DatabaseClient databaseClient;
    private final ReactiveEvidencePackageRepository packageRepository;
    private final ReactiveEvidenceAuditTrailRepository auditTrailRepository;

    public Mono<AuditEvidenceSummaryDto> getSummary(String projectId) {
        return Mono.zip(
                countDeliverables(projectId),
                countRequirements(projectId),
                countExports(projectId)
        ).map(tuple -> AuditEvidenceSummaryDto.builder()
                .totalEvidence(tuple.getT1().intValue() + tuple.getT2().intValue())
                .deliverableEvidence(tuple.getT1().intValue())
                .requirementEvidence(tuple.getT2().intValue())
                .testResultEvidence(0)
                .approvedEvidence(0)
                .pendingEvidence(0)
                .evidenceCoveragePct(0.0)
                .missingEvidenceCount(0)
                .exportCount(tuple.getT3().intValue())
                .build());
    }

    public Flux<AuditEvidenceItemDto> listEvidence(String projectId) {
        // Aggregate evidence from deliverables
        return databaseClient.sql("""
                SELECT d.id, d.title, d.description, d.status,
                       d.phase_id, d.created_at, d.updated_at,
                       'DELIVERABLE' as evidence_type
                FROM project.deliverables d
                WHERE d.project_id = :projectId
                ORDER BY d.created_at DESC
                """)
                .bind("projectId", projectId)
                .fetch().all()
                .map(row -> AuditEvidenceItemDto.builder()
                        .id((String) row.get("id"))
                        .evidenceType((String) row.get("evidence_type"))
                        .title((String) row.get("title"))
                        .description((String) row.get("description"))
                        .status((String) row.get("status"))
                        .phaseId((String) row.get("phase_id"))
                        .sourceEntity("DELIVERABLE")
                        .sourceEntityId((String) row.get("id"))
                        .createdAt((LocalDateTime) row.get("created_at"))
                        .updatedAt((LocalDateTime) row.get("updated_at"))
                        .build());
    }

    @Transactional
    public Mono<EvidencePackageDto> startExport(ExportRequest request, String userId) {
        R2dbcEvidencePackage pkg = R2dbcEvidencePackage.builder()
                .id(UUID.randomUUID().toString())
                .projectId(request.getProjectId())
                .requestedBy(userId)
                .packageType(request.getPackageType() != null ? request.getPackageType() : "ZIP")
                .totalItems(request.getEvidenceIds() != null ? request.getEvidenceIds().size() : 0)
                .filterSnapshot(request.getFilterSnapshot())
                .createdAt(LocalDateTime.now())
                .build();

        return packageRepository.save(pkg)
                .flatMap(saved -> logAuditTrail(request.getProjectId(), userId,
                        "EXPORT_STARTED", saved.getId()).thenReturn(saved))
                .map(EvidencePackageDto::from)
                .doOnSuccess(dto -> log.info("Export started: package={} project={}", dto.getId(), dto.getProjectId()));
    }

    public Mono<EvidencePackageDto> getExportStatus(String packageId) {
        return packageRepository.findById(packageId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Package not found: " + packageId)))
                .map(EvidencePackageDto::from);
    }

    public Flux<R2dbcEvidenceAuditTrail> getAuditTrail(String projectId) {
        return auditTrailRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    private Mono<Void> logAuditTrail(String projectId, String userId, String eventType, String packageId) {
        R2dbcEvidenceAuditTrail trail = R2dbcEvidenceAuditTrail.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .userId(userId)
                .eventType(eventType)
                .packageId(packageId)
                .createdAt(LocalDateTime.now())
                .build();
        return auditTrailRepository.save(trail).then();
    }

    private Mono<Long> countDeliverables(String projectId) {
        return databaseClient.sql("SELECT COUNT(*) as cnt FROM project.deliverables WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> ((Number) row.get("cnt")).longValue())
                .defaultIfEmpty(0L);
    }

    private Mono<Long> countRequirements(String projectId) {
        return databaseClient.sql("SELECT COUNT(*) as cnt FROM rfp.requirements WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> ((Number) row.get("cnt")).longValue())
                .defaultIfEmpty(0L);
    }

    private Mono<Long> countExports(String projectId) {
        return databaseClient.sql("SELECT COUNT(*) as cnt FROM audit.evidence_packages WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> ((Number) row.get("cnt")).longValue())
                .defaultIfEmpty(0L);
    }
}
