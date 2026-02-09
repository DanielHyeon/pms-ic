package com.insuretech.pms.audit.controller;

import com.insuretech.pms.audit.dto.*;
import com.insuretech.pms.audit.reactive.entity.R2dbcEvidenceAuditTrail;
import com.insuretech.pms.audit.service.ReactiveAuditEvidenceService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Tag(name = "Audit Evidence", description = "Audit evidence export and tracking API")
@RestController
@RequestMapping("/api/v2/audit/evidence")
@RequiredArgsConstructor
public class ReactiveAuditEvidenceController {

    private final ReactiveAuditEvidenceService evidenceService;

    @Operation(summary = "Get evidence summary for a project")
    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<AuditEvidenceSummaryDto>>> getSummary(
            @RequestParam String projectId) {
        return evidenceService.getSummary(projectId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "List evidence items for a project")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<AuditEvidenceItemDto>>>> listEvidence(
            @RequestParam String projectId) {
        return evidenceService.listEvidence(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Start evidence export package generation")
    @PostMapping("/export")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EvidencePackageDto>>> startExport(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return evidenceService.startExport(request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.ACCEPTED)
                        .body(ApiResponse.success("Export started", dto)));
    }

    @Operation(summary = "Get export package status")
    @GetMapping("/export/{packageId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EvidencePackageDto>>> getExportStatus(
            @PathVariable String packageId) {
        return evidenceService.getExportStatus(packageId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Get audit trail for evidence operations")
    @GetMapping("/trail")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<R2dbcEvidenceAuditTrail>>>> getAuditTrail(
            @RequestParam String projectId) {
        return evidenceService.getAuditTrail(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }
}
