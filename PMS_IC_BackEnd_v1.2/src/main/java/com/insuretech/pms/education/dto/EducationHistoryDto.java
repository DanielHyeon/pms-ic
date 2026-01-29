package com.insuretech.pms.education.dto;

import com.insuretech.pms.education.reactive.entity.R2dbcEducationHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EducationHistoryDto {
    private String id;
    private String sessionId;
    private String educationTitle;
    private String participantId;
    private String participantName;
    private String participantDepartment;
    private String completionStatus;
    private LocalDateTime registeredAt;
    private LocalDateTime completedAt;
    private Integer score;
    private String feedback;
    private Boolean certificateIssued;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EducationHistoryDto from(R2dbcEducationHistory history) {
        return EducationHistoryDto.builder()
                .id(history.getId())
                .sessionId(history.getSessionId())
                .educationTitle(null) // Education title must be populated separately via join
                .participantId(history.getParticipantId())
                .participantName(history.getParticipantName())
                .participantDepartment(history.getParticipantDepartment())
                .completionStatus(history.getCompletionStatus())
                .registeredAt(history.getRegisteredAt())
                .completedAt(history.getCompletedAt())
                .score(history.getScore())
                .feedback(history.getFeedback())
                .certificateIssued(history.getCertificateIssued())
                .createdAt(history.getCreatedAt())
                .updatedAt(history.getUpdatedAt())
                .build();
    }

    public static EducationHistoryDto from(R2dbcEducationHistory history, String educationTitle) {
        return EducationHistoryDto.builder()
                .id(history.getId())
                .sessionId(history.getSessionId())
                .educationTitle(educationTitle)
                .participantId(history.getParticipantId())
                .participantName(history.getParticipantName())
                .participantDepartment(history.getParticipantDepartment())
                .completionStatus(history.getCompletionStatus())
                .registeredAt(history.getRegisteredAt())
                .completedAt(history.getCompletedAt())
                .score(history.getScore())
                .feedback(history.getFeedback())
                .certificateIssued(history.getCertificateIssued())
                .createdAt(history.getCreatedAt())
                .updatedAt(history.getUpdatedAt())
                .build();
    }
}
