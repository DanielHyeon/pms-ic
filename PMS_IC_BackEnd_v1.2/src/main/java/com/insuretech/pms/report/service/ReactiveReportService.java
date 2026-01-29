package com.insuretech.pms.report.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.report.dto.ReportDto;
import com.insuretech.pms.report.dto.ReportGenerationRequest;
import com.insuretech.pms.report.enums.GenerationMode;
import com.insuretech.pms.report.enums.ReportScope;
import com.insuretech.pms.report.enums.ReportStatus;
import com.insuretech.pms.report.enums.ReportType;
import com.insuretech.pms.report.reactive.entity.R2dbcReport;
import com.insuretech.pms.report.reactive.repository.ReactiveReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveReportService {

    private final ReactiveReportRepository reportRepository;
    private final ObjectMapper objectMapper;

    private final Map<UUID, Sinks.Many<ReportProgressEvent>> reportProgressSinks = new ConcurrentHashMap<>();

    public Flux<ReportDto> getReportsByProject(String projectId) {
        return reportRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .map(this::toDto);
    }

    public Mono<ReportDto> getReportById(UUID id) {
        return reportRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Report not found: " + id)))
                .map(this::toDto);
    }

    public Flux<ReportDto> getReportsByPeriod(String projectId, LocalDate startDate, LocalDate endDate) {
        return reportRepository.findByProjectIdAndPeriod(projectId, startDate, endDate)
                .map(this::toDto);
    }

    public Mono<ReportDto> createReport(String projectId, ReportGenerationRequest request) {
        try {
            R2dbcReport report = R2dbcReport.builder()
                    .id(UUID.randomUUID())
                    .projectId(projectId)
                    .reportType(request.getReportType() != null ? request.getReportType().name() : "WEEKLY")
                    .reportScope(request.getScope() != null ? request.getScope().name() : "PROJECT")
                    .title(request.getCustomTitle())
                    .periodStart(request.getPeriodStart())
                    .periodEnd(request.getPeriodEnd())
                    .scopePhaseId(request.getScopePhaseId())
                    .scopeTeamId(request.getScopeTeamId())
                    .scopeUserId(request.getScopeUserId())
                    .creatorRole("PM")
                    .generationMode(request.getGenerationMode() != null ? request.getGenerationMode().name() : "MANUAL")
                    .templateId(request.getTemplateId())
                    .status("DRAFT")
                    .content("{}")
                    .build();

            return reportRepository.save(report)
                    .map(this::toDto)
                    .doOnSuccess(dto -> log.info("Created report: {} for project: {}", dto.getId(), projectId));
        } catch (Exception e) {
            return Mono.error(CustomException.badRequest("Failed to create report: " + e.getMessage()));
        }
    }

    /**
     * SSE streaming endpoint for report generation progress.
     * Emits progress events during report generation.
     */
    public Flux<ReportProgressEvent> streamReportGeneration(String projectId, ReportGenerationRequest request) {
        UUID reportId = UUID.randomUUID();
        Sinks.Many<ReportProgressEvent> sink = Sinks.many().multicast().onBackpressureBuffer();
        reportProgressSinks.put(reportId, sink);

        // Start report generation asynchronously
        generateReportAsync(reportId, projectId, request, sink)
                .subscribe();

        return sink.asFlux()
                .doOnCancel(() -> {
                    log.info("Report generation cancelled: {}", reportId);
                    reportProgressSinks.remove(reportId);
                })
                .doOnComplete(() -> reportProgressSinks.remove(reportId));
    }

    private Mono<Void> generateReportAsync(UUID reportId, String projectId,
                                            ReportGenerationRequest request,
                                            Sinks.Many<ReportProgressEvent> sink) {
        return Mono.fromRunnable(() -> {
            try {
                // Phase 1: Initialize
                emitProgress(sink, reportId, "INITIALIZING", 0, "Starting report generation...");

                // Phase 2: Collect data
                emitProgress(sink, reportId, "COLLECTING_DATA", 20, "Collecting project data...");

                // Phase 3: Analyze
                emitProgress(sink, reportId, "ANALYZING", 40, "Analyzing metrics...");

                // Phase 4: Generate content
                emitProgress(sink, reportId, "GENERATING", 60, "Generating report content...");

                // Phase 5: Format
                emitProgress(sink, reportId, "FORMATTING", 80, "Formatting report...");

                // Create and save the report
                R2dbcReport report = R2dbcReport.builder()
                        .id(reportId)
                        .projectId(projectId)
                        .reportType(request.getReportType() != null ? request.getReportType().name() : "WEEKLY")
                        .reportScope(request.getScope() != null ? request.getScope().name() : "PROJECT")
                        .title(request.getCustomTitle())
                        .periodStart(request.getPeriodStart())
                        .periodEnd(request.getPeriodEnd())
                        .creatorRole("PM")
                        .generationMode("AUTO")
                        .status("DRAFT")
                        .content("{\"summary\": \"Auto-generated report\"}")
                        .build();

                reportRepository.save(report)
                        .doOnSuccess(saved -> {
                            emitProgress(sink, reportId, "COMPLETED", 100, "Report generation completed");
                            sink.tryEmitComplete();
                        })
                        .doOnError(error -> {
                            emitProgress(sink, reportId, "FAILED", -1, "Error: " + error.getMessage());
                            sink.tryEmitError(error);
                        })
                        .subscribe();

            } catch (Exception e) {
                log.error("Report generation failed: {}", e.getMessage(), e);
                emitProgress(sink, reportId, "FAILED", -1, "Error: " + e.getMessage());
                sink.tryEmitError(e);
            }
        }).then();
    }

    private void emitProgress(Sinks.Many<ReportProgressEvent> sink, UUID reportId,
                              String phase, int percentage, String message) {
        ReportProgressEvent event = new ReportProgressEvent(reportId, phase, percentage, message);
        sink.tryEmitNext(event);

        // Small delay to simulate processing
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public Mono<Void> publishReport(UUID id) {
        return reportRepository.publishReport(id)
                .doOnSuccess(v -> log.info("Published report: {}", id));
    }

    public Mono<Void> deleteReport(UUID id) {
        return reportRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Report not found: " + id)))
                .flatMap(report -> reportRepository.delete(report))
                .doOnSuccess(v -> log.info("Deleted report: {}", id));
    }

    private ReportDto toDto(R2dbcReport entity) {
        Map<String, Object> content = null;
        Map<String, Object> metricsSnapshot = null;

        try {
            if (entity.getContent() != null) {
                content = objectMapper.readValue(entity.getContent(),
                        objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
            }
            if (entity.getMetricsSnapshot() != null) {
                metricsSnapshot = objectMapper.readValue(entity.getMetricsSnapshot(),
                        objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse JSON content for report: {}", entity.getId());
        }

        return ReportDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .reportType(parseReportType(entity.getReportType()))
                .reportScope(parseReportScope(entity.getReportScope()))
                .title(entity.getTitle())
                .periodStart(entity.getPeriodStart())
                .periodEnd(entity.getPeriodEnd())
                .scopePhaseId(entity.getScopePhaseId())
                .scopeTeamId(entity.getScopeTeamId())
                .scopeUserId(entity.getScopeUserId())
                .creatorRole(entity.getCreatorRole())
                .generationMode(parseGenerationMode(entity.getGenerationMode()))
                .templateId(entity.getTemplateId())
                .status(parseReportStatus(entity.getStatus()))
                .content(content)
                .metricsSnapshot(metricsSnapshot)
                .llmGeneratedSections(entity.getLlmGeneratedSections())
                .llmModel(entity.getLlmModel())
                .llmConfidenceScore(entity.getLlmConfidenceScore())
                .publishedAt(entity.getPublishedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private ReportType parseReportType(String type) {
        try {
            return type != null ? ReportType.valueOf(type) : ReportType.WEEKLY;
        } catch (IllegalArgumentException e) {
            return ReportType.WEEKLY;
        }
    }

    private ReportScope parseReportScope(String scope) {
        try {
            return scope != null ? ReportScope.valueOf(scope) : ReportScope.PROJECT;
        } catch (IllegalArgumentException e) {
            return ReportScope.PROJECT;
        }
    }

    private ReportStatus parseReportStatus(String status) {
        try {
            return status != null ? ReportStatus.valueOf(status) : ReportStatus.DRAFT;
        } catch (IllegalArgumentException e) {
            return ReportStatus.DRAFT;
        }
    }

    private GenerationMode parseGenerationMode(String mode) {
        try {
            return mode != null ? GenerationMode.valueOf(mode) : GenerationMode.MANUAL;
        } catch (IllegalArgumentException e) {
            return GenerationMode.MANUAL;
        }
    }

    /**
     * Event class for report generation progress streaming
     */
    public record ReportProgressEvent(
            UUID reportId,
            String phase,
            int percentage,
            String message
    ) {}
}
