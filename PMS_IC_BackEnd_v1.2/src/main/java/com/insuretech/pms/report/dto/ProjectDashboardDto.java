package com.insuretech.pms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Aggregation response combining all dashboard sections.
 * Single network round-trip for initial page load.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDashboardDto {
    private DashboardSection<DashboardStats> stats;
    private DashboardSection<PhaseProgressDto> phaseProgress;
    private DashboardSection<SprintVelocityDto> sprintVelocity;
    private DashboardSection<BurndownDto> burndown;
    private DashboardSection<PartStatsDto> partStats;
    private DashboardSection<WbsGroupStatsDto> wbsGroupStats;
    private DashboardSection<List<InsightDto>> insights;
}
