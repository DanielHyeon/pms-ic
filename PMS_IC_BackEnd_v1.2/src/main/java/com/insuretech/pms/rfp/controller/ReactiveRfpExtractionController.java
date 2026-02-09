package com.insuretech.pms.rfp.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.rfp.dto.*;
import com.insuretech.pms.rfp.service.ReactiveCandidateService;
import com.insuretech.pms.rfp.service.ReactiveExtractionService;
import com.insuretech.pms.rfp.service.ReactiveRfpVersionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/rfps/{rfpId}")
@RequiredArgsConstructor
public class ReactiveRfpExtractionController {

    private final ReactiveRfpVersionService versionService;
    private final ReactiveExtractionService extractionService;
    private final ReactiveCandidateService candidateService;

    // ==================== Version Endpoints ====================

    @PostMapping("/versions")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RfpVersionDto>>> uploadVersion(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestParam String fileName,
            @RequestParam(required = false) String filePath,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) Long fileSize,
            @RequestParam(required = false) String checksum,
            @RequestParam(required = false) String uploadedBy) {

        return versionService.createVersion(rfpId, fileName, filePath, fileType, fileSize, checksum, uploadedBy)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Version created", dto)));
    }

    @GetMapping("/versions")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<RfpVersionDto>>>> listVersions(
            @PathVariable String projectId,
            @PathVariable String rfpId) {

        return versionService.listVersions(rfpId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    // ==================== Extraction Run Endpoints ====================

    @PostMapping("/analyze")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<ExtractionRunDto>>> triggerAnalysis(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestBody(required = false) AnalyzeRequest request) {

        return extractionService.triggerAnalysis(rfpId, request)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Extraction analysis triggered", dto)));
    }

    @GetMapping("/extractions")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<ExtractionRunDto>>>> listExtractionRuns(
            @PathVariable String projectId,
            @PathVariable String rfpId) {

        return extractionService.listRuns(rfpId)
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @GetMapping("/extractions/latest")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<ExtractionResultDto>>> getLatestExtraction(
            @PathVariable String projectId,
            @PathVariable String rfpId) {

        return extractionService.getLatestRun(rfpId)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    @GetMapping("/extractions/{runId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<ExtractionResultDto>>> getExtractionRun(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @PathVariable String runId) {

        return extractionService.getRunById(runId)
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }

    // ==================== Candidate Management Endpoints ====================

    @PostMapping("/candidates/confirm")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<RequirementCandidateDto>>>> confirmCandidates(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @Valid @RequestBody CandidateConfirmRequest request) {

        return candidateService.confirmCandidates(rfpId, projectId, request.getCandidateIds())
                .map(list -> ResponseEntity.ok(ApiResponse.success("Candidates confirmed", list)));
    }

    @PostMapping("/candidates/reject")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<RequirementCandidateDto>>>> rejectCandidates(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @Valid @RequestBody CandidateRejectRequest request) {

        return candidateService.rejectCandidates(request.getCandidateIds(), request.getReason())
                .map(list -> ResponseEntity.ok(ApiResponse.success("Candidates rejected", list)));
    }

    @PatchMapping("/candidates/{candidateId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<RequirementCandidateDto>>> updateCandidate(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @PathVariable String candidateId,
            @RequestBody CandidateUpdateRequest request) {

        return candidateService.updateCandidate(candidateId, request)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Candidate updated", dto)));
    }
}
