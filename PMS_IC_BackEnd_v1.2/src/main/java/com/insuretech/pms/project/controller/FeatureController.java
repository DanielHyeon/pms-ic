package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.FeatureDto;
import com.insuretech.pms.project.service.FeatureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Features", description = "Feature management API (Backlog hierarchy)")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FeatureController {

    private final FeatureService featureService;

    @Operation(summary = "Get all features for an epic")
    @GetMapping("/epics/{epicId}/features")
    public ResponseEntity<ApiResponse<List<FeatureDto>>> getFeaturesByEpic(@PathVariable String epicId) {
        return ResponseEntity.ok(ApiResponse.success(featureService.getFeaturesByEpic(epicId)));
    }

    @Operation(summary = "Get features by WBS group")
    @GetMapping("/wbs/groups/{wbsGroupId}/features")
    public ResponseEntity<ApiResponse<List<FeatureDto>>> getFeaturesByWbsGroup(@PathVariable String wbsGroupId) {
        return ResponseEntity.ok(ApiResponse.success(featureService.getFeaturesByWbsGroup(wbsGroupId)));
    }

    @Operation(summary = "Get unlinked features for an epic")
    @GetMapping("/epics/{epicId}/features/unlinked")
    public ResponseEntity<ApiResponse<List<FeatureDto>>> getUnlinkedFeatures(@PathVariable String epicId) {
        return ResponseEntity.ok(ApiResponse.success(featureService.getUnlinkedFeaturesByEpic(epicId)));
    }

    @Operation(summary = "Get feature by ID")
    @GetMapping("/features/{featureId}")
    public ResponseEntity<ApiResponse<FeatureDto>> getFeature(@PathVariable String featureId) {
        return ResponseEntity.ok(ApiResponse.success(featureService.getFeatureById(featureId)));
    }

    @Operation(summary = "Create a new feature")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'BUSINESS_ANALYST')")
    @PostMapping("/epics/{epicId}/features")
    public ResponseEntity<ApiResponse<FeatureDto>> createFeature(
            @PathVariable String epicId,
            @Valid @RequestBody FeatureDto request) {
        FeatureDto created = featureService.createFeature(epicId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Feature created successfully", created));
    }

    @Operation(summary = "Update a feature")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM', 'BUSINESS_ANALYST')")
    @PutMapping("/features/{featureId}")
    public ResponseEntity<ApiResponse<FeatureDto>> updateFeature(
            @PathVariable String featureId,
            @Valid @RequestBody FeatureDto request) {
        FeatureDto updated = featureService.updateFeature(featureId, request);
        return ResponseEntity.ok(ApiResponse.success("Feature updated successfully", updated));
    }

    @Operation(summary = "Delete a feature")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    @DeleteMapping("/features/{featureId}")
    public ResponseEntity<ApiResponse<Void>> deleteFeature(@PathVariable String featureId) {
        featureService.deleteFeature(featureId);
        return ResponseEntity.ok(ApiResponse.success("Feature deleted successfully", null));
    }

    @Operation(summary = "Link feature to WBS group")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @PostMapping("/features/{featureId}/link-wbs-group/{wbsGroupId}")
    public ResponseEntity<ApiResponse<FeatureDto>> linkToWbsGroup(
            @PathVariable String featureId,
            @PathVariable String wbsGroupId) {
        FeatureDto updated = featureService.linkToWbsGroup(featureId, wbsGroupId);
        return ResponseEntity.ok(ApiResponse.success("Feature linked to WBS Group successfully", updated));
    }

    @Operation(summary = "Unlink feature from WBS group")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    @DeleteMapping("/features/{featureId}/link-wbs-group")
    public ResponseEntity<ApiResponse<FeatureDto>> unlinkFromWbsGroup(@PathVariable String featureId) {
        FeatureDto updated = featureService.unlinkFromWbsGroup(featureId);
        return ResponseEntity.ok(ApiResponse.success("Feature unlinked from WBS Group successfully", updated));
    }
}
