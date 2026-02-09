package com.insuretech.pms.collaboration.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * Meeting decision entity. Standalone (no base entity).
 */
@Table(name = "meeting_decisions", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcMeetingDecision {

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

    @Column("status")
    @Builder.Default
    private String status = "PROPOSED";

    @Nullable
    @Column("linked_decision_id")
    private String linkedDecisionId;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Nullable
    @Column("created_by")
    private String createdBy;
}
