package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingMinutes;
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
public class MeetingMinutesDto {
    private String id;
    private String meetingId;
    private String content;
    private String generationMethod;
    private String status;
    private String confirmedBy;
    private LocalDateTime confirmedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    public static MeetingMinutesDto from(R2dbcMeetingMinutes entity) {
        return MeetingMinutesDto.builder()
                .id(entity.getId())
                .meetingId(entity.getMeetingId())
                .content(entity.getContent())
                .generationMethod(entity.getGenerationMethod())
                .status(entity.getStatus())
                .confirmedBy(entity.getConfirmedBy())
                .confirmedAt(entity.getConfirmedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
