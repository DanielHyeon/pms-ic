package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingActionItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MeetingActionItemDto {
    private String id;
    private String meetingId;
    private String minutesId;
    private String title;
    private String description;
    private String assigneeId;
    private LocalDate dueDate;
    private String status;
    private String priority;
    private String linkedIssueId;
    private String linkedTaskId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    public static MeetingActionItemDto from(R2dbcMeetingActionItem entity) {
        return MeetingActionItemDto.builder()
                .id(entity.getId())
                .meetingId(entity.getMeetingId())
                .minutesId(entity.getMinutesId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .assigneeId(entity.getAssigneeId())
                .dueDate(entity.getDueDate())
                .status(entity.getStatus())
                .priority(entity.getPriority())
                .linkedIssueId(entity.getLinkedIssueId())
                .linkedTaskId(entity.getLinkedTaskId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}
