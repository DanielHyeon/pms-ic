package com.insuretech.pms.collaboration.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * Meeting agenda item entity. Standalone (no base entity).
 */
@Table(name = "meeting_agenda_items", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcMeetingAgendaItem {

    @Id
    @Column("id")
    private String id;

    @Column("meeting_id")
    private String meetingId;

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 0;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Nullable
    @Column("duration_minutes")
    private Integer durationMinutes;

    @Nullable
    @Column("presenter_id")
    private String presenterId;

    @Column("status")
    @Builder.Default
    private String status = "PENDING";

    @Column("created_at")
    private LocalDateTime createdAt;

    @Nullable
    @Column("updated_at")
    private LocalDateTime updatedAt;
}
