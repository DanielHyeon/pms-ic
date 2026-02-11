package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.governance.authority.dto.UserAuthorityDto;
import com.insuretech.pms.governance.authority.dto.UserAuthorityDto.*;
import com.insuretech.pms.governance.organization.repository.ReactivePartMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 사용자 권한 상세 조회 서비스 (User 360).
 * 소속, 역할, 직접 권한, 위임 권한, 유효 권한을 통합하여 반환.
 * 설계서 §10.7 사용자 권한 상세 조회 API 구현.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveUserAuthorityService {

    private final DatabaseClient databaseClient;
    private final ReactivePartMembershipRepository partMembershipRepository;

    /**
     * 특정 프로젝트 내 사용자의 전체 권한 정보를 통합 조회.
     *
     * @param projectId 프로젝트 ID
     * @param userId    사용자 ID
     * @return UserAuthorityDto (소속 + 역할 + 직접권한 + 위임권한 + 유효권한)
     */
    public Mono<UserAuthorityDto> getUserAuthority(String projectId, String userId) {
        // 1. 사용자 이름 조회
        Mono<String> userNameMono = resolveUserName(userId);

        // 2. 파트 소속 조회
        Mono<List<PartMembershipInfo>> partsMono = getPartMemberships(projectId, userId);

        // 3. 역할 조회 (preset 권한 포함)
        Mono<List<RoleInfo>> rolesMono = getRoles(projectId, userId);

        // 4. 직접 부여 권한
        Mono<List<DirectCapabilityInfo>> directCapsMono = getDirectCapabilities(projectId, userId);

        // 5. 위임받은 권한
        Mono<List<DelegatedCapabilityInfo>> delegatedCapsMono = getDelegatedCapabilities(projectId, userId);

        // 6. 유효 권한 (우선순위 적용)
        Mono<List<EffectiveCapabilityInfo>> effectiveCapsMono = getEffectiveCapabilities(projectId, userId);

        // 모든 쿼리 병렬 실행 후 통합
        return Mono.zip(userNameMono, partsMono, rolesMono, directCapsMono, delegatedCapsMono, effectiveCapsMono)
                .map(tuple -> UserAuthorityDto.builder()
                        .userId(userId)
                        .userName(tuple.getT1())
                        .partMemberships(tuple.getT2())
                        .roles(tuple.getT3())
                        .directCapabilities(tuple.getT4())
                        .delegatedCapabilities(tuple.getT5())
                        .effectiveCapabilities(tuple.getT6())
                        .build())
                .doOnSuccess(dto -> log.debug("User authority loaded for userId={} in project={}: {} roles, {} effective caps",
                        userId, projectId, dto.getRoles().size(), dto.getEffectiveCapabilities().size()));
    }

    // ================ 사용자 이름 조회 ================

    private Mono<String> resolveUserName(String userId) {
        return databaseClient
                .sql("SELECT name FROM auth.users WHERE id = :userId")
                .bind("userId", userId)
                .map(row -> row.get("name", String.class))
                .first()
                .defaultIfEmpty("");
    }

    // ================ 파트 소속 조회 ================

    private Mono<List<PartMembershipInfo>> getPartMemberships(String projectId, String userId) {
        // 파트 소속 + 파트 이름 JOIN
        String sql = """
                SELECT pm.part_id, p.name AS part_name, pm.membership_type
                FROM organization.part_memberships pm
                JOIN organization.parts p ON p.id = pm.part_id
                WHERE pm.project_id = :projectId
                  AND pm.user_id = :userId
                  AND pm.left_at IS NULL
                ORDER BY pm.membership_type, p.name
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .map(row -> PartMembershipInfo.builder()
                        .partId(row.get("part_id", String.class))
                        .partName(row.get("part_name", String.class))
                        .membershipType(row.get("membership_type", String.class))
                        .build())
                .all()
                .collectList();
    }

    // ================ 역할 조회 (preset 권한 포함) ================

    private Mono<List<RoleInfo>> getRoles(String projectId, String userId) {
        // 역할 부여 정보
        String rolesSql = """
                SELECT ur.role_id, r.code AS role_code, r.name AS role_name,
                       ur.granted_by, ur.granted_at
                FROM governance.user_roles ur
                JOIN governance.roles r ON r.id = ur.role_id
                WHERE ur.project_id = :projectId AND ur.user_id = :userId
                ORDER BY ur.granted_at
                """;

        return databaseClient.sql(rolesSql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .map(row -> RoleInfo.builder()
                        .roleId(row.get("role_id", String.class))
                        .roleCode(row.get("role_code", String.class))
                        .roleName(row.get("role_name", String.class))
                        .grantedBy(row.get("granted_by", String.class))
                        .grantedAt(row.get("granted_at", OffsetDateTime.class))
                        .build())
                .all()
                .collectList()
                .flatMap(roles -> {
                    if (roles.isEmpty()) return Mono.just(roles);

                    // 각 역할의 preset 권한 조회
                    List<String> roleIds = roles.stream().map(RoleInfo::getRoleId).distinct().toList();
                    List<String> grantedByIds = roles.stream().map(RoleInfo::getGrantedBy).filter(Objects::nonNull).distinct().toList();

                    // preset 권한 코드 조회
                    Mono<Map<String, List<String>>> presetCapsMono = databaseClient
                            .sql("SELECT rc.role_id, c.code FROM governance.role_capabilities rc JOIN governance.capabilities c ON c.id = rc.capability_id WHERE rc.role_id IN (:roleIds)")
                            .bind("roleIds", roleIds)
                            .map(row -> new String[]{row.get("role_id", String.class), row.get("code", String.class)})
                            .all()
                            .collectList()
                            .map(list -> list.stream().collect(Collectors.groupingBy(
                                    arr -> arr[0],
                                    Collectors.mapping(arr -> arr[1], Collectors.toList())
                            )));

                    // 부여자 이름 조회
                    Mono<Map<String, String>> namesMono = grantedByIds.isEmpty()
                            ? Mono.just(Map.<String, String>of())
                            : resolveUserNames(grantedByIds);

                    return Mono.zip(presetCapsMono, namesMono).map(tuple -> {
                        roles.forEach(r -> {
                            r.setPresetCapabilities(tuple.getT1().getOrDefault(r.getRoleId(), List.of()));
                            r.setGrantedByName(tuple.getT2().getOrDefault(r.getGrantedBy(), ""));
                        });
                        return roles;
                    });
                });
    }

    // ================ 직접 부여 권한 ================

    private Mono<List<DirectCapabilityInfo>> getDirectCapabilities(String projectId, String userId) {
        String sql = """
                SELECT uc.capability_id, c.code, c.name, uc.granted_by, uc.granted_at
                FROM governance.user_capabilities uc
                JOIN governance.capabilities c ON c.id = uc.capability_id
                WHERE uc.project_id = :projectId AND uc.user_id = :userId
                ORDER BY c.code
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .map(row -> DirectCapabilityInfo.builder()
                        .capabilityId(row.get("capability_id", String.class))
                        .capabilityCode(row.get("code", String.class))
                        .capabilityName(row.get("name", String.class))
                        .grantedBy(row.get("granted_by", String.class))
                        .grantedAt(row.get("granted_at", OffsetDateTime.class))
                        .build())
                .all()
                .collectList()
                .flatMap(caps -> {
                    if (caps.isEmpty()) return Mono.just(caps);
                    List<String> grantedByIds = caps.stream().map(DirectCapabilityInfo::getGrantedBy).filter(Objects::nonNull).distinct().toList();
                    if (grantedByIds.isEmpty()) return Mono.just(caps);
                    return resolveUserNames(grantedByIds).map(names -> {
                        caps.forEach(c -> c.setGrantedByName(names.getOrDefault(c.getGrantedBy(), "")));
                        return caps;
                    });
                });
    }

    // ================ 위임받은 권한 ================

    private Mono<List<DelegatedCapabilityInfo>> getDelegatedCapabilities(String projectId, String userId) {
        String sql = """
                SELECT d.id AS delegation_id, c.code, c.name,
                       d.delegator_id, d.approver_id,
                       d.scope_type, d.scope_part_id, d.scope_function_desc,
                       d.duration_type, d.end_at,
                       d.parent_delegation_id
                FROM governance.delegations d
                JOIN governance.capabilities c ON c.id = d.capability_id
                WHERE d.project_id = :projectId
                  AND d.delegatee_id = :userId
                  AND d.status = 'ACTIVE'
                ORDER BY c.code
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .map(row -> {
                    LocalDate endAt = row.get("end_at", LocalDate.class);
                    Integer daysRemaining = null;
                    if (endAt != null) {
                        daysRemaining = (int) ChronoUnit.DAYS.between(LocalDate.now(), endAt);
                    }

                    String scopeType = row.get("scope_type", String.class);
                    ScopeInfo scope = ScopeInfo.builder()
                            .type(scopeType)
                            .functionDescription(row.get("scope_function_desc", String.class))
                            .build();

                    return DelegatedCapabilityInfo.builder()
                            .delegationId(row.get("delegation_id", String.class))
                            .capabilityCode(row.get("code", String.class))
                            .capabilityName(row.get("name", String.class))
                            .delegator(row.get("delegator_id", String.class))
                            .approver(row.get("approver_id", String.class))
                            .scope(scope)
                            .durationType(row.get("duration_type", String.class))
                            .endDate(endAt)
                            .daysRemaining(daysRemaining)
                            .parentDelegationId(row.get("parent_delegation_id", String.class))
                            .build();
                })
                .all()
                .collectList()
                .flatMap(delegated -> {
                    if (delegated.isEmpty()) return Mono.just(delegated);

                    // 위임자, 승인자 이름 + 파트 이름 보강
                    Set<String> userIds = new HashSet<>();
                    Set<String> partIds = new HashSet<>();
                    delegated.forEach(d -> {
                        if (d.getDelegator() != null) userIds.add(d.getDelegator());
                        if (d.getApprover() != null) userIds.add(d.getApprover());
                        if (d.getScope() != null && "PART".equals(d.getScope().getType())) {
                            // scopePartId는 row에서 별도로 가져와야 함
                        }
                    });

                    Mono<Map<String, String>> namesMono = userIds.isEmpty()
                            ? Mono.just(Map.<String, String>of())
                            : resolveUserNames(new ArrayList<>(userIds));

                    // 파트 이름 조회를 위한 SQL (scope_part_id 기반)
                    String partSql = """
                            SELECT d.id AS delegation_id, p.name AS part_name
                            FROM governance.delegations d
                            JOIN organization.parts p ON p.id = d.scope_part_id
                            WHERE d.project_id = :projectId
                              AND d.delegatee_id = :userId
                              AND d.status = 'ACTIVE'
                              AND d.scope_type = 'PART'
                            """;

                    Mono<Map<String, String>> partNamesMono = databaseClient.sql(partSql)
                            .bind("projectId", projectId)
                            .bind("userId", userId)
                            .map(row -> new String[]{row.get("delegation_id", String.class), row.get("part_name", String.class)})
                            .all()
                            .collectMap(arr -> arr[0], arr -> arr[1]);

                    return Mono.zip(namesMono, partNamesMono).map(tuple -> {
                        Map<String, String> names = tuple.getT1();
                        Map<String, String> partNames = tuple.getT2();
                        delegated.forEach(d -> {
                            d.setDelegator(names.getOrDefault(d.getDelegator(), d.getDelegator()));
                            d.setApprover(names.getOrDefault(d.getApprover(), d.getApprover()));
                            if (d.getScope() != null && "PART".equals(d.getScope().getType())) {
                                d.getScope().setPartName(partNames.getOrDefault(d.getDelegationId(), ""));
                            }
                        });
                        return delegated;
                    });
                });
    }

    // ================ 유효 권한 (우선순위 적용) ================

    private Mono<List<EffectiveCapabilityInfo>> getEffectiveCapabilities(String projectId, String userId) {
        // v_effective_caps 뷰에서 전체 유효 권한 조회
        String sql = """
                SELECT ec.capability_id, c.code, c.name, ec.source_type, ec.source_id
                FROM governance.v_effective_caps ec
                JOIN governance.capabilities c ON c.id = ec.capability_id
                WHERE ec.project_id = :projectId AND ec.user_id = :userId
                ORDER BY c.code, ec.source_type
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .map(row -> new RawEffectiveCap(
                        row.get("capability_id", String.class),
                        row.get("code", String.class),
                        row.get("name", String.class),
                        row.get("source_type", String.class),
                        row.get("source_id", String.class)
                ))
                .all()
                .collectList()
                .flatMap(rawCaps -> {
                    if (rawCaps.isEmpty()) return Mono.just(List.<EffectiveCapabilityInfo>of());

                    // 동일 capability를 그룹핑하여 우선순위 적용
                    Map<String, List<RawEffectiveCap>> grouped = rawCaps.stream()
                            .collect(Collectors.groupingBy(RawEffectiveCap::capabilityId));

                    // source 보강을 위한 ID 수집
                    Set<String> roleSourceIds = new HashSet<>();
                    Set<String> delegationSourceIds = new HashSet<>();
                    rawCaps.forEach(rc -> {
                        if ("ROLE".equals(rc.sourceType)) roleSourceIds.add(rc.sourceId);
                        else if ("DELEGATION".equals(rc.sourceType)) delegationSourceIds.add(rc.sourceId);
                    });

                    // 역할 이름 조회
                    Mono<Map<String, String>> roleNamesMono = roleSourceIds.isEmpty()
                            ? Mono.just(Map.<String, String>of())
                            : databaseClient
                                .sql("SELECT ur.id, r.name FROM governance.user_roles ur JOIN governance.roles r ON r.id = ur.role_id WHERE ur.id IN (:ids)")
                                .bind("ids", new ArrayList<>(roleSourceIds))
                                .map(row -> new String[]{row.get("id", String.class), row.get("name", String.class)})
                                .all()
                                .collectMap(arr -> arr[0], arr -> arr[1]);

                    // 위임자 이름 조회
                    Mono<Map<String, String>> delegatorNamesMono = delegationSourceIds.isEmpty()
                            ? Mono.just(Map.<String, String>of())
                            : databaseClient
                                .sql("SELECT d.id, u.name FROM governance.delegations d JOIN auth.users u ON u.id = d.delegator_id WHERE d.id IN (:ids)")
                                .bind("ids", new ArrayList<>(delegationSourceIds))
                                .map(row -> new String[]{row.get("id", String.class), row.get("name", String.class)})
                                .all()
                                .collectMap(arr -> arr[0], arr -> arr[1]);

                    return Mono.zip(roleNamesMono, delegatorNamesMono).map(tuple -> {
                        Map<String, String> roleNames = tuple.getT1();
                        Map<String, String> delegatorNames = tuple.getT2();

                        List<EffectiveCapabilityInfo> result = new ArrayList<>();
                        for (Map.Entry<String, List<RawEffectiveCap>> entry : grouped.entrySet()) {
                            List<RawEffectiveCap> caps = entry.getValue();
                            // 우선순위: DELEGATION(1) > DIRECT(2) > ROLE(3)
                            caps.sort(Comparator.comparingInt(c -> sourcePriority(c.sourceType)));

                            RawEffectiveCap primary = caps.get(0);
                            int priority = sourcePriority(primary.sourceType);
                            String source = sourceLabel(primary.sourceType);

                            EffectiveCapabilityInfo.EffectiveCapabilityInfoBuilder builder = EffectiveCapabilityInfo.builder()
                                    .capabilityId(primary.capabilityId)
                                    .code(primary.code)
                                    .name(primary.name)
                                    .source(source)
                                    .priority(priority);

                            // source별 추가 정보
                            if ("ROLE".equals(primary.sourceType)) {
                                builder.roleName(roleNames.getOrDefault(primary.sourceId, ""));
                            } else if ("DELEGATION".equals(primary.sourceType)) {
                                builder.delegatorName(delegatorNames.getOrDefault(primary.sourceId, ""));
                            }

                            // 중복 출처
                            if (caps.size() > 1) {
                                List<DuplicateSourceInfo> duplicates = caps.subList(1, caps.size()).stream()
                                        .map(c -> {
                                            DuplicateSourceInfo.DuplicateSourceInfoBuilder db = DuplicateSourceInfo.builder()
                                                    .source(sourceLabel(c.sourceType))
                                                    .priority(sourcePriority(c.sourceType));
                                            if ("ROLE".equals(c.sourceType)) {
                                                db.roleName(roleNames.getOrDefault(c.sourceId, ""));
                                            } else if ("DELEGATION".equals(c.sourceType)) {
                                                db.delegatorName(delegatorNames.getOrDefault(c.sourceId, ""));
                                            }
                                            return db.build();
                                        })
                                        .toList();
                                builder.duplicateSources(duplicates);
                            }

                            result.add(builder.build());
                        }

                        // 우선순위 → 코드 순 정렬
                        result.sort(Comparator.comparingInt(EffectiveCapabilityInfo::getPriority)
                                .thenComparing(EffectiveCapabilityInfo::getCode));
                        return result;
                    });
                });
    }

    // ================ 유틸리티 ================

    /** 소스 타입별 우선순위: DELEGATION=1, DIRECT=2, ROLE=3 */
    private int sourcePriority(String sourceType) {
        return switch (sourceType) {
            case "DELEGATION" -> 1;
            case "DIRECT" -> 2;
            case "ROLE" -> 3;
            default -> 9;
        };
    }

    /** 소스 타입 → 표시 라벨 */
    private String sourceLabel(String sourceType) {
        return switch (sourceType) {
            case "DELEGATION" -> "DELEGATION";
            case "DIRECT" -> "DIRECT";
            case "ROLE" -> "ROLE_PRESET";
            default -> sourceType;
        };
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

    /** 유효 권한 원시 데이터 (내부용) */
    private record RawEffectiveCap(String capabilityId, String code, String name, String sourceType, String sourceId) {}
}
