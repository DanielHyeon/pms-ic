package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.governance.authority.dto.GovernanceCheckRunDto;
import com.insuretech.pms.governance.authority.dto.GovernanceFindingDto;
import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceCheckRun;
import com.insuretech.pms.governance.authority.entity.R2dbcGovernanceFinding;
import com.insuretech.pms.governance.authority.entity.R2dbcSodRule;
import com.insuretech.pms.governance.authority.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveGovernanceService {

    private final ReactiveSodRuleRepository sodRuleRepository;
    private final ReactiveGovernanceCheckRunRepository checkRunRepository;
    private final ReactiveGovernanceFindingRepository findingRepository;
    private final DatabaseClient databaseClient;

    public Flux<GovernanceCheckRunDto> listCheckRuns(String projectId) {
        return checkRunRepository.findByProjectIdOrderByCheckedAtDesc(projectId)
                .map(GovernanceCheckRunDto::from);
    }

    public Flux<GovernanceFindingDto> listFindings(String projectId) {
        return findingRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .map(GovernanceFindingDto::from);
    }

    @Transactional
    public Mono<GovernanceCheckRunDto> runGovernanceCheck(String projectId, String actorUserId) {
        String runId = UUID.randomUUID().toString();
        List<R2dbcGovernanceFinding> allFindings = Collections.synchronizedList(new ArrayList<>());

        return Mono.when(
                        // Check 1: SoD violations
                        checkSodViolations(projectId, runId).doOnNext(allFindings::add).then(),
                        // Check 2: Expiring delegations (within 7 days)
                        checkExpiringDelegations(projectId, runId).doOnNext(allFindings::add).then(),
                        // Check 3: Already expired delegations
                        checkExpiredDelegations(projectId, runId).doOnNext(allFindings::add).then(),
                        // Check 4: Duplicate capabilities (same cap from multiple sources)
                        checkDuplicateCapabilities(projectId, runId).doOnNext(allFindings::add).then()
                )
                .then(Mono.defer(() -> {
                    Map<String, Long> summary = new LinkedHashMap<>();
                    allFindings.forEach(f -> summary.merge(f.getSeverity(), 1L, Long::sum));
                    String summaryJson = buildSummaryJson(summary, allFindings.size());

                    R2dbcGovernanceCheckRun checkRun = R2dbcGovernanceCheckRun.builder()
                            .id(runId)
                            .projectId(projectId)
                            .checkedAt(OffsetDateTime.now())
                            .checkedBy(actorUserId)
                            .summaryJson(summaryJson)
                            .isNew(true)
                            .build();

                    return saveCheckRun(checkRun)
                            .then(Flux.fromIterable(allFindings)
                                    .flatMap(this::saveFinding)
                                    .then())
                            .then(Mono.just(checkRun))
                            .map(run -> {
                                GovernanceCheckRunDto dto = GovernanceCheckRunDto.from(run);
                                dto.setFindings(allFindings.stream().map(GovernanceFindingDto::from).toList());
                                return dto;
                            });
                }))
                .doOnSuccess(dto -> log.info("Governance check for project {} completed: {} findings",
                        projectId, dto.getFindings() != null ? dto.getFindings().size() : 0));
    }

    // --- Check implementations ---

    private Flux<R2dbcGovernanceFinding> checkSodViolations(String projectId, String runId) {
        return sodRuleRepository.findAll()
                .collectList()
                .flatMapMany(rules -> {
                    if (rules.isEmpty()) return Flux.empty();

                    // For each SoD rule, find users who have both capabilities
                    return Flux.fromIterable(rules)
                            .flatMap(rule -> checkSodRule(projectId, runId, rule));
                });
    }

    private Flux<R2dbcGovernanceFinding> checkSodRule(String projectId, String runId, R2dbcSodRule rule) {
        String sql = """
                SELECT DISTINCT a.user_id
                FROM governance.v_effective_caps a
                JOIN governance.v_effective_caps b
                  ON a.project_id = b.project_id AND a.user_id = b.user_id
                WHERE a.project_id = :projectId
                  AND a.capability_id = :capA
                  AND b.capability_id = :capB
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("capA", rule.getCapabilityAId())
                .bind("capB", rule.getCapabilityBId())
                .map(row -> row.get("user_id", String.class))
                .all()
                .map(userId -> R2dbcGovernanceFinding.builder()
                        .id(UUID.randomUUID().toString())
                        .runId(runId)
                        .projectId(projectId)
                        .findingType("SOD_VIOLATION")
                        .severity(rule.getSeverity())
                        .userId(userId)
                        .message("SoD violation: " + rule.getDescription())
                        .detailsJson("{\"ruleId\":\"" + rule.getId() + "\",\"capA\":\"" + rule.getCapabilityAId() + "\",\"capB\":\"" + rule.getCapabilityBId() + "\"}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build());
    }

    private Flux<R2dbcGovernanceFinding> checkExpiringDelegations(String projectId, String runId) {
        String sql = """
                SELECT * FROM governance.delegations
                WHERE project_id = :projectId
                  AND status = 'ACTIVE'
                  AND duration_type = 'TEMPORARY'
                  AND end_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .map(row -> R2dbcGovernanceFinding.builder()
                        .id(UUID.randomUUID().toString())
                        .runId(runId)
                        .projectId(projectId)
                        .findingType("EXPIRING_SOON")
                        .severity("MEDIUM")
                        .userId(row.get("delegatee_id", String.class))
                        .delegationId(row.get("id", String.class))
                        .message("Delegation expiring within 7 days (end_at: " + row.get("end_at") + ")")
                        .detailsJson("{\"endAt\":\"" + row.get("end_at") + "\"}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build())
                .all();
    }

    private Flux<R2dbcGovernanceFinding> checkExpiredDelegations(String projectId, String runId) {
        String sql = """
                SELECT * FROM governance.delegations
                WHERE project_id = :projectId
                  AND status = 'ACTIVE'
                  AND duration_type = 'TEMPORARY'
                  AND end_at < CURRENT_DATE
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .map(row -> R2dbcGovernanceFinding.builder()
                        .id(UUID.randomUUID().toString())
                        .runId(runId)
                        .projectId(projectId)
                        .findingType("EXPIRED")
                        .severity("HIGH")
                        .userId(row.get("delegatee_id", String.class))
                        .delegationId(row.get("id", String.class))
                        .message("Delegation has expired but is still active (end_at: " + row.get("end_at") + ")")
                        .detailsJson("{\"endAt\":\"" + row.get("end_at") + "\"}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build())
                .all();
    }

    private Flux<R2dbcGovernanceFinding> checkDuplicateCapabilities(String projectId, String runId) {
        String sql = """
                SELECT user_id, capability_id, count(*) as cnt
                FROM governance.v_effective_caps
                WHERE project_id = :projectId
                GROUP BY user_id, capability_id
                HAVING count(*) > 1
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .map(row -> R2dbcGovernanceFinding.builder()
                        .id(UUID.randomUUID().toString())
                        .runId(runId)
                        .projectId(projectId)
                        .findingType("DUPLICATE_CAP")
                        .severity("INFO")
                        .userId(row.get("user_id", String.class))
                        .message("User has capability from multiple sources")
                        .detailsJson("{\"capabilityId\":\"" + row.get("capability_id", String.class) + "\",\"count\":" + row.get("cnt", Long.class) + "}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build())
                .all();
    }

    private Mono<Void> saveCheckRun(R2dbcGovernanceCheckRun run) {
        return databaseClient.sql("""
                INSERT INTO governance.governance_check_runs (id, project_id, checked_at, checked_by, summary_json)
                VALUES (:id, :projectId, :checkedAt, :checkedBy, :summaryJson::jsonb)
                """)
                .bind("id", run.getId())
                .bind("projectId", run.getProjectId())
                .bind("checkedAt", run.getCheckedAt())
                .bind("checkedBy", run.getCheckedBy())
                .bind("summaryJson", run.getSummaryJson())
                .then();
    }

    private Mono<Void> saveFinding(R2dbcGovernanceFinding f) {
        return databaseClient.sql("""
                INSERT INTO governance.governance_findings
                  (id, run_id, project_id, finding_type, severity, user_id, delegation_id, message, details_json, created_at)
                VALUES
                  (:id, :runId, :projectId, :findingType, :severity, :userId, :delegationId, :message, :detailsJson::jsonb, :createdAt)
                """)
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
                .then();
    }

    private String buildSummaryJson(Map<String, Long> severityCounts, int total) {
        StringBuilder sb = new StringBuilder("{\"total\":");
        sb.append(total);
        for (Map.Entry<String, Long> entry : severityCounts.entrySet()) {
            sb.append(",\"").append(entry.getKey().toLowerCase()).append("\":").append(entry.getValue());
        }
        sb.append("}");
        return sb.toString();
    }
}
