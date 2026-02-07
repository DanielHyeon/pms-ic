package com.insuretech.pms.view.service;

import com.insuretech.pms.view.dto.DataQualityResponse;
import com.insuretech.pms.view.dto.DataQualityResponse.*;
import io.r2dbc.spi.Row;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Data Quality Service: 10 metrics across 3 categories (Integrity/Readiness/Traceability).
 * Scores are calculated with weighted formula: integrity*0.4 + readiness*0.35 + traceability*0.25.
 * Snapshots are auto-saved on API call (query-time snapshot strategy).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataQualityService {

    private final DatabaseClient db;

    private static final double INTEGRITY_WEIGHT = 0.4;
    private static final double READINESS_WEIGHT = 0.35;
    private static final double TRACEABILITY_WEIGHT = 0.25;

    // Metric definitions: id -> (name, target, category)
    private record MetricDef(String name, double target, String category) {}
    private static final Map<String, MetricDef> METRIC_DEFS = Map.ofEntries(
        Map.entry("part_join_rate", new MetricDef("Part JOIN Success Rate", 100, "integrity")),
        Map.entry("requirement_join_rate", new MetricDef("Requirement JOIN Success Rate", 100, "integrity")),
        Map.entry("feature_part_match_rate", new MetricDef("Feature-Part Consistency", 100, "integrity")),
        Map.entry("epic_text_match_rate", new MetricDef("Epic-Story Name Match Rate", 100, "integrity")),
        Map.entry("epic_id_coverage", new MetricDef("Epic ID Coverage", 80, "readiness")),
        Map.entry("part_id_coverage", new MetricDef("Part ID Coverage", 90, "readiness")),
        Map.entry("backlog_link_rate", new MetricDef("Backlog Item Link Rate", 70, "readiness")),
        Map.entry("requirement_input_completeness", new MetricDef("Requirement Input Completeness", 80, "traceability")),
        Map.entry("requirement_ref_validity", new MetricDef("Requirement Reference Validity", 100, "traceability")),
        Map.entry("story_decomposition_rate", new MetricDef("Story Decomposition Rate", 70, "traceability"))
    );

    /**
     * Main entry: calculate metrics -> build response -> save snapshot -> attach history.
     */
    public Mono<DataQualityResponse> getDataQuality(String projectId) {
        return calculateMetrics(projectId)
            .flatMap(response -> upsertSnapshot(projectId, response).thenReturn(response))
            .flatMap(response -> getHistory(projectId, 30)
                .map(history -> {
                    response.setHistory(history);
                    return response;
                }));
    }

    /**
     * Run all 10 metric queries and assemble the response.
     */
    private Mono<DataQualityResponse> calculateMetrics(String projectId) {
        String sql = """
            WITH integrity_metrics AS (
                SELECT 'part_join_rate' AS metric_id,
                    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) AS numerator,
                    COUNT(*) AS denominator
                FROM task.tasks t
                LEFT JOIN project.parts p ON t.part_id = p.id
                WHERE t.part_id IS NOT NULL AND t.project_id = :projectId

                UNION ALL

                SELECT 'requirement_join_rate',
                    COUNT(CASE WHEN r.id IS NOT NULL THEN 1 END),
                    COUNT(*)
                FROM project.backlog_items bi
                LEFT JOIN project.requirements r ON bi.requirement_id = r.id
                JOIN project.backlogs b ON bi.backlog_id = b.id
                WHERE bi.requirement_id IS NOT NULL AND b.project_id = :projectId

                UNION ALL

                SELECT 'feature_part_match_rate',
                    COUNT(CASE WHEN us.part_id = f.part_id THEN 1 END),
                    COUNT(*)
                FROM task.user_stories us
                JOIN project.features f ON us.feature_id = f.id
                WHERE us.feature_id IS NOT NULL AND us.project_id = :projectId

                UNION ALL

                SELECT 'epic_text_match_rate',
                    COUNT(CASE WHEN us.epic = e.name THEN 1 END),
                    COUNT(*)
                FROM task.user_stories us
                JOIN project.epics e ON us.epic_id = e.id
                WHERE us.epic_id IS NOT NULL AND us.project_id = :projectId
            ),
            readiness_metrics AS (
                SELECT 'epic_id_coverage' AS metric_id,
                    COUNT(epic_id) AS numerator,
                    COUNT(*) AS denominator
                FROM task.user_stories WHERE project_id = :projectId

                UNION ALL

                SELECT 'part_id_coverage',
                    COUNT(part_id), COUNT(*)
                FROM task.user_stories WHERE project_id = :projectId

                UNION ALL

                SELECT 'backlog_link_rate',
                    COUNT(backlog_item_id), COUNT(*)
                FROM task.user_stories WHERE project_id = :projectId
            ),
            traceability_metrics AS (
                SELECT 'requirement_input_completeness' AS metric_id,
                    COUNT(bi.requirement_id) AS numerator,
                    COUNT(*) AS denominator
                FROM project.backlog_items bi
                JOIN project.backlogs b ON bi.backlog_id = b.id
                WHERE b.project_id = :projectId

                UNION ALL

                SELECT 'requirement_ref_validity',
                    COUNT(CASE WHEN r.id IS NOT NULL THEN 1 END),
                    COUNT(*)
                FROM project.backlog_items bi
                LEFT JOIN project.requirements r ON bi.requirement_id = r.id
                JOIN project.backlogs b ON bi.backlog_id = b.id
                WHERE bi.requirement_id IS NOT NULL AND b.project_id = :projectId

                UNION ALL

                SELECT 'story_decomposition_rate',
                    COUNT(DISTINCT us.backlog_item_id),
                    COUNT(DISTINCT bi.id)
                FROM project.backlog_items bi
                JOIN project.backlogs b ON bi.backlog_id = b.id
                LEFT JOIN task.user_stories us ON us.backlog_item_id = bi.id
                WHERE b.project_id = :projectId
            )
            SELECT metric_id,
                   numerator,
                   denominator,
                   CASE WHEN denominator > 0
                        THEN ROUND(100.0 * numerator / denominator, 1)
                        ELSE 100.0 END AS value
            FROM (
                SELECT * FROM integrity_metrics
                UNION ALL SELECT * FROM readiness_metrics
                UNION ALL SELECT * FROM traceability_metrics
            ) all_metrics
            """;

        return db.sql(sql)
            .bind("projectId", projectId)
            .map((row, meta) -> mapRowToMetric(row))
            .all()
            .collectList()
            .map(metrics -> assembleResponse(projectId, metrics));
    }

    private Metric mapRowToMetric(Row row) {
        String metricId = row.get("metric_id", String.class);
        Number numVal = row.get("numerator", Number.class);
        Number denVal = row.get("denominator", Number.class);
        Number valNum = row.get("value", Number.class);

        long numerator = numVal != null ? numVal.longValue() : 0;
        long denominator = denVal != null ? denVal.longValue() : 0;
        double value = valNum != null ? valNum.doubleValue() : 100.0;

        MetricDef def = METRIC_DEFS.getOrDefault(metricId,
            new MetricDef(metricId, 100, "unknown"));

        String status;
        if (value >= def.target) {
            status = "OK";
        } else if (value >= def.target * 0.8) {
            status = "WARNING";
        } else {
            status = "DANGER";
        }

        return Metric.builder()
            .id(metricId)
            .name(def.name)
            .value(value)
            .target(def.target)
            .unit("%")
            .status(status)
            .numerator(numerator)
            .denominator(denominator)
            .build();
    }

    private DataQualityResponse assembleResponse(String projectId, List<Metric> metrics) {
        Map<String, List<Metric>> byCategory = new LinkedHashMap<>();
        byCategory.put("integrity", new ArrayList<>());
        byCategory.put("readiness", new ArrayList<>());
        byCategory.put("traceability", new ArrayList<>());

        for (Metric m : metrics) {
            MetricDef def = METRIC_DEFS.get(m.getId());
            String cat = def != null ? def.category : "unknown";
            byCategory.computeIfAbsent(cat, k -> new ArrayList<>()).add(m);
        }

        double integrityScore = avgScore(byCategory.get("integrity"));
        double readinessScore = avgScore(byCategory.get("readiness"));
        double traceabilityScore = avgScore(byCategory.get("traceability"));

        double overallScore = Math.round(
            (integrityScore * INTEGRITY_WEIGHT
             + readinessScore * READINESS_WEIGHT
             + traceabilityScore * TRACEABILITY_WEIGHT) * 10.0) / 10.0;

        String grade = computeGrade(overallScore);

        Map<String, CategoryScore> categories = new LinkedHashMap<>();
        categories.put("integrity", CategoryScore.builder()
            .score(integrityScore).weight(INTEGRITY_WEIGHT)
            .metrics(byCategory.get("integrity")).build());
        categories.put("readiness", CategoryScore.builder()
            .score(readinessScore).weight(READINESS_WEIGHT)
            .metrics(byCategory.get("readiness")).build());
        categories.put("traceability", CategoryScore.builder()
            .score(traceabilityScore).weight(TRACEABILITY_WEIGHT)
            .metrics(byCategory.get("traceability")).build());

        List<DataIssue> issues = buildIssues(metrics);

        return DataQualityResponse.builder()
            .projectId(projectId)
            .timestamp(LocalDateTime.now())
            .overallScore(overallScore)
            .grade(grade)
            .categories(categories)
            .issues(issues)
            .history(List.of())
            .build();
    }

    private double avgScore(List<Metric> metrics) {
        if (metrics == null || metrics.isEmpty()) return 100.0;
        return Math.round(metrics.stream()
            .mapToDouble(Metric::getValue)
            .average()
            .orElse(100.0) * 10.0) / 10.0;
    }

    private String computeGrade(double score) {
        if (score >= 90) return "A";
        if (score >= 75) return "B";
        if (score >= 60) return "C";
        if (score >= 40) return "D";
        return "F";
    }

    private List<DataIssue> buildIssues(List<Metric> metrics) {
        List<DataIssue> issues = new ArrayList<>();
        for (Metric m : metrics) {
            if ("OK".equals(m.getStatus())) continue;

            MetricDef def = METRIC_DEFS.get(m.getId());
            if (def == null) continue;

            String action = switch (m.getId()) {
                case "part_id_coverage" -> "PM should assign Parts to unassigned stories";
                case "epic_id_coverage" -> "PO should assign Epics to unlinked stories";
                case "backlog_link_rate" -> "PO should link stories to backlog items";
                case "requirement_input_completeness" -> "PO should link requirements to backlog items";
                case "story_decomposition_rate" -> "PO should decompose backlog items into stories";
                case "part_join_rate" -> "Admin should fix invalid part references in tasks";
                case "requirement_join_rate" -> "Admin should fix invalid requirement references";
                case "feature_part_match_rate" -> "PM should align story part_id with feature part_id";
                case "epic_text_match_rate" -> "PM should update story epic text to match epic name";
                case "requirement_ref_validity" -> "Admin should fix invalid requirement references";
                default -> "Review and fix data quality issues";
            };

            long gap = m.getDenominator() - m.getNumerator();
            String desc = String.format("%s: %.1f%% (%d/%d), target: %.0f%%, %d items need attention",
                def.name, m.getValue(), m.getNumerator(), m.getDenominator(), def.target, gap);

            issues.add(DataIssue.builder()
                .severity(m.getStatus())
                .category(def.category)
                .metric(m.getId())
                .description(desc)
                .affectedEntities(List.of())
                .suggestedAction(action)
                .build());
        }
        return issues;
    }

    /**
     * UPSERT today's snapshot (project_id + snapshot_date unique).
     */
    private Mono<Void> upsertSnapshot(String projectId, DataQualityResponse response) {
        String upsertSql = """
            INSERT INTO audit.data_quality_snapshots
                (id, project_id, snapshot_date, overall_score, grade,
                 integrity_score, readiness_score, traceability_score, metrics_json)
            VALUES
                (gen_random_uuid()::text, :projectId, CURRENT_DATE, :overallScore, :grade,
                 :integrityScore, :readinessScore, :traceabilityScore, :metricsJson::jsonb)
            ON CONFLICT (project_id, snapshot_date)
            DO UPDATE SET
                overall_score = EXCLUDED.overall_score,
                grade = EXCLUDED.grade,
                integrity_score = EXCLUDED.integrity_score,
                readiness_score = EXCLUDED.readiness_score,
                traceability_score = EXCLUDED.traceability_score,
                metrics_json = EXCLUDED.metrics_json,
                created_at = NOW()
            """;

        CategoryScore integrity = response.getCategories().get("integrity");
        CategoryScore readiness = response.getCategories().get("readiness");
        CategoryScore traceability = response.getCategories().get("traceability");

        // Simple JSON serialization for metrics_json
        String metricsJson = buildMetricsJson(response);

        return db.sql(upsertSql)
            .bind("projectId", projectId)
            .bind("overallScore", response.getOverallScore())
            .bind("grade", response.getGrade())
            .bind("integrityScore", integrity != null ? integrity.getScore() : 0.0)
            .bind("readinessScore", readiness != null ? readiness.getScore() : 0.0)
            .bind("traceabilityScore", traceability != null ? traceability.getScore() : 0.0)
            .bind("metricsJson", metricsJson)
            .then();
    }

    private String buildMetricsJson(DataQualityResponse response) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"overallScore\":").append(response.getOverallScore());
        sb.append(",\"grade\":\"").append(response.getGrade()).append("\"");
        sb.append(",\"categories\":{");
        boolean first = true;
        for (Map.Entry<String, CategoryScore> entry : response.getCategories().entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(entry.getKey()).append("\":{");
            sb.append("\"score\":").append(entry.getValue().getScore());
            sb.append(",\"weight\":").append(entry.getValue().getWeight());
            sb.append(",\"metrics\":[");
            boolean mFirst = true;
            for (Metric m : entry.getValue().getMetrics()) {
                if (!mFirst) sb.append(",");
                mFirst = false;
                sb.append("{\"id\":\"").append(m.getId()).append("\"");
                sb.append(",\"value\":").append(m.getValue());
                sb.append(",\"numerator\":").append(m.getNumerator());
                sb.append(",\"denominator\":").append(m.getDenominator());
                sb.append(",\"status\":\"").append(m.getStatus()).append("\"}");
            }
            sb.append("]}");
        }
        sb.append("}}");
        return sb.toString();
    }

    /**
     * Fetch historical snapshots for the last N days.
     */
    private Mono<List<HistoryEntry>> getHistory(String projectId, int days) {
        String sql = """
            SELECT snapshot_date, overall_score, integrity_score,
                   readiness_score, traceability_score
            FROM audit.data_quality_snapshots
            WHERE project_id = :projectId
              AND snapshot_date >= CURRENT_DATE - :days
            ORDER BY snapshot_date
            """;

        return db.sql(sql)
            .bind("projectId", projectId)
            .bind("days", days)
            .map((row, meta) -> HistoryEntry.builder()
                .date(row.get("snapshot_date", LocalDate.class).format(DateTimeFormatter.ISO_DATE))
                .score(row.get("overall_score", Number.class).doubleValue())
                .integrity(row.get("integrity_score", Number.class).doubleValue())
                .readiness(row.get("readiness_score", Number.class).doubleValue())
                .traceability(row.get("traceability_score", Number.class).doubleValue())
                .build())
            .all()
            .collectList();
    }
}
