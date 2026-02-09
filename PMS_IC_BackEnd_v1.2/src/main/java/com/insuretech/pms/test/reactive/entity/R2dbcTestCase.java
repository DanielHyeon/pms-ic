package com.insuretech.pms.test.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.ReadOnlyProperty;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "test_cases", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcTestCase extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("suite_id")
    private String suiteId;

    @Column("test_case_code")
    private String testCaseCode;

    @Column("title")
    private String title;

    @Nullable
    @Column("description")
    private String description;

    @Nullable
    @Column("preconditions")
    private String preconditions;

    @Column("test_type")
    @Builder.Default
    private String testType = "MANUAL";

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("definition_status")
    @Builder.Default
    private String definitionStatus = "DRAFT";

    @Column("last_outcome")
    @Builder.Default
    private String lastOutcome = "NOT_RUN";

    // derived_status is GENERATED ALWAYS -- read-only
    @ReadOnlyProperty
    @Column("derived_status")
    private String derivedStatus;

    @Nullable
    @Column("assignee_id")
    private String assigneeId;

    @Nullable
    @Column("phase_id")
    private String phaseId;

    @Column("run_count")
    @Builder.Default
    private Integer runCount = 0;

    @Nullable
    @Column("last_run_at")
    private LocalDateTime lastRunAt;

    @Nullable
    @Column("estimated_duration")
    private Integer estimatedDuration;
}
