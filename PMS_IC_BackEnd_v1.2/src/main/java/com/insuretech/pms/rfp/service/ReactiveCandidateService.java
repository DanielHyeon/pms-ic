package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.CandidateUpdateRequest;
import com.insuretech.pms.rfp.dto.RequirementCandidateDto;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirement;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirementCandidate;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementCandidateRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveCandidateService {

    private final ReactiveRequirementCandidateRepository candidateRepository;
    private final ReactiveRequirementRepository requirementRepository;

    /**
     * List all candidates for an extraction run, ordered by requirement key.
     */
    public Flux<RequirementCandidateDto> listCandidates(String extractionRunId) {
        return candidateRepository.findByExtractionRunIdOrderByReqKeyAsc(extractionRunId)
                .map(RequirementCandidateDto::from);
    }

    /**
     * Bulk confirm candidates: creates actual requirements from each candidate
     * that is in PROPOSED or EDITED status, then marks the candidate as ACCEPTED.
     */
    @Transactional
    public Mono<List<RequirementCandidateDto>> confirmCandidates(String rfpId, String projectId,
                                                                  List<String> candidateIds) {
        if (candidateIds == null || candidateIds.isEmpty()) {
            return Mono.error(CustomException.badRequest("candidateIds must not be empty"));
        }

        return Flux.fromIterable(candidateIds)
                .flatMap(candidateId -> confirmSingleCandidate(candidateId, rfpId, projectId))
                .collectList()
                .doOnSuccess(list -> log.info("Confirmed {} candidates for rfp {} in project {}",
                        list.size(), rfpId, projectId));
    }

    /**
     * Bulk reject candidates: marks each as REJECTED.
     */
    @Transactional
    public Mono<List<RequirementCandidateDto>> rejectCandidates(List<String> candidateIds, String reason) {
        if (candidateIds == null || candidateIds.isEmpty()) {
            return Mono.error(CustomException.badRequest("candidateIds must not be empty"));
        }

        return Flux.fromIterable(candidateIds)
                .flatMap(candidateId -> rejectSingleCandidate(candidateId, reason))
                .collectList()
                .doOnSuccess(list -> log.info("Rejected {} candidates", list.size()));
    }

    /**
     * Update a single candidate's text, category, or priority hint.
     * Sets status to EDITED if text is modified.
     */
    @Transactional
    public Mono<RequirementCandidateDto> updateCandidate(String candidateId, CandidateUpdateRequest request) {
        return candidateRepository.findById(candidateId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Candidate not found: " + candidateId)))
                .flatMap(candidate -> {
                    if (request.getText() != null && !request.getText().isBlank()) {
                        candidate.setEditedText(request.getText());
                        candidate.setStatus("EDITED");
                    }
                    if (request.getCategory() != null) {
                        candidate.setCategory(request.getCategory());
                    }
                    if (request.getPriorityHint() != null) {
                        candidate.setPriorityHint(request.getPriorityHint());
                    }
                    return candidateRepository.save(candidate);
                })
                .map(RequirementCandidateDto::from)
                .doOnSuccess(dto -> log.info("Updated candidate {}", candidateId));
    }

    /**
     * Confirm a single candidate: create a real requirement, update candidate status.
     */
    private Mono<RequirementCandidateDto> confirmSingleCandidate(String candidateId,
                                                                   String rfpId, String projectId) {
        return candidateRepository.findById(candidateId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Candidate not found: " + candidateId)))
                .flatMap(candidate -> {
                    // Only process PROPOSED or EDITED candidates
                    if (!"PROPOSED".equals(candidate.getStatus()) && !"EDITED".equals(candidate.getStatus())) {
                        return Mono.just(candidate);
                    }

                    String requirementId = UUID.randomUUID().toString();
                    String finalText = candidate.getEditedText() != null
                            ? candidate.getEditedText()
                            : candidate.getText();

                    return generateRequirementCode(projectId)
                            .flatMap(code -> {
                                R2dbcRequirement requirement = R2dbcRequirement.builder()
                                        .id(requirementId)
                                        .rfpId(rfpId)
                                        .projectId(projectId)
                                        .code(code)
                                        .title(truncateTitle(finalText))
                                        .description(finalText)
                                        .category(mapCategory(candidate.getCategory()))
                                        .priority(mapPriority(candidate.getPriorityHint()))
                                        .status("IDENTIFIED")
                                        .sourceText(candidate.getSourceQuote())
                                        .progressPercentage(0)
                                        .progressCalcMethod("STORY_POINT")
                                        .tenantId(projectId)
                                        .build();

                                return requirementRepository.save(requirement);
                            })
                            .flatMap(savedReq -> {
                                candidate.setStatus("ACCEPTED");
                                candidate.setConfirmedRequirementId(savedReq.getId());
                                candidate.setReviewedAt(LocalDateTime.now());
                                return candidateRepository.save(candidate);
                            });
                })
                .map(RequirementCandidateDto::from);
    }

    /**
     * Reject a single candidate.
     */
    private Mono<RequirementCandidateDto> rejectSingleCandidate(String candidateId, String reason) {
        return candidateRepository.findById(candidateId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Candidate not found: " + candidateId)))
                .flatMap(candidate -> {
                    candidate.setStatus("REJECTED");
                    candidate.setReviewedAt(LocalDateTime.now());
                    return candidateRepository.save(candidate);
                })
                .map(RequirementCandidateDto::from);
    }

    /**
     * Generate a sequential requirement code like REQ-ABCDE123-0001.
     */
    private Mono<String> generateRequirementCode(String projectId) {
        return requirementRepository.countByProjectId(projectId)
                .defaultIfEmpty(0L)
                .map(count -> String.format("REQ-%s-%04d",
                        projectId.substring(0, Math.min(8, projectId.length())).toUpperCase(),
                        count + 1));
    }

    /**
     * Map candidate category to requirement category.
     * Candidate uses: FUNCTIONAL, NON_FUNCTIONAL, CONSTRAINT
     * Requirement uses: FUNCTIONAL, NON_FUNCTIONAL, TECHNICAL, BUSINESS
     */
    private String mapCategory(String candidateCategory) {
        if (candidateCategory == null) return "FUNCTIONAL";
        return switch (candidateCategory) {
            case "NON_FUNCTIONAL" -> "NON_FUNCTIONAL";
            case "CONSTRAINT" -> "TECHNICAL";
            default -> "FUNCTIONAL";
        };
    }

    /**
     * Map candidate priority hint to requirement priority.
     * Candidate uses: MUST, SHOULD, COULD, UNKNOWN
     * Requirement uses: LOW, MEDIUM, HIGH, CRITICAL
     */
    private String mapPriority(String priorityHint) {
        if (priorityHint == null) return "MEDIUM";
        return switch (priorityHint) {
            case "MUST" -> "CRITICAL";
            case "SHOULD" -> "HIGH";
            case "COULD" -> "LOW";
            default -> "MEDIUM";
        };
    }

    /**
     * Truncate long text to produce a requirement title (max 200 chars).
     */
    private String truncateTitle(String text) {
        if (text == null) return "Untitled Requirement";
        if (text.length() <= 200) return text;
        return text.substring(0, 197) + "...";
    }
}
