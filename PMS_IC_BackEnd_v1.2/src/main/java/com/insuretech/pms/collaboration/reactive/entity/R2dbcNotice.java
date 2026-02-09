package com.insuretech.pms.collaboration.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

/**
 * Notice entity. Extends R2dbcBaseEntity for audit fields.
 */
@Table(name = "notices", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcNotice extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("title")
    private String title;

    @Column("content")
    private String content;

    @Column("priority")
    @Builder.Default
    private String priority = "NORMAL";

    @Column("category")
    @Builder.Default
    private String category = "GENERAL";

    @Column("status")
    @Builder.Default
    private String status = "DRAFT";

    @Column("pinned")
    @Builder.Default
    private Boolean pinned = false;

    @Nullable
    @Column("published_at")
    private LocalDateTime publishedAt;

    @Nullable
    @Column("published_by")
    private String publishedBy;

    @Nullable
    @Column("expires_at")
    private LocalDateTime expiresAt;
}
