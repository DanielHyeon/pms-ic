package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.governance.authority.dto.GovernanceCheckRunDto;
import com.insuretech.pms.governance.authority.dto.GovernanceFindingDto;
import com.insuretech.pms.governance.authority.dto.RecommendedActionDto;
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
                        checkDuplicateCapabilities(projectId, runId).doOnNext(allFindings::add).then(),
                        // Check 5: Self-approval (위임자가 자신을 승인자로 지정한 위임)
                        checkSelfApprovals(projectId, runId).doOnNext(allFindings::add).then()
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
                                // 각 finding에 권장 조치 생성
                                List<GovernanceFindingDto> findingDtos = allFindings.stream()
                                        .map(f -> {
                                            GovernanceFindingDto fd = GovernanceFindingDto.from(f);
                                            fd.setRecommendedActions(generateRecommendedActions(f));
                                            return fd;
                                        })
                                        .toList();
                                dto.setFindings(findingDtos);
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
                        .message("SoD 위반: " + rule.getDescription())
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
                        .message("7일 이내 만료 예정 위임 (종료일: " + row.get("end_at") + ")")
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
                        .message("만료되었으나 아직 활성 상태인 위임 (종료일: " + row.get("end_at") + ")")
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
                        .message("여러 경로에서 동일 권한이 부여됨")
                        .detailsJson("{\"capabilityId\":\"" + row.get("capability_id", String.class) + "\",\"count\":" + row.get("cnt", Long.class) + "}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build())
                .all();
    }

    /**
     * Check 5: 자기승인 검출 — delegator_id == approver_id인 위임
     */
    private Flux<R2dbcGovernanceFinding> checkSelfApprovals(String projectId, String runId) {
        String sql = """
                SELECT * FROM governance.delegations
                WHERE project_id = :projectId
                  AND delegator_id = approver_id
                  AND status IN ('ACTIVE', 'PENDING')
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .map(row -> R2dbcGovernanceFinding.builder()
                        .id(UUID.randomUUID().toString())
                        .runId(runId)
                        .projectId(projectId)
                        .findingType("SELF_APPROVAL")
                        .severity("HIGH")
                        .userId(row.get("delegator_id", String.class))
                        .delegationId(row.get("id", String.class))
                        .message("위임자가 자신을 승인자로 지정한 위임이 존재합니다")
                        .detailsJson("{\"delegateeId\":\"" + row.get("delegatee_id", String.class)
                                + "\",\"capabilityId\":\"" + row.get("capability_id", String.class) + "\"}")
                        .createdAt(OffsetDateTime.now())
                        .isNew(true)
                        .build())
                .all();
    }

    /**
     * finding 유형별 권장 조치 생성.
     */
    private List<RecommendedActionDto> generateRecommendedActions(R2dbcGovernanceFinding finding) {
        List<RecommendedActionDto> actions = new ArrayList<>();

        switch (finding.getFindingType()) {
            case "SOD_VIOLATION" -> actions.add(RecommendedActionDto.builder()
                    .actionType("REASSIGN_ROLE")
                    .targetId(finding.getUserId())
                    .description("SoD 충돌 권한 중 하나를 제거하거나 다른 사용자에게 재할당하세요")
                    .priority("HIGH")
                    .build());

            case "EXPIRED" -> actions.add(RecommendedActionDto.builder()
                    .actionType("REVOKE_DELEGATION")
                    .targetId(finding.getDelegationId())
                    .description("만료된 위임을 즉시 폐기하세요")
                    .priority("HIGH")
                    .build());

            case "EXPIRING_SOON" -> actions.add(RecommendedActionDto.builder()
                    .actionType("EXTEND_OR_REVOKE")
                    .targetId(finding.getDelegationId())
                    .description("만료 임박 위임을 연장하거나 폐기 여부를 결정하세요")
                    .priority("MEDIUM")
                    .build());

            case "DUPLICATE_CAP" -> actions.add(RecommendedActionDto.builder()
                    .actionType("REMOVE_DUPLICATE")
                    .targetId(finding.getUserId())
                    .description("중복 부여된 권한의 불필요한 경로를 정리하세요")
                    .priority("LOW")
                    .build());

            case "SELF_APPROVAL" -> actions.add(RecommendedActionDto.builder()
                    .actionType("CHANGE_APPROVER")
                    .targetId(finding.getDelegationId())
                    .description("자기승인 위임의 승인자를 다른 사람으로 변경하세요")
                    .priority("HIGH")
                    .build());

            default -> { /* 알 수 없는 유형은 조치 없음 */ }
        }

        return actions;
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
