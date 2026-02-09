package com.insuretech.pms.decision.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Table(name = "decisions", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDecision extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("decision_code")
    private String decisionCode;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Column("status")
    @Builder.Default
    private String status = "PROPOSED";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Nullable
    @Column("category")
    private String category;

    @Column("owner_id")
    private String ownerId;

    @Nullable
    @Column("part_id")
    private String partId;

    @Nullable
    @Column("phase_id")
    private String phaseId;

    @Nullable
    @Column("options_json")
    private String optionsJson;

    @Nullable
    @Column("selected_option")
    private String selectedOption;

    @Nullable
    @Column("rationale")
    private String rationale;

    @Nullable
    @Column("due_date")
    private LocalDate dueDate;

    @Nullable
    @Column("decided_at")
    private LocalDateTime decidedAt;

    @Nullable
    @Column("decided_by")
    private String decidedBy;

    @Column("etag")
    private String etag;

    @Column("sla_hours")
    @Builder.Default
    private Integer slaHours = 168;

    @Nullable
    @Column("escalated_from_id")
    private String escalatedFromId;

    @Nullable
    @Column("escalated_from_type")
    private String escalatedFromType;

    @Column("version")
    @Builder.Default
    private Integer version = 1;

    public enum Status {
        PROPOSED, UNDER_REVIEW, APPROVED, REJECTED, DEFERRED
    }

    public enum Priority {
        CRITICAL, HIGH, MEDIUM, LOW
    }

    public enum Category {
        ARCHITECTURE, SCOPE, RESOURCE, PROCESS, TECHNICAL, BUSINESS
    }
}
