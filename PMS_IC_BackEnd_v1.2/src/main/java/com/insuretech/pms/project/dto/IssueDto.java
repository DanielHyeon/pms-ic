package com.insuretech.pms.project.dto;

import com.insuretech.pms.project.reactive.entity.R2dbcIssue;
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
public class IssueDto {
    private String id;
    private String projectId;
    private String title;
    private String description;
    private String issueType;
    private String priority;
    private String status;
    private String assignee;
    private String reporter;
    private String reviewer;
    private LocalDate dueDate;
    private LocalDateTime resolvedAt;
    private String resolution;
    private String comments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static IssueDto from(R2dbcIssue issue) {
        return IssueDto.builder()
                .id(issue.getId())
                .projectId(issue.getProjectId())
                .title(issue.getTitle())
                .description(issue.getDescription())
                .issueType(issue.getIssueType())
                .priority(issue.getPriority())
                .status(issue.getStatus())
                .assignee(issue.getAssignee())
                .reporter(issue.getReporter())
                .reviewer(issue.getReviewer())
                .dueDate(issue.getDueDate())
                .resolvedAt(issue.getResolvedAt())
                .resolution(issue.getResolution())
                .comments(issue.getComments())
                .createdAt(issue.getCreatedAt())
                .updatedAt(issue.getUpdatedAt())
                .build();
    }
}
