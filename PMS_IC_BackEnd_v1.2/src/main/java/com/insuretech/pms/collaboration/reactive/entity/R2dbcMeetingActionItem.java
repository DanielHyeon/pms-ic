package com.insuretech.pms.collaboration.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

/**
 * Meeting action item entity. Extends R2dbcBaseEntity for audit fields.
 */
@Table(name = "meeting_action_items", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcMeetingActionItem extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("meeting_id")
    private String meetingId;

    @Nullable
    @Column("minutes_id")
    private String minutesId;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Column("assignee_id")
    private String assigneeId;

    @Nullable
    @Column("due_date")
    private LocalDate dueDate;

    @Column("status")
    @Builder.Default
    private String status = "OPEN";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Nullable
    @Column("linked_issue_id")
    private String linkedIssueId;

    @Nullable
    @Column("linked_task_id")
    private String linkedTaskId;
}
