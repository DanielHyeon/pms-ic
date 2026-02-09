package com.insuretech.pms.ai.service;

import com.insuretech.pms.ai.dto.AiBriefingResponseDto;
import com.insuretech.pms.ai.dto.AiInsightDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * WebClient to Flask LLM service for briefing enrichment.
 * POST /api/ai/briefing/generate
 */
@Service
@Slf4j
public class AiLlmClient {

    private final WebClient webClient;

    public AiLlmClient(@Value("${ai.service.url}") String aiServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    /**
     * Enriches a rule-based briefing with LLM-generated headline and body.
     * Returns the original briefing on any error (graceful degradation).
     */
    public Mono<AiBriefingResponseDto> enrichBriefing(String projectId, String role, String scope,
                                                       AiBriefingResponseDto ruleBasedBriefing) {
        Map<String, Object> requestBody = Map.of(
                "projectId", projectId,
                "role", role,
                "scope", scope,
                "asOf", ruleBasedBriefing.context().asOf(),
                "rawMetrics", extractMetricsSummary(ruleBasedBriefing),
                "ruleFindings", extractFindings(ruleBasedBriefing.insights()),
                "completeness", ruleBasedBriefing.context().completeness(),
                "missingSignals", ruleBasedBriefing.context().missingSignals() != null
                        ? ruleBasedBriefing.context().missingSignals() : List.of()
        );

        return webClient.post()
                .uri("/api/ai/briefing/generate")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(LlmBriefingResponse.class)
                .map(llmResp -> mergeWithRuleBriefing(ruleBasedBriefing, llmResp))
                .timeout(Duration.ofSeconds(30))
                .doOnSuccess(dto -> log.info("LLM enrichment succeeded for project={}", projectId))
                .onErrorResume(e -> {
                    log.warn("LLM enrichment failed for project={}: {}. Using rule-only.", projectId, e.getMessage());
                    return Mono.just(ruleBasedBriefing);
                });
    }

    private Map<String, Object> extractMetricsSummary(AiBriefingResponseDto briefing) {
        // Pass summary signals as metrics summary for LLM
        return Map.of(
                "signals", briefing.summary() != null ? briefing.summary().signals() : List.of(),
                "healthStatus", briefing.summary() != null ? briefing.summary().healthStatus() : "UNKNOWN",
                "insightCount", briefing.insights() != null ? briefing.insights().size() : 0
        );
    }

    private List<Map<String, Object>> extractFindings(List<AiInsightDto> insights) {
        if (insights == null) return List.of();
        return insights.stream()
                .map(i -> Map.<String, Object>of(
                        "type", i.type(),
                        "severity", i.severity(),
                        "title", i.title(),
                        "confidence", i.confidence()
                ))
                .collect(Collectors.toList());
    }

    private AiBriefingResponseDto mergeWithRuleBriefing(AiBriefingResponseDto original, LlmBriefingResponse llm) {
        if (llm == null) return original;

        // Replace headline and body with LLM-generated content, keep everything else
        var newSummary = AiBriefingResponseDto.SummaryDto.builder()
                .headline(llm.headline() != null ? llm.headline() : original.summary().headline())
                .signals(original.summary().signals())
                .healthStatus(original.summary().healthStatus())
                .confidence(original.summary().confidence())
                .body(llm.body() != null ? llm.body() : original.summary().body())
                .build();

        var newExplainability = original.explainability() != null
                ? com.insuretech.pms.ai.dto.AiExplainabilityDto.builder()
                    .dataCollectedAt(original.explainability().dataCollectedAt())
                    .completeness(original.explainability().completeness())
                    .missingSignals(original.explainability().missingSignals())
                    .dataSources(original.explainability().dataSources())
                    .generationMethod("HYBRID")
                    .warnings(original.explainability().warnings())
                    .changeHistoryLinks(original.explainability().changeHistoryLinks())
                    .build()
                : original.explainability();

        return AiBriefingResponseDto.builder()
                .context(original.context())
                .summary(newSummary)
                .insights(original.insights())
                .recommendedActions(original.recommendedActions())
                .explainability(newExplainability)
                .build();
    }

    /**
     * Response DTO from Flask LLM endpoint.
     */
    private record LlmBriefingResponse(
            boolean success,
            LlmData data
    ) {
        String headline() { return data != null ? data.headline() : null; }
        String body() { return data != null ? data.body() : null; }
    }

    private record LlmData(
            String headline,
            String body,
            String generationMethod
    ) {}
}
