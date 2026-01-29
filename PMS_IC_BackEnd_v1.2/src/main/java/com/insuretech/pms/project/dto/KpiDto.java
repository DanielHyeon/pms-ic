package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcKpi;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiDto {
    private String id;
    private String phaseId;
    private String name;
    private String target;
    private String current;
    private String status;

    public static KpiDto from(R2dbcKpi kpi) {
        return KpiDto.builder()
                .id(kpi.getId())
                .phaseId(kpi.getPhaseId())
                .name(kpi.getName())
                .target(kpi.getTarget())
                .current(kpi.getCurrent())
                .status(kpi.getStatus())
                .build();
    }
}
