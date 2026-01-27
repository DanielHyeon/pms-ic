package com.insuretech.pms.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a WBS snapshot
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWbsSnapshotRequest {

    @NotBlank(message = "Phase ID is required")
    private String phaseId;

    /**
     * Optional snapshot name. Auto-generated if not provided.
     */
    private String snapshotName;

    /**
     * Optional description for the snapshot
     */
    private String description;

    /**
     * Snapshot type: PRE_TEMPLATE or MANUAL
     * Defaults to PRE_TEMPLATE if not specified
     */
    private String snapshotType;
}
