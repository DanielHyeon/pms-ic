package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * WBS Group Template Entity - WBS Group definition within a Phase Template
 */
@Entity
@Table(name = "wbs_group_templates", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsGroupTemplate extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_template_id", nullable = false)
    private PhaseTemplate phaseTemplate;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "relative_order")
    @Builder.Default
    private Integer relativeOrder = 0;

    @Column(name = "default_weight")
    @Builder.Default
    private Integer defaultWeight = 100;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
