package com.insuretech.pms.governance.organization.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.governance.organization.dto.*;
import com.insuretech.pms.governance.organization.entity.R2dbcAssignmentChangeLog;
import com.insuretech.pms.governance.organization.entity.R2dbcOrgPart;
import com.insuretech.pms.governance.organization.repository.ReactiveAssignmentChangeLogRepository;
import com.insuretech.pms.governance.organization.repository.ReactiveOrgPartRepository;
import com.insuretech.pms.governance.organization.repository.ReactivePartMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveOrgPartService {

    private final ReactiveOrgPartRepository partRepository;
    private final ReactivePartMembershipRepository membershipRepository;
    private final ReactiveAssignmentChangeLogRepository changeLogRepository;
    private final DatabaseClient databaseClient;

    public Flux<OrgPartDto> listParts(String projectId) {
        return partRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .flatMap(this::enrichPartDto);
    }

    public Flux<OrgPartDto> listActiveParts(String projectId) {
        return partRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, "ACTIVE")
                .flatMap(this::enrichPartDto);
    }

    public Mono<OrgPartDetailDto> getPartDetail(String partId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    Mono<List<MemberDto>> members = membershipRepository.findActiveByPartId(partId)
                            .map(MemberDto::from)
                            .collectList()
                            .flatMap(this::enrichMemberNames);

                    Mono<List<CoLeaderDto>> coLeaders = getCoLeaders(partId);

                    Mono<Long> memberCount = membershipRepository.countActiveByPartId(partId);

                    return Mono.zip(members, coLeaders, memberCount)
                            .map(tuple -> {
                                OrgPartDetailDto detail = OrgPartDetailDto.builder()
                                        .id(part.getId())
                                        .projectId(part.getProjectId())
                                        .name(part.getName())
                                        .partType(part.getPartType())
                                        .customTypeName(part.getCustomTypeName())
                                        .status(part.getStatus())
                                        .leaderUserId(part.getLeaderUserId())
                                        .members(tuple.getT1())
                                        .coLeaders(tuple.getT2())
                                        .activeMemberCount(tuple.getT3())
                                        .createdAt(part.getCreatedAt())
                                        .createdBy(part.getCreatedBy())
                                        .closedAt(part.getClosedAt())
                                        .closedBy(part.getClosedBy())
                                        .build();
                                return detail;
                            })
                            .flatMap(this::enrichDetailUserNames);
                });
    }

    @Transactional
    public Mono<OrgPartDto> createPart(String projectId, CreateOrgPartRequest request, String actorUserId) {
        if (request.getPartType() == CreateOrgPartRequest.PartType.CUSTOM
                && (request.getCustomTypeName() == null || request.getCustomTypeName().isBlank())) {
            return Mono.error(CustomException.badRequest("Custom type name is required for CUSTOM part type"));
        }

        R2dbcOrgPart part = R2dbcOrgPart.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .name(request.getName())
                .partType(request.getPartType().name())
                .customTypeName(request.getCustomTypeName())
                .status("ACTIVE")
                .leaderUserId(request.getLeaderUserId())
                .createdAt(OffsetDateTime.now())
                .createdBy(actorUserId)
                .isNew(true)
                .build();

        R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .partId(part.getId())
                .userId(actorUserId)
                .changeType("PART_OPEN")
                .newValue(request.getName())
                .changedBy(actorUserId)
                .changedAt(OffsetDateTime.now())
                .isNew(true)
                .build();

        return partRepository.save(part)
                .then(changeLogRepository.save(logEntry))
                .then(partRepository.findById(part.getId()))
                .flatMap(this::enrichPartDto)
                .doOnSuccess(dto -> log.info("Created part {} in project {}", part.getId(), projectId));
    }

    @Transactional
    public Mono<OrgPartDto> updatePart(String partId, UpdateOrgPartRequest request, String actorUserId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if ("CLOSED".equals(part.getStatus())) {
                        return Mono.error(CustomException.badRequest("Cannot update a closed part"));
                    }
                    part.setName(request.getName());
                    if (request.getCustomTypeName() != null) {
                        part.setCustomTypeName(request.getCustomTypeName());
                    }
                    part.setNew(false);
                    return partRepository.save(part);
                })
                .flatMap(this::enrichPartDto);
    }

    @Transactional
    public Mono<OrgPartDto> closePart(String partId, String actorUserId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if ("CLOSED".equals(part.getStatus())) {
                        return Mono.error(CustomException.badRequest("Part is already closed"));
                    }
                    part.setStatus("CLOSED");
                    part.setClosedAt(OffsetDateTime.now());
                    part.setClosedBy(actorUserId);
                    part.setNew(false);

                    R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(part.getProjectId())
                            .partId(partId)
                            .userId(actorUserId)
                            .changeType("PART_CLOSE")
                            .previousValue("ACTIVE")
                            .newValue("CLOSED")
                            .changedBy(actorUserId)
                            .changedAt(OffsetDateTime.now())
                            .isNew(true)
                            .build();

                    return changeLogRepository.save(logEntry)
                            .then(partRepository.save(part));
                })
                .flatMap(this::enrichPartDto)
                .doOnSuccess(dto -> log.info("Closed part {}", partId));
    }

    @Transactional
    public Mono<OrgPartDto> reopenPart(String partId, String actorUserId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if ("ACTIVE".equals(part.getStatus())) {
                        return Mono.error(CustomException.badRequest("Part is already active"));
                    }
                    part.setStatus("ACTIVE");
                    part.setClosedAt(null);
                    part.setClosedBy(null);
                    part.setNew(false);

                    R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(part.getProjectId())
                            .partId(partId)
                            .userId(actorUserId)
                            .changeType("PART_OPEN")
                            .previousValue("CLOSED")
                            .newValue("ACTIVE")
                            .changedBy(actorUserId)
                            .changedAt(OffsetDateTime.now())
                            .isNew(true)
                            .build();

                    return changeLogRepository.save(logEntry)
                            .then(partRepository.save(part));
                })
                .flatMap(this::enrichPartDto)
                .doOnSuccess(dto -> log.info("Reopened part {}", partId));
    }

    @Transactional
    public Mono<OrgPartDto> changeLeader(String partId, ChangeLeaderRequest request, String actorUserId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if ("CLOSED".equals(part.getStatus())) {
                        return Mono.error(CustomException.badRequest("Cannot change leader of a closed part"));
                    }
                    String previousLeader = part.getLeaderUserId();
                    part.setLeaderUserId(request.getNewLeaderUserId());
                    part.setNew(false);

                    R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(part.getProjectId())
                            .partId(partId)
                            .userId(request.getNewLeaderUserId() != null ? request.getNewLeaderUserId() : actorUserId)
                            .changeType("LEADER_CHANGE")
                            .previousValue(previousLeader)
                            .newValue(request.getNewLeaderUserId())
                            .changedBy(actorUserId)
                            .changeReason(request.getChangeReason())
                            .changedAt(OffsetDateTime.now())
                            .isNew(true)
                            .build();

                    return changeLogRepository.save(logEntry)
                            .then(partRepository.save(part));
                })
                .flatMap(this::enrichPartDto)
                .doOnSuccess(dto -> log.info("Changed leader of part {} to {}", partId, request.getNewLeaderUserId()));
    }

    public Mono<LeaderWarningDto> getLeaderWarning(String partId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if (part.getLeaderUserId() == null) {
                        return Mono.just(LeaderWarningDto.builder()
                                .hasWarning(true)
                                .partId(partId)
                                .message("No leader assigned to this part")
                                .build());
                    }

                    // Check if leader has required PART_LEADER capabilities via v_effective_caps
                    String requiredCapsQuery = """
                        SELECT c.code FROM governance.capabilities c
                        WHERE c.id IN ('cap-manage-part', 'cap-manage-part-mem')
                        AND c.id NOT IN (
                            SELECT ec.capability_id FROM governance.v_effective_caps ec
                            WHERE ec.project_id = :projectId AND ec.user_id = :userId
                        )
                        """;

                    return databaseClient.sql(requiredCapsQuery)
                            .bind("projectId", part.getProjectId())
                            .bind("userId", part.getLeaderUserId())
                            .map(row -> row.get(0, String.class))
                            .all()
                            .collectList()
                            .flatMap(missingCaps -> {
                                if (missingCaps.isEmpty()) {
                                    return Mono.just(LeaderWarningDto.builder()
                                            .hasWarning(false)
                                            .partId(partId)
                                            .leaderUserId(part.getLeaderUserId())
                                            .build());
                                }
                                return resolveUserName(part.getLeaderUserId())
                                        .map(name -> LeaderWarningDto.builder()
                                                .hasWarning(true)
                                                .partId(partId)
                                                .leaderUserId(part.getLeaderUserId())
                                                .leaderUserName(name)
                                                .missingCapabilities(missingCaps)
                                                .message("Leader is missing required capabilities: " + String.join(", ", missingCaps))
                                                .build());
                            });
                });
    }

    // --- Enrichment helpers ---

    private Mono<OrgPartDto> enrichPartDto(R2dbcOrgPart part) {
        OrgPartDto dto = OrgPartDto.from(part);

        Mono<Long> memberCount = membershipRepository.countActiveByPartId(part.getId());
        Mono<List<CoLeaderDto>> coLeaders = getCoLeaders(part.getId());

        return Mono.zip(memberCount, coLeaders)
                .flatMap(tuple -> {
                    dto.setActiveMemberCount(tuple.getT1());
                    dto.setCoLeaders(tuple.getT2());
                    return enrichPartDtoUserNames(dto);
                });
    }

    private Mono<List<CoLeaderDto>> getCoLeaders(String partId) {
        return databaseClient
                .sql("SELECT cl.user_id, cl.created_at, u.name FROM organization.part_co_leaders cl LEFT JOIN auth.users u ON cl.user_id = u.id WHERE cl.part_id = :partId")
                .bind("partId", partId)
                .map(row -> CoLeaderDto.builder()
                        .userId(row.get("user_id", String.class))
                        .userName(row.get("name", String.class))
                        .createdAt(row.get("created_at", OffsetDateTime.class))
                        .build())
                .all()
                .collectList();
    }

    private Mono<OrgPartDto> enrichPartDtoUserNames(OrgPartDto dto) {
        if (dto.getLeaderUserId() == null) {
            return Mono.just(dto);
        }
        return resolveUserName(dto.getLeaderUserId())
                .doOnNext(dto::setLeaderUserName)
                .thenReturn(dto);
    }

    private Mono<OrgPartDetailDto> enrichDetailUserNames(OrgPartDetailDto dto) {
        if (dto.getLeaderUserId() == null) {
            return Mono.just(dto);
        }
        return resolveUserName(dto.getLeaderUserId())
                .doOnNext(dto::setLeaderUserName)
                .thenReturn(dto);
    }

    private Mono<List<MemberDto>> enrichMemberNames(List<MemberDto> members) {
        if (members.isEmpty()) {
            return Mono.just(members);
        }

        List<String> userIds = members.stream().map(MemberDto::getUserId).toList();
        return resolveUserNames(userIds)
                .doOnNext(nameMap ->
                        members.forEach(m -> m.setUserName(nameMap.getOrDefault(m.getUserId(), ""))))
                .thenReturn(members);
    }

    private Mono<String> resolveUserName(String userId) {
        return databaseClient
                .sql("SELECT name FROM auth.users WHERE id = :id")
                .bind("id", userId)
                .map(row -> row.get("name", String.class))
                .one()
                .defaultIfEmpty("");
    }

    private Mono<Map<String, String>> resolveUserNames(List<String> userIds) {
        if (userIds.isEmpty()) {
            return Mono.just(Map.of());
        }
        return databaseClient
                .sql("SELECT id, name FROM auth.users WHERE id IN (:ids)")
                .bind("ids", userIds)
                .map(row -> new String[]{row.get("id", String.class), row.get("name", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> arr[1]);
    }
}
