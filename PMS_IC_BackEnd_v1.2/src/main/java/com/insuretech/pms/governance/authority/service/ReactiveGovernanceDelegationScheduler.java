package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceFinding;
import com.insuretech.pms.governance.authority.repository.ReactiveDelegationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 위임 만료 자동 처리 스케줄러.
 * 매일 자정(KST)에 실행되어:
 * 1) 만료된 한시적 위임을 EXPIRED 상태로 전환 (하위 위임 cascade 포함)
 * 2) 7일 이내 만료 예정 위임에 대한 경고 finding 생성 (중복 방지)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveGovernanceDelegationScheduler {

    private final ReactiveDelegationRepository delegationRepository;
    private final DatabaseClient databaseClient;

    /**
     * 매일 자정(KST) 실행.
     * 만료된 위임 자동 폐기 + 만료 임박 경고 생성.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void processExpiredDelegations() {
        log.info("[Scheduler] 위임 만료 처리 시작");

        expireTemporaryDelegations()
                .then(generateExpiringWarnings())
                .doOnSuccess(v -> log.info("[Scheduler] 위임 만료 처리 완료"))
                .doOnError(e -> log.error("[Scheduler] 위임 만료 처리 중 오류 발생", e))
                .subscribe();
    }

    /**
     * ACTIVE + TEMPORARY + end_at < today → EXPIRED 처리.
     * 하위 위임도 연쇄 만료 처리.
     */
    @Transactional
    protected Mono<Void> expireTemporaryDelegations() {
        // 만료된 위임을 직접 UPDATE (하위 위임 포함)
        String sql = """
                UPDATE governance.delegations
                SET status = 'EXPIRED',
                    revoked_at = NOW(),
                    revoked_by = 'SYSTEM_SCHEDULER',
                    revoke_reason = '한시적 위임 기간 만료로 자동 폐기'
                WHERE status = 'ACTIVE'
                  AND duration_type = 'TEMPORARY'
                  AND end_at < CURRENT_DATE
                """;

        String cascadeSql = """
                UPDATE governance.delegations child
                SET status = 'EXPIRED',
                    revoked_at = NOW(),
                    revoked_by = 'SYSTEM_SCHEDULER',
                    revoke_reason = '상위 위임 만료로 인한 자동 폐기'
                WHERE child.status IN ('ACTIVE', 'PENDING')
                  AND child.parent_delegation_id IN (
                    SELECT id FROM governance.delegations
                    WHERE status = 'EXPIRED'
                      AND revoked_by = 'SYSTEM_SCHEDULER'
                      AND revoked_at::date = CURRENT_DATE
                  )
                """;

        AtomicInteger expiredCount = new AtomicInteger(0);

        return databaseClient.sql(sql)
                .fetch().rowsUpdated()
                .doOnNext(count -> {
                    expiredCount.set(count.intValue());
                    log.info("[Scheduler] 만료 처리된 위임: {}건", count);
                })
                .then(databaseClient.sql(cascadeSql)
                        .fetch().rowsUpdated()
                        .doOnNext(count -> log.info("[Scheduler] 연쇄 만료 처리된 하위 위임: {}건", count)))
                .then();
    }

    /**
     * 7일 이내 만료 예정 위임에 대한 경고 finding 자동 생성.
     * 오늘 이미 생성된 경고는 중복 생성하지 않음.
     */
    @Transactional
    protected Mono<Void> generateExpiringWarnings() {
        String sql = """
                SELECT d.id, d.project_id, d.delegatee_id, d.end_at
                FROM governance.delegations d
                WHERE d.status = 'ACTIVE'
                  AND d.duration_type = 'TEMPORARY'
                  AND d.end_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                  AND NOT EXISTS (
                    SELECT 1 FROM governance.governance_findings gf
                    WHERE gf.delegation_id = d.id
                      AND gf.finding_type = 'EXPIRING_SOON'
                      AND gf.created_at::date = CURRENT_DATE
                  )
                """;

        String insertSql = """
                INSERT INTO governance.governance_findings
                  (id, run_id, project_id, finding_type, severity, user_id, delegation_id, message, details_json, created_at)
                VALUES
                  (:id, :runId, :projectId, :findingType, :severity, :userId, :delegationId, :message, :detailsJson::jsonb, :createdAt)
                """;

        String runId = "SCHEDULER-" + java.time.LocalDate.now();

        return databaseClient.sql(sql)
                .map(row -> R2dbcGovernanceFinding.builder()
                        .id(UUID.randomUUID().toString())
                        .runId(runId)
                        .projectId(row.get("project_id", String.class))
                        .findingType("EXPIRING_SOON")
                        .severity("MEDIUM")
                        .userId(row.get("delegatee_id", String.class))
                        .delegationId(row.get("id", String.class))
                        .message("7일 이내 만료 예정 위임 (종료일: " + row.get("end_at") + ")")
                        .detailsJson("{\"endAt\":\"" + row.get("end_at") + "\",\"source\":\"scheduler\"}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build())
                .all()
                .flatMap(f -> databaseClient.sql(insertSql)
                        .bind("id", f.getId())
                        .bind("runId", f.getRunId())
                        .bind("projectId", f.getProjectId())
                        .bind("findingType", f.getFindingType())
                        .bind("severity", f.getSeverity())
                        .bind("userId", f.getUserId() != null ? f.getUserId() : "")
                        .bind("delegationId", f.getDelegationId() != null ? f.getDelegationId() : "")
                        .bind("message", f.getMessage())
                        .bind("detailsJson", f.getDetailsJson())
                        .bind("createdAt", f.getCreatedAt())
                        .then())
                .then()
                .doOnSuccess(v -> log.info("[Scheduler] 만료 임박 경고 생성 완료"));
    }
}
