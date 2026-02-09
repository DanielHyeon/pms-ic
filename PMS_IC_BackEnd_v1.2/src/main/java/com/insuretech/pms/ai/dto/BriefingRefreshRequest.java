package com.insuretech.pms.ai.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /briefing/refresh.
 */
public record BriefingRefreshRequest(
        @NotBlank String role,
        String scope
) {}
