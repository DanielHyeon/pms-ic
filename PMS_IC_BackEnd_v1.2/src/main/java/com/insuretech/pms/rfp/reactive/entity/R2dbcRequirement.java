package com.insuretech.pms.rfp.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Table(name = "requirements", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRequirement extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Nullable
    @Column("rfp_id")
    private String rfpId;

    @Column("project_id")
    private String projectId;

    @Column("requirement_code")
    private String code;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Column("category")
    @Builder.Default
    private String category = "FUNCTIONAL";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("status")
    @Builder.Default
    private String status = "IDENTIFIED";

    @Column("progress")
    @Builder.Default
    private Integer progress = 0;

    @Nullable
    @Column("source_text")
    private String sourceText;

    @Nullable
    @Column("page_number")
    private Integer pageNumber;

    @Nullable
    @Column("assignee_id")
    private String assigneeId;

    @Nullable
    @Column("due_date")
    private LocalDate dueDate;

    @Nullable
    @Column("acceptance_criteria")
    private String acceptanceCriteria;

    @Nullable
    @Column("estimated_effort")
    private Integer estimatedEffort;

    @Nullable
    @Column("actual_effort")
    private Integer actualEffort;

    @Nullable
    @Column("story_points")
    private Integer storyPoints;

    @Nullable
    @Column("estimated_effort_hours")
    private Integer estimatedEffortHours;

    @Nullable
    @Column("actual_effort_hours")
    private Integer actualEffortHours;

    @Nullable
    @Column("remaining_effort_hours")
    private Integer remainingEffortHours;

    @Column("progress_percentage")
    @Builder.Default
    private Integer progressPercentage = 0;

    @Nullable
    @Column("last_progress_update")
    private LocalDateTime lastProgressUpdate;

    @Column("progress_calc_method")
    @Builder.Default
    private String progressCalcMethod = "STORY_POINT";

    @Column("tenant_id")
    private String tenantId;

    @Nullable
    @Column("neo4j_node_id")
    private String neo4jNodeId;

    public enum RequirementCategory {
        FUNCTIONAL, NON_FUNCTIONAL, TECHNICAL, BUSINESS
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum RequirementStatus {
        IDENTIFIED, ANALYZED, APPROVED, DEFERRED, REJECTED, IMPLEMENTED, VERIFIED
    }

    public enum ProgressCalculationMethod {
        STORY_POINT, TASK_COUNT, TIME_BASED
    }
}
