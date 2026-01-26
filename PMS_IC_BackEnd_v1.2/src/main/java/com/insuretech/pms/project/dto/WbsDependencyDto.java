package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.entity.WbsDependency;
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

    public static WbsDependencyDto from(WbsDependency entity) {
        return WbsDependencyDto.builder()
            .id(entity.getId())
            .predecessorType(entity.getPredecessorType().name())
            .predecessorId(entity.getPredecessorId())
            .successorType(entity.getSuccessorType().name())
            .successorId(entity.getSuccessorId())
            .dependencyType(entity.getDependencyType().name())
            .lagDays(entity.getLagDays())
            .projectId(entity.getProjectId())
            .build();
    }
}
