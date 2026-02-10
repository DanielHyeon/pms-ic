package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.CreateRfpRequest;
import com.insuretech.pms.rfp.dto.RfpDto;
import com.insuretech.pms.rfp.dto.UpdateRfpRequest;
import com.insuretech.pms.rfp.enums.ProcessingStatus;
import com.insuretech.pms.rfp.enums.RfpStatus;
import com.insuretech.pms.rfp.reactive.entity.R2dbcDocumentChunk;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfp;
import com.insuretech.pms.rfp.reactive.repository.ReactiveDocumentChunkRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRfpRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class ReactiveRfpService {

    private final ReactiveRfpRepository rfpRepository;
    private final ReactiveRequirementRepository requirementRepository;
    private final ReactiveDocumentChunkRepository chunkRepository;
    private final WebClient webClient;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    public ReactiveRfpService(
            ReactiveRfpRepository rfpRepository,
            ReactiveRequirementRepository requirementRepository,
            ReactiveDocumentChunkRepository chunkRepository,
            WebClient.Builder webClientBuilder) {
        this.rfpRepository = rfpRepository;
        this.requirementRepository = requirementRepository;
        this.chunkRepository = chunkRepository;
        this.webClient = webClientBuilder.build();
    }

    public Flux<RfpDto> getRfpsByProject(String projectId) {
        return rfpRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .flatMap(this::toDtoWithCount);
    }

    public Mono<RfpDto> getRfpById(String id) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(this::toDtoWithCount);
    }

    public Mono<RfpDto> createRfp(String projectId, CreateRfpRequest request) {
        R2dbcRfp rfp = R2dbcRfp.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .title(request.getTitle())
                .content(request.getContent())
                // 기본 상태를 UPLOADED로 설정 (콘텐츠가 있으면 바로 파싱 가능)
                .status(request.getStatus() != null ? request.getStatus() : "UPLOADED")
                .processingStatus(request.getProcessingStatus() != null ? request.getProcessingStatus() : "PENDING")
                .tenantId(projectId)
                .build();

        return rfpRepository.save(rfp)
                .flatMap(this::toDtoWithCount)
                .doOnSuccess(dto -> {
                    log.info("Created RFP: {} for project: {}", dto.getId(), projectId);
                    // Sprint A: 콘텐츠가 있으면 자동 파싱 트리거 (fire-and-forget)
                    if (request.getContent() != null && !request.getContent().isBlank()) {
                        parseRfpContent(dto.getId()).subscribe(
                                null,
                                err -> log.warn("자동 파싱 실패 rfp={}: {}", dto.getId(), err.getMessage())
                        );
                    }
                });
    }

    public Mono<RfpDto> updateRfp(String id, UpdateRfpRequest request) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(rfp -> {
                    if (request.getTitle() != null) rfp.setTitle(request.getTitle());
                    if (request.getContent() != null) rfp.setContent(request.getContent());
                    if (request.getStatus() != null) rfp.setStatus(request.getStatus());
                    return rfpRepository.save(rfp);
                })
                .flatMap(this::toDtoWithCount);
    }

    public Mono<Void> deleteRfp(String id) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(rfp -> {
                    if ("CONFIRMED".equals(rfp.getStatus())) {
                        return Mono.error(CustomException.badRequest(
                                "Cannot delete CONFIRMED RFP. Use ON_HOLD instead."));
                    }
                    return rfpRepository.delete(rfp);
                })
                .doOnSuccess(v -> log.info("Deleted RFP: {}", id));
    }

    /**
     * 상태 전이 (설계 문서 Section 4 상태 머신 기반).
     */
    @Transactional
    public Mono<Void> updateStatus(String id, String newStatus) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(rfp -> {
                    String currentStatus = rfp.getStatus();
                    RfpStateMachine.validateTransition(currentStatus, newStatus);

                    // ON_HOLD: 이전 상태를 보존하여 복원에 사용
                    if ("ON_HOLD".equals(newStatus)) {
                        rfp.setPreviousStatus(currentStatus);
                    }

                    if ("FAILED".equals(newStatus) && rfp.getFailureReason() == null) {
                        log.warn("RFP {} transitioning to FAILED without reason", id);
                    }

                    return rfpRepository.updateStatus(id, newStatus);
                })
                .doOnSuccess(v -> log.info("Updated RFP status: {} to {}", id, newStatus));
    }

    /**
     * 실패 전이 + 사유 기록.
     */
    @Transactional
    public Mono<Void> failRfp(String id, String reason) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(rfp -> {
                    RfpStateMachine.validateTransition(rfp.getStatus(), "FAILED");
                    rfp.setFailureReason(reason);
                    rfp.setStatus("FAILED");
                    return rfpRepository.save(rfp).then();
                });
    }

    /**
     * ON_HOLD에서 이전 상태로 복원.
     */
    @Transactional
    public Mono<Void> resumeFromHold(String id) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(rfp -> {
                    if (!"ON_HOLD".equals(rfp.getStatus())) {
                        return Mono.error(CustomException.badRequest("RFP is not ON_HOLD"));
                    }
                    String restoreStatus = rfp.getPreviousStatus();
                    if (restoreStatus == null) {
                        restoreStatus = "EXTRACTED";
                    }
                    RfpStateMachine.validateTransition("ON_HOLD", restoreStatus);
                    rfp.setStatus(restoreStatus);
                    rfp.setPreviousStatus(null);
                    return rfpRepository.save(rfp).then();
                });
    }

    public Mono<List<String>> getAllowedTransitions(String id) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .map(rfp -> RfpStateMachine.getAllowedTransitions(rfp.getStatus()));
    }

    public Mono<Void> updateProcessingStatus(String id, String processingStatus, String message) {
        return rfpRepository.updateProcessingStatus(id, processingStatus, message);
    }

    // ══════════════════════════════════════════════════════════════
    // Sprint A: 업로드 후 자동 파싱 파이프라인
    // RFP 콘텐츠를 LLM /api/rfp/parse로 보내고 반환된 chunks를 DB에 저장
    // 상태 전이: UPLOADED → PARSING → PARSED (실패 시 → FAILED)
    // ══════════════════════════════════════════════════════════════

    /**
     * RFP 콘텐츠를 LLM 파싱 서비스로 보내고 문서 청크를 생성한다.
     */
    @Transactional
    public Mono<Void> parseRfpContent(String rfpId) {
        return rfpRepository.findById(rfpId)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + rfpId)))
                .flatMap(rfp -> {
                    String text = rfp.getContent();
                    if (text == null || text.isBlank()) {
                        return Mono.error(CustomException.badRequest("파싱할 콘텐츠가 없습니다: " + rfpId));
                    }

                    // 상태 전이: UPLOADED → PARSING
                    if (RfpStateMachine.isTransitionAllowed(rfp.getStatus(), "PARSING")) {
                        return rfpRepository.updateStatus(rfpId, "PARSING")
                                .then(callLlmParse(rfpId, text, rfp.getFileType()))
                                .flatMap(chunks -> saveChunks(rfpId, chunks))
                                .then(rfpRepository.updateStatus(rfpId, "PARSED"))
                                .doOnSuccess(v -> log.info("파싱 완료: rfp={}", rfpId));
                    } else {
                        log.info("상태 전이 불가 ({} → PARSING), 파싱 건너뜀: rfp={}", rfp.getStatus(), rfpId);
                        return Mono.empty();
                    }
                })
                .onErrorResume(err -> {
                    log.error("파싱 실패: rfp={}, error={}", rfpId, err.getMessage());
                    // 실패 시 FAILED 상태로 전이 + 사유 기록
                    return rfpRepository.findById(rfpId)
                            .flatMap(rfp -> {
                                if (RfpStateMachine.isTransitionAllowed(rfp.getStatus(), "FAILED")) {
                                    rfp.setFailureReason("파싱 실패: " + err.getMessage());
                                    rfp.setStatus("FAILED");
                                    return rfpRepository.save(rfp).then();
                                }
                                return Mono.empty();
                            });
                });
    }

    /**
     * LLM 서비스의 /api/rfp/parse 엔드포인트 호출.
     */
    @SuppressWarnings("unchecked")
    private Mono<List<Map<String, Object>>> callLlmParse(String rfpId, String text, String fileType) {
        return webClient
                .post()
                .uri(aiServiceUrl + "/api/rfp/parse")
                .bodyValue(Map.of(
                        "rfp_id", rfpId,
                        "text", text,
                        "file_type", fileType != null ? fileType : "txt"
                ))
                .retrieve()
                .bodyToMono(Map.class)
                .flatMap(response -> {
                    Boolean success = (Boolean) response.get("success");
                    if (!Boolean.TRUE.equals(success)) {
                        String error = response.get("error") != null ? response.get("error").toString() : "알 수 없는 오류";
                        return Mono.error(new RuntimeException("LLM 파싱 실패: " + error));
                    }
                    Map<String, Object> data = (Map<String, Object>) response.get("data");
                    List<Map<String, Object>> chunks = (List<Map<String, Object>>) data.get("chunks");
                    log.info("LLM 파싱 결과: rfp={}, chunks={}", rfpId, chunks != null ? chunks.size() : 0);
                    return Mono.just(chunks != null ? chunks : List.of());
                });
    }

    /**
     * LLM에서 반환된 청크 데이터를 rfp.rfp_document_chunks 테이블에 저장.
     */
    private Mono<Void> saveChunks(String rfpId, List<Map<String, Object>> chunks) {
        if (chunks.isEmpty()) {
            log.warn("파싱 결과 청크가 0개: rfp={}", rfpId);
            return Mono.empty();
        }
        // 기존 청크 삭제 후 새로 저장
        return chunkRepository.deleteByRfpId(rfpId)
                .thenMany(Flux.range(0, chunks.size())
                        .map(i -> {
                            Map<String, Object> chunk = chunks.get(i);
                            return R2dbcDocumentChunk.builder()
                                    .id(UUID.randomUUID().toString())
                                    .rfpId(rfpId)
                                    .sectionId(chunk.get("section") != null ? chunk.get("section").toString() : null)
                                    .heading(chunk.get("heading") != null ? chunk.get("heading").toString() : null)
                                    .content(chunk.get("text") != null ? chunk.get("text").toString() : "")
                                    .chunkOrder(i)
                                    .chunkType("PARAGRAPH")
                                    .createdAt(LocalDateTime.now())
                                    .build();
                        })
                        .flatMap(chunkRepository::save))
                .then()
                .doOnSuccess(v -> log.info("청크 저장 완료: rfp={}, count={}", rfpId, chunks.size()));
    }

    // ══════════════════════════════════════════════════════════════

    private Mono<RfpDto> toDtoWithCount(R2dbcRfp entity) {
        return requirementRepository.countByProjectId(entity.getProjectId())
                .defaultIfEmpty(0L)
                .map(count -> toDto(entity, count.intValue()));
    }

    private RfpDto toDto(R2dbcRfp entity, int requirementCount) {
        return RfpDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .filePath(entity.getFilePath())
                .fileName(entity.getFileName())
                .fileType(entity.getFileType())
                .fileSize(entity.getFileSize())
                .status(parseRfpStatus(entity.getStatus()))
                .processingStatus(parseProcessingStatus(entity.getProcessingStatus()))
                .processingMessage(entity.getProcessingMessage())
                .submittedAt(entity.getSubmittedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .requirementCount(requirementCount)
                .originType(entity.getOriginType())
                .versionLabel(entity.getVersionLabel())
                .previousStatus(entity.getPreviousStatus())
                .failureReason(entity.getFailureReason())
                .sourceName(entity.getSourceName())
                .rfpType(entity.getRfpType())
                .build();
    }

    private RfpStatus parseRfpStatus(String status) {
        try {
            return status != null ? RfpStatus.valueOf(status) : RfpStatus.DRAFT;
        } catch (IllegalArgumentException e) {
            return RfpStatus.DRAFT;
        }
    }

    private ProcessingStatus parseProcessingStatus(String status) {
        try {
            return status != null ? ProcessingStatus.valueOf(status) : ProcessingStatus.PENDING;
        } catch (IllegalArgumentException e) {
            return ProcessingStatus.PENDING;
        }
    }
}
