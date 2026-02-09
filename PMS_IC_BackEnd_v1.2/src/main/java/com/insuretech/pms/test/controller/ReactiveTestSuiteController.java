package com.insuretech.pms.test.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.test.dto.TestSuiteDto;
import com.insuretech.pms.test.service.ReactiveTestSuiteService;
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

@Tag(name = "Test Suites", description = "Test suite management API")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/tests/suites")
@RequiredArgsConstructor
public class ReactiveTestSuiteController {

    private final ReactiveTestSuiteService suiteService;

    @Operation(summary = "List test suites for a project")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<TestSuiteDto>>>> listSuites(
            @PathVariable String projectId) {
        return suiteService.listSuites(projectId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get test suite detail")
    @GetMapping("/{suiteId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestSuiteDto>>> getSuite(
            @PathVariable String projectId,
            @PathVariable String suiteId) {
        return suiteService.getSuite(suiteId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Create a test suite")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestSuiteDto>>> createSuite(
            @PathVariable String projectId,
            @RequestBody TestSuiteDto request,
            @AuthenticationPrincipal UserDetails user) {
        return suiteService.createSuite(projectId, request, user.getUsername())
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Test suite created", dto)));
    }

    @Operation(summary = "Update a test suite")
    @PutMapping("/{suiteId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<TestSuiteDto>>> updateSuite(
            @PathVariable String projectId,
            @PathVariable String suiteId,
            @RequestBody TestSuiteDto request,
            @AuthenticationPrincipal UserDetails user) {
        return suiteService.updateSuite(suiteId, request, user.getUsername())
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Test suite updated", dto)));
    }

    @Operation(summary = "Archive (soft-delete) a test suite")
    @DeleteMapping("/{suiteId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> archiveSuite(
            @PathVariable String projectId,
            @PathVariable String suiteId,
            @AuthenticationPrincipal UserDetails user) {
        return suiteService.archiveSuite(suiteId, user.getUsername())
                .then(Mono.just(ResponseEntity.ok(ApiResponse.<Void>success("Test suite archived", null))));
    }
}
