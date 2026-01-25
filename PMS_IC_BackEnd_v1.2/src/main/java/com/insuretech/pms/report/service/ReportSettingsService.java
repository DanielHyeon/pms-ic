package com.insuretech.pms.report.service;

import com.insuretech.pms.report.dto.ReportSettingsDto;
import com.insuretech.pms.report.entity.UserReportSettings;
import com.insuretech.pms.report.repository.UserReportSettingsRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing user report settings
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportSettingsService {

    private final UserReportSettingsRepository settingsRepository;

    /**
     * Get user settings (global or for specific project)
     */
    public ReportSettingsDto getUserSettings(String userId, String projectId) {
        Optional<UserReportSettings> settings;

        if (projectId != null) {
            settings = settingsRepository.findByUserIdAndProjectId(userId, projectId);
        } else {
            settings = settingsRepository.findGlobalSettings(userId);
        }

        if (settings.isEmpty()) {
            // Return default settings
            return createDefaultSettings(userId, projectId);
        }

        ReportSettingsDto dto = ReportSettingsDto.from(settings.get());
        dto.setNextScheduledAt(calculateNextScheduledTime(settings.get()));
        return dto;
    }

    /**
     * Save user settings
     */
    @Transactional
    public ReportSettingsDto saveUserSettings(String userId, ReportSettingsDto dto) {
        UserReportSettings settings = settingsRepository
                .findByUserIdAndProjectId(userId, dto.getProjectId())
                .orElse(new UserReportSettings());

        // Update fields
        settings.setUserId(userId);
        settings.setProjectId(dto.getProjectId());

        // Weekly settings
        settings.setWeeklyEnabled(dto.getWeeklyEnabled());
        settings.setWeeklyDayOfWeek(dto.getWeeklyDayOfWeek());
        settings.setWeeklyTime(dto.getWeeklyTime());
        settings.setWeeklyTemplateId(dto.getWeeklyTemplateId());
        settings.setWeeklySections(dto.getWeeklySections());
        settings.setWeeklyUseAiSummary(dto.getWeeklyUseAiSummary());

        // Monthly settings
        settings.setMonthlyEnabled(dto.getMonthlyEnabled());
        settings.setMonthlyDayOfMonth(dto.getMonthlyDayOfMonth());
        settings.setMonthlyTime(dto.getMonthlyTime());
        settings.setMonthlyTemplateId(dto.getMonthlyTemplateId());
        settings.setMonthlySections(dto.getMonthlySections());
        settings.setMonthlyUseAiSummary(dto.getMonthlyUseAiSummary());

        // Notifications
        settings.setNotifyOnComplete(dto.getNotifyOnComplete());
        settings.setNotifyEmail(dto.getNotifyEmail());
        settings.setNotifyEmailAddress(dto.getNotifyEmailAddress());
        settings.setNotifySlack(dto.getNotifySlack());
        settings.setNotifySlackChannel(dto.getNotifySlackChannel());

        // Behavior
        settings.setAutoPublish(dto.getAutoPublish());
        settings.setEditAfterGenerate(dto.getEditAfterGenerate());

        UserReportSettings saved = settingsRepository.save(settings);
        log.info("Saved report settings for user: {}, project: {}", userId, dto.getProjectId());

        ReportSettingsDto result = ReportSettingsDto.from(saved);
        result.setNextScheduledAt(calculateNextScheduledTime(saved));
        return result;
    }

    /**
     * Delete user settings
     */
    @Transactional
    public void deleteUserSettings(String userId, String projectId) {
        UserReportSettings settings = settingsRepository
                .findByUserIdAndProjectId(userId, projectId)
                .orElseThrow(() -> new EntityNotFoundException("Settings not found"));

        settingsRepository.delete(settings);
        log.info("Deleted report settings for user: {}, project: {}", userId, projectId);
    }

    /**
     * Enable/disable weekly reports
     */
    @Transactional
    public ReportSettingsDto toggleWeeklyReports(String userId, String projectId, boolean enabled) {
        UserReportSettings settings = getOrCreateSettings(userId, projectId);
        settings.setWeeklyEnabled(enabled);
        UserReportSettings saved = settingsRepository.save(settings);

        ReportSettingsDto result = ReportSettingsDto.from(saved);
        result.setNextScheduledAt(calculateNextScheduledTime(saved));
        return result;
    }

    /**
     * Enable/disable monthly reports
     */
    @Transactional
    public ReportSettingsDto toggleMonthlyReports(String userId, String projectId, boolean enabled) {
        UserReportSettings settings = getOrCreateSettings(userId, projectId);
        settings.setMonthlyEnabled(enabled);
        UserReportSettings saved = settingsRepository.save(settings);

        ReportSettingsDto result = ReportSettingsDto.from(saved);
        result.setNextScheduledAt(calculateNextScheduledTime(saved));
        return result;
    }

    private UserReportSettings getOrCreateSettings(String userId, String projectId) {
        return settingsRepository.findByUserIdAndProjectId(userId, projectId)
                .orElseGet(() -> {
                    UserReportSettings newSettings = new UserReportSettings();
                    newSettings.setUserId(userId);
                    newSettings.setProjectId(projectId);
                    return newSettings;
                });
    }

    private ReportSettingsDto createDefaultSettings(String userId, String projectId) {
        return ReportSettingsDto.builder()
                .userId(userId)
                .projectId(projectId)
                .weeklyEnabled(false)
                .weeklyDayOfWeek(1) // Monday
                .weeklyTime(LocalTime.of(9, 0))
                .weeklyUseAiSummary(true)
                .monthlyEnabled(false)
                .monthlyDayOfMonth(1)
                .monthlyTime(LocalTime.of(9, 0))
                .monthlyUseAiSummary(true)
                .notifyOnComplete(true)
                .notifyEmail(false)
                .notifySlack(false)
                .autoPublish(false)
                .editAfterGenerate(true)
                .build();
    }

    private String calculateNextScheduledTime(UserReportSettings settings) {
        LocalDateTime nextWeekly = null;
        LocalDateTime nextMonthly = null;

        if (Boolean.TRUE.equals(settings.getWeeklyEnabled())) {
            nextWeekly = calculateNextWeeklyTime(
                    settings.getWeeklyDayOfWeek(),
                    settings.getWeeklyTime()
            );
        }

        if (Boolean.TRUE.equals(settings.getMonthlyEnabled())) {
            nextMonthly = calculateNextMonthlyTime(
                    settings.getMonthlyDayOfMonth(),
                    settings.getMonthlyTime()
            );
        }

        if (nextWeekly != null && nextMonthly != null) {
            return nextWeekly.isBefore(nextMonthly) ?
                    nextWeekly.toString() : nextMonthly.toString();
        } else if (nextWeekly != null) {
            return nextWeekly.toString();
        } else if (nextMonthly != null) {
            return nextMonthly.toString();
        }

        return null;
    }

    private LocalDateTime calculateNextWeeklyTime(Integer dayOfWeek, LocalTime time) {
        if (dayOfWeek == null || time == null) return null;

        LocalDate today = LocalDate.now();
        DayOfWeek targetDay = DayOfWeek.of(dayOfWeek);
        int daysUntil = (targetDay.getValue() - today.getDayOfWeek().getValue() + 7) % 7;

        LocalDate nextDate = today.plusDays(daysUntil == 0 ?
                (LocalTime.now().isAfter(time) ? 7 : 0) : daysUntil);

        return LocalDateTime.of(nextDate, time);
    }

    private LocalDateTime calculateNextMonthlyTime(Integer dayOfMonth, LocalTime time) {
        if (dayOfMonth == null || time == null) return null;

        LocalDate today = LocalDate.now();
        LocalDate nextDate;

        if (today.getDayOfMonth() < dayOfMonth) {
            nextDate = today.withDayOfMonth(Math.min(dayOfMonth, today.lengthOfMonth()));
        } else if (today.getDayOfMonth() == dayOfMonth && LocalTime.now().isBefore(time)) {
            nextDate = today;
        } else {
            LocalDate nextMonth = today.plusMonths(1);
            nextDate = nextMonth.withDayOfMonth(Math.min(dayOfMonth, nextMonth.lengthOfMonth()));
        }

        return LocalDateTime.of(nextDate, time);
    }
}
