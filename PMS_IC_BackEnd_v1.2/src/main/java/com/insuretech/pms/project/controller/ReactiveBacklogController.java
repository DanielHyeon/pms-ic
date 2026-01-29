package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.BacklogDto;
import com.insuretech.pms.project.dto.BacklogItemDto;
import com.insuretech.pms.project.service.ReactiveBacklogService;
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

@Tag(name = "Backlogs", description = "Product backlog management API")
@RestController
@RequiredArgsConstructor
public class ReactiveBacklogController {

    private final ReactiveBacklogService backlogService;

    // ========== Backlog Endpoints ==========

    @Operation(summary = "Get all backlogs for a project")
    @GetMapping("/api/projects/{projectId}/backlogs")
    public Mono<ResponseEntity<ApiResponse<List<BacklogDto>>>> getBacklogsByProject(@PathVariable String projectId) {
        return backlogService.getBacklogsByProject(projectId)
                .collectList()
                .map(backlogs -> ResponseEntity.ok(ApiResponse.success(backlogs)));
    }

    @Operation(summary = "Get active backlog for a project")
    @GetMapping("/api/projects/{projectId}/backlogs/active")
    public Mono<ResponseEntity<ApiResponse<BacklogDto>>> getActiveBacklog(@PathVariable String projectId) {
        return backlogService.getActiveBacklog(projectId)
                .map(backlog -> ResponseEntity.ok(ApiResponse.success(backlog)));
    }

    @Operation(summary = "Get a backlog by ID")
    @GetMapping("/api/backlogs/{backlogId}")
    public Mono<ResponseEntity<ApiResponse<BacklogDto>>> getBacklog(@PathVariable String backlogId) {
        return backlogService.getBacklogById(backlogId)
                .map(backlog -> ResponseEntity.ok(ApiResponse.success(backlog)));
    }

    @Operation(summary = "Create a backlog")
    @PostMapping("/api/projects/{projectId}/backlogs")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<BacklogDto>>> createBacklog(
            @PathVariable String projectId,
            @Valid @RequestBody BacklogDto request) {
        return backlogService.createBacklog(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Backlog created", created)));
    }

    @Operation(summary = "Update a backlog")
    @PutMapping("/api/backlogs/{backlogId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<BacklogDto>>> updateBacklog(
            @PathVariable String backlogId,
            @Valid @RequestBody BacklogDto request) {
        return backlogService.updateBacklog(backlogId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Backlog updated", updated)));
    }

    @Operation(summary = "Delete a backlog")
    @DeleteMapping("/api/backlogs/{backlogId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteBacklog(@PathVariable String backlogId) {
        return backlogService.deleteBacklog(backlogId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Backlog deleted", null))));
    }

    // ========== Backlog Item Endpoints ==========

    @Operation(summary = "Get all items in a backlog")
    @GetMapping("/api/backlogs/{backlogId}/items")
    public Mono<ResponseEntity<ApiResponse<List<BacklogItemDto>>>> getItemsByBacklog(@PathVariable String backlogId) {
        return backlogService.getItemsByBacklog(backlogId)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get items by status")
    @GetMapping("/api/backlogs/{backlogId}/items/status/{status}")
    public Mono<ResponseEntity<ApiResponse<List<BacklogItemDto>>>> getItemsByStatus(
            @PathVariable String backlogId,
            @PathVariable String status) {
        return backlogService.getItemsByBacklogAndStatus(backlogId, status)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get selected items for sprint planning")
    @GetMapping("/api/backlogs/{backlogId}/items/selected")
    public Mono<ResponseEntity<ApiResponse<List<BacklogItemDto>>>> getSelectedItems(@PathVariable String backlogId) {
        return backlogService.getSelectedItemsForSprintPlanning(backlogId)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get items by sprint")
    @GetMapping("/api/sprints/{sprintId}/backlog-items")
    public Mono<ResponseEntity<ApiResponse<List<BacklogItemDto>>>> getItemsBySprint(@PathVariable String sprintId) {
        return backlogService.getItemsBySprint(sprintId)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get a backlog item by ID")
    @GetMapping("/api/backlog-items/{itemId}")
    public Mono<ResponseEntity<ApiResponse<BacklogItemDto>>> getItem(@PathVariable String itemId) {
        return backlogService.getItemById(itemId)
                .map(item -> ResponseEntity.ok(ApiResponse.success(item)));
    }

    @Operation(summary = "Create a backlog item")
    @PostMapping("/api/backlogs/{backlogId}/items")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<BacklogItemDto>>> createItem(
            @PathVariable String backlogId,
            @Valid @RequestBody BacklogItemDto request) {
        return backlogService.createItem(backlogId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Backlog item created", created)));
    }

    @Operation(summary = "Update a backlog item")
    @PutMapping("/api/backlog-items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<BacklogItemDto>>> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody BacklogItemDto request) {
        return backlogService.updateItem(itemId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Backlog item updated", updated)));
    }

    @Operation(summary = "Select item for sprint")
    @PostMapping("/api/backlog-items/{itemId}/select")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<BacklogItemDto>>> selectItem(@PathVariable String itemId) {
        return backlogService.selectItemForSprint(itemId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Item selected for sprint", updated)));
    }

    @Operation(summary = "Assign item to sprint")
    @PostMapping("/api/backlog-items/{itemId}/assign-sprint")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<BacklogItemDto>>> assignToSprint(
            @PathVariable String itemId,
            @RequestBody Map<String, String> request) {
        String sprintId = request.get("sprintId");
        return backlogService.assignItemToSprint(itemId, sprintId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Item assigned to sprint", updated)));
    }

    @Operation(summary = "Delete a backlog item")
    @DeleteMapping("/api/backlog-items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteItem(@PathVariable String itemId) {
        return backlogService.deleteItem(itemId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Backlog item deleted", null))));
    }

    // ========== Statistics Endpoints ==========

    @Operation(summary = "Get backlog item count")
    @GetMapping("/api/backlogs/{backlogId}/stats/count")
    public Mono<ResponseEntity<ApiResponse<Long>>> getItemCount(@PathVariable String backlogId) {
        return backlogService.countItemsByBacklog(backlogId)
                .map(count -> ResponseEntity.ok(ApiResponse.success(count)));
    }

    @Operation(summary = "Get total story points for selected items")
    @GetMapping("/api/backlogs/{backlogId}/stats/story-points")
    public Mono<ResponseEntity<ApiResponse<Integer>>> getSelectedStoryPoints(@PathVariable String backlogId) {
        return backlogService.sumStoryPointsForSelectedItems(backlogId)
                .map(points -> ResponseEntity.ok(ApiResponse.success(points)));
    }
}
