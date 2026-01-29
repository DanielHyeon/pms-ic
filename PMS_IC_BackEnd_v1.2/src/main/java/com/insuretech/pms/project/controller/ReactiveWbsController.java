package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.WbsGroupDto;
import com.insuretech.pms.project.dto.WbsItemDto;
import com.insuretech.pms.project.dto.WbsTaskDto;
import com.insuretech.pms.project.service.ReactiveWbsService;
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

@Tag(name = "WBS", description = "Work Breakdown Structure management API")
@RestController
@RequiredArgsConstructor
public class ReactiveWbsController {

    private final ReactiveWbsService wbsService;

    // ========== WBS Group Endpoints ==========

    @Operation(summary = "Get all WBS groups for a phase")
    @GetMapping("/api/phases/{phaseId}/wbs-groups")
    public Mono<ResponseEntity<ApiResponse<List<WbsGroupDto>>>> getGroupsByPhase(@PathVariable String phaseId) {
        return wbsService.getGroupsByPhase(phaseId)
                .collectList()
                .map(groups -> ResponseEntity.ok(ApiResponse.success(groups)));
    }

    @Operation(summary = "Get all WBS groups for a project")
    @GetMapping("/api/projects/{projectId}/wbs-groups")
    public Mono<ResponseEntity<ApiResponse<List<WbsGroupDto>>>> getGroupsByProject(@PathVariable String projectId) {
        return wbsService.getGroupsByProject(projectId)
                .collectList()
                .map(groups -> ResponseEntity.ok(ApiResponse.success(groups)));
    }

    @Operation(summary = "Get a WBS group by ID")
    @GetMapping("/api/wbs/groups/{groupId}")
    public Mono<ResponseEntity<ApiResponse<WbsGroupDto>>> getGroup(@PathVariable String groupId) {
        return wbsService.getGroupById(groupId)
                .map(group -> ResponseEntity.ok(ApiResponse.success(group)));
    }

    @Operation(summary = "Create a WBS group")
    @PostMapping("/api/phases/{phaseId}/wbs-groups")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsGroupDto>>> createGroup(
            @PathVariable String phaseId,
            @Valid @RequestBody WbsGroupDto request) {
        return wbsService.createGroup(phaseId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("WBS group created", created)));
    }

    @Operation(summary = "Update a WBS group")
    @PutMapping("/api/wbs/groups/{groupId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsGroupDto>>> updateGroup(
            @PathVariable String groupId,
            @Valid @RequestBody WbsGroupDto request) {
        return wbsService.updateGroup(groupId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("WBS group updated", updated)));
    }

    @Operation(summary = "Delete a WBS group")
    @DeleteMapping("/api/wbs/groups/{groupId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteGroup(@PathVariable String groupId) {
        return wbsService.deleteGroup(groupId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("WBS group deleted", null))));
    }

    // ========== WBS Item Endpoints ==========

    @Operation(summary = "Get all WBS items for a group")
    @GetMapping("/api/wbs/groups/{groupId}/items")
    public Mono<ResponseEntity<ApiResponse<List<WbsItemDto>>>> getItemsByGroup(@PathVariable String groupId) {
        return wbsService.getItemsByGroup(groupId)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get all WBS items for a phase")
    @GetMapping("/api/phases/{phaseId}/wbs-items")
    public Mono<ResponseEntity<ApiResponse<List<WbsItemDto>>>> getItemsByPhase(@PathVariable String phaseId) {
        return wbsService.getItemsByPhase(phaseId)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get all WBS items for a project")
    @GetMapping("/api/projects/{projectId}/wbs-items")
    public Mono<ResponseEntity<ApiResponse<List<WbsItemDto>>>> getItemsByProject(@PathVariable String projectId) {
        return wbsService.getItemsByProject(projectId)
                .collectList()
                .map(items -> ResponseEntity.ok(ApiResponse.success(items)));
    }

    @Operation(summary = "Get a WBS item by ID")
    @GetMapping("/api/wbs/items/{itemId}")
    public Mono<ResponseEntity<ApiResponse<WbsItemDto>>> getItem(@PathVariable String itemId) {
        return wbsService.getItemById(itemId)
                .map(item -> ResponseEntity.ok(ApiResponse.success(item)));
    }

    @Operation(summary = "Create a WBS item")
    @PostMapping("/api/wbs/groups/{groupId}/items")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsItemDto>>> createItem(
            @PathVariable String groupId,
            @Valid @RequestBody WbsItemDto request) {
        return wbsService.createItem(groupId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("WBS item created", created)));
    }

    @Operation(summary = "Update a WBS item")
    @PutMapping("/api/wbs/items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsItemDto>>> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody WbsItemDto request) {
        return wbsService.updateItem(itemId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("WBS item updated", updated)));
    }

    @Operation(summary = "Delete a WBS item")
    @DeleteMapping("/api/wbs/items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteItem(@PathVariable String itemId) {
        return wbsService.deleteItem(itemId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("WBS item deleted", null))));
    }

    // ========== WBS Task Endpoints ==========

    @Operation(summary = "Get all WBS tasks for an item")
    @GetMapping("/api/wbs/items/{itemId}/tasks")
    public Mono<ResponseEntity<ApiResponse<List<WbsTaskDto>>>> getTasksByItem(@PathVariable String itemId) {
        return wbsService.getTasksByItem(itemId)
                .collectList()
                .map(tasks -> ResponseEntity.ok(ApiResponse.success(tasks)));
    }

    @Operation(summary = "Get all WBS tasks for a group")
    @GetMapping("/api/wbs/groups/{groupId}/tasks")
    public Mono<ResponseEntity<ApiResponse<List<WbsTaskDto>>>> getTasksByGroup(@PathVariable String groupId) {
        return wbsService.getTasksByGroup(groupId)
                .collectList()
                .map(tasks -> ResponseEntity.ok(ApiResponse.success(tasks)));
    }

    @Operation(summary = "Get all WBS tasks for a phase")
    @GetMapping("/api/phases/{phaseId}/wbs-tasks")
    public Mono<ResponseEntity<ApiResponse<List<WbsTaskDto>>>> getTasksByPhase(@PathVariable String phaseId) {
        return wbsService.getTasksByPhase(phaseId)
                .collectList()
                .map(tasks -> ResponseEntity.ok(ApiResponse.success(tasks)));
    }

    @Operation(summary = "Get all WBS tasks for a project")
    @GetMapping("/api/projects/{projectId}/wbs-tasks")
    public Mono<ResponseEntity<ApiResponse<List<WbsTaskDto>>>> getTasksByProject(@PathVariable String projectId) {
        return wbsService.getTasksByProject(projectId)
                .collectList()
                .map(tasks -> ResponseEntity.ok(ApiResponse.success(tasks)));
    }

    @Operation(summary = "Get a WBS task by ID")
    @GetMapping("/api/wbs/tasks/{taskId}")
    public Mono<ResponseEntity<ApiResponse<WbsTaskDto>>> getTask(@PathVariable String taskId) {
        return wbsService.getTaskById(taskId)
                .map(task -> ResponseEntity.ok(ApiResponse.success(task)));
    }

    @Operation(summary = "Create a WBS task")
    @PostMapping("/api/wbs/items/{itemId}/tasks")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsTaskDto>>> createTask(
            @PathVariable String itemId,
            @Valid @RequestBody WbsTaskDto request) {
        return wbsService.createTask(itemId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("WBS task created", created)));
    }

    @Operation(summary = "Update a WBS task")
    @PutMapping("/api/wbs/tasks/{taskId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<WbsTaskDto>>> updateTask(
            @PathVariable String taskId,
            @Valid @RequestBody WbsTaskDto request) {
        return wbsService.updateTask(taskId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("WBS task updated", updated)));
    }

    @Operation(summary = "Delete a WBS task")
    @DeleteMapping("/api/wbs/tasks/{taskId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteTask(@PathVariable String taskId) {
        return wbsService.deleteTask(taskId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("WBS task deleted", null))));
    }
}
