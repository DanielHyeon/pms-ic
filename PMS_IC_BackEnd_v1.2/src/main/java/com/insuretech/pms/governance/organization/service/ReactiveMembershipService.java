package com.insuretech.pms.governance.organization.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.governance.organization.dto.*;
import com.insuretech.pms.governance.organization.entity.R2dbcAssignmentChangeLog;
import com.insuretech.pms.governance.organization.entity.R2dbcPartMembership;
import com.insuretech.pms.governance.organization.repository.ReactiveAssignmentChangeLogRepository;
import com.insuretech.pms.governance.organization.repository.ReactiveOrgPartRepository;
import com.insuretech.pms.governance.organization.repository.ReactivePartMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveMembershipService {

    private final ReactiveOrgPartRepository partRepository;
    private final ReactivePartMembershipRepository membershipRepository;
    private final ReactiveAssignmentChangeLogRepository changeLogRepository;
    private final DatabaseClient databaseClient;

    @Transactional
    public Mono<MemberDto> addMember(String partId, AddMemberRequest request, String actorUserId) {
        return partRepository.findById(partId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Part not found: " + partId)))
                .flatMap(part -> {
                    if ("CLOSED".equals(part.getStatus())) {
                        return Mono.error(CustomException.badRequest("Cannot add member to a closed part"));
                    }

                    // Check if user already has active membership in this part
                    return membershipRepository.findActiveByPartIdAndUserId(partId, request.getUserId())
                            .flatMap(existing -> Mono.<MemberDto>error(
                                    CustomException.conflict("User already has active membership in this part")))
                            .switchIfEmpty(Mono.defer(() -> {
                                // PRIMARY uniqueness check: one active PRIMARY per user per project
                                if (request.getMembershipType() == AddMemberRequest.MembershipType.PRIMARY) {
                                    return membershipRepository.findActivePrimaryByProjectIdAndUserId(
                                                    part.getProjectId(), request.getUserId())
                                            .flatMap(existingPrimary -> Mono.<MemberDto>error(
                                                    CustomException.conflict(
                                                            "User already has a PRIMARY membership in part: " + existingPrimary.getPartId())))
                                            .switchIfEmpty(Mono.defer(() -> doAddMember(part.getProjectId(), partId, request, actorUserId)));
                                }
                                return doAddMember(part.getProjectId(), partId, request, actorUserId);
                            }));
                });
    }

    @Transactional
    public Mono<Void> removeMember(String partId, String userId, String actorUserId) {
        return membershipRepository.findActiveByPartIdAndUserId(partId, userId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Active membership not found")))
                .flatMap(membership -> {
                    // Last-membership protection: check if this is the user's last active membership in the project
                    return membershipRepository.findActiveByProjectIdAndUserId(membership.getProjectId(), userId)
                            .collectList()
                            .flatMap(allMemberships -> {
                                if (allMemberships.size() <= 1) {
                                    return Mono.error(CustomException.badRequest(
                                            "Cannot remove last membership. User must belong to at least one part."));
                                }

                                membership.setLeftAt(OffsetDateTime.now());
                                membership.setLeftBy(actorUserId);
                                membership.setNew(false);

                                R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                                        .id(UUID.randomUUID().toString())
                                        .projectId(membership.getProjectId())
                                        .partId(partId)
                                        .userId(userId)
                                        .changeType("MEMBERSHIP_REMOVE")
                                        .previousValue(membership.getMembershipType())
                                        .changedBy(actorUserId)
                                        .changedAt(OffsetDateTime.now())
                                        .isNew(true)
                                        .build();

                                return changeLogRepository.save(logEntry)
                                        .then(membershipRepository.save(membership))
                                        .then();
                            });
                })
                .doOnSuccess(v -> log.info("Removed member {} from part {}", userId, partId));
    }

    @Transactional
    public Mono<MemberDto> switchMembershipType(String partId, String userId, String actorUserId) {
        return membershipRepository.findActiveByPartIdAndUserId(partId, userId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Active membership not found")))
                .flatMap(membership -> {
                    String currentType = membership.getMembershipType();
                    String newType = "PRIMARY".equals(currentType) ? "SECONDARY" : "PRIMARY";

                    // If switching to PRIMARY, check uniqueness constraint
                    if ("PRIMARY".equals(newType)) {
                        return membershipRepository.findActivePrimaryByProjectIdAndUserId(
                                        membership.getProjectId(), userId)
                                .flatMap(existingPrimary -> Mono.<MemberDto>error(
                                        CustomException.conflict(
                                                "User already has a PRIMARY membership in part: " + existingPrimary.getPartId())))
                                .switchIfEmpty(Mono.defer(() -> doSwitchType(membership, currentType, newType, actorUserId)));
                    }
                    return doSwitchType(membership, currentType, newType, actorUserId);
                });
    }

    public Mono<UserPartSummaryDto> getUserPartSummary(String projectId, String userId) {
        return membershipRepository.findActiveByProjectIdAndUserId(projectId, userId)
                .collectList()
                .flatMap(memberships -> {
                    if (memberships.isEmpty()) {
                        return resolveUserName(userId)
                                .map(name -> UserPartSummaryDto.builder()
                                        .userId(userId)
                                        .userName(name)
                                        .memberships(List.of())
                                        .build());
                    }

                    List<String> partIds = memberships.stream().map(R2dbcPartMembership::getPartId).toList();

                    return resolvePartNames(partIds)
                            .flatMap(partNameMap -> resolveUserName(userId)
                                    .map(userName -> {
                                        List<UserPartSummaryDto.UserMembershipDto> membershipDtos = memberships.stream()
                                                .map(m -> {
                                                    String[] partInfo = partNameMap.getOrDefault(m.getPartId(), new String[]{"", ""});
                                                    return UserPartSummaryDto.UserMembershipDto.builder()
                                                            .partId(m.getPartId())
                                                            .partName(partInfo[0])
                                                            .partType(partInfo[1])
                                                            .membershipType(m.getMembershipType())
                                                            .joinedAt(m.getJoinedAt())
                                                            .build();
                                                })
                                                .toList();

                                        return UserPartSummaryDto.builder()
                                                .userId(userId)
                                                .userName(userName)
                                                .memberships(membershipDtos)
                                                .build();
                                    }));
                });
    }

    // --- Private helpers ---

    private Mono<MemberDto> doAddMember(String projectId, String partId, AddMemberRequest request, String actorUserId) {
        R2dbcPartMembership membership = R2dbcPartMembership.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .partId(partId)
                .userId(request.getUserId())
                .membershipType(request.getMembershipType().name())
                .joinedAt(OffsetDateTime.now())
                .joinedBy(actorUserId)
                .isNew(true)
                .build();

        R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .partId(partId)
                .userId(request.getUserId())
                .changeType("MEMBERSHIP_ADD")
                .newValue(request.getMembershipType().name())
                .changedBy(actorUserId)
                .changedAt(OffsetDateTime.now())
                .isNew(true)
                .build();

        return membershipRepository.save(membership)
                .then(changeLogRepository.save(logEntry))
                .then(Mono.just(MemberDto.from(membership)))
                .flatMap(dto -> resolveUserName(dto.getUserId())
                        .doOnNext(dto::setUserName)
                        .thenReturn(dto))
                .doOnSuccess(dto -> log.info("Added member {} to part {} as {}", request.getUserId(), partId, request.getMembershipType()));
    }

    private Mono<MemberDto> doSwitchType(R2dbcPartMembership membership, String currentType, String newType, String actorUserId) {
        membership.setMembershipType(newType);
        membership.setNew(false);

        R2dbcAssignmentChangeLog logEntry = R2dbcAssignmentChangeLog.builder()
                .id(UUID.randomUUID().toString())
                .projectId(membership.getProjectId())
                .partId(membership.getPartId())
                .userId(membership.getUserId())
                .changeType("PRIMARY_SWITCH")
                .previousValue(currentType)
                .newValue(newType)
                .changedBy(actorUserId)
                .changedAt(OffsetDateTime.now())
                .isNew(true)
                .build();

        return changeLogRepository.save(logEntry)
                .then(membershipRepository.save(membership))
                .map(saved -> MemberDto.builder()
                        .membershipId(saved.getId())
                        .userId(saved.getUserId())
                        .membershipType(saved.getMembershipType())
                        .joinedAt(saved.getJoinedAt())
                        .build())
                .flatMap(dto -> resolveUserName(dto.getUserId())
                        .doOnNext(dto::setUserName)
                        .thenReturn(dto))
                .doOnSuccess(dto -> log.info("Switched member {} in part {} from {} to {}",
                        membership.getUserId(), membership.getPartId(), currentType, newType));
    }

    private Mono<String> resolveUserName(String userId) {
        return databaseClient
                .sql("SELECT name FROM auth.users WHERE id = :id")
                .bind("id", userId)
                .map(row -> row.get("name", String.class))
                .one()
                .defaultIfEmpty("");
    }

    private Mono<java.util.Map<String, String[]>> resolvePartNames(List<String> partIds) {
        if (partIds.isEmpty()) {
            return Mono.just(java.util.Map.of());
        }
        return databaseClient
                .sql("SELECT id, name, part_type FROM organization.parts WHERE id IN (:ids)")
                .bind("ids", partIds)
                .map(row -> new String[]{
                        row.get("id", String.class),
                        row.get("name", String.class),
                        row.get("part_type", String.class)
                })
                .all()
                .collectMap(arr -> arr[0], arr -> new String[]{arr[1], arr[2]});
    }
}
