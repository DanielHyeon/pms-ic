package com.insuretech.pms.task.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.task.dto.CreateUserStoryRequest;
import com.insuretech.pms.task.dto.UpdateUserStoryRequest;
import com.insuretech.pms.task.dto.UserStoryResponse;
import com.insuretech.pms.task.service.ReactiveUserStoryService;
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

@Tag(name = "User Stories", description = "User story management API")
@RestController
@RequiredArgsConstructor
public class ReactiveUserStoryController {

    private final ReactiveUserStoryService userStoryService;

    @Operation(summary = "Get all user stories for a project")
    @GetMapping("/api/projects/{projectId}/user-stories")
    public Mono<ResponseEntity<ApiResponse<List<UserStoryResponse>>>> getUserStoriesByProject(
            @PathVariable String projectId) {
        return userStoryService.getUserStoriesByProject(projectId)
                .collectList()
                .map(stories -> ResponseEntity.ok(ApiResponse.success(stories)));
    }

    @Operation(summary = "Get user stories by status")
    @GetMapping("/api/projects/{projectId}/user-stories/status/{status}")
    public Mono<ResponseEntity<ApiResponse<List<UserStoryResponse>>>> getUserStoriesByStatus(
            @PathVariable String projectId,
            @PathVariable String status) {
        return userStoryService.getUserStoriesByProjectAndStatus(projectId, status)
                .collectList()
                .map(stories -> ResponseEntity.ok(ApiResponse.success(stories)));
    }

    @Operation(summary = "Get user stories by sprint")
    @GetMapping("/api/sprints/{sprintId}/user-stories")
    public Mono<ResponseEntity<ApiResponse<List<UserStoryResponse>>>> getUserStoriesBySprint(
            @PathVariable String sprintId) {
        return userStoryService.getUserStoriesBySprint(sprintId)
                .collectList()
                .map(stories -> ResponseEntity.ok(ApiResponse.success(stories)));
    }

    @Operation(summary = "Get user stories by feature")
    @GetMapping("/api/features/{featureId}/user-stories")
    public Mono<ResponseEntity<ApiResponse<List<UserStoryResponse>>>> getUserStoriesByFeature(
            @PathVariable String featureId) {
        return userStoryService.getUserStoriesByFeature(featureId)
                .collectList()
                .map(stories -> ResponseEntity.ok(ApiResponse.success(stories)));
    }

    @Operation(summary = "Get user stories by part")
    @GetMapping("/api/parts/{partId}/user-stories")
    public Mono<ResponseEntity<ApiResponse<List<UserStoryResponse>>>> getUserStoriesByPart(
            @PathVariable String partId) {
        return userStoryService.getUserStoriesByPart(partId)
                .collectList()
                .map(stories -> ResponseEntity.ok(ApiResponse.success(stories)));
    }

    @Operation(summary = "Get unlinked user stories")
    @GetMapping("/api/projects/{projectId}/user-stories/unlinked")
    public Mono<ResponseEntity<ApiResponse<List<UserStoryResponse>>>> getUnlinkedUserStories(
            @PathVariable String projectId) {
        return userStoryService.getUnlinkedUserStories(projectId)
                .collectList()
                .map(stories -> ResponseEntity.ok(ApiResponse.success(stories)));
    }

    @Operation(summary = "Get a user story by ID")
    @GetMapping("/api/user-stories/{storyId}")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> getUserStory(@PathVariable String storyId) {
        return userStoryService.getUserStoryById(storyId)
                .map(story -> ResponseEntity.ok(ApiResponse.success(story)));
    }

    @Operation(summary = "Create a user story")
    @PostMapping("/api/user-stories")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> createUserStory(
            @Valid @RequestBody CreateUserStoryRequest request) {
        return userStoryService.createUserStory(request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("User story created", created)));
    }

    @Operation(summary = "Update a user story")
    @PutMapping("/api/user-stories/{storyId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> updateUserStory(
            @PathVariable String storyId,
            @Valid @RequestBody UpdateUserStoryRequest request) {
        return userStoryService.updateUserStory(storyId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("User story updated", updated)));
    }

    @Operation(summary = "Assign user story to sprint")
    @PostMapping("/api/user-stories/{storyId}/assign-sprint")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> assignToSprint(
            @PathVariable String storyId,
            @RequestBody Map<String, String> request) {
        String sprintId = request.get("sprintId");
        return userStoryService.assignToSprint(storyId, sprintId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("User story assigned to sprint", updated)));
    }

    @Operation(summary = "Remove user story from sprint")
    @PostMapping("/api/user-stories/{storyId}/remove-sprint")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> removeFromSprint(@PathVariable String storyId) {
        return userStoryService.removeFromSprint(storyId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("User story removed from sprint", updated)));
    }

    @Operation(summary = "Update user story status")
    @PatchMapping("/api/user-stories/{storyId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> updateStatus(
            @PathVariable String storyId,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        return userStoryService.updateStatus(storyId, status)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("User story status updated", updated)));
    }

    @Operation(summary = "Link user story to WBS item")
    @PostMapping("/api/user-stories/{storyId}/link-wbs-item")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<UserStoryResponse>>> linkToWbsItem(
            @PathVariable String storyId,
            @RequestBody Map<String, String> request) {
        String wbsItemId = request.get("wbsItemId");
        return userStoryService.linkToWbsItem(storyId, wbsItemId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("User story linked to WBS item", updated)));
    }

    @Operation(summary = "Delete a user story")
    @DeleteMapping("/api/user-stories/{storyId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteUserStory(@PathVariable String storyId) {
        return userStoryService.deleteUserStory(storyId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("User story deleted", null))));
    }
}
