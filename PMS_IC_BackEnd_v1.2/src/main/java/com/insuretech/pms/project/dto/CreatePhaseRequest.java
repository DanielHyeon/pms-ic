package com.insuretech.pms.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePhaseRequest {

    @NotBlank(message = "Phase name is required")
    private String name;

    private String description;

    @NotNull(message = "Order number is required")
    private Integer orderNum;

    private String status;

    private String gateStatus;

    private LocalDate startDate;

    private LocalDate endDate;

    private Integer progress;

    private String trackType;
}
