package com.insuretech.pms.rfp.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.rfp.dto.CreateRequirementRequest;
import com.insuretech.pms.rfp.dto.RequirementDto;
import com.insuretech.pms.rfp.dto.UpdateRequirementRequest;
import com.insuretech.pms.rfp.service.ReactiveRequirementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/requirements")
@RequiredArgsConstructor
public class ReactiveRequirementController {

    private final ReactiveRequirementService requirementService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<RequirementDto>>>> getRequirementsByProject(
            @PathVariable String projectId) {
        return requirementService.getRequirementsByProject(projectId)
                .collectList()
                .map(reqs -> ResponseEntity.ok(ApiResponse.success(reqs)));
    }

    @GetMapping("/by-rfp/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<List<RequirementDto>>>> getRequirementsByRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return requirementService.getRequirementsByRfp(rfpId)
                .collectList()
                .map(reqs -> ResponseEntity.ok(ApiResponse.success(reqs)));
    }

    @GetMapping("/{requirementId}")
    public Mono<ResponseEntity<ApiResponse<RequirementDto>>> getRequirementById(
            @PathVariable String projectId,
            @PathVariable String requirementId) {
        return requirementService.getRequirementById(requirementId)
                .map(req -> ResponseEntity.ok(ApiResponse.success(req)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<RequirementDto>>> createRequirement(
            @PathVariable String projectId,
            @Valid @RequestBody CreateRequirementRequest request) {
        return requirementService.createRequirement(projectId, request)
                .map(req -> ResponseEntity.ok(ApiResponse.success("Requirement created", req)));
    }

    @PutMapping("/{requirementId}")
    public Mono<ResponseEntity<ApiResponse<RequirementDto>>> updateRequirement(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @Valid @RequestBody UpdateRequirementRequest request) {
        return requirementService.updateRequirement(requirementId, request)
                .map(req -> ResponseEntity.ok(ApiResponse.success("Requirement updated", req)));
    }

    @DeleteMapping("/{requirementId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteRequirement(
            @PathVariable String projectId,
            @PathVariable String requirementId) {
        return requirementService.deleteRequirement(requirementId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Requirement deleted", null))));
    }

    @PatchMapping("/{requirementId}/progress")
    public Mono<ResponseEntity<ApiResponse<Void>>> updateProgress(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @RequestParam Integer progress) {
        return requirementService.updateProgress(requirementId, progress)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Progress updated", null))));
    }

    @GetMapping("/average-progress")
    public Mono<ResponseEntity<ApiResponse<Double>>> getAverageProgress(
            @PathVariable String projectId) {
        return requirementService.getAverageProgress(projectId)
                .map(avg -> ResponseEntity.ok(ApiResponse.success(avg)));
    }
}
