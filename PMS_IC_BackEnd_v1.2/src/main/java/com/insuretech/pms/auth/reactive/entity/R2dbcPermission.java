package com.insuretech.pms.auth.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "permissions", schema = "auth")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcPermission extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("category")
    private String category;

    @Column("name")
    private String name;

    @Nullable
    @Column("description")
    private String description;

    @Nullable
    @Column("resource")
    private String resource;

    @Nullable
    @Column("action")
    private String action;
}
