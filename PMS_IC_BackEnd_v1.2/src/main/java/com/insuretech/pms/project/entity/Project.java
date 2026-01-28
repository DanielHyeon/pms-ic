package com.insuretech.pms.project.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseEntity {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Nullable
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.PLANNING;

    @Nullable
    @Column(name = "start_date")
    private LocalDate startDate;

    @Nullable
    @Column(name = "end_date")
    private LocalDate endDate;

    @Nullable
    @Column(name = "budget", precision = 15, scale = 2)
    private java.math.BigDecimal budget;

    // Track weights for weighted progress calculation (AI/SI/Common)
    @Column(name = "ai_weight", precision = 5, scale = 2)
    @Builder.Default
    private java.math.BigDecimal aiWeight = new java.math.BigDecimal("0.70"); // Default 70%

    @Column(name = "si_weight", precision = 5, scale = 2)
    @Builder.Default
    private java.math.BigDecimal siWeight = new java.math.BigDecimal("0.30"); // Default 30%

    @Column(name = "progress", nullable = false)
    @Builder.Default
    private Integer progress = 0;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean isDefault = false;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Phase> phases = new ArrayList<>();

    public enum ProjectStatus {
        PLANNING,
        IN_PROGRESS,
        ON_HOLD,
        COMPLETED,
        CANCELLED
    }
}
