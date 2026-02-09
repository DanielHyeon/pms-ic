package com.insuretech.pms.pmo.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.pmo.dto.PmoHealthDto;
import com.insuretech.pms.pmo.dto.PmoPortfolioDto;
import com.insuretech.pms.pmo.service.ReactivePmoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Tag(name = "PMO Governance", description = "Portfolio-level project health monitoring")
@RestController
@RequestMapping("/api/v2/pmo")
@RequiredArgsConstructor
public class ReactivePmoController {

    private final ReactivePmoService pmoService;

    @Operation(summary = "Get portfolio summary with all projects")
    @GetMapping("/portfolio")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<PmoPortfolioDto>>> getPortfolio() {
        return pmoService.getPortfolio()
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Get health matrix for all active projects")
    @GetMapping("/health")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<PmoHealthDto>>>> getHealthMatrix() {
        return pmoService.getHealthMatrix()
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get single project health detail")
    @GetMapping("/health/{projectId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<PmoHealthDto>>> getProjectHealth(
            @PathVariable String projectId) {
        return pmoService.getProjectHealth(projectId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }
}
