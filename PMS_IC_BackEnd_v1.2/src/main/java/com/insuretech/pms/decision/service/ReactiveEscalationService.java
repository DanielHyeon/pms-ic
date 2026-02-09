package com.insuretech.pms.decision.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.decision.dto.EscalationChainDto;
import com.insuretech.pms.decision.dto.EscalationRequest;
import com.insuretech.pms.decision.reactive.entity.R2dbcEscalationLink;
import com.insuretech.pms.decision.reactive.repository.ReactiveEscalationLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveEscalationService {

    private final ReactiveEscalationLinkRepository escalationRepository;

    @Transactional
    public Mono<EscalationChainDto.Link> createEscalation(String projectId, EscalationRequest request, String userId) {
        if (request.getTargetId() == null || request.getTargetId().isBlank()) {
            return Mono.error(CustomException.badRequest("targetId is required"));
        }

        return escalationRepository.existsBySourceTypeAndSourceIdAndTargetTypeAndTargetId(
                        request.getSourceType(), request.getSourceId(),
                        request.getTargetType(), request.getTargetId())
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(CustomException.conflict("Escalation link already exists"));
                    }

                    R2dbcEscalationLink link = R2dbcEscalationLink.builder()
                            .id(UUID.randomUUID().toString())
                            .sourceType(request.getSourceType())
                            .sourceId(request.getSourceId())
                            .targetType(request.getTargetType())
                            .targetId(request.getTargetId())
                            .escalatedBy(userId)
                            .reason(request.getReason())
                            .createdAt(LocalDateTime.now())
                            .build();

                    return escalationRepository.save(link);
                })
                .map(saved -> EscalationChainDto.Link.builder()
                        .sourceType(saved.getSourceType())
                        .sourceId(saved.getSourceId())
                        .targetType(saved.getTargetType())
                        .targetId(saved.getTargetId())
                        .escalatedBy(saved.getEscalatedBy())
                        .reason(saved.getReason())
                        .createdAt(saved.getCreatedAt())
                        .build())
                .doOnSuccess(link -> log.info("Created escalation: {} {} -> {} {}",
                        link.getSourceType(), link.getSourceId(), link.getTargetType(), link.getTargetId()));
    }

    public Mono<EscalationChainDto> getEscalationChain(String entityType, String entityId) {
        // Build chain by following links from source to target
        return buildChainForward(entityType, entityId, new ArrayList<>())
                .map(chain -> EscalationChainDto.builder()
                        .entityType(entityType)
                        .entityId(entityId)
                        .chain(chain)
                        .build());
    }

    private Mono<List<EscalationChainDto.Link>> buildChainForward(String entityType, String entityId,
                                                                    List<EscalationChainDto.Link> accumulated) {
        return escalationRepository.findBySourceTypeAndSourceId(entityType, entityId)
                .map(link -> EscalationChainDto.Link.builder()
                        .sourceType(link.getSourceType())
                        .sourceId(link.getSourceId())
                        .targetType(link.getTargetType())
                        .targetId(link.getTargetId())
                        .escalatedBy(link.getEscalatedBy())
                        .reason(link.getReason())
                        .createdAt(link.getCreatedAt())
                        .build())
                .collectList()
                .flatMap(links -> {
                    accumulated.addAll(links);
                    if (links.isEmpty() || accumulated.size() > 10) {
                        return Mono.just(accumulated);
                    }
                    // Follow the first link forward
                    EscalationChainDto.Link last = links.get(0);
                    return buildChainForward(last.getTargetType(), last.getTargetId(), accumulated);
                });
    }
}
