package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.PhaseDto;
import com.insuretech.pms.project.service.ReactivePhaseService;
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

@Tag(name = "Phases", description = "Phase management API")
@RestController
@RequestMapping("/api/phases")
@RequiredArgsConstructor
public class ReactivePhaseController {

    private final ReactivePhaseService phaseService;

    @Operation(summary = "Get all phases")
    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<PhaseDto>>>> getPhases(
            @RequestParam(value = "projectId", required = false) String projectId) {
        return phaseService.getPhases(projectId)
                .collectList()
                .map(phases -> ResponseEntity.ok(ApiResponse.success(phases)));
    }

    @Operation(summary = "Get phase by ID")
    @GetMapping("/{phaseId}")
    public Mono<ResponseEntity<ApiResponse<PhaseDto>>> getPhase(@PathVariable String phaseId) {
        return phaseService.getPhaseById(phaseId)
                .map(phase -> ResponseEntity.ok(ApiResponse.success(phase)));
    }

    @Operation(summary = "Create a new phase")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping
    public Mono<ResponseEntity<ApiResponse<PhaseDto>>> createPhase(
            @RequestParam("projectId") String projectId,
            @Valid @RequestBody PhaseDto request) {
        return phaseService.createPhase(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Phase created successfully", created)));
    }

    @Operation(summary = "Update an existing phase")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER', 'QA')")
    @PutMapping("/{phaseId}")
    public Mono<ResponseEntity<ApiResponse<PhaseDto>>> updatePhase(
            @PathVariable String phaseId,
            @Valid @RequestBody PhaseDto request) {
        return phaseService.updatePhase(phaseId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Phase updated successfully", updated)));
    }

    @Operation(summary = "Delete a phase")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    @DeleteMapping("/{phaseId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deletePhase(@PathVariable String phaseId) {
        return phaseService.deletePhase(phaseId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Phase deleted successfully", null))));
    }
}
