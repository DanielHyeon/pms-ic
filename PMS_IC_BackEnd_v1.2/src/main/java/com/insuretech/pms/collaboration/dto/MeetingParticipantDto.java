package com.insuretech.pms.collaboration.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingParticipant;
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
public class MeetingParticipantDto {
    private String id;
    private String meetingId;
    private String userId;
    private String role;
    private String rsvpStatus;
    private Boolean attended;
    private LocalDateTime createdAt;

    public static MeetingParticipantDto from(R2dbcMeetingParticipant entity) {
        return MeetingParticipantDto.builder()
                .id(entity.getId())
                .meetingId(entity.getMeetingId())
                .userId(entity.getUserId())
                .role(entity.getRole())
                .rsvpStatus(entity.getRsvpStatus())
                .attended(entity.getAttended())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
