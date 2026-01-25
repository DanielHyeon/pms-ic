package com.insuretech.pms.report.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

/**
 * User report settings entity - stores auto-generation preferences per user
 */
@Entity
@Table(name = "user_report_settings", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserReportSettings extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "project_id", length = 50)
    private String projectId;

    // Weekly report settings
    @Column(name = "weekly_enabled")
    @Builder.Default
    private Boolean weeklyEnabled = false;

    @Column(name = "weekly_day_of_week")
    @Builder.Default
    private Integer weeklyDayOfWeek = 1; // Monday

    @Column(name = "weekly_time")
    @Builder.Default
    private LocalTime weeklyTime = LocalTime.of(9, 0);

    @Column(name = "weekly_template_id")
    private UUID weeklyTemplateId;

    @Column(name = "weekly_sections", columnDefinition = "TEXT[]")
    private String[] weeklySections;

    @Column(name = "weekly_use_ai_summary")
    @Builder.Default
    private Boolean weeklyUseAiSummary = true;

    // Monthly report settings
    @Column(name = "monthly_enabled")
    @Builder.Default
    private Boolean monthlyEnabled = false;

    @Column(name = "monthly_day_of_month")
    @Builder.Default
    private Integer monthlyDayOfMonth = 1;

    @Column(name = "monthly_time")
    @Builder.Default
    private LocalTime monthlyTime = LocalTime.of(9, 0);

    @Column(name = "monthly_template_id")
    private UUID monthlyTemplateId;

    @Column(name = "monthly_sections", columnDefinition = "TEXT[]")
    private String[] monthlySections;

    @Column(name = "monthly_use_ai_summary")
    @Builder.Default
    private Boolean monthlyUseAiSummary = true;

    // Notification settings
    @Column(name = "notify_on_complete")
    @Builder.Default
    private Boolean notifyOnComplete = true;

    @Column(name = "notify_email")
    @Builder.Default
    private Boolean notifyEmail = false;

    @Column(name = "notify_email_address", length = 255)
    private String notifyEmailAddress;

    @Column(name = "notify_slack")
    @Builder.Default
    private Boolean notifySlack = false;

    @Column(name = "notify_slack_channel", length = 100)
    private String notifySlackChannel;

    // Post-generation behavior
    @Column(name = "auto_publish")
    @Builder.Default
    private Boolean autoPublish = false;

    @Column(name = "edit_after_generate")
    @Builder.Default
    private Boolean editAfterGenerate = true;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "weekly_template_id", insertable = false, updatable = false)
    private ReportTemplate weeklyTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "monthly_template_id", insertable = false, updatable = false)
    private ReportTemplate monthlyTemplate;
}
