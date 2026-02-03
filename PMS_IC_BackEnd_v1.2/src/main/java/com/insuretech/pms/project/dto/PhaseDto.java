package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcPhase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhaseDto {
    private String id;
    private String projectId;
    private String name;
    private Integer orderNum;
    private String status;
    private String gateStatus;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer progress;
    private String description;
    private String parentId;

    public static PhaseDto from(R2dbcPhase phase) {
        return PhaseDto.builder()
                .id(phase.getId())
                .projectId(phase.getProjectId())
                .name(phase.getName())
                .orderNum(phase.getOrderNum())
                .status(phase.getStatus())
                .gateStatus(phase.getGateStatus())
                .startDate(phase.getStartDate())
                .endDate(phase.getEndDate())
                .progress(phase.getProgress())
                .description(phase.getDescription())
                .parentId(phase.getParentId())
                .build();
    }
}