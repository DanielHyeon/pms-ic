package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Table(name = "issues", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcIssue extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Column("issue_type")
    @Builder.Default
    private String issueType = "OTHER";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("status")
    @Builder.Default
    private String status = "OPEN";

    @Nullable
    @Column("assignee")
    private String assignee;

    @Nullable
    @Column("reporter")
    private String reporter;

    @Nullable
    @Column("reviewer")
    private String reviewer;

    @Nullable
    @Column("due_date")
    private LocalDate dueDate;

    @Nullable
    @Column("resolved_at")
    private LocalDateTime resolvedAt;

    @Nullable
    @Column("resolution")
    private String resolution;

    @Nullable
    @Column("comments")
    private String comments;

    public enum IssueType {
        BUG,
        RISK,
        BLOCKER,
        CHANGE_REQUEST,
        QUESTION,
        IMPROVEMENT,
        OTHER
    }

    public enum IssuePriority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }

    public enum IssueStatus {
        OPEN,
        IN_PROGRESS,
        RESOLVED,
        VERIFIED,
        CLOSED,
        REOPENED,
        DEFERRED
    }
}
