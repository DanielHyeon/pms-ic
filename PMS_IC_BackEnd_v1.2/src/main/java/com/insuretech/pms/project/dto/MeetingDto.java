package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcMeeting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingDto {
    private String id;
    private String projectId;
    private String title;
    private String description;
    private String meetingType;
    private String status;
    private LocalDateTime scheduledAt;
    private String location;
    private String organizer;
    private String attendees;
    private String minutes;
    private LocalDateTime actualStartAt;
    private LocalDateTime actualEndAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MeetingDto from(R2dbcMeeting meeting) {
        return MeetingDto.builder()
                .id(meeting.getId())
                .projectId(meeting.getProjectId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .meetingType(meeting.getMeetingType())
                .status(meeting.getStatus())
                .scheduledAt(meeting.getScheduledAt())
                .location(meeting.getLocation())
                .organizer(meeting.getOrganizer())
                .attendees(meeting.getAttendees())
                .minutes(meeting.getMinutes())
                .actualStartAt(meeting.getActualStartAt())
                .actualEndAt(meeting.getActualEndAt())
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .build();
    }
}
