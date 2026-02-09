package com.insuretech.pms.collaboration.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

/**
 * Meeting participant entity (many-to-many between meetings and users).
 * Does NOT extend R2dbcBaseEntity since it has no updatedAt/updatedBy fields.
 */
@Table(name = "meeting_participants", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcMeetingParticipant {

    @Id
    @Column("id")
    private String id;

    @Column("meeting_id")
    private String meetingId;

    @Column("user_id")
    private String userId;

    @Column("role")
    @Builder.Default
    private String role = "ATTENDEE";

    @Column("rsvp_status")
    @Builder.Default
    private String rsvpStatus = "PENDING";

    @Column("attended")
    @Builder.Default
    private Boolean attended = false;

    @Column("created_at")
    private LocalDateTime createdAt;
}
