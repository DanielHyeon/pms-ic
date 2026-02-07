package com.insuretech.pms.project.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Full WBS tree response DTO.
 * Returns all groups, items, and tasks for a project in a single response.
 * Frontend assembles the tree client-side using FK references (phaseId, groupId, itemId).
 */
@Data
@Builder
public class WbsFullTreeDto {
    private List<WbsGroupDto> groups;
    private List<WbsItemDto> items;
    private List<WbsTaskDto> tasks;
}
