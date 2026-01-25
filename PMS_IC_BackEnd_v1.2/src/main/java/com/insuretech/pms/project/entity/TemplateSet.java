package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Template Set Entity - Container for Phase/WBS templates
 */
@Entity
@Table(name = "template_sets", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateSet extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "name", nullable = false, length = 255, unique = true)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 50)
    private TemplateCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private TemplateStatus status = TemplateStatus.ACTIVE;

    @Column(name = "version", length = 20)
    @Builder.Default
    private String version = "1.0";

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "tags", columnDefinition = "TEXT[]")
    private String[] tags;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    public enum TemplateCategory {
        INSURANCE_DEVELOPMENT,
        INSURANCE_MAINTENANCE,
        SI_PROJECT,
        AI_PROJECT,
        CUSTOM
    }

    public enum TemplateStatus {
        ACTIVE,
        INACTIVE,
        ARCHIVED
    }
}
