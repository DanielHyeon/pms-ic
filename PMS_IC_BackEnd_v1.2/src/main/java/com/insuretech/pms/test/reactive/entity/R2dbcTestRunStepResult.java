package com.insuretech.pms.test.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

/**
 * Per-step result within a test run -- standalone entity (no base entity).
 */
@Table(name = "test_run_step_results", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcTestRunStepResult {

    @Id
    @Column("id")
    private String id;

    @Column("test_run_id")
    private String testRunId;

    @Column("test_step_id")
    private String testStepId;

    @Column("step_number")
    private Integer stepNumber;

    @Nullable
    @Column("actual_result")
    private String actualResult;

    @Column("status")
    private String status;

    @Nullable
    @Column("screenshot_path")
    private String screenshotPath;

    @Nullable
    @Column("notes")
    private String notes;
}
