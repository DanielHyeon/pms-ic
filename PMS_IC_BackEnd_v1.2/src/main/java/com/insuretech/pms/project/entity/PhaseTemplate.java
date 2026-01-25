package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Phase Template Entity - Phase definition within a Template Set
 */
@Entity
@Table(name = "phase_templates", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhaseTemplate extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_set_id", nullable = false)
    private TemplateSet templateSet;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "relative_order")
    @Builder.Default
    private Integer relativeOrder = 0;

    @Column(name = "default_duration_days")
    private Integer defaultDurationDays;

    @Column(name = "color", length = 20)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "track_type", length = 20)
    @Builder.Default
    private Phase.TrackType trackType = Phase.TrackType.COMMON;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
