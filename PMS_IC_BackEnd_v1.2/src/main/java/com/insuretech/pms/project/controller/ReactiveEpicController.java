package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.EpicDto;
import com.insuretech.pms.project.service.ReactiveEpicService;
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

@Tag(name = "Epics", description = "Epic management API")
@RestController
@RequiredArgsConstructor
public class ReactiveEpicController {

    private final ReactiveEpicService epicService;

    @Operation(summary = "Get all epics for a project")
    @GetMapping("/api/projects/{projectId}/epics")
    public Mono<ResponseEntity<ApiResponse<List<EpicDto>>>> getEpicsByProject(@PathVariable String projectId) {
        return epicService.getEpicsByProject(projectId)
                .collectList()
                .map(epics -> ResponseEntity.ok(ApiResponse.success(epics)));
    }

    @Operation(summary = "Get active epics for a project")
    @GetMapping("/api/projects/{projectId}/epics/active")
    public Mono<ResponseEntity<ApiResponse<List<EpicDto>>>> getActiveEpics(@PathVariable String projectId) {
        return epicService.getActiveEpicsByProject(projectId)
                .collectList()
                .map(epics -> ResponseEntity.ok(ApiResponse.success(epics)));
    }

    @Operation(summary = "Get epics by status")
    @GetMapping("/api/projects/{projectId}/epics/status/{status}")
    public Mono<ResponseEntity<ApiResponse<List<EpicDto>>>> getEpicsByStatus(
            @PathVariable String projectId,
            @PathVariable String status) {
        return epicService.getEpicsByProjectAndStatus(projectId, status)
                .collectList()
                .map(epics -> ResponseEntity.ok(ApiResponse.success(epics)));
    }

    @Operation(summary = "Get epics for a phase")
    @GetMapping("/api/phases/{phaseId}/epics")
    public Mono<ResponseEntity<ApiResponse<List<EpicDto>>>> getEpicsByPhase(@PathVariable String phaseId) {
        return epicService.getEpicsByPhase(phaseId)
                .collectList()
                .map(epics -> ResponseEntity.ok(ApiResponse.success(epics)));
    }

    @Operation(summary = "Get unlinked epics for a project")
    @GetMapping("/api/projects/{projectId}/epics/unlinked")
    public Mono<ResponseEntity<ApiResponse<List<EpicDto>>>> getUnlinkedEpics(@PathVariable String projectId) {
        return epicService.getUnlinkedEpics(projectId)
                .collectList()
                .map(epics -> ResponseEntity.ok(ApiResponse.success(epics)));
    }

    @Operation(summary = "Get an epic by ID")
    @GetMapping("/api/epics/{epicId}")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> getEpic(@PathVariable String epicId) {
        return epicService.getEpicById(epicId)
                .map(epic -> ResponseEntity.ok(ApiResponse.success(epic)));
    }

    @Operation(summary = "Create an epic")
    @PostMapping("/api/projects/{projectId}/epics")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> createEpic(
            @PathVariable String projectId,
            @Valid @RequestBody EpicDto request) {
        return epicService.createEpic(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Epic created", created)));
    }

    @Operation(summary = "Update an epic")
    @PutMapping("/api/epics/{epicId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> updateEpic(
            @PathVariable String epicId,
            @Valid @RequestBody EpicDto request) {
        return epicService.updateEpic(epicId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Epic updated", updated)));
    }

    @Operation(summary = "Link epic to phase")
    @PostMapping("/api/epics/{epicId}/link-phase")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> linkToPhase(
            @PathVariable String epicId,
            @RequestBody Map<String, String> request) {
        String phaseId = request.get("phaseId");
        return epicService.linkEpicToPhase(epicId, phaseId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Epic linked to phase", updated)));
    }

    @Operation(summary = "Unlink epic from phase")
    @PostMapping("/api/epics/{epicId}/unlink-phase")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> unlinkFromPhase(@PathVariable String epicId) {
        return epicService.unlinkEpicFromPhase(epicId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Epic unlinked from phase", updated)));
    }

    @Operation(summary = "Update epic status")
    @PatchMapping("/api/epics/{epicId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> updateEpicStatus(
            @PathVariable String epicId,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        return epicService.updateEpicStatus(epicId, status)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Epic status updated", updated)));
    }

    @Operation(summary = "Update epic progress")
    @PatchMapping("/api/epics/{epicId}/progress")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EpicDto>>> updateEpicProgress(
            @PathVariable String epicId,
            @RequestBody Map<String, Integer> request) {
        Integer progress = request.get("progress");
        return epicService.updateEpicProgress(epicId, progress)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Epic progress updated", updated)));
    }

    @Operation(summary = "Delete an epic")
    @DeleteMapping("/api/epics/{epicId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteEpic(@PathVariable String epicId) {
        return epicService.deleteEpic(epicId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Epic deleted", null))));
    }
}
