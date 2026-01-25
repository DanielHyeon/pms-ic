package com.insuretech.pms.report.service;

import com.insuretech.pms.report.dto.ReportDto;
import com.insuretech.pms.report.dto.ReportGenerationRequest;
import com.insuretech.pms.report.entity.*;
import com.insuretech.pms.report.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for generating reports
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportGenerationService {

    private final ReportRepository reportRepository;
    private final ReportTemplateRepository templateRepository;
    private final RoleReportDefaultsRepository roleDefaultsRepository;
    private final ReportGenerationLogRepository generationLogRepository;
    private final ReportMetricsRepository metricsRepository;
    private final LlmServiceClient llmClient;
    private final ReportDataCollectorService dataCollector;

    /**
     * Generate a report based on request
     */
    @Transactional
    public ReportDto generateReport(ReportGenerationRequest request, String userId, String userRole) {
        long startTime = System.currentTimeMillis();
        List<String> sectionsGenerated = new ArrayList<>();
        List<String> sectionsFailed = new ArrayList<>();

        try {
            // 1. Validate scope access
            validateScopeAccess(request, userRole);

            // 2. Load template
            ReportTemplate template = loadTemplate(request, userRole);

            // 3. Determine sections to generate
            List<String> sections = determineSections(request, template, userRole);

            // 4. Collect data for report
            long dataStartTime = System.currentTimeMillis();
            Map<String, Object> reportData = dataCollector.collectData(
                    request.getProjectId(),
                    request.getScope() != null ? request.getScope() : getDefaultScope(userRole),
                    request.getPeriodStart(),
                    request.getPeriodEnd(),
                    request.getScopeUserId() != null ? request.getScopeUserId() : userId,
                    request.getScopeTeamId(),
                    request.getScopePhaseId()
            );
            int dataCollectionMs = (int) (System.currentTimeMillis() - dataStartTime);

            // 5. Generate content for each section
            long llmStartTime = System.currentTimeMillis();
            Map<String, Object> content = new LinkedHashMap<>();

            for (String sectionKey : sections) {
                try {
                    Object sectionContent = generateSectionContent(
                            sectionKey, template, reportData, userRole, request.getUseAiSummary()
                    );
                    content.put(sectionKey, sectionContent);
                    sectionsGenerated.add(sectionKey);
                } catch (Exception e) {
                    log.warn("Failed to generate section {}: {}", sectionKey, e.getMessage());
                    sectionsFailed.add(sectionKey);
                    content.put(sectionKey, Map.of("error", "Generation failed", "message", e.getMessage()));
                }
            }
            int llmGenerationMs = (int) (System.currentTimeMillis() - llmStartTime);

            // 6. Build report entity
            Report report = Report.builder()
                    .projectId(request.getProjectId())
                    .reportType(request.getReportType())
                    .reportScope(request.getScope() != null ? request.getScope() : getDefaultScope(userRole))
                    .title(buildTitle(request, template, userRole))
                    .periodStart(request.getPeriodStart())
                    .periodEnd(request.getPeriodEnd())
                    .scopePhaseId(request.getScopePhaseId())
                    .scopeTeamId(request.getScopeTeamId())
                    .scopeUserId(request.getScopeUserId() != null ? request.getScopeUserId() : userId)
                    .creatorRole(userRole)
                    .generationMode(request.getGenerationMode() != null ?
                            request.getGenerationMode() : GenerationMode.MANUAL)
                    .templateId(template != null ? template.getId() : null)
                    .status(ReportStatus.DRAFT)
                    .content(content)
                    .metricsSnapshot(extractMetricsSnapshot(reportData))
                    .llmGeneratedSections(sectionsGenerated.toArray(new String[0]))
                    .llmModel(llmClient.getModelName())
                    .llmConfidenceScore(BigDecimal.valueOf(0.85))
                    .build();

            Report saved = reportRepository.save(report);

            // 7. Log generation
            logGeneration(userId, saved, request, "SUCCESS", null,
                    dataCollectionMs, llmGenerationMs, sectionsGenerated, sectionsFailed);

            log.info("Generated report {} for user {} in {}ms",
                    saved.getId(), userId, System.currentTimeMillis() - startTime);

            return ReportDto.from(saved);

        } catch (Exception e) {
            log.error("Report generation failed for user {}: {}", userId, e.getMessage(), e);
            logGeneration(userId, null, request, "FAILED", e.getMessage(),
                    0, 0, sectionsGenerated, sectionsFailed);
            throw new RuntimeException("Report generation failed: " + e.getMessage(), e);
        }
    }

    private void validateScopeAccess(ReportGenerationRequest request, String userRole) {
        RoleReportDefaults defaults = roleDefaultsRepository
                .findByRoleAndReportType(userRole, request.getReportType())
                .orElse(null);

        if (defaults != null && !defaults.getCanChangeScope()) {
            ReportScope requestedScope = request.getScope();
            if (requestedScope != null && requestedScope != defaults.getDefaultScope()) {
                throw new SecurityException("Role " + userRole + " cannot access scope " + requestedScope);
            }
        }
    }

    private ReportTemplate loadTemplate(ReportGenerationRequest request, String userRole) {
        if (request.getTemplateId() != null) {
            return templateRepository.findById(request.getTemplateId()).orElse(null);
        }
        return templateRepository.findDefaultTemplateForRole(request.getReportType(), userRole).orElse(null);
    }

    private List<String> determineSections(ReportGenerationRequest request,
                                           ReportTemplate template,
                                           String userRole) {
        if (request.getSections() != null && !request.getSections().isEmpty()) {
            return request.getSections();
        }

        if (template != null && template.getStructure() != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> templateSections =
                    (List<Map<String, Object>>) template.getStructure().get("sections");
            if (templateSections != null) {
                return templateSections.stream()
                        .map(s -> (String) s.get("key"))
                        .toList();
            }
        }

        // Default sections from role defaults
        RoleReportDefaults defaults = roleDefaultsRepository
                .findByRoleAndReportType(userRole, request.getReportType())
                .orElse(null);

        if (defaults != null) {
            return Arrays.asList(defaults.getDefaultSections());
        }

        return Arrays.asList("my_summary", "completed_tasks", "in_progress", "next_week_plan");
    }

    private Object generateSectionContent(String sectionKey,
                                          ReportTemplate template,
                                          Map<String, Object> reportData,
                                          String userRole,
                                          Boolean useAiSummary) {
        // Find section config from template
        Map<String, Object> sectionConfig = findSectionConfig(template, sectionKey);
        String sectionType = sectionConfig != null ?
                (String) sectionConfig.get("type") : "DATA_TABLE";

        return switch (sectionType) {
            case "AI_GENERATED" -> {
                if (Boolean.TRUE.equals(useAiSummary)) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> config = (Map<String, Object>) sectionConfig.get("config");
                    String prompt = config != null ? (String) config.get("prompt") : "";
                    yield llmClient.generateContent(prompt, reportData, userRole);
                } else {
                    yield Map.of("placeholder", "AI summary disabled");
                }
            }
            case "DATA_TABLE" -> extractTableData(sectionKey, reportData);
            case "DATA_LIST" -> extractListData(sectionKey, reportData);
            case "METRIC_CHART" -> extractChartData(sectionKey, reportData);
            case "MANUAL_INPUT" -> Map.of("placeholder", "User input required");
            default -> Map.of("data", reportData.getOrDefault(sectionKey, Collections.emptyMap()));
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> findSectionConfig(ReportTemplate template, String sectionKey) {
        if (template == null || template.getStructure() == null) return null;

        List<Map<String, Object>> sections =
                (List<Map<String, Object>>) template.getStructure().get("sections");
        if (sections == null) return null;

        return sections.stream()
                .filter(s -> sectionKey.equals(s.get("key")))
                .findFirst()
                .orElse(null);
    }

    private Object extractTableData(String sectionKey, Map<String, Object> reportData) {
        return reportData.getOrDefault(sectionKey, Collections.emptyList());
    }

    private Object extractListData(String sectionKey, Map<String, Object> reportData) {
        return reportData.getOrDefault(sectionKey, Collections.emptyList());
    }

    private Object extractChartData(String sectionKey, Map<String, Object> reportData) {
        return reportData.getOrDefault(sectionKey + "_metrics", Collections.emptyMap());
    }

    private String buildTitle(ReportGenerationRequest request, ReportTemplate template, String userRole) {
        if (request.getCustomTitle() != null) {
            return request.getCustomTitle();
        }

        String typeStr = request.getReportType().name().toLowerCase();
        return String.format("%s Report (%s - %s)",
                typeStr.substring(0, 1).toUpperCase() + typeStr.substring(1),
                request.getPeriodStart(),
                request.getPeriodEnd());
    }

    private Map<String, Object> extractMetricsSnapshot(Map<String, Object> reportData) {
        Map<String, Object> snapshot = new HashMap<>();
        String[] metricKeys = {"totalTasks", "completedTasks", "inProgressTasks",
                "completionRate", "velocity", "storyPointsCompleted"};

        for (String key : metricKeys) {
            if (reportData.containsKey(key)) {
                snapshot.put(key, reportData.get(key));
            }
        }
        return snapshot;
    }

    private ReportScope getDefaultScope(String userRole) {
        return switch (userRole) {
            case "sponsor", "pmo_head", "pm" -> ReportScope.PROJECT;
            case "team_lead" -> ReportScope.TEAM;
            default -> ReportScope.INDIVIDUAL;
        };
    }

    private void logGeneration(String userId, Report report, ReportGenerationRequest request,
                               String status, String errorMessage,
                               int dataCollectionMs, int llmGenerationMs,
                               List<String> generated, List<String> failed) {
        ReportGenerationLog log = ReportGenerationLog.builder()
                .userId(userId)
                .reportId(report != null ? report.getId() : null)
                .projectId(request.getProjectId())
                .generationMode(request.getGenerationMode() != null ?
                        request.getGenerationMode() : GenerationMode.MANUAL)
                .reportType(request.getReportType())
                .templateId(request.getTemplateId())
                .status(status)
                .errorMessage(errorMessage)
                .dataCollectionMs(dataCollectionMs)
                .llmGenerationMs(llmGenerationMs)
                .totalDurationMs(dataCollectionMs + llmGenerationMs)
                .sectionsGenerated(generated.toArray(new String[0]))
                .sectionsFailed(failed.toArray(new String[0]))
                .llmModel(llmClient.getModelName())
                .build();

        generationLogRepository.save(log);
    }
}
