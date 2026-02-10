package com.insuretech.pms.rfp.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.rfp.dto.*;
import com.insuretech.pms.rfp.service.ReactiveRfpEvidenceService;
import com.insuretech.pms.rfp.service.ReactiveRfpService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/rfps")
@RequiredArgsConstructor
public class ReactiveRfpController {

    private final ReactiveRfpService rfpService;
    private final ReactiveRfpEvidenceService evidenceService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<RfpDto>>>> getRfpsByProject(
            @PathVariable String projectId) {
        return rfpService.getRfpsByProject(projectId)
                .collectList()
                .map(rfps -> ResponseEntity.ok(ApiResponse.success(rfps)));
    }

    @GetMapping("/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> getRfpById(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.getRfpById(rfpId)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success(rfp)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> createRfp(
            @PathVariable String projectId,
            @Valid @RequestBody CreateRfpRequest request) {
        return rfpService.createRfp(projectId, request)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success("RFP created", rfp)));
    }

    @PutMapping("/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> updateRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @Valid @RequestBody UpdateRfpRequest request) {
        return rfpService.updateRfp(rfpId, request)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success("RFP updated", rfp)));
    }

    @DeleteMapping("/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.deleteRfp(rfpId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("RFP deleted", null))));
    }

    @Operation(summary = "Upload RFP file (multipart) — 파일 업로드 후 자동 파싱 트리거")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> uploadRfp(
            @PathVariable String projectId,
            @RequestPart("file") FilePart file,
            @RequestPart(value = "title", required = false) String title) {
        return rfpService.uploadRfp(projectId, file, title)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success("RFP uploaded", rfp)));
    }

    @Operation(summary = "Transition RFP status (state machine validated)")
    @PatchMapping("/{rfpId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> updateRfpStatus(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestParam String status) {
        return rfpService.updateStatus(rfpId, status)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Status updated", null))));
    }

    @Operation(summary = "Get allowed next status transitions")
    @GetMapping("/{rfpId}/transitions")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getAllowedTransitions(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.getAllowedTransitions(rfpId)
                .map(transitions -> ResponseEntity.ok(ApiResponse.success(
                        Map.of("rfpId", rfpId, "allowedTransitions", transitions))));
    }

    @Operation(summary = "Mark RFP as failed with reason")
    @PostMapping("/{rfpId}/fail")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> failRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestParam String reason) {
        return rfpService.failRfp(rfpId, reason)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("RFP marked as failed", null))));
    }

    @Operation(summary = "Resume RFP from ON_HOLD (restore previous status)")
    @PostMapping("/{rfpId}/resume")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> resumeFromHold(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.resumeFromHold(rfpId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("RFP resumed", null))));
    }

    @Operation(summary = "Retry failed RFP parsing (retryable=true인 경우만)")
    @PostMapping("/{rfpId}/retry")
    public Mono<ResponseEntity<ApiResponse<Void>>> retryParse(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.retryParse(rfpId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("재시도 시작됨", null))));
    }

    // ==================== Evidence / Impact / Diff (Sprint C) ====================

    @Operation(summary = "요구사항 근거(Evidence) 추적 조회")
    @GetMapping("/{rfpId}/evidence")
    public Mono<ResponseEntity<ApiResponse<List<EvidenceDto>>>> getEvidence(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestParam(required = false) String requirementId) {
        return evidenceService.getEvidence(rfpId, requirementId)
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "RFP 변경 영향 분석 조회")
    @GetMapping("/{rfpId}/impact")
    public Mono<ResponseEntity<ApiResponse<ImpactDto>>> getImpact(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return evidenceService.getImpact(rfpId)
                .map(impact -> ResponseEntity.ok(ApiResponse.success(impact)));
    }

    @Operation(summary = "RFP 버전 간 요구사항 차이 비교")
    @GetMapping("/{rfpId}/diff")
    public Mono<ResponseEntity<ApiResponse<DiffDto>>> getDiff(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestParam(defaultValue = "v1.0") String from,
            @RequestParam(defaultValue = "v2.0") String to) {
        return evidenceService.getDiff(rfpId, from, to)
                .map(diff -> ResponseEntity.ok(ApiResponse.success(diff)));
    }
}
