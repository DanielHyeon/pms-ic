package com.insuretech.pms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for deliverable upload operation.
 * Consolidates parameters for uploadDeliverable method to reduce parameter count.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliverableUploadRequest {

    /**
     * Existing deliverable ID for update, null for new upload
     */
    private String deliverableId;

    /**
     * Deliverable name (required for new uploads)
     */
    private String name;

    /**
     * Optional description of the deliverable
     */
    private String description;

    /**
     * Deliverable type: DOCUMENT, REPORT, PRESENTATION, CODE, OTHER
     */
    private String type;

    /**
     * User ID of the uploader
     */
    private String uploadedBy;
}
