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
    private String projectId;
    private String name;
    private String category;
    private String target;
    private String current;
    private String status;

    public static KpiDto from(R2dbcKpi kpi) {
        return KpiDto.builder()
                .id(kpi.getId())
                .projectId(kpi.getProjectId())
                .name(kpi.getName())
                .category(kpi.getCategory())
                .target(kpi.getTarget() != null ? kpi.getTarget().toPlainString() : null)
                .current(kpi.getCurrent() != null ? kpi.getCurrent().toPlainString() : null)
                .status(kpi.getStatus())
                .build();
    }
}
