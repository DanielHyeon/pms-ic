package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Feature Entity - Second level in Backlog hierarchy
 * Epic -> Feature -> UserStory -> Task
 */
@Entity
@Table(name = "features", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Feature extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "epic_id", nullable = false)
    private Epic epic;

    /**
     * Part (Work Area) that owns this Feature.
     * Part Leader (PL) is responsible for all features in their part.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id")
    private Part part;

    @Column(name = "wbs_group_id", length = 36)
    private String wbsGroupId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private FeatureStatus status = FeatureStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 50)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "order_num")
    @Builder.Default
    private Integer orderNum = 0;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    public enum FeatureStatus {
        OPEN,
        IN_PROGRESS,
        DONE,
        CANCELLED
    }

    public enum Priority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }
}
