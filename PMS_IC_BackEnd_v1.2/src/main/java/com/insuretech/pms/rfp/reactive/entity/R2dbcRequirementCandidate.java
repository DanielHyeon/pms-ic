package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Table(name = "rfp_requirement_candidates", schema = "rfp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRequirementCandidate {

    @Id
    @Column("id")
    private String id;

    @Column("extraction_run_id")
    private String extractionRunId;

    @Column("rfp_id")
    private String rfpId;

    @Column("req_key")
    private String reqKey;

    @Column("text")
    private String text;

    @Column("category")
    @Builder.Default
    private String category = "FUNCTIONAL";

    @Column("priority_hint")
    @Builder.Default
    private String priorityHint = "UNKNOWN";

    @Nullable
    @Column("confidence")
    private BigDecimal confidence;

    @Nullable
    @Column("source_section")
    private String sourceSection;

    @Nullable
    @Column("source_paragraph_id")
    private String sourceParagraphId;

    @Nullable
    @Column("source_quote")
    private String sourceQuote;

    @Column("is_ambiguous")
    @Builder.Default
    private Boolean isAmbiguous = false;

    @Nullable
    @Column("ambiguity_questions")
    private String ambiguityQuestions;

    @Nullable
    @Column("duplicate_refs")
    private String duplicateRefs;

    @Column("status")
    @Builder.Default
    private String status = "PROPOSED";

    @Nullable
    @Column("edited_text")
    private String editedText;

    @Nullable
    @Column("reviewed_by")
    private String reviewedBy;

    @Nullable
    @Column("reviewed_at")
    private LocalDateTime reviewedAt;

    @Nullable
    @Column("confirmed_requirement_id")
    private String confirmedRequirementId;

    @Column("created_at")
    private LocalDateTime createdAt;
}
