package com.insuretech.pms.report.dto;

import com.insuretech.pms.report.entity.UserReportSettings;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

/**
 * DTO for UserReportSettings entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSettingsDto {

    private UUID id;
    private String userId;
    private String projectId;

    // Weekly settings
    private Boolean weeklyEnabled;
    private Integer weeklyDayOfWeek;
    private LocalTime weeklyTime;
    private UUID weeklyTemplateId;
    private String weeklyTemplateName;
    private String[] weeklySections;
    private Boolean weeklyUseAiSummary;

    // Monthly settings
    private Boolean monthlyEnabled;
    private Integer monthlyDayOfMonth;
    private LocalTime monthlyTime;
    private UUID monthlyTemplateId;
    private String monthlyTemplateName;
    private String[] monthlySections;
    private Boolean monthlyUseAiSummary;

    // Notifications
    private Boolean notifyOnComplete;
    private Boolean notifyEmail;
    private String notifyEmailAddress;
    private Boolean notifySlack;
    private String notifySlackChannel;

    // Behavior
    private Boolean autoPublish;
    private Boolean editAfterGenerate;

    // Computed - next scheduled time
    private String nextScheduledAt;

    public static ReportSettingsDto from(UserReportSettings settings) {
        return ReportSettingsDto.builder()
                .id(settings.getId())
                .userId(settings.getUserId())
                .projectId(settings.getProjectId())
                .weeklyEnabled(settings.getWeeklyEnabled())
                .weeklyDayOfWeek(settings.getWeeklyDayOfWeek())
                .weeklyTime(settings.getWeeklyTime())
                .weeklyTemplateId(settings.getWeeklyTemplateId())
                .weeklyTemplateName(settings.getWeeklyTemplate() != null ?
                        settings.getWeeklyTemplate().getName() : null)
                .weeklySections(settings.getWeeklySections())
                .weeklyUseAiSummary(settings.getWeeklyUseAiSummary())
                .monthlyEnabled(settings.getMonthlyEnabled())
                .monthlyDayOfMonth(settings.getMonthlyDayOfMonth())
                .monthlyTime(settings.getMonthlyTime())
                .monthlyTemplateId(settings.getMonthlyTemplateId())
                .monthlyTemplateName(settings.getMonthlyTemplate() != null ?
                        settings.getMonthlyTemplate().getName() : null)
                .monthlySections(settings.getMonthlySections())
                .monthlyUseAiSummary(settings.getMonthlyUseAiSummary())
                .notifyOnComplete(settings.getNotifyOnComplete())
                .notifyEmail(settings.getNotifyEmail())
                .notifyEmailAddress(settings.getNotifyEmailAddress())
                .notifySlack(settings.getNotifySlack())
                .notifySlackChannel(settings.getNotifySlackChannel())
                .autoPublish(settings.getAutoPublish())
                .editAfterGenerate(settings.getEditAfterGenerate())
                .build();
    }
}
