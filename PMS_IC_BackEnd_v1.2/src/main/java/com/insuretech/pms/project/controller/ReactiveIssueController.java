package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.IssueDto;
import com.insuretech.pms.project.service.ReactiveIssueService;
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

@Tag(name = "Issues", description = "Issue management API")
@RestController
@RequestMapping("/api/projects/{projectId}/issues")
@RequiredArgsConstructor
public class ReactiveIssueController {

    private final ReactiveIssueService issueService;

    @Operation(summary = "Get all issues for a project")
    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<IssueDto>>>> getIssues(@PathVariable String projectId) {
        return issueService.getIssuesByProject(projectId)
                .collectList()
                .map(issues -> ResponseEntity.ok(ApiResponse.success(issues)));
    }

    @Operation(summary = "Create an issue")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<IssueDto>>> createIssue(
            @PathVariable String projectId,
            @Valid @RequestBody IssueDto request) {
        return issueService.createIssue(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Issue created", created)));
    }

    @Operation(summary = "Update an issue")
    @PutMapping("/{issueId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<IssueDto>>> updateIssue(
            @PathVariable String projectId,
            @PathVariable String issueId,
            @Valid @RequestBody IssueDto request) {
        return issueService.updateIssue(issueId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Issue updated", updated)));
    }

    @Operation(summary = "Update issue status")
    @PatchMapping("/{issueId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<IssueDto>>> updateIssueStatus(
            @PathVariable String projectId,
            @PathVariable String issueId,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        return issueService.updateIssueStatus(issueId, status)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Issue status updated", updated)));
    }

    @Operation(summary = "Delete an issue")
    @DeleteMapping("/{issueId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteIssue(
            @PathVariable String projectId,
            @PathVariable String issueId) {
        return issueService.deleteIssue(issueId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Issue deleted", null))));
    }
}
