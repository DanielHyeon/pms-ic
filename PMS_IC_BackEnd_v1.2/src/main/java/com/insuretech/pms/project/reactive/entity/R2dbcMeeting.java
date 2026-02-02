package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "meetings", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcMeeting extends R2dbcBaseEntity {

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

    @Column("meeting_type")
    @Builder.Default
    private String meetingType = "OTHER";

    @Column("status")
    @Builder.Default
    private String status = "SCHEDULED";

    @Column("scheduled_at")
    private LocalDateTime scheduledAt;

    @Nullable
    @Column("location")
    private String location;

    @Nullable
    @Column("organizer")
    private String organizer;

    @Nullable
    @Column("attendees")
    private String attendees;

    @Nullable
    @Column("minutes")
    private String minutes;

    @Nullable
    @Column("actual_start_at")
    private LocalDateTime actualStartAt;

    @Nullable
    @Column("actual_end_at")
    private LocalDateTime actualEndAt;

    public enum MeetingType {
        KICKOFF,
        WEEKLY,
        MONTHLY,
        MILESTONE,
        CLOSING,
        TECHNICAL,
        STAKEHOLDER,
        OTHER
    }

    public enum MeetingStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        POSTPONED
    }
}
