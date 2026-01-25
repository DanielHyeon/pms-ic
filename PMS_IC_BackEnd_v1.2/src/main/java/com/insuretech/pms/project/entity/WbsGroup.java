package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * WBS Group Entity - Second level in WBS hierarchy
 * Phase -> WbsGroup -> WbsItem -> WbsTask
 */
@Entity
@Table(name = "wbs_groups", schema = "project")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WbsGroup extends BaseEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id", nullable = false)
    private Phase phase;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private WbsStatus status = WbsStatus.NOT_STARTED;

    @Column(name = "progress")
    @Builder.Default
    private Integer progress = 0;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(name = "weight")
    @Builder.Default
    private Integer weight = 100;

    @Column(name = "order_num")
    @Builder.Default
    private Integer orderNum = 0;

    @Column(name = "linked_epic_id", length = 36)
    private String linkedEpicId;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    public enum WbsStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        ON_HOLD,
        CANCELLED
    }
}
