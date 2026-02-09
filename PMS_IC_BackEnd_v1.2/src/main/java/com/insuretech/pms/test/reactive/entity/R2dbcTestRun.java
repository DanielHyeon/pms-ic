package com.insuretech.pms.test.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * Test run entity -- immutable execution snapshot.
 * Does NOT extend R2dbcBaseEntity because test runs have no updatedAt/updatedBy.
 */
@Table(name = "test_runs", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcTestRun {

    @Id
    @Column("id")
    private String id;

    @Column("test_case_id")
    private String testCaseId;

    @Column("project_id")
    private String projectId;

    @Column("run_number")
    private Integer runNumber;

    @Column("mode")
    @Builder.Default
    private String mode = "DETAILED";

    @Column("result")
    private String result;

    @Column("executor_id")
    private String executorId;

    @Nullable
    @Column("environment")
    private String environment;

    @Column("started_at")
    private LocalDateTime startedAt;

    @Nullable
    @Column("finished_at")
    private LocalDateTime finishedAt;

    @Nullable
    @Column("duration_seconds")
    private Integer durationSeconds;

    @Nullable
    @Column("notes")
    private String notes;

    @Nullable
    @Column("defect_issue_id")
    private String defectIssueId;

    @Nullable
    @Column("defect_create_status")
    private String defectCreateStatus;

    @Column("created_at")
    private LocalDateTime createdAt;
}
