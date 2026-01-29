package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.KpiDto;
import com.insuretech.pms.project.service.ReactiveKpiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Tag(name = "KPIs", description = "Key Performance Indicator management API")
@RestController
@RequiredArgsConstructor
public class ReactiveKpiController {

    private final ReactiveKpiService kpiService;

    @Operation(summary = "Get all KPIs for a phase")
    @GetMapping("/api/phases/{phaseId}/kpis")
    public Mono<ResponseEntity<ApiResponse<List<KpiDto>>>> getKpisByPhase(@PathVariable String phaseId) {
        return kpiService.getKpisByPhase(phaseId)
                .collectList()
                .map(kpis -> ResponseEntity.ok(ApiResponse.success(kpis)));
    }

    @Operation(summary = "Get KPIs by status")
    @GetMapping("/api/phases/{phaseId}/kpis/status/{status}")
    public Mono<ResponseEntity<ApiResponse<List<KpiDto>>>> getKpisByStatus(
            @PathVariable String phaseId,
            @PathVariable String status) {
        return kpiService.getKpisByPhaseAndStatus(phaseId, status)
                .collectList()
                .map(kpis -> ResponseEntity.ok(ApiResponse.success(kpis)));
    }

    @Operation(summary = "Get a KPI by ID")
    @GetMapping("/api/kpis/{kpiId}")
    public Mono<ResponseEntity<ApiResponse<KpiDto>>> getKpi(@PathVariable String kpiId) {
        return kpiService.getKpiById(kpiId)
                .map(kpi -> ResponseEntity.ok(ApiResponse.success(kpi)));
    }

    @Operation(summary = "Create a KPI")
    @PostMapping("/api/phases/{phaseId}/kpis")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<KpiDto>>> createKpi(
            @PathVariable String phaseId,
            @Valid @RequestBody KpiDto request) {
        return kpiService.createKpi(phaseId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("KPI created", created)));
    }

    @Operation(summary = "Update a KPI")
    @PutMapping("/api/kpis/{kpiId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<KpiDto>>> updateKpi(
            @PathVariable String kpiId,
            @Valid @RequestBody KpiDto request) {
        return kpiService.updateKpi(kpiId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("KPI updated", updated)));
    }

    @Operation(summary = "Update KPI status")
    @PatchMapping("/api/kpis/{kpiId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<KpiDto>>> updateKpiStatus(
            @PathVariable String kpiId,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        return kpiService.updateKpiStatus(kpiId, status)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("KPI status updated", updated)));
    }

    @Operation(summary = "Update KPI current value")
    @PatchMapping("/api/kpis/{kpiId}/value")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<KpiDto>>> updateKpiValue(
            @PathVariable String kpiId,
            @RequestBody Map<String, String> request) {
        String currentValue = request.get("current");
        return kpiService.updateKpiValue(kpiId, currentValue)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("KPI value updated", updated)));
    }

    @Operation(summary = "Delete a KPI")
    @DeleteMapping("/api/kpis/{kpiId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteKpi(@PathVariable String kpiId) {
        return kpiService.deleteKpi(kpiId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("KPI deleted", null))));
    }
}
