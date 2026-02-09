package com.insuretech.pms.ai.service;

import com.insuretech.pms.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Main orchestration service for AI briefings.
 * Flow: cache check → aggregate → rules → assemble → cache → (background) LLM enrichment.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiBriefingService {

    private final AiBriefingCacheService cacheService;
    private final AiDataAggregationService aggregationService;
    private final AiRuleEngine ruleEngine;
    private final AiActionMapper actionMapper;
    private final AiLlmClient llmClient;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /**
     * Get briefing: cache → DB fallback → generate fresh.
     */
    public Mono<AiBriefingResponseDto> getBriefing(String projectId, String role, String scope) {
        return cacheService.get(projectId, role, scope)
                .switchIfEmpty(generateFreshBriefing(projectId, role, scope));
    }

    /**
     * Force refresh: invalidate cache and regenerate.
     */
    public Mono<AiBriefingResponseDto> refreshBriefing(String projectId, String role, String scope) {
        return cacheService.invalidate(projectId, role, scope)
                .then(generateFreshBriefing(projectId, role, scope));
    }

    private Mono<AiBriefingResponseDto> generateFreshBriefing(String projectId, String role, String scope) {
        String asOf = OffsetDateTime.now(KST).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        String briefingId = UUID.randomUUID().toString();

        return aggregationService.aggregateMetrics(projectId, scope)
                .map(metrics -> {
                    // Rule engine: detect insights
                    List<AiInsightDto> insights = ruleEngine.detectInsights(metrics, role, asOf);

                    // Map insights to actions
                    List<AiRecommendedActionDto> actions = actionMapper.mapActions(insights);

                    // Compute health status
                    String healthStatus = ruleEngine.computeHealthStatus(insights);

                    // Check completeness
                    List<String> missingSignals = aggregationService.checkCompleteness(metrics);
                    String completeness = missingSignals.isEmpty() ? "FULL" : "PARTIAL";

                    // Build context
                    var context = AiBriefingResponseDto.ContextDto.builder()
                            .projectId(projectId)
                            .role(role)
                            .asOf(asOf)
                            .scope(scope)
                            .completeness(completeness)
                            .missingSignals(missingSignals)
                            .build();

                    // Build summary (rule-based)
                    var summary = buildRuleSummary(insights, metrics, healthStatus, asOf);

                    // Build explainability
                    var explainability = buildExplainability(metrics, asOf, completeness, missingSignals);

                    return AiBriefingResponseDto.builder()
                            .context(context)
                            .summary(summary)
                            .insights(insights)
                            .recommendedActions(actions)
                            .explainability(explainability)
                            .build();
                })
                .flatMap(briefing ->
                        cacheService.store(projectId, role, scope, briefing)
                                .thenReturn(briefing)
                )
                .doOnSuccess(briefing -> {
                    // Fire-and-forget: LLM enrichment in background
                    llmClient.enrichBriefing(projectId, role, scope, briefing)
                            .flatMap(enriched -> cacheService.store(projectId, role, scope, enriched))
                            .subscribeOn(Schedulers.boundedElastic())
                            .subscribe(
                                    v -> log.info("LLM enrichment stored for project={}", projectId),
                                    e -> log.warn("Background LLM enrichment failed: {}", e.getMessage())
                            );
                });
    }

    private AiBriefingResponseDto.SummaryDto buildRuleSummary(
            List<AiInsightDto> insights,
            RawProjectMetrics metrics,
            String healthStatus,
            String asOf) {

        // Build headline from most severe insight
        String headline;
        if (insights.isEmpty()) {
            headline = "프로젝트가 정상 범위 내에서 진행 중입니다";
        } else {
            AiInsightDto topInsight = insights.get(0);
            headline = topInsight.title();
        }

        // Build signals list
        List<String> signals = new ArrayList<>();
        if (metrics.overdueTasks() != null && !metrics.overdueTasks().isEmpty()) {
            signals.add("지연 태스크 " + metrics.overdueTasks().size() + "건 감지");
        }
        if (metrics.sprintProgress() != null && metrics.sprintProgress().sprintId() != null) {
            signals.add("스프린트 진행률 " + String.format("%.1f", metrics.sprintProgress().progressPct()) + "%");
        }
        if (metrics.openIssues() != null && !metrics.openIssues().isEmpty()) {
            long highCount = metrics.openIssues().stream()
                    .filter(i -> "CRITICAL".equals(i.severity()) || "HIGH".equals(i.severity()))
                    .count();
            if (highCount > 0) {
                signals.add("고심각도 이슈 " + highCount + "건 미해결");
            }
        }
        if (signals.isEmpty()) {
            signals.add("특이사항 없음");
        }

        // Build body
        String body = insights.stream()
                .limit(3)
                .map(i -> "- [" + i.severity() + "] " + i.title())
                .collect(Collectors.joining("\n"));
        if (body.isBlank()) {
            body = "현재 프로젝트에서 주요 위험 신호가 감지되지 않았습니다.";
        }

        // Compute confidence (average of all insights, or 0.9 if none)
        double confidence = insights.isEmpty() ? 0.9
                : insights.stream().mapToDouble(AiInsightDto::confidence).average().orElse(0.9);

        return AiBriefingResponseDto.SummaryDto.builder()
                .headline(headline)
                .signals(signals)
                .healthStatus(healthStatus)
                .confidence(confidence)
                .body(body)
                .build();
    }

    private AiExplainabilityDto buildExplainability(
            RawProjectMetrics metrics, String asOf,
            String completeness, List<String> missingSignals) {

        int totalRecords = 0;
        List<AiExplainabilityDto.DataSourceDto> dataSources = new ArrayList<>();

        if (metrics.overdueTasks() != null) {
            totalRecords += metrics.overdueTasks().size();
            dataSources.add(AiExplainabilityDto.DataSourceDto.builder()
                    .source("PostgreSQL")
                    .tables(List.of("task.tasks", "auth.users"))
                    .recordCount(metrics.overdueTasks().size())
                    .lastSyncAt(asOf)
                    .build());
        }
        if (metrics.openIssues() != null) {
            totalRecords += metrics.openIssues().size();
            dataSources.add(AiExplainabilityDto.DataSourceDto.builder()
                    .source("PostgreSQL")
                    .tables(List.of("project.issues"))
                    .recordCount(metrics.openIssues().size())
                    .lastSyncAt(asOf)
                    .build());
        }
        if (metrics.sprintProgress() != null && metrics.sprintProgress().sprintId() != null) {
            dataSources.add(AiExplainabilityDto.DataSourceDto.builder()
                    .source("PostgreSQL")
                    .tables(List.of("task.sprints"))
                    .recordCount(1)
                    .lastSyncAt(asOf)
                    .build());
        }

        List<String> warnings = new ArrayList<>();
        if ("PARTIAL".equals(completeness)) {
            warnings.add("일부 데이터 소스를 사용할 수 없어 분석이 불완전할 수 있습니다.");
        }

        return AiExplainabilityDto.builder()
                .dataCollectedAt(asOf)
                .completeness(completeness)
                .missingSignals(missingSignals)
                .dataSources(dataSources)
                .generationMethod("RULE_BASED")
                .warnings(warnings)
                .changeHistoryLinks(List.of(
                        AiExplainabilityDto.ChangeHistoryLinkDto.builder()
                                .label("태스크 변경 이력")
                                .route("/kanban?view=history")
                                .build(),
                        AiExplainabilityDto.ChangeHistoryLinkDto.builder()
                                .label("이슈 변경 이력")
                                .route("/issues?view=history")
                                .build()
                ))
                .build();
    }
}
