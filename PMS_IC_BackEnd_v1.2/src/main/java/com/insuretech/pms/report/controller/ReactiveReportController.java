package com.insuretech.pms.report.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.dto.sse.*;
import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.ReportDto;
import com.insuretech.pms.report.dto.ReportGenerationRequest;
import com.insuretech.pms.report.service.ReactiveReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/reports")
@RequiredArgsConstructor
public class ReactiveReportController {

    private final ReactiveReportService reportService;
    private final SseEventBuilder sseBuilder;
    private final ObjectMapper objectMapper;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<ReportDto>>>> getReportsByProject(
            @PathVariable String projectId) {
        return reportService.getReportsByProject(projectId)
                .collectList()
                .map(reports -> ResponseEntity.ok(ApiResponse.success(reports)));
    }

    @GetMapping("/{reportId}")
    public Mono<ResponseEntity<ApiResponse<ReportDto>>> getReportById(
            @PathVariable String projectId,
            @PathVariable UUID reportId) {
        return reportService.getReportById(reportId)
                .map(report -> ResponseEntity.ok(ApiResponse.success(report)));
    }

    @GetMapping("/by-period")
    public Mono<ResponseEntity<ApiResponse<List<ReportDto>>>> getReportsByPeriod(
            @PathVariable String projectId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return reportService.getReportsByPeriod(projectId, startDate, endDate)
                .collectList()
                .map(reports -> ResponseEntity.ok(ApiResponse.success(reports)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<ReportDto>>> createReport(
            @PathVariable String projectId,
            @Valid @RequestBody ReportGenerationRequest request) {
        return reportService.createReport(projectId, request)
                .map(report -> ResponseEntity.ok(ApiResponse.success("Report created", report)));
    }

    /**
     * SSE streaming endpoint for report generation with Standard Event Contract.
     * Uses: meta, delta, done, error events
     */
    @PostMapping(value = "/generate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> generateReportStream(
            @PathVariable String projectId,
            @Valid @RequestBody ReportGenerationRequest request) {

        String traceId = UUID.randomUUID().toString();

        log.info("Starting report generation stream: projectId={}, traceId={}", projectId, traceId);

        return Flux.concat(
                // Meta event (stream start)
                Flux.just(sseBuilder.meta(MetaEvent.builder()
                        .traceId(traceId)
                        .mode("report_generation")
                        .timestamp(Instant.now())
                        .build())),

                // Delta events for progress updates
                reportService.streamReportGeneration(projectId, request)
                        .map(event -> {
                            try {
                                String jsonPayload = objectMapper.writeValueAsString(event);
                                return sseBuilder.delta(DeltaEvent.builder()
                                        .kind(DeltaKind.JSON)
                                        .json(jsonPayload)
                                        .build());
                            } catch (Exception e) {
                                log.error("Error serializing progress event", e);
                                return sseBuilder.error("SERIALIZATION_ERROR", e.getMessage(), traceId);
                            }
                        }),

                // Done event (stream complete)
                Flux.just(sseBuilder.doneStop())

        ).doOnCancel(() -> log.info("Report generation stream cancelled: {}", traceId))
         .doOnError(e -> log.error("Error in report generation stream: {}", e.getMessage()))
         .onErrorResume(e -> Flux.just(sseBuilder.error("GENERATION_ERROR", e.getMessage(), traceId)));
    }

    @PatchMapping("/{reportId}/publish")
    public Mono<ResponseEntity<ApiResponse<Void>>> publishReport(
            @PathVariable String projectId,
            @PathVariable UUID reportId) {
        return reportService.publishReport(reportId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Report published", null))));
    }

    @DeleteMapping("/{reportId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteReport(
            @PathVariable String projectId,
            @PathVariable UUID reportId) {
        return reportService.deleteReport(reportId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Report deleted", null))));
    }
}
