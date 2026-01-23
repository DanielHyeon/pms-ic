package com.insuretech.pms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePhaseRequest {

    private String name;

    private String description;

    private Integer orderNum;

    private String status;

    private String gateStatus;

    private LocalDate startDate;

    private LocalDate endDate;

    private Integer progress;

    private String trackType;
}
