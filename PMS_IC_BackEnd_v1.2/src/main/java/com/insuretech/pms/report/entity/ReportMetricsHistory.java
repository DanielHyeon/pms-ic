package com.insuretech.pms.report.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Report metrics history entity - stores time-series data for trend analysis
 */
@Entity
@Table(name = "report_metrics_history", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportMetricsHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", length = 50, nullable = false)
    private String projectId;

    // Time dimension
    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", length = 20, nullable = false)
    private ReportType reportType;

    @Column(name = "fiscal_year")
    private Integer fiscalYear;

    @Column(name = "fiscal_quarter")
    private Integer fiscalQuarter;

    @Column(name = "fiscal_month")
    private Integer fiscalMonth;

    @Column(name = "fiscal_week")
    private Integer fiscalWeek;

    // Task metrics
    @Column(name = "total_tasks")
    @Builder.Default
    private Integer totalTasks = 0;

    @Column(name = "completed_tasks")
    @Builder.Default
    private Integer completedTasks = 0;

    @Column(name = "in_progress_tasks")
    @Builder.Default
    private Integer inProgressTasks = 0;

    @Column(name = "blocked_tasks")
    @Builder.Default
    private Integer blockedTasks = 0;

    @Column(name = "delayed_tasks")
    @Builder.Default
    private Integer delayedTasks = 0;

    // Performance metrics
    @Column(name = "completion_rate", precision = 5, scale = 2)
    private BigDecimal completionRate;

    @Column(name = "velocity", precision = 10, scale = 2)
    private BigDecimal velocity;

    @Column(name = "story_points_completed")
    @Builder.Default
    private Integer storyPointsCompleted = 0;

    @Column(name = "story_points_planned")
    @Builder.Default
    private Integer storyPointsPlanned = 0;

    // Quality metrics
    @Column(name = "bug_count")
    @Builder.Default
    private Integer bugCount = 0;

    @Column(name = "bug_resolved")
    @Builder.Default
    private Integer bugResolved = 0;

    @Column(name = "test_coverage", precision = 5, scale = 2)
    private BigDecimal testCoverage;

    // Scope (optional)
    @Column(name = "scope_type", length = 30)
    private String scopeType;

    @Column(name = "scope_id", length = 50)
    private String scopeId;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
