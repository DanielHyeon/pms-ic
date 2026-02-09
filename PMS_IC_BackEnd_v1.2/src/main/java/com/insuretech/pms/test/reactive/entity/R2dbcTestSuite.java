package com.insuretech.pms.test.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "test_suites", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcTestSuite extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Column("suite_type")
    @Builder.Default
    private String suiteType = "GENERAL";

    @Column("status")
    @Builder.Default
    private String status = "ACTIVE";

    @Nullable
    @Column("phase_id")
    private String phaseId;

    @Nullable
    @Column("owner_id")
    private String ownerId;

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 0;
}
