package com.insuretech.pms.report.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Template section entity - defines individual sections within a template
 */
@Entity
@Table(name = "template_sections", schema = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "section_key", length = 50, nullable = false)
    private String sectionKey;

    @Column(name = "title", length = 200, nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_type", length = 30, nullable = false)
    private SectionType sectionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> config;

    @Column(name = "is_required")
    @Builder.Default
    private Boolean isRequired = false;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", insertable = false, updatable = false)
    private ReportTemplate template;
}
