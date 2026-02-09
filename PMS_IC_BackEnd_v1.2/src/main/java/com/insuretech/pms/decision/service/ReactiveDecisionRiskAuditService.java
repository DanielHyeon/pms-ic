package com.insuretech.pms.decision.service;

import com.insuretech.pms.decision.reactive.entity.R2dbcDecisionRiskAuditTrail;
import com.insuretech.pms.decision.reactive.repository.ReactiveDecisionRiskAuditRepository;
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
public class ReactiveDecisionRiskAuditService {

    private final ReactiveDecisionRiskAuditRepository auditRepository;

    public Mono<Void> logAudit(String entityType, String entityId, String projectId,
                               String action, String fromStatus, String toStatus,
                               String actorId, String detailsJson) {
        R2dbcDecisionRiskAuditTrail trail = R2dbcDecisionRiskAuditTrail.builder()
                .id(UUID.randomUUID().toString())
                .entityType(entityType)
                .entityId(entityId)
                .projectId(projectId)
                .action(action)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .actorId(actorId)
                .detailsJson(detailsJson)
                .createdAt(LocalDateTime.now())
                .build();

        return auditRepository.save(trail)
                .doOnSuccess(saved -> log.debug("Audit trail: {} {} {} -> {}",
                        entityType, action, fromStatus, toStatus))
                .then();
    }

    public Flux<R2dbcDecisionRiskAuditTrail> getAuditTrail(String entityType, String entityId) {
        return auditRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }
}
