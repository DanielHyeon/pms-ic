package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.PartDto;
import com.insuretech.pms.project.service.ReactivePartService;
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

@Tag(name = "Parts", description = "Part (Sub-Project) management API")
@RestController
@RequiredArgsConstructor
public class ReactivePartController {

    private final ReactivePartService partService;

    @Operation(summary = "Get all parts for a project")
    @GetMapping("/api/projects/{projectId}/parts")
    public Mono<ResponseEntity<ApiResponse<List<PartDto>>>> getParts(@PathVariable String projectId) {
        return partService.getPartsByProject(projectId)
                .collectList()
                .map(parts -> ResponseEntity.ok(ApiResponse.success(parts)));
    }

    @Operation(summary = "Get part by ID")
    @GetMapping("/api/parts/{partId}")
    public Mono<ResponseEntity<ApiResponse<PartDto>>> getPart(@PathVariable String partId) {
        return partService.getPartById(partId)
                .map(part -> ResponseEntity.ok(ApiResponse.success(part)));
    }

    @Operation(summary = "Create a new part")
    @PostMapping("/api/projects/{projectId}/parts")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<PartDto>>> createPart(
            @PathVariable String projectId,
            @Valid @RequestBody PartDto request) {
        return partService.createPart(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Part created successfully", created)));
    }

    @Operation(summary = "Update a part")
    @PutMapping("/api/parts/{partId}")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<PartDto>>> updatePart(
            @PathVariable String partId,
            @Valid @RequestBody PartDto request) {
        return partService.updatePart(partId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Part updated successfully", updated)));
    }

    @Operation(summary = "Delete a part")
    @DeleteMapping("/api/parts/{partId}")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<Void>>> deletePart(@PathVariable String partId) {
        return partService.deletePart(partId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Part deleted successfully", null))));
    }

    @Operation(summary = "Assign a leader to a part")
    @PutMapping("/api/parts/{partId}/leader")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<PartDto>>> assignLeader(
            @PathVariable String partId,
            @RequestBody Map<String, String> request) {
        String userId = request.get("userId");
        return partService.assignLeader(partId, userId)
                .map(part -> ResponseEntity.ok(ApiResponse.success("Leader assigned successfully", part)));
    }
}
