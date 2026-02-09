package com.insuretech.pms.rfp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.*;
import com.insuretech.pms.rfp.reactive.entity.R2dbcExtractionRun;
import com.insuretech.pms.rfp.reactive.repository.ReactiveExtractionRunRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementCandidateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveExtractionService {

    private final ReactiveExtractionRunRepository runRepository;
    private final ReactiveRequirementCandidateRepository candidateRepository;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    /**
     * Trigger a new extraction analysis for an RFP.
     * Creates a run record in RUNNING status, deactivates previous active runs,
     * and returns the new run immediately. The actual LLM call is handled separately.
     */
    @Transactional
    public Mono<ExtractionRunDto> triggerAnalysis(String rfpId, AnalyzeRequest request) {
        String runId = UUID.randomUUID().toString();
        String generationParamsJson = serializeParams(request != null ? request.getGenerationParams() : null);

        return runRepository.deactivateAllByRfpId(rfpId)
                .then(Mono.defer(() -> {
                    R2dbcExtractionRun run = R2dbcExtractionRun.builder()
                            .id(runId)
                            .rfpId(rfpId)
                            .modelName(request != null ? request.getModelName() : null)
                            .promptVersion(request != null ? request.getPromptVersion() : null)
                            .generationParams(generationParamsJson)
                            .status("RUNNING")
                            .isActive(true)
                            .startedAt(LocalDateTime.now())
                            .createdAt(LocalDateTime.now())
                            .build();
                    return runRepository.save(run);
                }))
                .map(ExtractionRunDto::from)
                .doOnSuccess(dto -> {
                    log.info("Created extraction run {} for rfp {} with status RUNNING", runId, rfpId);
                    // Fire-and-forget: trigger LLM extraction asynchronously
                    fireLlmExtraction(rfpId, runId);
                });
    }

    /**
     * Get the latest active extraction run for an RFP, including candidates.
     */
    public Mono<ExtractionResultDto> getLatestRun(String rfpId) {
        return runRepository.findByRfpIdAndIsActive(rfpId, true)
                .switchIfEmpty(
                        runRepository.findByRfpIdOrderByCreatedAtDesc(rfpId)
                                .next()
                                .switchIfEmpty(Mono.error(CustomException.notFound(
                                        "No extraction runs found for RFP: " + rfpId)))
                )
                .flatMap(this::buildExtractionResult);
    }

    /**
     * Get a specific extraction run by ID, including candidates.
     */
    public Mono<ExtractionResultDto> getRunById(String runId) {
        return runRepository.findById(runId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Extraction run not found: " + runId)))
                .flatMap(this::buildExtractionResult);
    }

    /**
     * List all extraction runs for an RFP (without candidates).
     */
    public Mono<List<ExtractionRunDto>> listRuns(String rfpId) {
        return runRepository.findByRfpIdOrderByCreatedAtDesc(rfpId)
                .map(ExtractionRunDto::from)
                .collectList();
    }

    /**
     * Build the full ExtractionResultDto with run, candidates, and summary counts.
     */
    private Mono<ExtractionResultDto> buildExtractionResult(R2dbcExtractionRun run) {
        ExtractionRunDto runDto = ExtractionRunDto.from(run);
        String runId = run.getId();

        Mono<List<RequirementCandidateDto>> candidatesMono =
                candidateRepository.findByExtractionRunIdOrderByReqKeyAsc(runId)
                        .map(RequirementCandidateDto::from)
                        .collectList();

        Mono<Long> totalMono = candidateRepository.countByExtractionRunId(runId).defaultIfEmpty(0L);
        Mono<Long> proposedMono = candidateRepository.countByExtractionRunIdAndStatus(runId, "PROPOSED").defaultIfEmpty(0L);
        Mono<Long> acceptedMono = candidateRepository.countByExtractionRunIdAndStatus(runId, "ACCEPTED").defaultIfEmpty(0L);
        Mono<Long> rejectedMono = candidateRepository.countByExtractionRunIdAndStatus(runId, "REJECTED").defaultIfEmpty(0L);
        Mono<Long> editedMono = candidateRepository.countByExtractionRunIdAndStatus(runId, "EDITED").defaultIfEmpty(0L);

        return Mono.zip(candidatesMono, totalMono, proposedMono, acceptedMono, rejectedMono, editedMono)
                .map(tuple -> {
                    ExtractionResultDto.SummaryDto summary = ExtractionResultDto.SummaryDto.builder()
                            .totalCandidates(tuple.getT2())
                            .proposedCount(tuple.getT3())
                            .acceptedCount(tuple.getT4())
                            .rejectedCount(tuple.getT5())
                            .editedCount(tuple.getT6())
                            .build();

                    return ExtractionResultDto.builder()
                            .run(runDto)
                            .candidates(tuple.getT1())
                            .summary(summary)
                            .build();
                });
    }

    /**
     * Fire-and-forget call to the LLM service to start extraction.
     * The LLM service is expected to call back or update the run status directly.
     * For now this is a best-effort async call; errors are logged but not propagated.
     */
    private void fireLlmExtraction(String rfpId, String runId) {
        try {
            webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/api/rfp/extract")
                    .bodyValue(Map.of("rfp_id", rfpId, "run_id", runId))
                    .retrieve()
                    .bodyToMono(String.class)
                    .doOnSuccess(resp -> log.info("LLM extraction triggered for run {}: {}", runId, resp))
                    .doOnError(err -> log.warn("LLM extraction call failed for run {}: {}", runId, err.getMessage()))
                    .subscribe();
        } catch (Exception e) {
            log.warn("Failed to trigger LLM extraction for run {}: {}", runId, e.getMessage());
        }
    }

    private String serializeParams(Map<String, Object> params) {
        if (params == null || params.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize generation params: {}", e.getMessage());
            return null;
        }
    }
}
