package com.insuretech.pms.collaboration.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * Meeting minutes entity. Extends R2dbcBaseEntity for audit fields.
 * One-to-one with meetings (UNIQUE constraint on meeting_id).
 */
@Table(name = "meeting_minutes", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcMeetingMinutes extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("meeting_id")
    private String meetingId;

    @Column("content")
    private String content;

    @Column("generation_method")
    @Builder.Default
    private String generationMethod = "MANUAL";

    @Column("status")
    @Builder.Default
    private String status = "DRAFT";

    @Nullable
    @Column("confirmed_by")
    private String confirmedBy;

    @Nullable
    @Column("confirmed_at")
    private LocalDateTime confirmedAt;
}
