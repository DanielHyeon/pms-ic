package com.insuretech.pms.view.controller;

import com.insuretech.pms.view.dto.PmWorkboardView;
import com.insuretech.pms.view.dto.PmoPortfolioView;
import com.insuretech.pms.view.dto.PoBacklogView;
import com.insuretech.pms.view.service.ViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Role-based View API endpoints.
 * Each endpoint returns a pre-assembled view model tailored to the role's questions.
 * Security: Controller-level capability check + Service-level scope enforcement.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/views")
@RequiredArgsConstructor
public class ViewApiController {

    private final ViewService viewService;

    /**
     * PO Backlog View: requirement coverage, epic progress, backlog item status.
     */
    @GetMapping("/po-backlog")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_BACKLOG')")
    public Mono<PoBacklogView> getPoBacklogView(@PathVariable String projectId) {
        return viewService.buildPoBacklogView(projectId);
    }

    /**
     * PM Workboard View: sprint board, scoped stories, part workload.
     * Service layer enforces allowedPartIds scope filtering.
     */
    @GetMapping("/pm-workboard")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_STORY')")
    public Mono<PmWorkboardView> getPmWorkboardView(@PathVariable String projectId) {
        return viewService.buildPmWorkboardView(projectId);
    }

    /**
     * PMO Portfolio View: KPI dashboard, data quality, part comparison.
     * Read-only: no edit capabilities.
     */
    @GetMapping("/pmo-portfolio")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_KPI')")
    public Mono<PmoPortfolioView> getPmoPortfolioView(@PathVariable String projectId) {
        return viewService.buildPmoPortfolioView(projectId);
    }
}
