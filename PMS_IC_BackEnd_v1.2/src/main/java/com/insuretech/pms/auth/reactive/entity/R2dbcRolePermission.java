package com.insuretech.pms.auth.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table(name = "role_permissions", schema = "auth")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRolePermission extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("role")
    private String role;

    @Column("permission_id")
    private String permissionId;

    @Column("granted")
    @Builder.Default
    private Boolean granted = true;
}
