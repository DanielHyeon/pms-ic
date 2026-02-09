package com.insuretech.pms.test.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "test_steps", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcTestStep {

    @Id
    @Column("id")
    private String id;

    @Column("test_case_id")
    private String testCaseId;

    @Column("step_number")
    private Integer stepNumber;

    @Column("action")
    private String action;

    @Column("expected_result")
    private String expectedResult;

    @Nullable
    @Column("test_data")
    private String testData;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Nullable
    @Column("updated_at")
    private LocalDateTime updatedAt;
}
