package com.insuretech.pms.test.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.test.dto.QuickRunRequest;
import com.insuretech.pms.test.dto.TestKpiDto;
import com.insuretech.pms.test.dto.TestRunDto;
import com.insuretech.pms.test.service.ReactiveTestKpiService;
import com.insuretech.pms.test.service.ReactiveTestRunService;
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

@Tag(name = "Test Runs", description = "Test run execution and KPI API")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/tests")
@RequiredArgsConstructor
public class ReactiveTestRunController {

    private final ReactiveTestRunService testRunService;
    private final ReactiveTestKpiService kpiService;

    @Operation(summary = "List runs for a test case (timeline)")
    @GetMapping("/cases/{testCaseId}/runs")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<TestRunDto>>>> listRuns(
            @PathVariable String projectId,
            @PathVariable String testCaseId) {
        return testRunService.listRuns(testCaseId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get run detail with step results")
    @GetMapping("/cases/{testCaseId}/runs/{runId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestRunDto>>> getRun(
            @PathVariable String projectId,
            @PathVariable String testCaseId,
            @PathVariable String runId) {
        return testRunService.getRun(runId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Record a detailed test run")
    @PostMapping("/cases/{testCaseId}/runs")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestRunDto>>> createRun(
            @PathVariable String projectId,
            @PathVariable String testCaseId,
            @RequestBody TestRunDto request,
            @AuthenticationPrincipal UserDetails user) {
        return testRunService.createRun(projectId, testCaseId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Test run recorded", dto)));
    }

    @Operation(summary = "Quick run: record bulk result without step details")
    @PostMapping("/runs/quick")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestRunDto>>> quickRun(
            @PathVariable String projectId,
            @RequestBody QuickRunRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return testRunService.quickRun(
                        projectId, request.getTestCaseId(), request.getResult(),
                        request.getEnvironment(), request.getNotes(), user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Quick run recorded", dto)));
    }

    @Operation(summary = "Get test KPI summary for a project")
    @GetMapping("/kpi")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestKpiDto>>> getKpi(
            @PathVariable String projectId) {
        return kpiService.getKpi(projectId)
                .map(kpi -> ResponseEntity.ok(ApiResponse.success(kpi)));
    }
}
