package com.insuretech.pms.education.dto;

import com.insuretech.pms.education.reactive.entity.R2dbcEducationSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EducationSessionDto {
    private String id;
    private String educationId;
    private String educationTitle;
    private String sessionName;
    private LocalDateTime scheduledAt;
    private LocalDateTime endAt;
    private String location;
    private String instructor;
    private Integer maxParticipants;
    private Integer currentParticipants;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EducationSessionDto from(R2dbcEducationSession session) {
        return EducationSessionDto.builder()
                .id(session.getId())
                .educationId(session.getEducationId())
                .educationTitle(null)
                .sessionName(session.getSessionName())
                .scheduledAt(session.getScheduledAt())
                .endAt(session.getEndAt())
                .location(session.getLocation())
                .instructor(session.getInstructor())
                .maxParticipants(session.getMaxParticipants())
                .currentParticipants(session.getCurrentParticipants())
                .status(session.getStatus())
                .notes(session.getNotes())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }
}
