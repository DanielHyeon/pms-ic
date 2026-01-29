package com.insuretech.pms.education.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "education_sessions", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEducationSession extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("education_id")
    private String educationId;

    @Nullable
    @Column("session_name")
    private String sessionName;

    @Column("scheduled_at")
    private LocalDateTime scheduledAt;

    @Nullable
    @Column("end_at")
    private LocalDateTime endAt;

    @Nullable
    @Column("location")
    private String location;

    @Nullable
    @Column("instructor")
    private String instructor;

    @Nullable
    @Column("max_participants")
    private Integer maxParticipants;

    @Column("current_participants")
    @Builder.Default
    private Integer currentParticipants = 0;

    @Column("status")
    @Builder.Default
    private String status = "SCHEDULED";

    @Nullable
    @Column("notes")
    private String notes;
}
