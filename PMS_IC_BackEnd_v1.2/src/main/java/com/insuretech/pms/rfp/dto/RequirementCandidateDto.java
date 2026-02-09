package com.insuretech.pms.rfp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirementCandidate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RequirementCandidateDto {

    private String id;
    private String extractionRunId;
    private String rfpId;
    private String reqKey;
    private String text;
    private String category;
    private String priorityHint;
    private BigDecimal confidence;
    private String sourceSection;
    private String sourceParagraphId;
    private String sourceQuote;
    private Boolean isAmbiguous;
    private String ambiguityQuestions;
    private String duplicateRefs;
    private String status;
    private String editedText;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String confirmedRequirementId;
    private LocalDateTime createdAt;

    public static RequirementCandidateDto from(R2dbcRequirementCandidate entity) {
        return RequirementCandidateDto.builder()
                .id(entity.getId())
                .extractionRunId(entity.getExtractionRunId())
                .rfpId(entity.getRfpId())
                .reqKey(entity.getReqKey())
                .text(entity.getText())
                .category(entity.getCategory())
                .priorityHint(entity.getPriorityHint())
                .confidence(entity.getConfidence())
                .sourceSection(entity.getSourceSection())
                .sourceParagraphId(entity.getSourceParagraphId())
                .sourceQuote(entity.getSourceQuote())
                .isAmbiguous(entity.getIsAmbiguous())
                .ambiguityQuestions(entity.getAmbiguityQuestions())
                .duplicateRefs(entity.getDuplicateRefs())
                .status(entity.getStatus())
                .editedText(entity.getEditedText())
                .reviewedBy(entity.getReviewedBy())
                .reviewedAt(entity.getReviewedAt())
                .confirmedRequirementId(entity.getConfirmedRequirementId())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
