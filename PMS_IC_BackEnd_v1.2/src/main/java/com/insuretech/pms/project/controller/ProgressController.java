package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.ProgressDto;
import com.insuretech.pms.project.service.ProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Progress", description = "진행률 조회 API")
@RestController
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @Operation(summary = "프로젝트 진행률 조회")
    @GetMapping("/api/projects/{projectId}/progress")
    public ResponseEntity<ApiResponse<List<ProgressDto>>> getProjectProgress(@PathVariable String projectId) {
        List<ProgressDto> progress = progressService.getProjectProgress(projectId);
        return ResponseEntity.ok(ApiResponse.success(progress));
    }

    @Operation(summary = "요구사항 진행률 조회")
    @GetMapping("/api/requirements/{requirementId}/progress")
    public ResponseEntity<ApiResponse<ProgressDto>> getRequirementProgress(@PathVariable String requirementId) {
        ProgressDto progress = progressService.getRequirementProgress(requirementId);
        return ResponseEntity.ok(ApiResponse.success(progress));
    }
}
