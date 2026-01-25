package com.insuretech.pms.report.entity;

import com.insuretech.pms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Report template entity - defines report structure and sections
 */
@Entity
@Table(name = "report_templates", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", length = 30, nullable = false)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", length = 30, nullable = false)
    private TemplateScope scope;

    @Column(name = "organization_id", length = 50)
    private String organizationId;

    @Column(name = "target_roles", columnDefinition = "TEXT[]")
    private String[] targetRoles;

    @Column(name = "target_report_scopes", columnDefinition = "TEXT[]")
    private String[] targetReportScopes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structure", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> structure;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "styling", columnDefinition = "jsonb")
    private Map<String, Object> styling;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "version")
    @Builder.Default
    private Integer version = 1;

    // Relationships
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("displayOrder")
    private List<TemplateSection> sections;
}
