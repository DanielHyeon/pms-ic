package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.FeatureDto;
import com.insuretech.pms.project.service.ReactiveFeatureService;
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

@Tag(name = "Features", description = "Feature management API")
@RestController
@RequiredArgsConstructor
public class ReactiveFeatureController {

    private final ReactiveFeatureService featureService;

    @Operation(summary = "Get all features for an epic")
    @GetMapping("/api/epics/{epicId}/features")
    public Mono<ResponseEntity<ApiResponse<List<FeatureDto>>>> getFeaturesByEpic(@PathVariable String epicId) {
        return featureService.getFeaturesByEpic(epicId)
                .collectList()
                .map(features -> ResponseEntity.ok(ApiResponse.success(features)));
    }

    @Operation(summary = "Get all features for a part")
    @GetMapping("/api/parts/{partId}/features")
    public Mono<ResponseEntity<ApiResponse<List<FeatureDto>>>> getFeaturesByPart(@PathVariable String partId) {
        return featureService.getFeaturesByPart(partId)
                .collectList()
                .map(features -> ResponseEntity.ok(ApiResponse.success(features)));
    }

    @Operation(summary = "Get all features for a project")
    @GetMapping("/api/projects/{projectId}/features")
    public Mono<ResponseEntity<ApiResponse<List<FeatureDto>>>> getFeaturesByProject(@PathVariable String projectId) {
        return featureService.getFeaturesByProject(projectId)
                .collectList()
                .map(features -> ResponseEntity.ok(ApiResponse.success(features)));
    }

    @Operation(summary = "Get unlinked features for an epic")
    @GetMapping("/api/epics/{epicId}/features/unlinked")
    public Mono<ResponseEntity<ApiResponse<List<FeatureDto>>>> getUnlinkedFeatures(@PathVariable String epicId) {
        return featureService.getUnlinkedFeaturesByEpic(epicId)
                .collectList()
                .map(features -> ResponseEntity.ok(ApiResponse.success(features)));
    }

    @Operation(summary = "Get a feature by ID")
    @GetMapping("/api/features/{featureId}")
    public Mono<ResponseEntity<ApiResponse<FeatureDto>>> getFeature(@PathVariable String featureId) {
        return featureService.getFeatureById(featureId)
                .map(feature -> ResponseEntity.ok(ApiResponse.success(feature)));
    }

    @Operation(summary = "Create a feature")
    @PostMapping("/api/epics/{epicId}/features")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<FeatureDto>>> createFeature(
            @PathVariable String epicId,
            @Valid @RequestBody FeatureDto request) {
        return featureService.createFeature(epicId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Feature created", created)));
    }

    @Operation(summary = "Update a feature")
    @PutMapping("/api/features/{featureId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<FeatureDto>>> updateFeature(
            @PathVariable String featureId,
            @Valid @RequestBody FeatureDto request) {
        return featureService.updateFeature(featureId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Feature updated", updated)));
    }

    @Operation(summary = "Link a feature to a WBS group")
    @PostMapping("/api/features/{featureId}/link-wbs-group")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<FeatureDto>>> linkToWbsGroup(
            @PathVariable String featureId,
            @RequestBody Map<String, String> request) {
        String wbsGroupId = request.get("wbsGroupId");
        return featureService.linkFeatureToWbsGroup(featureId, wbsGroupId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Feature linked to WBS group", updated)));
    }

    @Operation(summary = "Unlink a feature from WBS group")
    @PostMapping("/api/features/{featureId}/unlink-wbs-group")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<FeatureDto>>> unlinkFromWbsGroup(@PathVariable String featureId) {
        return featureService.unlinkFeatureFromWbsGroup(featureId)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Feature unlinked from WBS group", updated)));
    }

    @Operation(summary = "Delete a feature")
    @DeleteMapping("/api/features/{featureId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteFeature(@PathVariable String featureId) {
        return featureService.deleteFeature(featureId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Feature deleted", null))));
    }
}
