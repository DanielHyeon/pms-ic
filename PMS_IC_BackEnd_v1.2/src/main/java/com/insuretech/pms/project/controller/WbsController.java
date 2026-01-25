package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.WbsGroupDto;
import com.insuretech.pms.project.dto.WbsItemDto;
import com.insuretech.pms.project.dto.WbsTaskDto;
import com.insuretech.pms.project.service.WbsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "WBS", description = "WBS (Work Breakdown Structure) management API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WbsController {

    private final WbsService wbsService;

    // ============ WBS Group Endpoints ============

    @Operation(summary = "Get all WBS groups for a phase")
    @GetMapping("/phases/{phaseId}/wbs/groups")
    public ResponseEntity<ApiResponse<List<WbsGroupDto>>> getGroupsByPhase(@PathVariable String phaseId) {
        return ResponseEntity.ok(ApiResponse.success(wbsService.getGroupsByPhase(phaseId)));
    }

    @Operation(summary = "Get WBS group by ID")
    @GetMapping("/wbs/groups/{groupId}")
    public ResponseEntity<ApiResponse<WbsGroupDto>> getGroup(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.success(wbsService.getGroupById(groupId)));
    }

    @Operation(summary = "Create a new WBS group")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping("/phases/{phaseId}/wbs/groups")
    public ResponseEntity<ApiResponse<WbsGroupDto>> createGroup(
            @PathVariable String phaseId,
            @Valid @RequestBody WbsGroupDto request) {
        WbsGroupDto created = wbsService.createGroup(phaseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("WBS Group created successfully", created));
    }

    @Operation(summary = "Update a WBS group")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER')")
    @PutMapping("/wbs/groups/{groupId}")
    public ResponseEntity<ApiResponse<WbsGroupDto>> updateGroup(
            @PathVariable String groupId,
            @Valid @RequestBody WbsGroupDto request) {
        WbsGroupDto updated = wbsService.updateGroup(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("WBS Group updated successfully", updated));
    }

    @Operation(summary = "Delete a WBS group")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    @DeleteMapping("/wbs/groups/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable String groupId) {
        wbsService.deleteGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success("WBS Group deleted successfully", null));
    }

    // ============ WBS Item Endpoints ============

    @Operation(summary = "Get all WBS items for a group")
    @GetMapping("/wbs/groups/{groupId}/items")
    public ResponseEntity<ApiResponse<List<WbsItemDto>>> getItemsByGroup(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.success(wbsService.getItemsByGroup(groupId)));
    }

    @Operation(summary = "Get WBS item by ID")
    @GetMapping("/wbs/items/{itemId}")
    public ResponseEntity<ApiResponse<WbsItemDto>> getItem(@PathVariable String itemId) {
        return ResponseEntity.ok(ApiResponse.success(wbsService.getItemById(itemId)));
    }

    @Operation(summary = "Create a new WBS item")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping("/wbs/groups/{groupId}/items")
    public ResponseEntity<ApiResponse<WbsItemDto>> createItem(
            @PathVariable String groupId,
            @Valid @RequestBody WbsItemDto request) {
        WbsItemDto created = wbsService.createItem(groupId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("WBS Item created successfully", created));
    }

    @Operation(summary = "Update a WBS item")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER')")
    @PutMapping("/wbs/items/{itemId}")
    public ResponseEntity<ApiResponse<WbsItemDto>> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody WbsItemDto request) {
        WbsItemDto updated = wbsService.updateItem(itemId, request);
        return ResponseEntity.ok(ApiResponse.success("WBS Item updated successfully", updated));
    }

    @Operation(summary = "Delete a WBS item")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    @DeleteMapping("/wbs/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable String itemId) {
        wbsService.deleteItem(itemId);
        return ResponseEntity.ok(ApiResponse.success("WBS Item deleted successfully", null));
    }

    // ============ WBS Task Endpoints ============

    @Operation(summary = "Get all WBS tasks for an item")
    @GetMapping("/wbs/items/{itemId}/tasks")
    public ResponseEntity<ApiResponse<List<WbsTaskDto>>> getTasksByItem(@PathVariable String itemId) {
        return ResponseEntity.ok(ApiResponse.success(wbsService.getTasksByItem(itemId)));
    }

    @Operation(summary = "Get WBS task by ID")
    @GetMapping("/wbs/tasks/{taskId}")
    public ResponseEntity<ApiResponse<WbsTaskDto>> getTask(@PathVariable String taskId) {
        return ResponseEntity.ok(ApiResponse.success(wbsService.getTaskById(taskId)));
    }

    @Operation(summary = "Create a new WBS task")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER')")
    @PostMapping("/wbs/items/{itemId}/tasks")
    public ResponseEntity<ApiResponse<WbsTaskDto>> createTask(
            @PathVariable String itemId,
            @Valid @RequestBody WbsTaskDto request) {
        WbsTaskDto created = wbsService.createTask(itemId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("WBS Task created successfully", created));
    }

    @Operation(summary = "Update a WBS task")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER')")
    @PutMapping("/wbs/tasks/{taskId}")
    public ResponseEntity<ApiResponse<WbsTaskDto>> updateTask(
            @PathVariable String taskId,
            @Valid @RequestBody WbsTaskDto request) {
        WbsTaskDto updated = wbsService.updateTask(taskId, request);
        return ResponseEntity.ok(ApiResponse.success("WBS Task updated successfully", updated));
    }

    @Operation(summary = "Delete a WBS task")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    @DeleteMapping("/wbs/tasks/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable String taskId) {
        wbsService.deleteTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("WBS Task deleted successfully", null));
    }
}
