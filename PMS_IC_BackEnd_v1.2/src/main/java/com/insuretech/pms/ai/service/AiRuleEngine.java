package com.insuretech.pms.ai.service;

import com.insuretech.pms.ai.dto.AiInsightDto;
import com.insuretech.pms.ai.dto.RawProjectMetrics;
import com.insuretech.pms.ai.dto.RawProjectMetrics.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Rule-based insight detection engine.
 * 8 detection rules covering delay, bottleneck, quality, resource, progress, and positive signals.
 */
@Component
@Slf4j
public class AiRuleEngine {

    /**
     * Detects insights from raw metrics filtered by user role.
     */
    public List<AiInsightDto> detectInsights(RawProjectMetrics metrics, String role, String asOf) {
        List<AiInsightDto> insights = new ArrayList<>();

        // R-DELAY-01: Overdue tasks
        detectOverdueTasks(metrics, asOf, insights);

        // R-DELAY-02: Sprint progress gap
        detectSprintProgressGap(metrics, asOf, insights);

        // R-BOTTLE-01: Assignee overload (>8 active tasks)
        detectAssigneeOverload(metrics, asOf, insights);

        // R-BOTTLE-02: Unassigned active tasks
        detectUnassignedTasks(metrics, asOf, insights);

        // R-QUALITY-01: Open high-severity issues
        detectHighSeverityIssues(metrics, asOf, insights);

        // R-RESOURCE-01: Single point of failure
        detectSinglePointOfFailure(metrics, asOf, insights);

        // R-PROGRESS-01: Sprint midpoint progress check
        detectSprintMidpointLag(metrics, asOf, insights);

        // R-POSITIVE-01: Ahead of schedule
        detectPositiveProgress(metrics, asOf, insights);

        return filterByRole(insights, role);
    }

    /**
     * Computes overall health status from detected insights.
     */
    public String computeHealthStatus(List<AiInsightDto> insights) {
        boolean hasCritical = insights.stream()
                .anyMatch(i -> "CRITICAL".equals(i.severity()) || "HIGH".equals(i.severity()));
        boolean hasMedium = insights.stream()
                .anyMatch(i -> "MEDIUM".equals(i.severity()));

        if (hasCritical) return "RED";
        if (hasMedium) return "YELLOW";
        return "GREEN";
    }

    // ----- Rule Implementations -----

    private void detectOverdueTasks(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        List<OverdueTask> overdue = metrics.overdueTasks();
        if (overdue == null || overdue.isEmpty()) return;

        int count = overdue.size();
        int maxDelay = overdue.stream().mapToInt(OverdueTask::delayDays).max().orElse(0);
        String severity = count >= 5 || maxDelay >= 7 ? "HIGH" : count >= 2 ? "MEDIUM" : "LOW";

        String topTasks = overdue.stream().limit(3)
                .map(t -> t.title() + " (" + t.delayDays() + "d)")
                .collect(Collectors.joining(", "));

        insights.add(AiInsightDto.builder()
                .id("INS-DELAY-" + UUID.randomUUID().toString().substring(0, 8))
                .type("DELAY")
                .severity(severity)
                .title(count + "개 태스크가 마감일을 초과했습니다")
                .description("최대 " + maxDelay + "일 지연. 주요 항목: " + topTasks)
                .confidence(0.95)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("overdue_count=" + count, "max_delay_days=" + maxDelay))
                        .entities(overdue.stream().limit(5).map(OverdueTask::id).toList())
                        .dataSource("task.tasks")
                        .build())
                .actionRefs(List.of("create-issue", "reassign-task"))
                .build());
    }

    private void detectSprintProgressGap(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        SprintProgress sp = metrics.sprintProgress();
        if (sp == null || sp.sprintId() == null || sp.startDate() == null || sp.endDate() == null) return;

        long totalDays = ChronoUnit.DAYS.between(sp.startDate(), sp.endDate());
        if (totalDays <= 0) return;

        long elapsed = ChronoUnit.DAYS.between(sp.startDate(), OffsetDateTime.now());
        double expectedProgress = Math.min(100.0, (elapsed * 100.0) / totalDays);
        double gap = expectedProgress - sp.progressPct();

        if (gap <= 10) return;

        String severity = gap >= 30 ? "HIGH" : gap >= 20 ? "MEDIUM" : "LOW";

        insights.add(AiInsightDto.builder()
                .id("INS-DELAY-" + UUID.randomUUID().toString().substring(0, 8))
                .type("DELAY")
                .severity(severity)
                .title("스프린트 진행률이 기대치보다 " + String.format("%.0f", gap) + "%p 뒤처져 있습니다")
                .description(sp.sprintName() + ": 현재 " + String.format("%.1f", sp.progressPct()) + "% 완료 (기대: "
                        + String.format("%.0f", expectedProgress) + "%). " + sp.completed() + "/" + sp.total() + " 태스크 완료.")
                .confidence(0.88)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("progress=" + sp.progressPct() + "%",
                                "expected=" + String.format("%.0f", expectedProgress) + "%",
                                "gap=" + String.format("%.0f", gap) + "%p"))
                        .entities(List.of(sp.sprintId()))
                        .dataSource("task.sprints, task.tasks")
                        .build())
                .actionRefs(List.of("create-issue", "create-meeting-agenda"))
                .build());
    }

    private void detectAssigneeOverload(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        if (metrics.assigneeWorkload() == null) return;

        List<AssigneeWorkload> overloaded = metrics.assigneeWorkload().stream()
                .filter(w -> w.activeTasks() > 8)
                .toList();

        if (overloaded.isEmpty()) return;

        String names = overloaded.stream().limit(3)
                .map(w -> w.assigneeName() + "(" + w.activeTasks() + ")")
                .collect(Collectors.joining(", "));

        insights.add(AiInsightDto.builder()
                .id("INS-BOTTLE-" + UUID.randomUUID().toString().substring(0, 8))
                .type("BOTTLENECK")
                .severity(overloaded.size() >= 3 ? "HIGH" : "MEDIUM")
                .title(overloaded.size() + "명의 담당자에게 작업이 과중됩니다")
                .description("8개 이상 활성 태스크 할당: " + names)
                .confidence(0.90)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("overloaded_count=" + overloaded.size()))
                        .entities(overloaded.stream().map(AssigneeWorkload::assigneeId).toList())
                        .dataSource("task.tasks, auth.users")
                        .build())
                .actionRefs(List.of("reassign-task", "create-meeting-agenda"))
                .build());
    }

    private void detectUnassignedTasks(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        // Detect from overdue tasks with null assignee
        if (metrics.overdueTasks() == null) return;

        long unassignedCount = metrics.overdueTasks().stream()
                .filter(t -> t.assigneeId() == null || t.assigneeId().isBlank())
                .count();

        if (unassignedCount == 0) return;

        insights.add(AiInsightDto.builder()
                .id("INS-RESOURCE-" + UUID.randomUUID().toString().substring(0, 8))
                .type("RESOURCE")
                .severity(unassignedCount >= 3 ? "MEDIUM" : "LOW")
                .title(unassignedCount + "개 지연 태스크에 담당자가 미배정입니다")
                .description("마감일 초과 태스크 중 담당자 미배정 건이 있습니다.")
                .confidence(0.92)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("unassigned_overdue=" + unassignedCount))
                        .entities(List.of())
                        .dataSource("task.tasks")
                        .build())
                .actionRefs(List.of("reassign-task"))
                .build());
    }

    private void detectHighSeverityIssues(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        if (metrics.openIssues() == null) return;

        List<OpenIssue> critical = metrics.openIssues().stream()
                .filter(i -> "CRITICAL".equals(i.severity()) || "HIGH".equals(i.severity()))
                .toList();

        if (critical.isEmpty()) return;

        String titles = critical.stream().limit(3)
                .map(i -> i.title() + " [" + i.severity() + "]")
                .collect(Collectors.joining(", "));

        insights.add(AiInsightDto.builder()
                .id("INS-QUALITY-" + UUID.randomUUID().toString().substring(0, 8))
                .type("QUALITY")
                .severity(critical.stream().anyMatch(i -> "CRITICAL".equals(i.severity())) ? "HIGH" : "MEDIUM")
                .title(critical.size() + "개의 고심각도 이슈가 미해결입니다")
                .description("주요 이슈: " + titles)
                .confidence(0.93)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("critical_issues=" + critical.size()))
                        .entities(critical.stream().map(OpenIssue::id).toList())
                        .dataSource("project.issues")
                        .build())
                .actionRefs(List.of("create-issue", "escalate-pmo"))
                .build());
    }

    private void detectSinglePointOfFailure(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        if (metrics.assigneeWorkload() == null) return;

        // If only 1 active member handles > 60% of total tasks
        int totalTasks = metrics.assigneeWorkload().stream().mapToInt(AssigneeWorkload::activeTasks).sum();
        if (totalTasks < 5) return;

        Optional<AssigneeWorkload> dominant = metrics.assigneeWorkload().stream()
                .filter(w -> w.activeTasks() > totalTasks * 0.6)
                .findFirst();

        if (dominant.isEmpty()) return;

        AssigneeWorkload d = dominant.get();
        insights.add(AiInsightDto.builder()
                .id("INS-BOTTLE-" + UUID.randomUUID().toString().substring(0, 8))
                .type("BOTTLENECK")
                .severity("MEDIUM")
                .title("단일 담당자 의존도가 높습니다")
                .description(d.assigneeName() + "이(가) 전체 활성 태스크의 "
                        + String.format("%.0f", (d.activeTasks() * 100.0 / totalTasks)) + "%를 담당합니다.")
                .confidence(0.85)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("dominant_ratio=" + String.format("%.0f%%", d.activeTasks() * 100.0 / totalTasks)))
                        .entities(List.of(d.assigneeId()))
                        .dataSource("task.tasks, auth.users")
                        .build())
                .actionRefs(List.of("reassign-task", "create-meeting-agenda"))
                .build());
    }

    private void detectSprintMidpointLag(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        SprintProgress sp = metrics.sprintProgress();
        if (sp == null || sp.sprintId() == null || sp.startDate() == null || sp.endDate() == null) return;

        long totalDays = ChronoUnit.DAYS.between(sp.startDate(), sp.endDate());
        long elapsed = ChronoUnit.DAYS.between(sp.startDate(), OffsetDateTime.now());

        // Only trigger at midpoint (40-60% through sprint)
        double elapsedPct = (elapsed * 100.0) / totalDays;
        if (elapsedPct < 40 || elapsedPct > 60) return;
        if (sp.progressPct() >= 30) return; // not lagging

        insights.add(AiInsightDto.builder()
                .id("INS-PROGRESS-" + UUID.randomUUID().toString().substring(0, 8))
                .type("PROGRESS")
                .severity("MEDIUM")
                .title("스프린트 중간점에서 진행률이 30% 미만입니다")
                .description(sp.sprintName() + " 스프린트의 " + String.format("%.0f", elapsedPct)
                        + "% 시점에서 완료율 " + String.format("%.1f", sp.progressPct()) + "%.")
                .confidence(0.80)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("midpoint_progress=" + sp.progressPct() + "%"))
                        .entities(List.of(sp.sprintId()))
                        .dataSource("task.sprints, task.tasks")
                        .build())
                .actionRefs(List.of("create-meeting-agenda"))
                .build());
    }

    private void detectPositiveProgress(RawProjectMetrics metrics, String asOf, List<AiInsightDto> insights) {
        SprintProgress sp = metrics.sprintProgress();
        if (sp == null || sp.sprintId() == null || sp.startDate() == null || sp.endDate() == null) return;

        long totalDays = ChronoUnit.DAYS.between(sp.startDate(), sp.endDate());
        if (totalDays <= 0) return;

        long elapsed = ChronoUnit.DAYS.between(sp.startDate(), OffsetDateTime.now());
        double expectedProgress = Math.min(100.0, (elapsed * 100.0) / totalDays);

        // Progress is ahead by more than 15%p
        double ahead = sp.progressPct() - expectedProgress;
        if (ahead < 15) return;

        insights.add(AiInsightDto.builder()
                .id("INS-POSITIVE-" + UUID.randomUUID().toString().substring(0, 8))
                .type("POSITIVE")
                .severity("INFO")
                .title("스프린트 진행이 기대보다 앞서 있습니다")
                .description(sp.sprintName() + ": " + String.format("%.1f", sp.progressPct())
                        + "% 완료 (기대 " + String.format("%.0f", expectedProgress) + "%). "
                        + String.format("%.0f", ahead) + "%p 앞서 진행 중.")
                .confidence(0.90)
                .evidence(AiInsightDto.EvidenceDto.builder()
                        .asOf(asOf)
                        .metrics(List.of("progress=" + sp.progressPct() + "%",
                                "ahead=" + String.format("%.0f", ahead) + "%p"))
                        .entities(List.of(sp.sprintId()))
                        .dataSource("task.sprints, task.tasks")
                        .build())
                .actionRefs(List.of("update-progress"))
                .build());
    }

    // ----- Role Filtering -----

    private List<AiInsightDto> filterByRole(List<AiInsightDto> insights, String role) {
        if (role == null) return insights;
        return switch (role.toUpperCase()) {
            case "PM" -> insights; // PM sees everything
            case "PMO_HEAD", "SPONSOR" -> insights.stream()
                    .filter(i -> Set.of("HIGH", "CRITICAL", "MEDIUM").contains(i.severity()))
                    .toList();
            case "DEVELOPER", "QA" -> insights.stream()
                    .filter(i -> Set.of("DELAY", "BOTTLENECK", "PROGRESS", "POSITIVE").contains(i.type()))
                    .toList();
            default -> insights;
        };
    }
}
