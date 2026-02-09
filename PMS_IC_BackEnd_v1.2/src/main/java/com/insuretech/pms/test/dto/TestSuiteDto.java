package com.insuretech.pms.test.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.test.reactive.entity.R2dbcTestSuite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestSuiteDto {

    private String id;
    private String projectId;
    private String name;
    private String description;
    private String suiteType;
    private String status;
    private String phaseId;
    private String ownerId;
    private Integer orderNum;
    private Long testCaseCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    public static TestSuiteDto from(R2dbcTestSuite entity) {
        return TestSuiteDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .name(entity.getName())
                .description(entity.getDescription())
                .suiteType(entity.getSuiteType())
                .status(entity.getStatus())
                .phaseId(entity.getPhaseId())
                .ownerId(entity.getOwnerId())
                .orderNum(entity.getOrderNum())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
