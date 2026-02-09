package com.insuretech.pms.ai.service;

import com.insuretech.pms.ai.dto.DecisionTraceEventDto;
import com.insuretech.pms.ai.entity.R2dbcDecisionTrace;
import com.insuretech.pms.ai.repository.DecisionTraceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Service for logging decision trace events to ai.decision_trace_log.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiDecisionTraceService {

    private final DecisionTraceRepository traceRepository;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public Mono<Void> logEvent(String projectId, DecisionTraceEventDto event) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .defaultIfEmpty("anonymous")
                .flatMap(userId -> {
                    OffsetDateTime now = OffsetDateTime.now(KST);

                    R2dbcDecisionTrace trace = R2dbcDecisionTrace.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .userId(userId)
                            .userRole("UNKNOWN") // Will be enriched by caller context
                            .eventType(event.eventType())
                            .briefingId(event.briefingId())
                            .insightId(event.insightId())
                            .insightType(event.insightType())
                            .severity(event.severity())
                            .confidence(event.confidence() != null
                                    ? BigDecimal.valueOf(event.confidence()) : null)
                            .actionId(event.actionId())
                            .actionResult(event.actionResult())
                            .generationMethod(event.generationMethod())
                            .completeness(event.completeness())
                            .asOf(now)
                            .generatedAt(now)
                            .actionClickedAt("ACTION_CLICKED".equals(event.eventType()) ? now : null)
                            .actionCompletedAt("ACTION_COMPLETED".equals(event.eventType()) ? now : null)
                            .isNew(true)
                            .build();

                    return traceRepository.save(trace);
                })
                .then()
                .doOnSuccess(v -> log.debug("Logged trace event: type={} project={}", event.eventType(), projectId))
                .onErrorResume(e -> {
                    log.error("Failed to log trace event: {}", e.getMessage());
                    return Mono.empty();
                });
    }
}
