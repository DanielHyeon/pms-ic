package com.insuretech.pms.view.controller;

import com.insuretech.pms.view.dto.DataQualityResponse;
import com.insuretech.pms.view.service.DataQualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Data Quality API endpoint.
 * Returns 3-tier scoring (Integrity/Readiness/Traceability) with history.
 * Snapshots are auto-saved on each API call (query-time snapshot strategy).
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class DataQualityController {

    private final DataQualityService dataQualityService;

    @GetMapping("/data-quality")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_DATA_QUALITY')")
    public Mono<DataQualityResponse> getDataQuality(@PathVariable String projectId) {
        return dataQualityService.getDataQuality(projectId);
    }
}
