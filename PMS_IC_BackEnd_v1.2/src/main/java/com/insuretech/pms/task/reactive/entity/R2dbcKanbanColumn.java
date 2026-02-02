package com.insuretech.pms.task.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table(name = "kanban_columns", schema = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcKanbanColumn extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("name")
    private String name;

    @Column("order_num")
    private Integer orderNum;

    @Column("wip_limit")
    @Builder.Default
    private Integer wipLimit = 0;

    @Column("color")
    @Builder.Default
    private String color = "#808080";
}
