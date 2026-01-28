package com.insuretech.pms.report.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insuretech.pms.report.dto.ReportDto;
import com.insuretech.pms.report.dto.ReportOptionsDto;
import com.insuretech.pms.report.entity.Report;
import com.insuretech.pms.report.entity.ReportScope;
import com.insuretech.pms.report.entity.ReportStatus;
import com.insuretech.pms.report.entity.ReportTemplate;
import com.insuretech.pms.report.entity.ReportType;
import com.insuretech.pms.report.entity.RoleReportDefaults;
import com.insuretech.pms.report.repository.ReportRepository;
import com.insuretech.pms.report.repository.ReportTemplateRepository;
import com.insuretech.pms.report.repository.RoleReportDefaultsRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing reports
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReportTemplateRepository templateRepository;
    private final RoleReportDefaultsRepository roleDefaultsRepository;

    /**
     * Get report by ID
     */
    public ReportDto getReportById(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        return ReportDto.from(report);
    }

    /**
     * Get report by ID with access check
     */
    public ReportDto getReportById(UUID reportId, String userId, String userRole) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        // Check access based on role and ownership
        if (!canAccessReport(report, userId, userRole)) {
            throw new SecurityException("Not authorized to access this report");
        }

        return ReportDto.from(report);
    }

    private boolean canAccessReport(Report report, String userId, String userRole) {
        // Owner can always access
        if (Objects.equals(report.getCreatedBy(), userId)) {
            return true;
        }
        // PMO and sponsors can see all project reports
        if ("sponsor".equals(userRole) || "pmo_head".equals(userRole) || "pm".equals(userRole)) {
            return true;
        }
        // Team leads can see team and individual reports
        if ("team_lead".equals(userRole)) {
            return report.getReportScope() == ReportScope.TEAM ||
                   report.getReportScope() == ReportScope.INDIVIDUAL;
        }
        return false;
    }

    /**
     * Search reports with criteria
     */
    public Page<ReportDto> searchReports(
            String projectId,
            ReportType reportType,
            ReportScope reportScope,
            ReportStatus status,
            String createdBy,
            Pageable pageable) {

        return reportRepository.searchReports(
                projectId, reportType, reportScope, status, createdBy, pageable
        ).map(ReportDto::from);
    }

    /**
     * Get reports by project
     */
    public Page<ReportDto> getReportsByProject(String projectId, Pageable pageable) {
        return reportRepository.findByProjectId(projectId, pageable).map(ReportDto::from);
    }

    /**
     * Get reports by user
     */
    public List<ReportDto> getReportsByUser(String userId) {
        return reportRepository.findByCreatedByOrderByCreatedAtDesc(userId)
                .stream()
                .map(ReportDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Update report content
     */
    @Transactional
    public ReportDto updateReport(UUID reportId, Map<String, Object> content, String userId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        // Verify ownership or permission
        if (!userId.equals(report.getCreatedBy())) {
            throw new SecurityException("Not authorized to update this report");
        }

        // Can only update draft reports
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new IllegalStateException("Can only update draft reports");
        }

        report.setContent(content);
        Report saved = reportRepository.save(report);

        log.info("Updated report: {} by user: {}", reportId, userId);
        return ReportDto.from(saved);
    }

    /**
     * Publish report
     */
    @Transactional
    public ReportDto publishReport(UUID reportId, String userId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        if (!userId.equals(report.getCreatedBy())) {
            throw new SecurityException("Not authorized to publish this report");
        }

        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new IllegalStateException("Can only publish draft reports");
        }

        report.setStatus(ReportStatus.PUBLISHED);
        report.setPublishedAt(LocalDateTime.now());
        Report saved = reportRepository.save(report);

        log.info("Published report: {} by user: {}", reportId, userId);
        return ReportDto.from(saved);
    }

    /**
     * Archive report
     */
    @Transactional
    public ReportDto archiveReport(UUID reportId, String userId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        report.setStatus(ReportStatus.ARCHIVED);
        Report saved = reportRepository.save(report);

        log.info("Archived report: {} by user: {}", reportId, userId);
        return ReportDto.from(saved);
    }

    /**
     * Delete report
     */
    @Transactional
    public void deleteReport(UUID reportId, String userId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        if (!userId.equals(report.getCreatedBy())) {
            throw new SecurityException("Not authorized to delete this report");
        }

        reportRepository.delete(report);
        log.info("Deleted report: {} by user: {}", reportId, userId);
    }

    /**
     * Get report options for a role
     */
    public ReportOptionsDto getReportOptionsForRole(String role, ReportType reportType) {
        RoleReportDefaults defaults = roleDefaultsRepository
                .findByRoleAndReportType(role, reportType)
                .orElseGet(() -> createDefaultRoleDefaults(role, reportType));

        List<ReportTemplate> templates = templateRepository.findTemplatesForRole(reportType.name(), role);

        return ReportOptionsDto.builder()
                .role(role)
                .defaultScope(defaults.getDefaultScope())
                .availableScopes(getAvailableScopesForRole(role, defaults))
                .canChangeScope(defaults.getCanChangeScope())
                .defaultSections(Arrays.asList(defaults.getDefaultSections()))
                .availableSections(buildSectionOptions(defaults))
                .canSelectSections(defaults.getCanSelectSections())
                .maxPeriodDays(defaults.getMaxPeriodDays())
                .canExtendPeriod(defaults.getCanExtendPeriod())
                .availableTemplates(templates.stream()
                        .map(t -> ReportOptionsDto.TemplateOption.builder()
                                .id(t.getId().toString())
                                .name(t.getName())
                                .description(t.getDescription())
                                .isDefault(t.getIsDefault())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    private List<ReportScope> getAvailableScopesForRole(String role, RoleReportDefaults defaults) {
        if (defaults.getCanChangeScope()) {
            // Higher roles can see more scopes
            if (role.equals("sponsor") || role.equals("pmo_head") || role.equals("pm")) {
                return Arrays.asList(ReportScope.PROJECT, ReportScope.PHASE, ReportScope.TEAM, ReportScope.INDIVIDUAL);
            } else if (role.equals("team_lead")) {
                return Arrays.asList(ReportScope.TEAM, ReportScope.INDIVIDUAL);
            }
        }
        return Collections.singletonList(defaults.getDefaultScope());
    }

    private List<ReportOptionsDto.SectionOption> buildSectionOptions(RoleReportDefaults defaults) {
        // Build section options based on default sections
        return Arrays.stream(defaults.getDefaultSections())
                .map(section -> ReportOptionsDto.SectionOption.builder()
                        .key(section)
                        .label(getSectionLabel(section))
                        .description(getSectionDescription(section))
                        .isDefault(true)
                        .isRequired(isRequiredSection(section))
                        .build())
                .collect(Collectors.toList());
    }

    private String getSectionLabel(String sectionKey) {
        return switch (sectionKey) {
            case "executive_summary" -> "Executive Summary";
            case "my_summary" -> "My Summary";
            case "progress_overview" -> "Progress Overview";
            case "completed_tasks" -> "Completed Tasks";
            case "in_progress" -> "In Progress";
            case "blockers" -> "Blockers/Issues";
            case "next_week_plan" -> "Next Week Plan";
            case "team_performance" -> "Team Performance";
            case "phase_status" -> "Phase Status";
            case "issues_risks" -> "Issues & Risks";
            default -> sectionKey.replace("_", " ");
        };
    }

    private String getSectionDescription(String sectionKey) {
        return switch (sectionKey) {
            case "executive_summary" -> "High-level summary for executives";
            case "my_summary" -> "Personal work summary";
            case "completed_tasks" -> "List of completed tasks this period";
            case "blockers" -> "Current blockers and issues";
            default -> "";
        };
    }

    private boolean isRequiredSection(String sectionKey) {
        return sectionKey.contains("summary") || sectionKey.equals("completed_tasks");
    }

    private RoleReportDefaults createDefaultRoleDefaults(String role, ReportType reportType) {
        return RoleReportDefaults.builder()
                .role(role)
                .reportType(reportType)
                .defaultScope(ReportScope.INDIVIDUAL)
                .defaultSections(new String[]{"my_summary", "completed_tasks", "in_progress", "next_week_plan"})
                .canChangeScope(false)
                .canSelectSections(true)
                .maxPeriodDays(7)
                .build();
    }

    /**
     * Get project reports with filters
     */
    public Page<ReportDto> getProjectReports(
            String projectId,
            ReportType reportType,
            ReportStatus status,
            String userId,
            String userRole,
            Pageable pageable) {

        return reportRepository.searchReports(
                projectId, reportType, null, status, null, pageable
        ).map(ReportDto::from);
    }

    /**
     * Get my reports with filters
     */
    public Page<ReportDto> getMyReports(
            String userId,
            ReportType reportType,
            ReportStatus status,
            Pageable pageable) {

        return reportRepository.searchReports(
                null, reportType, null, status, userId, pageable
        ).map(ReportDto::from);
    }

    /**
     * Update report content (alias for updateReport)
     */
    @Transactional
    public ReportDto updateReportContent(UUID reportId, Map<String, Object> content, String userId) {
        return updateReport(reportId, content, userId);
    }

    /**
     * Get report options for current user
     */
    public ReportOptionsDto getReportOptions(String userId, String userRole, String projectId) {
        // Default to WEEKLY report type
        return getReportOptionsForRole(userRole, ReportType.WEEKLY);
    }

    /**
     * Get report history with scope filtering
     */
    public Page<ReportDto> getReportHistory(
            String projectId,
            String scope,
            String scopeId,
            String userId,
            String userRole,
            Pageable pageable) {

        ReportScope reportScope = null;
        if (scope != null) {
            try {
                reportScope = ReportScope.valueOf(scope.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Invalid scope, search all
            }
        }

        return reportRepository.searchReports(
                projectId, null, reportScope, null, scopeId, pageable
        ).map(ReportDto::from);
    }
}
