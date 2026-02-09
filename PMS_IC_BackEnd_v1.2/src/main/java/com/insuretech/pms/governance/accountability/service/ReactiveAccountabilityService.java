package com.insuretech.pms.governance.accountability.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.governance.accountability.dto.*;
import com.insuretech.pms.governance.accountability.entity.R2dbcAccountabilityChangeLog;
import com.insuretech.pms.governance.accountability.entity.R2dbcProjectAccountability;
import com.insuretech.pms.governance.accountability.repository.ReactiveAccountabilityChangeLogRepository;
import com.insuretech.pms.governance.accountability.repository.ReactiveAccountabilityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveAccountabilityService {

    private final ReactiveAccountabilityRepository accountabilityRepository;
    private final ReactiveAccountabilityChangeLogRepository changeLogRepository;
    private final DatabaseClient databaseClient;

    public Mono<AccountabilityDto> getAccountability(String projectId) {
        return accountabilityRepository.findByProjectId(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound(
                        "Accountability not found for project: " + projectId)))
                .map(AccountabilityDto::from)
                .flatMap(dto -> enrichWithUserNames(dto));
    }

    public Flux<ChangeLogEntryDto> getChangeLog(String projectId) {
        return changeLogRepository.findByProjectIdOrderByChangedAtDesc(projectId)
                .map(ChangeLogEntryDto::from);
    }

    @Transactional
    public Mono<AccountabilityDto> updateAccountability(
            String projectId, UpdateAccountabilityRequest request, String actorUserId) {

        return accountabilityRepository.findByProjectId(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound(
                        "Accountability not found for project: " + projectId)))
                .flatMap(acct -> {
                    String previousUserId = getPreviousUserId(acct, request.getChangeType());
                    applyChange(acct, request, actorUserId);

                    R2dbcAccountabilityChangeLog logEntry = R2dbcAccountabilityChangeLog.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .changeType(request.getChangeType().name())
                            .previousUserId(previousUserId)
                            .newUserId(request.getNewUserId())
                            .changedBy(actorUserId)
                            .changeReason(request.getChangeReason())
                            .changedAt(OffsetDateTime.now())
                            .build();

                    return changeLogRepository.save(logEntry)
                            .then(accountabilityRepository.save(acct));
                })
                .map(AccountabilityDto::from)
                .flatMap(dto -> enrichWithUserNames(dto))
                .doOnSuccess(dto -> log.info("Updated accountability for project {}: {} -> {}",
                        projectId, request.getChangeType(), request.getNewUserId()));
    }

    @Transactional
    public Mono<AccountabilityDto> createAccountability(
            String projectId, String pmUserId, String actorUserId) {

        return accountabilityRepository.findByProjectId(projectId)
                .flatMap(existing -> Mono.<R2dbcProjectAccountability>error(
                        CustomException.conflict("Accountability already exists for project: " + projectId)))
                .switchIfEmpty(Mono.defer(() -> {
                    R2dbcProjectAccountability acct = R2dbcProjectAccountability.builder()
                            .projectId(projectId)
                            .primaryPmUserId(pmUserId)
                            .updatedAt(OffsetDateTime.now())
                            .updatedBy(actorUserId)
                            .isNew(true)
                            .build();
                    return accountabilityRepository.save(acct);
                }))
                .map(AccountabilityDto::from);
    }

    public Mono<ConnectionSummaryDto> getConnectionSummary(String projectId) {
        Mono<Long> partCount = databaseClient
                .sql("SELECT count(*) FROM organization.parts WHERE project_id = :projectId AND status = 'ACTIVE'")
                .bind("projectId", projectId)
                .map(row -> row.get(0, Long.class))
                .one()
                .defaultIfEmpty(0L);

        Mono<Long> memberCount = databaseClient
                .sql("SELECT count(DISTINCT user_id) FROM organization.part_memberships WHERE project_id = :projectId AND left_at IS NULL")
                .bind("projectId", projectId)
                .map(row -> row.get(0, Long.class))
                .one()
                .defaultIfEmpty(0L);

        Mono<Long> delegationCount = databaseClient
                .sql("SELECT count(*) FROM governance.delegations WHERE project_id = :projectId AND status = 'ACTIVE'")
                .bind("projectId", projectId)
                .map(row -> row.get(0, Long.class))
                .one()
                .defaultIfEmpty(0L);

        return Mono.zip(partCount, memberCount, delegationCount)
                .map(tuple -> ConnectionSummaryDto.builder()
                        .partCount(tuple.getT1())
                        .totalMemberCount(tuple.getT2())
                        .activeDelegationCount(tuple.getT3())
                        .build());
    }

    private String getPreviousUserId(R2dbcProjectAccountability acct,
                                      UpdateAccountabilityRequest.ChangeType changeType) {
        return switch (changeType) {
            case PM_CHANGE -> acct.getPrimaryPmUserId();
            case CO_PM_CHANGE -> acct.getCoPmUserId();
            case SPONSOR_CHANGE -> acct.getSponsorUserId();
        };
    }

    private void applyChange(R2dbcProjectAccountability acct,
                              UpdateAccountabilityRequest request, String actorUserId) {
        switch (request.getChangeType()) {
            case PM_CHANGE -> {
                if (request.getNewUserId() == null || request.getNewUserId().isBlank()) {
                    throw CustomException.badRequest("PM cannot be null");
                }
                acct.setPrimaryPmUserId(request.getNewUserId());
            }
            case CO_PM_CHANGE -> acct.setCoPmUserId(request.getNewUserId());
            case SPONSOR_CHANGE -> acct.setSponsorUserId(request.getNewUserId());
        }
        acct.setUpdatedAt(OffsetDateTime.now());
        acct.setUpdatedBy(actorUserId);
    }

    private Mono<AccountabilityDto> enrichWithUserNames(AccountabilityDto dto) {
        return databaseClient
                .sql("SELECT id, name FROM auth.users WHERE id IN (:ids)")
                .bind("ids", java.util.List.of(
                        dto.getPrimaryPmUserId(),
                        dto.getCoPmUserId() != null ? dto.getCoPmUserId() : "",
                        dto.getSponsorUserId() != null ? dto.getSponsorUserId() : ""
                ))
                .map(row -> new String[]{row.get("id", String.class), row.get("name", String.class)})
                .all()
                .collectMap(arr -> arr[0], arr -> arr[1])
                .map(userNames -> {
                    dto.setPrimaryPmName(userNames.getOrDefault(dto.getPrimaryPmUserId(), ""));
                    if (dto.getCoPmUserId() != null) {
                        dto.setCoPmName(userNames.getOrDefault(dto.getCoPmUserId(), ""));
                    }
                    if (dto.getSponsorUserId() != null) {
                        dto.setSponsorName(userNames.getOrDefault(dto.getSponsorUserId(), ""));
                    }
                    return dto;
                })
                .defaultIfEmpty(dto);
    }
}
