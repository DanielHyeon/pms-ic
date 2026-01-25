package com.insuretech.pms.report.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Role report defaults entity - defines default report settings per role
 */
@Entity
@Table(name = "role_report_defaults", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleReportDefaults {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "role", length = 30, nullable = false)
    private String role;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", length = 30, nullable = false)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_scope", length = 30, nullable = false)
    private ReportScope defaultScope;

    @Column(name = "default_sections", columnDefinition = "TEXT[]", nullable = false)
    private String[] defaultSections;

    @Column(name = "can_change_scope")
    @Builder.Default
    private Boolean canChangeScope = false;

    @Column(name = "can_select_sections")
    @Builder.Default
    private Boolean canSelectSections = true;

    @Column(name = "can_extend_period")
    @Builder.Default
    private Boolean canExtendPeriod = false;

    @Column(name = "max_period_days")
    @Builder.Default
    private Integer maxPeriodDays = 7;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
