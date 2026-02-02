package com.insuretech.pms.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateWbsDependencyRequest {
    @NotBlank
    private String predecessorType;  // GROUP, ITEM, TASK
    @NotBlank
    private String predecessorId;
    @NotBlank
    private String successorType;    // GROUP, ITEM, TASK
    @NotBlank
    private String successorId;
    private String dependencyType;   // FS (default), SS, FF, SF
    private Integer lagDays;         // default 0
}
