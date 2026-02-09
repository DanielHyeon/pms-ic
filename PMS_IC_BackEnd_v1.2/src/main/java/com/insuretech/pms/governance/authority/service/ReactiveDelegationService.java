package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.governance.authority.dto.*;
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
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDelegationService {

    private final ReactiveDelegationRepository delegationRepository;
    private final ReactiveCapabilityRepository capabilityRepository;
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
                    if (!cap.isDelegatable()) {
                        return Mono.error(CustomException.badRequest("Capability is not delegatable: " + cap.getCode()));
                    }

                    if (request.getDurationType() == CreateDelegationRequest.DurationType.TEMPORARY
                            && request.getEndAt() == null) {
                        return Mono.error(CustomException.badRequest("End date required for TEMPORARY delegation"));
                    }

                    if (actorUserId.equals(request.getApproverId())) {
                        return Mono.error(CustomException.badRequest("Delegator cannot be the approver (self-approval not allowed)"));
                    }

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
                                return dto;
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

                    // Cascade revoke child delegations
                    return delegationRepository.findActiveChildDelegations(delegationId)
                            .flatMap(child -> {
                                child.setStatus("REVOKED");
                                child.setRevokedAt(OffsetDateTime.now());
                                child.setRevokedBy(actorUserId);
                                child.setRevokeReason("Parent delegation revoked");
                                child.setNew(false);
                                return delegationRepository.save(child);
                            })
                            .then(delegationRepository.save(d))
                            .map(DelegationDto::from);
                })
                .doOnSuccess(dto -> log.info("Revoked delegation {} (cascade)", delegationId));
    }

    public Flux<DelegationMapNodeDto> getDelegationMap(String projectId) {
        return delegationRepository.findByProjectIdAndStatus(projectId, "ACTIVE")
                .collectList()
                .flatMapMany(delegations -> {
                    // Build delegation map: group by delegator
                    Map<String, List<DelegationMapNodeDto.DelegationEdgeDto>> edgeMap = new LinkedHashMap<>();
                    Set<String> allUserIds = new LinkedHashSet<>();

                    for (R2dbcDelegation d : delegations) {
                        allUserIds.add(d.getDelegatorId());
                        allUserIds.add(d.getDelegateeId());

                        edgeMap.computeIfAbsent(d.getDelegatorId(), k -> new ArrayList<>())
                                .add(DelegationMapNodeDto.DelegationEdgeDto.builder()
                                        .delegationId(d.getId())
                                        .delegateeId(d.getDelegateeId())
                                        .capabilityCode(d.getCapabilityId()) // will be enriched
                                        .status(d.getStatus())
                                        .build());
                    }

                    // Resolve user names and capability codes
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
                                    // Enrich edges
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
                                return Flux.fromIterable(nodes);
                            });
                });
    }

    // --- Enrichment ---

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
