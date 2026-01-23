package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.CreatePhaseRequest;
import com.insuretech.pms.project.dto.PhaseDto;
import com.insuretech.pms.project.dto.UpdatePhaseRequest;
import com.insuretech.pms.project.service.PhaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Phases", description = "Phase management API")
@RestController
@RequestMapping("/api/phases")
@RequiredArgsConstructor
public class PhaseController {

    private final PhaseService phaseService;

    @Operation(summary = "Get all phases")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhaseDto>>> getPhases(
            @RequestParam(value = "projectId", required = false) String projectId) {
        return ResponseEntity.ok(ApiResponse.success(phaseService.getPhases(projectId)));
    }

    @Operation(summary = "Get phase by ID")
    @GetMapping("/{phaseId}")
    public ResponseEntity<ApiResponse<PhaseDto>> getPhase(@PathVariable String phaseId) {
        return ResponseEntity.ok(ApiResponse.success(phaseService.getPhaseById(phaseId)));
    }

    @Operation(summary = "Create a new phase")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping
    public ResponseEntity<ApiResponse<PhaseDto>> createPhase(
            @RequestParam("projectId") String projectId,
            @Valid @RequestBody CreatePhaseRequest request) {
        PhaseDto created = phaseService.createPhase(projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Phase created successfully", created));
    }

    @Operation(summary = "Update an existing phase")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER', 'QA')")
    @PutMapping("/{phaseId}")
    public ResponseEntity<ApiResponse<PhaseDto>> updatePhase(
            @PathVariable String phaseId,
            @Valid @RequestBody UpdatePhaseRequest request) {
        PhaseDto updated = phaseService.updatePhase(phaseId, request);
        return ResponseEntity.ok(ApiResponse.success("Phase updated successfully", updated));
    }

    @Operation(summary = "Delete a phase")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    @DeleteMapping("/{phaseId}")
    public ResponseEntity<ApiResponse<Void>> deletePhase(@PathVariable String phaseId) {
        phaseService.deletePhase(phaseId);
        return ResponseEntity.ok(ApiResponse.success("Phase deleted successfully", null));
    }
}
