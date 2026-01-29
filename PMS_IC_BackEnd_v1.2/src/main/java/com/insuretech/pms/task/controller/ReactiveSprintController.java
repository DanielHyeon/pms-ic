package com.insuretech.pms.task.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.task.dto.SprintDto;
import com.insuretech.pms.task.service.ReactiveSprintService;
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

@Tag(name = "Sprints", description = "Sprint management API")
@RestController
@RequestMapping("/api/projects/{projectId}/sprints")
@RequiredArgsConstructor
public class ReactiveSprintController {

    private final ReactiveSprintService sprintService;

    @Operation(summary = "Get all sprints for a project")
    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<SprintDto>>>> getSprints(@PathVariable String projectId) {
        return sprintService.getSprintsByProject(projectId)
                .collectList()
                .map(sprints -> ResponseEntity.ok(ApiResponse.success(sprints)));
    }

    @Operation(summary = "Get active sprint for a project")
    @GetMapping("/active")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> getActiveSprint(@PathVariable String projectId) {
        return sprintService.getActiveSprint(projectId)
                .map(sprint -> ResponseEntity.ok(ApiResponse.success(sprint)))
                .defaultIfEmpty(ResponseEntity.ok(ApiResponse.success("No active sprint", null)));
    }

    @Operation(summary = "Get sprints by status")
    @GetMapping("/status/{status}")
    public Mono<ResponseEntity<ApiResponse<List<SprintDto>>>> getSprintsByStatus(
            @PathVariable String projectId,
            @PathVariable String status) {
        return sprintService.getSprintsByProjectAndStatus(projectId, status)
                .collectList()
                .map(sprints -> ResponseEntity.ok(ApiResponse.success(sprints)));
    }

    @Operation(summary = "Get a sprint by ID")
    @GetMapping("/{sprintId}")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> getSprint(
            @PathVariable String projectId,
            @PathVariable String sprintId) {
        return sprintService.getSprintById(sprintId)
                .map(sprint -> ResponseEntity.ok(ApiResponse.success(sprint)));
    }

    @Operation(summary = "Create a sprint")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> createSprint(
            @PathVariable String projectId,
            @Valid @RequestBody SprintDto request) {
        return sprintService.createSprint(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Sprint created", created)));
    }

    @Operation(summary = "Update a sprint")
    @PutMapping("/{sprintId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> updateSprint(
            @PathVariable String projectId,
            @PathVariable String sprintId,
            @Valid @RequestBody SprintDto request) {
        return sprintService.updateSprint(sprintId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Sprint updated", updated)));
    }

    @Operation(summary = "Start a sprint")
    @PostMapping("/{sprintId}/start")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> startSprint(
            @PathVariable String projectId,
            @PathVariable String sprintId) {
        return sprintService.startSprint(sprintId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Sprint started", updated)));
    }

    @Operation(summary = "Complete a sprint")
    @PostMapping("/{sprintId}/complete")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> completeSprint(
            @PathVariable String projectId,
            @PathVariable String sprintId) {
        return sprintService.completeSprint(sprintId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Sprint completed", updated)));
    }

    @Operation(summary = "Cancel a sprint")
    @PostMapping("/{sprintId}/cancel")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<SprintDto>>> cancelSprint(
            @PathVariable String projectId,
            @PathVariable String sprintId) {
        return sprintService.cancelSprint(sprintId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Sprint cancelled", updated)));
    }

    @Operation(summary = "Delete a sprint")
    @DeleteMapping("/{sprintId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteSprint(
            @PathVariable String projectId,
            @PathVariable String sprintId) {
        return sprintService.deleteSprint(sprintId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Sprint deleted", null))));
    }
}
