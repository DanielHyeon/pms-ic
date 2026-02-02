package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcWbsSnapshot;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for WBS Snapshot
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsSnapshotDto {

    private String id;
    private String phaseId;
    private String phaseName;
    private String projectId;
    private String projectName;
    private String snapshotName;
    private String description;
    private String snapshotType;
    private Integer groupCount;
    private Integer itemCount;
    private Integer taskCount;
    private Integer dependencyCount;
    private String status;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime restoredAt;
    private String restoredBy;

    /**
     * Create DTO from R2DBC entity
     */
    public static WbsSnapshotDto from(R2dbcWbsSnapshot entity) {
        return WbsSnapshotDto.builder()
                .id(entity.getId())
                .phaseId(entity.getPhaseId())
                .projectId(entity.getProjectId())
                .snapshotName(entity.getSnapshotName())
                .description(entity.getDescription())
                .snapshotType(entity.getSnapshotType())
                .groupCount(entity.getGroupCount())
                .itemCount(entity.getItemCount())
                .taskCount(entity.getTaskCount())
                .dependencyCount(entity.getDependencyCount())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .restoredAt(entity.getRestoredAt())
                .restoredBy(entity.getRestoredBy())
                .build();
    }

    /**
     * Create DTO from entity with phase and project names
     */
    public static WbsSnapshotDto from(R2dbcWbsSnapshot entity, String phaseName, String projectName) {
        WbsSnapshotDto dto = from(entity);
        dto.setPhaseName(phaseName);
        dto.setProjectName(projectName);
        return dto;
    }
}
