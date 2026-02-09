package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingAgendaItem;
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
public class MeetingAgendaItemDto {
    private String id;
    private String meetingId;
    private Integer orderNum;
    private String title;
    private String description;
    private Integer durationMinutes;
    private String presenterId;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MeetingAgendaItemDto from(R2dbcMeetingAgendaItem entity) {
        return MeetingAgendaItemDto.builder()
                .id(entity.getId())
                .meetingId(entity.getMeetingId())
                .orderNum(entity.getOrderNum())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .durationMinutes(entity.getDurationMinutes())
                .presenterId(entity.getPresenterId())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
