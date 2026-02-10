package com.insuretech.pms.rfp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.*;
import com.insuretech.pms.rfp.reactive.entity.R2dbcExtractionRun;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRequirementCandidate;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfp;
import com.insuretech.pms.rfp.reactive.repository.ReactiveDocumentChunkRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveExtractionRunRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementCandidateRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRfpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
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
    private final ReactiveRfpRepository rfpRepository;
    private final ReactiveDocumentChunkRepository chunkRepository;
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
     * LLM 추출을 비동기로 실행하고, 결과를 DB에 저장하는 fire-and-forget 메서드.
     * 성공 시: 후보 요구사항 저장 + run 완료 처리 + RFP 상태 → EXTRACTED
     * 실패 시: run 실패 처리 + RFP 상태 → FAILED
     */
    private void fireLlmExtraction(String rfpId, String runId) {
        doLlmExtraction(rfpId, runId)
                .subscribe(
                        null,
                        err -> log.error("추출 파이프라인 최종 에러: rfp={}, run={}, error={}",
                                rfpId, runId, err.getMessage())
                );
    }

    /**
     * LLM 추출 파이프라인 전체 흐름.
     * 1. RFP 콘텐츠 로드 (없으면 청크에서 조합)
     * 2. RFP 상태 → EXTRACTING
     * 3. LLM /api/rfp/extract 호출
     * 4. 응답의 requirements → rfp_requirement_candidates 저장
     * 5. extraction_run 통계 업데이트 + status=COMPLETED
     * 6. RFP 상태 → EXTRACTED
     */
    private Mono<Void> doLlmExtraction(String rfpId, String runId) {
        return rfpRepository.findById(rfpId)
                .switchIfEmpty(Mono.error(new RuntimeException("RFP not found: " + rfpId)))
                .flatMap(rfp -> {
                    // RFP 콘텐츠 확보: content 필드 우선, 없으면 청크 텍스트 조합
                    String content = rfp.getContent();
                    Mono<String> textMono;
                    if (content != null && !content.isBlank()) {
                        textMono = Mono.just(content);
                    } else {
                        textMono = chunkRepository.findByRfpIdOrderByChunkOrderAsc(rfpId)
                                .map(chunk -> chunk.getContent())
                                .collectList()
                                .map(chunks -> String.join("\n\n", chunks));
                    }
                    return textMono.map(text -> Map.entry(rfp, text));
                })
                .flatMap(entry -> {
                    R2dbcRfp rfp = entry.getKey();
                    String text = entry.getValue();

                    if (text == null || text.isBlank()) {
                        return failRun(runId, "추출할 텍스트가 없습니다")
                                .then(Mono.<Void>empty());
                    }

                    // RFP 상태 전이: → EXTRACTING (가능한 경우에만)
                    Mono<Void> statusTransition = Mono.empty();
                    if (RfpStateMachine.isTransitionAllowed(rfp.getStatus(), "EXTRACTING")) {
                        statusTransition = rfpRepository.updateStatus(rfpId, "EXTRACTING");
                    }

                    String originType = rfp.getOriginType() != null ? rfp.getOriginType() : "EXTERNAL_RFP";

                    return statusTransition
                            .then(callLlmExtract(rfpId, runId, rfp.getProjectId(), text, originType))
                            .flatMap(response -> processExtractionResponse(rfpId, runId, response));
                })
                .onErrorResume(err -> {
                    log.error("추출 파이프라인 오류: rfp={}, run={}, error={}", rfpId, runId, err.getMessage());
                    return failRun(runId, err.getMessage())
                            .then(rfpRepository.findById(rfpId)
                                    .flatMap(rfp -> {
                                        if (RfpStateMachine.isTransitionAllowed(rfp.getStatus(), "FAILED")) {
                                            rfp.setFailureReason("추출 실패: " + err.getMessage());
                                            rfp.setStatus("FAILED");
                                            return rfpRepository.save(rfp).then();
                                        }
                                        return Mono.empty();
                                    }));
                });
    }

    /**
     * LLM /api/rfp/extract 엔드포인트 호출.
     */
    @SuppressWarnings("unchecked")
    private Mono<Map<String, Object>> callLlmExtract(
            String rfpId, String runId, String projectId, String text, String originType) {
        return webClientBuilder.build()
                .post()
                .uri(aiServiceUrl + "/api/rfp/extract")
                .bodyValue(Map.of(
                        "project_id", projectId,
                        "rfp_id", rfpId,
                        "run_id", runId,
                        "text", text,
                        "origin_type", originType
                ))
                .retrieve()
                .bodyToMono(Map.class)
                .map(m -> (Map<String, Object>) m);
    }

    /**
     * LLM 응답에서 requirements를 파싱하여 후보 저장 + run 통계 업데이트.
     */
    @SuppressWarnings("unchecked")
    private Mono<Void> processExtractionResponse(String rfpId, String runId, Map<String, Object> response) {
        Boolean success = (Boolean) response.get("success");
        if (!Boolean.TRUE.equals(success)) {
            String error = response.get("error") != null ? response.get("error").toString() : "알 수 없는 오류";
            return failRun(runId, "LLM 추출 실패: " + error)
                    .then(rfpRepository.updateStatus(rfpId, "FAILED"));
        }

        Map<String, Object> data = (Map<String, Object>) response.get("data");
        if (data == null) {
            return failRun(runId, "LLM 응답에 data 필드가 없습니다")
                    .then(rfpRepository.updateStatus(rfpId, "FAILED"));
        }

        List<Map<String, Object>> requirements = (List<Map<String, Object>>) data.get("requirements");
        Map<String, Object> stats = (Map<String, Object>) data.get("stats");
        if (requirements == null) requirements = List.of();
        if (stats == null) stats = Map.of();

        final List<Map<String, Object>> finalReqs = requirements;
        final Map<String, Object> finalStats = stats;

        return saveCandidates(rfpId, runId, finalReqs)
                .then(completeRun(runId, finalReqs, finalStats))
                .then(rfpRepository.updateStatus(rfpId, "EXTRACTED"))
                .doOnSuccess(v -> log.info("추출 완료: rfp={}, run={}, candidates={}", rfpId, runId, finalReqs.size()));
    }

    /**
     * LLM에서 추출된 요구사항을 rfp_requirement_candidates 테이블에 저장.
     */
    @SuppressWarnings("unchecked")
    private Mono<Void> saveCandidates(String rfpId, String runId, List<Map<String, Object>> requirements) {
        if (requirements.isEmpty()) {
            log.warn("추출 결과 요구사항이 0개: rfp={}, run={}", rfpId, runId);
            return Mono.empty();
        }

        return Flux.fromIterable(requirements)
                .map(req -> {
                    // source 트레이싱 정보 추출
                    Map<String, Object> source = req.get("source") instanceof Map
                            ? (Map<String, Object>) req.get("source") : Map.of();
                    // 모호성(ambiguity) 정보 추출
                    Map<String, Object> ambiguity = req.get("ambiguity") instanceof Map
                            ? (Map<String, Object>) req.get("ambiguity") : Map.of();

                    // confidence 변환 (Number → BigDecimal)
                    BigDecimal confidence = BigDecimal.valueOf(0.5);
                    try {
                        Object confObj = req.get("confidence");
                        if (confObj instanceof Number) {
                            confidence = BigDecimal.valueOf(((Number) confObj).doubleValue());
                        }
                    } catch (Exception ignored) {}

                    // ambiguity questions → JSON 문자열
                    String ambiguityQuestionsJson = null;
                    Object questions = ambiguity.get("questions");
                    if (questions instanceof List && !((List<?>) questions).isEmpty()) {
                        try { ambiguityQuestionsJson = objectMapper.writeValueAsString(questions); }
                        catch (Exception ignored) {}
                    }

                    // duplicates → JSON 문자열
                    String duplicateRefsJson = null;
                    Object duplicates = req.get("duplicates");
                    if (duplicates instanceof List && !((List<?>) duplicates).isEmpty()) {
                        try { duplicateRefsJson = objectMapper.writeValueAsString(duplicates); }
                        catch (Exception ignored) {}
                    }

                    return R2dbcRequirementCandidate.builder()
                            .id(UUID.randomUUID().toString())
                            .extractionRunId(runId)
                            .rfpId(rfpId)
                            .reqKey(req.get("req_key") != null ? req.get("req_key").toString() : "RFP-REQ-???")
                            .text(req.get("text") != null ? req.get("text").toString() : "")
                            .category(req.get("category") != null ? req.get("category").toString() : "FUNCTIONAL")
                            .priorityHint(req.get("priority_hint") != null ? req.get("priority_hint").toString() : "UNKNOWN")
                            .confidence(confidence)
                            .sourceSection(source.get("section") != null ? source.get("section").toString() : null)
                            .sourceParagraphId(source.get("paragraph_id") != null ? source.get("paragraph_id").toString() : null)
                            .sourceQuote(source.get("quote") != null ? source.get("quote").toString() : null)
                            .isAmbiguous(Boolean.TRUE.equals(ambiguity.get("is_ambiguous")))
                            .ambiguityQuestions(ambiguityQuestionsJson)
                            .duplicateRefs(duplicateRefsJson)
                            .status("PROPOSED")
                            .createdAt(LocalDateTime.now())
                            .build();
                })
                .flatMap(candidateRepository::save)
                .then()
                .doOnSuccess(v -> log.info("후보 저장 완료: rfp={}, run={}, count={}", rfpId, runId, requirements.size()));
    }

    /**
     * extraction_run을 COMPLETED 상태로 업데이트하고 통계를 기록.
     */
    private Mono<Void> completeRun(String runId, List<Map<String, Object>> requirements, Map<String, Object> stats) {
        return runRepository.findById(runId)
                .flatMap(run -> {
                    run.setStatus("COMPLETED");
                    run.setFinishedAt(LocalDateTime.now());
                    run.setTotalCandidates(requirements.size());

                    // stats에서 모호성 수, 평균 신뢰도, 카테고리 분포 추출
                    Object ambCount = stats.get("ambiguity_count");
                    if (ambCount instanceof Number) {
                        run.setAmbiguityCount(((Number) ambCount).intValue());
                    }

                    Object avgConf = stats.get("avg_confidence");
                    if (avgConf instanceof Number) {
                        run.setAvgConfidence(BigDecimal.valueOf(((Number) avgConf).doubleValue()));
                    }

                    Object catBreakdown = stats.get("category_breakdown");
                    if (catBreakdown instanceof Map) {
                        try { run.setCategoryBreakdown(objectMapper.writeValueAsString(catBreakdown)); }
                        catch (Exception ignored) {}
                    }

                    return runRepository.save(run).then();
                });
    }

    /**
     * extraction_run을 FAILED 상태로 업데이트하고 에러 메시지를 기록.
     */
    private Mono<Void> failRun(String runId, String errorMessage) {
        return runRepository.findById(runId)
                .flatMap(run -> {
                    run.setStatus("FAILED");
                    run.setFinishedAt(LocalDateTime.now());
                    run.setErrorMessage(errorMessage);
                    return runRepository.save(run).then();
                })
                .doOnSuccess(v -> log.warn("추출 실행 실패 처리: run={}, error={}", runId, errorMessage));
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
