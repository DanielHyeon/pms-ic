package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsDependency;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsDependencyDto {
    private String id;
    private String predecessorType;
    private String predecessorId;
    private String successorType;
    private String successorId;
    private String dependencyType;
    private Integer lagDays;
    private String projectId;

    public static WbsDependencyDto from(R2dbcWbsDependency entity) {
        return WbsDependencyDto.builder()
            .id(entity.getId())
            .predecessorType(entity.getPredecessorType())
            .predecessorId(entity.getPredecessorId())
            .successorType(entity.getSuccessorType())
            .successorId(entity.getSuccessorId())
            .dependencyType(entity.getDependencyType())
            .lagDays(entity.getLagDays())
            .projectId(entity.getProjectId())
            .build();
    }
}
