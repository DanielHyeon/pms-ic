package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.entity.Epic;
import com.insuretech.pms.project.entity.Feature;
import com.insuretech.pms.project.service.IntegrationService;
import com.insuretech.pms.task.entity.UserStory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Integration", description = "Phase-WBS-Backlog Integration API")
@RestController
@RequestMapping("/api/integration")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegrationService integrationService;

    // ============ Epic-Phase Integration ============

    @Operation(summary = "Link epic to phase")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping("/epic-phase")
    public ResponseEntity<ApiResponse<Void>> linkEpicToPhase(
            @RequestParam String epicId,
            @RequestParam String phaseId) {
        integrationService.linkEpicToPhase(epicId, phaseId);
        return ResponseEntity.ok(ApiResponse.success("Epic linked to Phase successfully", null));
    }

    @Operation(summary = "Unlink epic from phase")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @DeleteMapping("/epic-phase/{epicId}")
    public ResponseEntity<ApiResponse<Void>> unlinkEpicFromPhase(@PathVariable String epicId) {
        integrationService.unlinkEpicFromPhase(epicId);
        return ResponseEntity.ok(ApiResponse.success("Epic unlinked from Phase successfully", null));
    }

    @Operation(summary = "Get epics by phase")
    @GetMapping("/phases/{phaseId}/epics")
    public ResponseEntity<ApiResponse<List<Epic>>> getEpicsByPhase(@PathVariable String phaseId) {
        return ResponseEntity.ok(ApiResponse.success(integrationService.getEpicsByPhase(phaseId)));
    }

    @Operation(summary = "Get unlinked epics for a project")
    @GetMapping("/projects/{projectId}/epics/unlinked")
    public ResponseEntity<ApiResponse<List<Epic>>> getUnlinkedEpics(@PathVariable String projectId) {
        return ResponseEntity.ok(ApiResponse.success(integrationService.getUnlinkedEpics(projectId)));
    }

    // ============ Feature-WbsGroup Integration ============

    @Operation(summary = "Link feature to WBS group")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping("/feature-group")
    public ResponseEntity<ApiResponse<Void>> linkFeatureToWbsGroup(
            @RequestParam String featureId,
            @RequestParam String wbsGroupId) {
        integrationService.linkFeatureToWbsGroup(featureId, wbsGroupId);
        return ResponseEntity.ok(ApiResponse.success("Feature linked to WBS Group successfully", null));
    }

    @Operation(summary = "Unlink feature from WBS group")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @DeleteMapping("/feature-group/{featureId}")
    public ResponseEntity<ApiResponse<Void>> unlinkFeatureFromWbsGroup(@PathVariable String featureId) {
        integrationService.unlinkFeatureFromWbsGroup(featureId);
        return ResponseEntity.ok(ApiResponse.success("Feature unlinked from WBS Group successfully", null));
    }

    @Operation(summary = "Get features by WBS group")
    @GetMapping("/wbs-groups/{wbsGroupId}/features")
    public ResponseEntity<ApiResponse<List<Feature>>> getFeaturesByWbsGroup(@PathVariable String wbsGroupId) {
        return ResponseEntity.ok(ApiResponse.success(integrationService.getFeaturesByWbsGroup(wbsGroupId)));
    }

    // ============ Story-WbsItem Integration ============

    @Operation(summary = "Link story to WBS item")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER')")
    @PostMapping("/story-item")
    public ResponseEntity<ApiResponse<Void>> linkStoryToWbsItem(
            @RequestParam String storyId,
            @RequestParam String wbsItemId) {
        integrationService.linkStoryToWbsItem(storyId, wbsItemId);
        return ResponseEntity.ok(ApiResponse.success("Story linked to WBS Item successfully", null));
    }

    @Operation(summary = "Unlink story from WBS item")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'DEVELOPER')")
    @DeleteMapping("/story-item/{storyId}")
    public ResponseEntity<ApiResponse<Void>> unlinkStoryFromWbsItem(@PathVariable String storyId) {
        integrationService.unlinkStoryFromWbsItem(storyId);
        return ResponseEntity.ok(ApiResponse.success("Story unlinked from WBS Item successfully", null));
    }

    @Operation(summary = "Get stories by WBS item")
    @GetMapping("/wbs-items/{wbsItemId}/stories")
    public ResponseEntity<ApiResponse<List<UserStory>>> getStoriesByWbsItem(@PathVariable String wbsItemId) {
        return ResponseEntity.ok(ApiResponse.success(integrationService.getStoriesByWbsItem(wbsItemId)));
    }

    @Operation(summary = "Get unlinked stories for a project")
    @GetMapping("/projects/{projectId}/stories/unlinked")
    public ResponseEntity<ApiResponse<List<UserStory>>> getUnlinkedStories(@PathVariable String projectId) {
        return ResponseEntity.ok(ApiResponse.success(integrationService.getUnlinkedStories(projectId)));
    }

    // ============ Integration Summary ============

    @Operation(summary = "Get phase integration summary")
    @GetMapping("/phases/{phaseId}/summary")
    public ResponseEntity<ApiResponse<IntegrationService.PhaseIntegrationSummary>> getPhaseIntegrationSummary(
            @PathVariable String phaseId,
            @RequestParam String projectId) {
        return ResponseEntity.ok(ApiResponse.success(
                integrationService.getPhaseIntegrationSummary(phaseId, projectId)));
    }
}
