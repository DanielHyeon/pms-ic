package com.insuretech.pms.education.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "education_histories", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEducationHistory extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("session_id")
    private String sessionId;

    @Column("participant_id")
    private String participantId;

    @Column("participant_name")
    private String participantName;

    @Nullable
    @Column("participant_department")
    private String participantDepartment;

    @Column("completion_status")
    @Builder.Default
    private String completionStatus = "REGISTERED";

    @Nullable
    @Column("registered_at")
    private LocalDateTime registeredAt;

    @Nullable
    @Column("completed_at")
    private LocalDateTime completedAt;

    @Nullable
    @Column("score")
    private Integer score;

    @Nullable
    @Column("feedback")
    private String feedback;

    @Column("certificate_issued")
    @Builder.Default
    private Boolean certificateIssued = false;
}
