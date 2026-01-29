package com.insuretech.pms.auth.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "users", schema = "auth")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcUser extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("email")
    private String email;

    @Column("password")
    private String password;

    @Column("name")
    private String name;

    @Column("role")
    private String role;

    @Nullable
    @Column("department")
    private String department;

    @Column("active")
    @Builder.Default
    private Boolean active = true;

    @Nullable
    @Column("last_login_at")
    private LocalDateTime lastLoginAt;

    public enum UserRole {
        SPONSOR,
        PMO_HEAD,
        PM,
        DEVELOPER,
        QA,
        BUSINESS_ANALYST,
        AUDITOR,
        ADMIN
    }
}
