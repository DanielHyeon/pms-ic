package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.governance.authority.dto.*;
import com.insuretech.pms.governance.authority.entity.R2dbcUserCapability;
import com.insuretech.pms.governance.authority.entity.R2dbcUserRole;
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
public class ReactiveRoleService {

    private final ReactiveRoleRepository roleRepository;
    private final ReactiveCapabilityRepository capabilityRepository;
    private final ReactiveUserRoleRepository userRoleRepository;
    private final ReactiveUserCapabilityRepository userCapabilityRepository;
    private final DatabaseClient databaseClient;

    public Flux<RoleDto> listRoles(String projectId) {
        return roleRepository.findByProjectIdIsNullOrProjectId(projectId)
                .map(RoleDto::from)
                .flatMap(this::enrichRoleCapabilities);
    }

    public Flux<CapabilityDto> listCapabilities() {
        return capabilityRepository.findAll()
                .map(CapabilityDto::from);
    }

    public Flux<CapabilityDto> listCapabilitiesByCategory(String category) {
        return capabilityRepository.findByCategory(category)
                .map(CapabilityDto::from);
    }

    public Flux<UserRoleDto> listUserRoles(String projectId) {
        return userRoleRepository.findByProjectId(projectId)
                .map(UserRoleDto::from)
                .collectList()
                .flatMapMany(this::enrichUserRoleNames);
    }

    public Flux<UserCapabilityDto> listUserCapabilities(String projectId) {
        return userCapabilityRepository.findByProjectId(projectId)
                .map(UserCapabilityDto::from)
                .collectList()
                .flatMapMany(this::enrichUserCapabilityNames);
    }

    @Transactional
    public Mono<UserRoleDto> grantUserRole(String projectId, GrantUserRoleRequest request, String actorUserId) {
        return roleRepository.findById(request.getRoleId())
                .switchIfEmpty(Mono.error(CustomException.notFound("Role not found: " + request.getRoleId())))
                .flatMap(role -> {
                    // 역할의 preset 권한 vs 사용자의 기존 유효 권한 → SoD 사전 검증
                    return checkSodForRoleGrant(projectId, request.getUserId(), request.getRoleId())
                            .<UserRoleDto>flatMap(sodWarnings -> {
                                R2dbcUserRole userRole = R2dbcUserRole.builder()
                                        .id(UUID.randomUUID().toString())
                                        .projectId(projectId)
                                        .userId(request.getUserId())
                                        .roleId(request.getRoleId())
                                        .grantedBy(actorUserId)
                                        .grantedAt(OffsetDateTime.now())
                                        .reason(request.getReason())
                                        .isNew(true)
                                        .build();

                                return userRoleRepository.save(userRole)
                                        .map(saved -> {
                                            UserRoleDto dto = UserRoleDto.from(saved);
                                            dto.setRoleName(role.getName());
                                            if (!sodWarnings.isEmpty()) {
                                                dto.setSodWarnings(sodWarnings);
                                            }
                                            return dto;
                                        });
                            });
                })
                .doOnSuccess(dto -> log.info("Granted role {} to user {} in project {}", request.getRoleId(), request.getUserId(), projectId));
    }

    @Transactional
    public Mono<Void> revokeUserRole(String userRoleId) {
        return userRoleRepository.deleteById(userRoleId)
                .doOnSuccess(v -> log.info("Revoked user role {}", userRoleId));
    }

    @Transactional
    public Mono<UserCapabilityDto> grantUserCapability(String projectId, GrantUserCapabilityRequest request, String actorUserId) {
        return capabilityRepository.findById(request.getCapabilityId())
                .switchIfEmpty(Mono.error(CustomException.notFound("Capability not found: " + request.getCapabilityId())))
                .flatMap(cap -> {
                    R2dbcUserCapability userCap = R2dbcUserCapability.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .userId(request.getUserId())
                            .capabilityId(request.getCapabilityId())
                            .grantedBy(actorUserId)
                            .grantedAt(OffsetDateTime.now())
                            .reason(request.getReason())
                            .isNew(true)
                            .build();

                    return userCapabilityRepository.save(userCap)
                            .map(saved -> {
                                UserCapabilityDto dto = UserCapabilityDto.from(saved);
                                dto.setCapabilityCode(cap.getCode());
                                dto.setCapabilityName(cap.getName());
                                return dto;
                            });
                })
                .doOnSuccess(dto -> log.info("Granted capability {} to user {} in project {}",
                        request.getCapabilityId(), request.getUserId(), projectId));
    }

    @Transactional
    public Mono<Void> revokeUserCapability(String userCapId) {
        return userCapabilityRepository.deleteById(userCapId)
                .doOnSuccess(v -> log.info("Revoked user capability {}", userCapId));
    }

    // --- SoD 사전 검증 ---

    /**
     * 역할 부여 시 SoD 사전 검증.
     * 역할의 preset 권한과 사용자의 기존 유효 권한이 SoD 규칙에 위반되는지 검사.
     * - HIGH + blocking → 409 Conflict 차단
     * - 나머지 → 경고 목록 반환
     */
    private Mono<List<SodWarningDto>> checkSodForRoleGrant(String projectId, String userId, String roleId) {
        String sql = """
                SELECT DISTINCT sr.id AS rule_id,
                       sr.capability_a_id, ca.code AS cap_a_code,
                       sr.capability_b_id, cb.code AS cap_b_code,
                       sr.severity, sr.is_blocking, sr.description
                FROM governance.role_capabilities rc
                JOIN governance.sod_rules sr
                  ON (rc.capability_id = sr.capability_a_id OR rc.capability_id = sr.capability_b_id)
                JOIN governance.capabilities ca ON ca.id = sr.capability_a_id
                JOIN governance.capabilities cb ON cb.id = sr.capability_b_id
                WHERE rc.role_id = :roleId
                  AND EXISTS (
                    SELECT 1 FROM governance.v_effective_caps ec
                    WHERE ec.project_id = :projectId
                      AND ec.user_id = :userId
                      AND ec.capability_id = CASE
                          WHEN rc.capability_id = sr.capability_a_id THEN sr.capability_b_id
                          ELSE sr.capability_a_id
                      END
                  )
                """;

        return databaseClient.sql(sql)
                .bind("roleId", roleId)
                .bind("projectId", projectId)
                .bind("userId", userId)
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
                    Optional<SodWarningDto> blockingWarning = warnings.stream()
                            .filter(w -> "HIGH".equals(w.getSeverity()) && w.isBlocking())
                            .findFirst();

                    if (blockingWarning.isPresent()) {
                        SodWarningDto bw = blockingWarning.get();
                        return Mono.error(CustomException.conflict(
                                "SoD 위반으로 역할 부여가 차단되었습니다: " + bw.getDescription()
                                        + " (" + bw.getCapabilityACode() + " ↔ " + bw.getCapabilityBCode() + ")"));
                    }

                    return Mono.just(warnings);
                });
    }

    // --- Enrichment ---

    private Mono<RoleDto> enrichRoleCapabilities(RoleDto dto) {
        return databaseClient
                .sql("SELECT capability_id FROM governance.role_capabilities WHERE role_id = :roleId")
                .bind("roleId", dto.getId())
                .map(row -> row.get("capability_id", String.class))
                .all()
                .collectList()
                .doOnNext(dto::setCapabilityIds)
                .thenReturn(dto);
    }

    private Flux<UserRoleDto> enrichUserRoleNames(List<UserRoleDto> dtos) {
        if (dtos.isEmpty()) return Flux.empty();

        List<String> userIds = dtos.stream().map(UserRoleDto::getUserId).distinct().toList();
        List<String> roleIds = dtos.stream().map(UserRoleDto::getRoleId).distinct().toList();

        Mono<Map<String, String>> userNames = resolveUserNames(userIds);
        Mono<Map<String, String>> roleNames = databaseClient
                .sql("SELECT id, name FROM governance.roles WHERE id IN (:ids)")
                .bind("ids", roleIds)
                .map(row -> new String[]{row.get("id", String.class), row.get("name", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> arr[1]);

        return Mono.zip(userNames, roleNames)
                .flatMapMany(tuple -> {
                    dtos.forEach(dto -> {
                        dto.setUserName(tuple.getT1().getOrDefault(dto.getUserId(), ""));
                        dto.setRoleName(tuple.getT2().getOrDefault(dto.getRoleId(), ""));
                        dto.setGrantedByName(tuple.getT1().getOrDefault(dto.getGrantedBy(), ""));
                    });
                    return Flux.fromIterable(dtos);
                });
    }

    private Flux<UserCapabilityDto> enrichUserCapabilityNames(List<UserCapabilityDto> dtos) {
        if (dtos.isEmpty()) return Flux.empty();

        List<String> userIds = dtos.stream().map(UserCapabilityDto::getUserId).distinct().toList();
        List<String> capIds = dtos.stream().map(UserCapabilityDto::getCapabilityId).distinct().toList();

        Mono<Map<String, String>> userNames = resolveUserNames(userIds);
        Mono<Map<String, String[]>> capInfo = databaseClient
                .sql("SELECT id, code, name FROM governance.capabilities WHERE id IN (:ids)")
                .bind("ids", capIds)
                .map(row -> new String[]{row.get("id", String.class), row.get("code", String.class), row.get("name", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> new String[]{arr[1], arr[2]});

        return Mono.zip(userNames, capInfo)
                .flatMapMany(tuple -> {
                    dtos.forEach(dto -> {
                        dto.setUserName(tuple.getT1().getOrDefault(dto.getUserId(), ""));
                        dto.setGrantedByName(tuple.getT1().getOrDefault(dto.getGrantedBy(), ""));
                        String[] ci = tuple.getT2().getOrDefault(dto.getCapabilityId(), new String[]{"", ""});
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
}
