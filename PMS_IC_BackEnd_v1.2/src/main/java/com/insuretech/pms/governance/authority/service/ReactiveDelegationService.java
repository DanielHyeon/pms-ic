package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.governance.authority.dto.*;
import com.insuretech.pms.governance.authority.entity.R2dbcCapability;
import com.insuretech.pms.governance.authority.entity.R2dbcDelegation;
import com.insuretech.pms.governance.authority.repository.ReactiveCapabilityRepository;
import com.insuretech.pms.governance.authority.repository.ReactiveDelegationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDelegationService {

    /** FUNCTION 스코프 위임 최대 기간 (일) */
    private static final long MAX_FUNCTION_SCOPE_DAYS = 90;

    private final ReactiveDelegationRepository delegationRepository;
    private final ReactiveCapabilityRepository capabilityRepository;
    private final ReactiveEffectiveCapService effectiveCapService;
    private final DatabaseClient databaseClient;

    public Flux<DelegationDto> listDelegations(String projectId) {
        return delegationRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .map(DelegationDto::from)
                .collectList()
                .flatMapMany(this::enrichDelegationNames);
    }

    @Transactional
    public Mono<DelegationDto> createDelegation(String projectId, CreateDelegationRequest request, String actorUserId) {
        return capabilityRepository.findById(request.getCapabilityId())
                .switchIfEmpty(Mono.error(CustomException.notFound("Capability not found: " + request.getCapabilityId())))
                .flatMap(cap -> {
                    // 기본 검증: 위임 가능 여부
                    if (!cap.isDelegatable()) {
                        return Mono.error(CustomException.badRequest("위임 불가능한 권한입니다: " + cap.getCode()));
                    }

                    // 기본 검증: TEMPORARY 종료일 필수
                    if (request.getDurationType() == CreateDelegationRequest.DurationType.TEMPORARY
                            && request.getEndAt() == null) {
                        return Mono.error(CustomException.badRequest("한시적 위임은 종료일이 필수입니다"));
                    }

                    // 기본 검증: 자기승인 금지
                    if (actorUserId.equals(request.getApproverId())) {
                        return Mono.error(CustomException.badRequest("위임자가 승인자가 될 수 없습니다 (자기승인 불가)"));
                    }

                    // 확장 검증 4가지를 순차 실행 후 위임 생성
                    return validateRedelegation(projectId, request, actorUserId, cap)
                            .then(validateFunctionScope(request))
                            .then(validateApproverQualification(projectId, request.getApproverId(), request.getCapabilityId()))
                            .then(checkSodBeforeDelegation(projectId, request.getDelegateeId(), request.getCapabilityId()))
                            .flatMap(sodWarnings -> {
                                // 재위임인 경우 부모 위임 ID 설정
                                Mono<String> parentIdMono = findParentDelegationId(projectId, actorUserId, request.getCapabilityId());

                                return parentIdMono.defaultIfEmpty("").flatMap(parentId -> {
                                    R2dbcDelegation delegation = R2dbcDelegation.builder()
                                            .id(UUID.randomUUID().toString())
                                            .projectId(projectId)
                                            .delegatorId(actorUserId)
                                            .delegateeId(request.getDelegateeId())
                                            .capabilityId(request.getCapabilityId())
                                            .scopeType(request.getScopeType().name())
                                            .scopePartId(request.getScopePartId())
                                            .scopeFunctionDesc(request.getScopeFunctionDesc())
                                            .durationType(request.getDurationType().name())
                                            .startAt(request.getStartAt() != null ? request.getStartAt() : LocalDate.now())
                                            .endAt(request.getEndAt())
                                            .approverId(request.getApproverId())
                                            .parentDelegationId(parentId.isEmpty() ? null : parentId)
                                            .status("PENDING")
                                            .createdAt(OffsetDateTime.now())
                                            .createdBy(actorUserId)
                                            .isNew(true)
                                            .build();

                                    return delegationRepository.save(delegation)
                                            .map(saved -> {
                                                DelegationDto dto = DelegationDto.from(saved);
                                                dto.setCapabilityCode(cap.getCode());
                                                dto.setCapabilityName(cap.getName());
                                                // SoD 비차단 경고가 있으면 DTO에 포함
                                                if (!sodWarnings.isEmpty()) {
                                                    dto.setSodWarnings(sodWarnings);
                                                }
                                                return dto;
                                            });
                                });
                            });
                })
                .doOnSuccess(dto -> log.info("Created delegation {} in project {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<DelegationDto> approveDelegation(String delegationId, String actorUserId) {
        return delegationRepository.findById(delegationId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Delegation not found: " + delegationId)))
                .flatMap(d -> {
                    if (!"PENDING".equals(d.getStatus())) {
                        return Mono.error(CustomException.badRequest("Delegation is not in PENDING status"));
                    }
                    if (!d.getApproverId().equals(actorUserId)) {
                        return Mono.error(CustomException.badRequest("Only the designated approver can approve this delegation"));
                    }

                    d.setStatus("ACTIVE");
                    d.setApprovedAt(OffsetDateTime.now());
                    d.setNew(false);

                    return delegationRepository.save(d)
                            .map(DelegationDto::from);
                })
                .doOnSuccess(dto -> log.info("Approved delegation {}", delegationId));
    }

    @Transactional
    public Mono<DelegationDto> revokeDelegation(String delegationId, String reason, String actorUserId) {
        return delegationRepository.findById(delegationId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Delegation not found: " + delegationId)))
                .flatMap(d -> {
                    if ("REVOKED".equals(d.getStatus())) {
                        return Mono.error(CustomException.badRequest("Delegation is already revoked"));
                    }

                    d.setStatus("REVOKED");
                    d.setRevokedAt(OffsetDateTime.now());
                    d.setRevokedBy(actorUserId);
                    d.setRevokeReason(reason);
                    d.setNew(false);

                    // 하위 위임 연쇄 폐기
                    return delegationRepository.findActiveChildDelegations(delegationId)
                            .flatMap(child -> {
                                child.setStatus("REVOKED");
                                child.setRevokedAt(OffsetDateTime.now());
                                child.setRevokedBy(actorUserId);
                                child.setRevokeReason("상위 위임 폐기로 인한 자동 폐기");
                                child.setNew(false);
                                return delegationRepository.save(child);
                            })
                            .then(delegationRepository.save(d))
                            .map(DelegationDto::from);
                })
                .doOnSuccess(dto -> log.info("Revoked delegation {} (cascade)", delegationId));
    }

    /**
     * 위임 맵 조회.
     * @param includeEffectiveCapabilities true이면 각 노드에 유효 권한 목록을 포함
     */
    public Flux<DelegationMapNodeDto> getDelegationMap(String projectId, boolean includeEffectiveCapabilities) {
        return delegationRepository.findByProjectIdAndStatus(projectId, "ACTIVE")
                .collectList()
                .flatMapMany(delegations -> {
                    // 위임자별 Edge 그룹화
                    Map<String, List<DelegationMapNodeDto.DelegationEdgeDto>> edgeMap = new LinkedHashMap<>();
                    Set<String> allUserIds = new LinkedHashSet<>();

                    for (R2dbcDelegation d : delegations) {
                        allUserIds.add(d.getDelegatorId());
                        allUserIds.add(d.getDelegateeId());

                        edgeMap.computeIfAbsent(d.getDelegatorId(), k -> new ArrayList<>())
                                .add(DelegationMapNodeDto.DelegationEdgeDto.builder()
                                        .delegationId(d.getId())
                                        .delegateeId(d.getDelegateeId())
                                        .capabilityCode(d.getCapabilityId()) // 이후 enrichment에서 교체됨
                                        .status(d.getStatus())
                                        .build());
                    }

                    // 사용자명/권한코드 조회
                    Mono<Map<String, String>> userNames = resolveUserNames(new ArrayList<>(allUserIds));
                    List<String> capIds = delegations.stream().map(R2dbcDelegation::getCapabilityId).distinct().toList();
                    Mono<Map<String, String>> capCodes = resolveCapabilityCodes(capIds);

                    return Mono.zip(userNames, capCodes)
                            .flatMapMany(tuple -> {
                                Map<String, String> names = tuple.getT1();
                                Map<String, String> codes = tuple.getT2();

                                List<DelegationMapNodeDto> nodes = new ArrayList<>();
                                for (String userId : allUserIds) {
                                    List<DelegationMapNodeDto.DelegationEdgeDto> edges = edgeMap.getOrDefault(userId, List.of());
                                    edges.forEach(e -> {
                                        e.setDelegateeName(names.getOrDefault(e.getDelegateeId(), ""));
                                        e.setCapabilityCode(codes.getOrDefault(e.getCapabilityCode(), e.getCapabilityCode()));
                                    });

                                    nodes.add(DelegationMapNodeDto.builder()
                                            .userId(userId)
                                            .userName(names.getOrDefault(userId, ""))
                                            .delegations(edges)
                                            .build());
                                }

                                if (!includeEffectiveCapabilities) {
                                    return Flux.fromIterable(nodes);
                                }

                                // 각 노드에 유효 권한 포함
                                return Flux.fromIterable(nodes)
                                        .flatMap(node -> effectiveCapService
                                                .getEffectiveCapabilities(projectId, node.getUserId())
                                                .collectList()
                                                .doOnNext(node::setEffectiveCapabilities)
                                                .thenReturn(node));
                            });
                });
    }

    /** 기존 시그니처 호환용 오버로드 */
    public Flux<DelegationMapNodeDto> getDelegationMap(String projectId) {
        return getDelegationMap(projectId, false);
    }

    // ============================================================
    // 위임 생성 확장 검증 메서드
    // ============================================================

    /**
     * 재위임 검증.
     * - allowRedelegation이 false인 권한은 위임받은 사람이 재위임 불가
     * - 체인 깊이 2 이상이면 차단
     * - 재위임 시 승인자가 PM 역할 보유 필수
     */
    private Mono<Void> validateRedelegation(String projectId, CreateDelegationRequest request,
                                            String actorUserId, R2dbcCapability cap) {
        // delegator가 해당 권한을 위임받았는지 확인
        return delegationRepository.findActiveByProjectIdAndDelegateeId(projectId, actorUserId)
                .filter(d -> d.getCapabilityId().equals(request.getCapabilityId()))
                .collectList()
                .flatMap(parentDelegations -> {
                    if (parentDelegations.isEmpty()) {
                        // 위임받은 권한이 아님 → 재위임이 아니므로 패스
                        return Mono.empty();
                    }

                    // 재위임인데 allowRedelegation이 false이면 차단
                    if (!cap.isAllowRedelegation()) {
                        return Mono.error(CustomException.badRequest(
                                "이 권한은 재위임이 허용되지 않습니다: " + cap.getCode()));
                    }

                    // 재위임 체인 깊이 확인 (recursive CTE)
                    return checkDelegationChainDepth(projectId, actorUserId, request.getCapabilityId())
                            .flatMap(depth -> {
                                if (depth >= 2) {
                                    return Mono.error(CustomException.badRequest(
                                            "재위임 체인 깊이가 최대치(2)를 초과합니다. 현재 깊이: " + depth));
                                }

                                // 재위임 시 승인자가 PM 역할이어야 함
                                return checkUserHasRole(projectId, request.getApproverId(), "PM")
                                        .flatMap(hasPm -> {
                                            if (!hasPm) {
                                                return Mono.error(CustomException.badRequest(
                                                        "재위임의 승인자는 PM 역할을 보유해야 합니다"));
                                            }
                                            return Mono.empty();
                                        });
                            });
                });
    }

    /**
     * FUNCTION 스코프 제약 검증.
     * - FUNCTION 스코프는 TEMPORARY만 허용
     * - scopeFunctionDesc 필수
     * - 최대 90일 제한
     * - 승인자: PM 또는 audit_governance 보유자만
     */
    private Mono<Void> validateFunctionScope(CreateDelegationRequest request) {
        if (request.getScopeType() != CreateDelegationRequest.ScopeType.FUNCTION) {
            return Mono.empty();
        }

        // FUNCTION → TEMPORARY만 허용
        if (request.getDurationType() != CreateDelegationRequest.DurationType.TEMPORARY) {
            return Mono.error(CustomException.badRequest(
                    "FUNCTION 스코프 위임은 한시적(TEMPORARY)만 가능합니다"));
        }

        // scopeFunctionDesc 필수
        if (request.getScopeFunctionDesc() == null || request.getScopeFunctionDesc().isBlank()) {
            return Mono.error(CustomException.badRequest(
                    "FUNCTION 스코프 위임은 기능 설명(scopeFunctionDesc)이 필수입니다"));
        }

        // 최대 90일 제한
        if (request.getEndAt() != null && request.getStartAt() != null) {
            long days = ChronoUnit.DAYS.between(request.getStartAt(), request.getEndAt());
            if (days > MAX_FUNCTION_SCOPE_DAYS) {
                return Mono.error(CustomException.badRequest(
                        "FUNCTION 스코프 위임은 최대 " + MAX_FUNCTION_SCOPE_DAYS + "일까지 가능합니다 (요청: " + days + "일)"));
            }
        } else if (request.getEndAt() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), request.getEndAt());
            if (days > MAX_FUNCTION_SCOPE_DAYS) {
                return Mono.error(CustomException.badRequest(
                        "FUNCTION 스코프 위임은 최대 " + MAX_FUNCTION_SCOPE_DAYS + "일까지 가능합니다 (요청: " + days + "일)"));
            }
        }

        return Mono.empty();
    }

    /**
     * 승인자 자격 검증.
     * 다음 중 하나 이상 충족해야 함:
     * (a) PM 역할 보유
     * (b) 해당 권한 보유
     * (c) audit_governance 권한 보유
     */
    private Mono<Void> validateApproverQualification(String projectId, String approverId, String capabilityId) {
        // 3가지 조건 병렬 확인
        Mono<Boolean> hasPm = checkUserHasRole(projectId, approverId, "PM");
        Mono<Boolean> hasCap = checkUserHasCapability(projectId, approverId, capabilityId);
        Mono<Boolean> hasAudit = checkUserHasCapabilityByCode(projectId, approverId, "audit_governance");

        return Mono.zip(hasPm, hasCap, hasAudit)
                .flatMap(tuple -> {
                    boolean pm = tuple.getT1();
                    boolean cap = tuple.getT2();
                    boolean audit = tuple.getT3();

                    if (!pm && !cap && !audit) {
                        return Mono.error(CustomException.badRequest(
                                "승인자 자격이 부족합니다. PM 역할, 해당 권한, 또는 audit_governance 권한 중 하나 이상이 필요합니다"));
                    }
                    return Mono.empty();
                });
    }

    /**
     * SoD 사전 검증.
     * delegatee의 기존 유효 권한 + 새 권한이 SoD 규칙과 충돌하는지 검사.
     * - severity=HIGH AND is_blocking=true → 409 Conflict로 차단
     * - 그 외 → 경고 목록 반환 (차단하지 않음)
     */
    private Mono<List<SodWarningDto>> checkSodBeforeDelegation(String projectId, String delegateeId, String newCapabilityId) {
        // delegatee의 기존 유효 권한 ID 목록 조회
        String sql = """
                SELECT sr.id AS rule_id,
                       sr.capability_a_id, ca.code AS cap_a_code,
                       sr.capability_b_id, cb.code AS cap_b_code,
                       sr.severity, sr.is_blocking, sr.description
                FROM governance.sod_rules sr
                JOIN governance.capabilities ca ON ca.id = sr.capability_a_id
                JOIN governance.capabilities cb ON cb.id = sr.capability_b_id
                WHERE (sr.capability_a_id = :newCapId OR sr.capability_b_id = :newCapId)
                  AND EXISTS (
                    SELECT 1 FROM governance.v_effective_caps ec
                    WHERE ec.project_id = :projectId
                      AND ec.user_id = :userId
                      AND ec.capability_id = CASE
                          WHEN sr.capability_a_id = :newCapId THEN sr.capability_b_id
                          ELSE sr.capability_a_id
                      END
                  )
                """;

        return databaseClient.sql(sql)
                .bind("newCapId", newCapabilityId)
                .bind("projectId", projectId)
                .bind("userId", delegateeId)
                .map(row -> SodWarningDto.builder()
                        .ruleId(row.get("rule_id", String.class))
                        .capabilityAId(row.get("capability_a_id", String.class))
                        .capabilityACode(row.get("cap_a_code", String.class))
                        .capabilityBId(row.get("capability_b_id", String.class))
                        .capabilityBCode(row.get("cap_b_code", String.class))
                        .severity(row.get("severity", String.class))
                        .blocking(Boolean.TRUE.equals(row.get("is_blocking", Boolean.class)))
                        .description(row.get("description", String.class))
                        .build())
                .all()
                .collectList()
                .flatMap(warnings -> {
                    // HIGH + blocking → 차단
                    Optional<SodWarningDto> blockingWarning = warnings.stream()
                            .filter(w -> "HIGH".equals(w.getSeverity()) && w.isBlocking())
                            .findFirst();

                    if (blockingWarning.isPresent()) {
                        SodWarningDto bw = blockingWarning.get();
                        return Mono.error(CustomException.conflict(
                                "SoD 위반으로 위임이 차단되었습니다: " + bw.getDescription()
                                        + " (" + bw.getCapabilityACode() + " ↔ " + bw.getCapabilityBCode() + ")"));
                    }

                    return Mono.just(warnings);
                });
    }

    // ============================================================
    // 내부 헬퍼 메서드
    // ============================================================

    /** 재위임 체인 깊이를 recursive CTE로 계산 */
    private Mono<Integer> checkDelegationChainDepth(String projectId, String delegateeId, String capabilityId) {
        String sql = """
                WITH RECURSIVE chain AS (
                    SELECT id, parent_delegation_id, 1 AS depth
                    FROM governance.delegations
                    WHERE project_id = :projectId
                      AND delegatee_id = :delegateeId
                      AND capability_id = :capId
                      AND status = 'ACTIVE'
                      AND parent_delegation_id IS NOT NULL
                    UNION ALL
                    SELECT d.id, d.parent_delegation_id, c.depth + 1
                    FROM governance.delegations d
                    JOIN chain c ON d.id = c.parent_delegation_id
                    WHERE d.status = 'ACTIVE'
                )
                SELECT COALESCE(MAX(depth), 0) AS max_depth FROM chain
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("delegateeId", delegateeId)
                .bind("capId", capabilityId)
                .map(row -> row.get("max_depth", Integer.class))
                .one()
                .defaultIfEmpty(0);
    }

    /** 사용자가 특정 역할(role name)을 보유하는지 확인 */
    private Mono<Boolean> checkUserHasRole(String projectId, String userId, String roleName) {
        String sql = """
                SELECT COUNT(*) AS cnt
                FROM governance.user_roles ur
                JOIN governance.roles r ON r.id = ur.role_id
                WHERE ur.project_id = :projectId
                  AND ur.user_id = :userId
                  AND r.name = :roleName
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .bind("roleName", roleName)
                .map(row -> row.get("cnt", Long.class))
                .one()
                .map(cnt -> cnt > 0)
                .defaultIfEmpty(false);
    }

    /** 사용자가 특정 권한(capability ID)을 유효 권한으로 보유하는지 확인 */
    private Mono<Boolean> checkUserHasCapability(String projectId, String userId, String capabilityId) {
        String sql = """
                SELECT COUNT(*) AS cnt
                FROM governance.v_effective_caps
                WHERE project_id = :projectId
                  AND user_id = :userId
                  AND capability_id = :capId
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .bind("capId", capabilityId)
                .map(row -> row.get("cnt", Long.class))
                .one()
                .map(cnt -> cnt > 0)
                .defaultIfEmpty(false);
    }

    /** 사용자가 특정 권한(capability code)을 유효 권한으로 보유하는지 확인 */
    private Mono<Boolean> checkUserHasCapabilityByCode(String projectId, String userId, String capCode) {
        String sql = """
                SELECT COUNT(*) AS cnt
                FROM governance.v_effective_caps ec
                JOIN governance.capabilities c ON c.id = ec.capability_id
                WHERE ec.project_id = :projectId
                  AND ec.user_id = :userId
                  AND c.code = :capCode
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .bind("capCode", capCode)
                .map(row -> row.get("cnt", Long.class))
                .one()
                .map(cnt -> cnt > 0)
                .defaultIfEmpty(false);
    }

    /** 재위임 시 부모 위임 ID 조회 */
    private Mono<String> findParentDelegationId(String projectId, String delegateeId, String capabilityId) {
        return delegationRepository.findActiveByProjectIdAndDelegateeId(projectId, delegateeId)
                .filter(d -> d.getCapabilityId().equals(capabilityId))
                .next()
                .map(R2dbcDelegation::getId);
    }

    // ============================================================
    // Enrichment 메서드
    // ============================================================

    private Flux<DelegationDto> enrichDelegationNames(List<DelegationDto> dtos) {
        if (dtos.isEmpty()) return Flux.empty();

        Set<String> allUserIds = new LinkedHashSet<>();
        Set<String> capIds = new LinkedHashSet<>();

        dtos.forEach(dto -> {
            allUserIds.add(dto.getDelegatorId());
            allUserIds.add(dto.getDelegateeId());
            allUserIds.add(dto.getApproverId());
            if (dto.getRevokedBy() != null) allUserIds.add(dto.getRevokedBy());
            capIds.add(dto.getCapabilityId());
        });

        Mono<Map<String, String>> userNames = resolveUserNames(new ArrayList<>(allUserIds));
        Mono<Map<String, String[]>> capInfo = databaseClient
                .sql("SELECT id, code, name FROM governance.capabilities WHERE id IN (:ids)")
                .bind("ids", new ArrayList<>(capIds))
                .map(row -> new String[]{row.get("id", String.class), row.get("code", String.class), row.get("name", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> new String[]{arr[1], arr[2]});

        return Mono.zip(userNames, capInfo)
                .flatMapMany(tuple -> {
                    Map<String, String> names = tuple.getT1();
                    Map<String, String[]> caps = tuple.getT2();

                    dtos.forEach(dto -> {
                        dto.setDelegatorName(names.getOrDefault(dto.getDelegatorId(), ""));
                        dto.setDelegateeName(names.getOrDefault(dto.getDelegateeId(), ""));
                        dto.setApproverName(names.getOrDefault(dto.getApproverId(), ""));
                        String[] ci = caps.getOrDefault(dto.getCapabilityId(), new String[]{"", ""});
                        dto.setCapabilityCode(ci[0]);
                        dto.setCapabilityName(ci[1]);
                    });
                    return Flux.fromIterable(dtos);
                });
    }

    private Mono<Map<String, String>> resolveUserNames(List<String> userIds) {
        if (userIds.isEmpty()) return Mono.just(Map.of());
        return databaseClient
                .sql("SELECT id, name FROM auth.users WHERE id IN (:ids)")
                .bind("ids", userIds)
                .map(row -> new String[]{row.get("id", String.class), row.get("name", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> arr[1]);
    }

    private Mono<Map<String, String>> resolveCapabilityCodes(List<String> capIds) {
        if (capIds.isEmpty()) return Mono.just(Map.of());
        return databaseClient
                .sql("SELECT id, code FROM governance.capabilities WHERE id IN (:ids)")
                .bind("ids", capIds)
                .map(row -> new String[]{row.get("id", String.class), row.get("code", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> arr[1]);
    }
}
