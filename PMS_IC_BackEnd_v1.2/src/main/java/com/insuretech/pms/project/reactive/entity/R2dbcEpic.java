package com.insuretech.pms.project.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

@Table(name = "epics", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEpic extends R2dbcBaseEntity {

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

    @Column("status")
    @Builder.Default
    private String status = "BACKLOG";

    @Nullable
    @Column("goal")
    private String goal;

    @Nullable
    @Column("owner_id")
    private String ownerId;

    @Nullable
    @Column("target_completion_date")
    private LocalDate targetCompletionDate;

    @Nullable
    @Column("business_value")
    private Integer businessValue;

    @Column("total_story_points")
    @Builder.Default
    private Integer totalStoryPoints = 0;

    @Column("item_count")
    @Builder.Default
    private Integer itemCount = 0;

    @Nullable
    @Column("phase_id")
    private String phaseId;

    @Nullable
    @Column("color")
    private String color;

    @Column("progress")
    @Builder.Default
    private Integer progress = 0;

    @Column("priority")
    @Builder.Default
    private String priority = "MEDIUM";

    @Column("order_num")
    @Builder.Default
    private Integer orderNum = 0;

    public enum EpicStatus {
        BACKLOG,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    public enum Priority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }
}
