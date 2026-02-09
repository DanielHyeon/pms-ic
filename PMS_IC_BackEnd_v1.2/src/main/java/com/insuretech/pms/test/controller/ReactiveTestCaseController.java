package com.insuretech.pms.test.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.test.dto.StatusTransitionRequest;
import com.insuretech.pms.test.dto.TestCaseDto;
import com.insuretech.pms.test.dto.TestCaseSummaryDto;
import com.insuretech.pms.test.service.ReactiveTestCaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Tag(name = "Test Cases", description = "Test case management API")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/tests/cases")
@RequiredArgsConstructor
public class ReactiveTestCaseController {

    private final ReactiveTestCaseService testCaseService;

    @Operation(summary = "List test cases for a project")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<TestCaseSummaryDto>>>> listTestCases(
            @PathVariable String projectId,
            @RequestParam(required = false) String suiteId) {
        return testCaseService.listTestCases(projectId, suiteId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get test case detail with steps")
    @GetMapping("/{testCaseId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestCaseDto>>> getTestCase(
            @PathVariable String projectId,
            @PathVariable String testCaseId) {
        return testCaseService.getTestCase(testCaseId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Create a test case with optional steps")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestCaseDto>>> createTestCase(
            @PathVariable String projectId,
            @RequestBody TestCaseDto request,
            @AuthenticationPrincipal UserDetails user) {
        return testCaseService.createTestCase(projectId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Test case created", dto)));
    }

    @Operation(summary = "Update a test case")
    @PutMapping("/{testCaseId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestCaseDto>>> updateTestCase(
            @PathVariable String projectId,
            @PathVariable String testCaseId,
            @RequestBody TestCaseDto request,
            @AuthenticationPrincipal UserDetails user) {
        return testCaseService.updateTestCase(testCaseId, request, user.getUsername())
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Test case updated", dto)));
    }

    @Operation(summary = "Delete a test case")
    @DeleteMapping("/{testCaseId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteTestCase(
            @PathVariable String projectId,
            @PathVariable String testCaseId) {
        return testCaseService.deleteTestCase(testCaseId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Test case deleted", null))));
    }

    @Operation(summary = "Transition definition status (DRAFT -> READY -> DEPRECATED)")
    @PatchMapping("/{testCaseId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestCaseDto>>> transitionStatus(
            @PathVariable String projectId,
            @PathVariable String testCaseId,
            @RequestBody StatusTransitionRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return testCaseService.transitionStatus(testCaseId, request.getTargetStatus(), user.getUsername())
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Status transitioned", dto)));
    }
}
