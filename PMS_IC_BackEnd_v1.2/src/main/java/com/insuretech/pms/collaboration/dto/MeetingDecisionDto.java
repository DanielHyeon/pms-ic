package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingDecision;
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
public class MeetingDecisionDto {
    private String id;
    private String meetingId;
    private String minutesId;
    private String title;
    private String description;
    private String status;
    private String linkedDecisionId;
    private LocalDateTime createdAt;
    private String createdBy;

    public static MeetingDecisionDto from(R2dbcMeetingDecision entity) {
        return MeetingDecisionDto.builder()
                .id(entity.getId())
                .meetingId(entity.getMeetingId())
                .minutesId(entity.getMinutesId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .linkedDecisionId(entity.getLinkedDecisionId())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}
