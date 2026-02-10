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
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    // 파일 업로드 → RFP 생성 → 자동 파싱 트리거
    // ══════════════════════════════════════════════════════════════

    /**
     * 파일 업로드를 통한 RFP 생성.
     * 파일을 디스크에 저장하고, 텍스트 파일이면 내용을 읽어 자동 파싱까지 수행한다.
     */
    public Mono<RfpDto> uploadRfp(String projectId, FilePart file, String title) {
        String fileName = file.filename();
        String fileType = getFileExtension(fileName);
        String rfpId = UUID.randomUUID().toString();
        String storedName = rfpId + "-" + fileName;
        Path uploadDir = Paths.get("uploads", "rfp", projectId);
        Path targetPath = uploadDir.resolve(storedName);

        // 1. FilePart 데이터를 바이트로 수집 → 디스크 저장 → RFP 엔티티 생성
        return DataBufferUtils.join(file.content())
                .flatMap(dataBuffer -> {
                    try {
                        Files.createDirectories(uploadDir);
                        byte[] bytes = new byte[dataBuffer.readableByteCount()];
                        dataBuffer.read(bytes);
                        DataBufferUtils.release(dataBuffer);
                        Files.write(targetPath, bytes);

                        long fileSize = bytes.length;

                        // 텍스트 기반 파일이면 내용을 content에 저장 (파싱용)
                        String content = null;
                        Set<String> textTypes = Set.of("txt", "csv", "json", "xml", "md");
                        if (textTypes.contains(fileType)) {
                            content = new String(bytes, StandardCharsets.UTF_8);
                        }

                        // RFP 엔티티 생성
                        String rfpTitle = (title != null && !title.isBlank())
                                ? title
                                : fileName.replaceFirst("[.][^.]+$", "");

                        R2dbcRfp rfp = R2dbcRfp.builder()
                                .id(rfpId)
                                .projectId(projectId)
                                .title(rfpTitle)
                                .content(content)
                                .fileName(fileName)
                                .filePath(targetPath.toString())
                                .fileType(fileType)
                                .fileSize(fileSize)
                                .status("UPLOADED")
                                .processingStatus("PENDING")
                                .tenantId(projectId)
                                .build();

                        return rfpRepository.save(rfp);
                    } catch (IOException e) {
                        DataBufferUtils.release(dataBuffer);
                        return Mono.<R2dbcRfp>error(
                                CustomException.internalError("파일 저장 실패: " + e.getMessage()));
                    }
                })
                .flatMap(this::toDtoWithCount)
                .doOnSuccess(dto -> {
                    log.info("파일 업로드 완료: rfp={}, file={}", dto.getId(), fileName);
                    // 텍스트 콘텐츠가 있으면 자동 파싱 트리거 (fire-and-forget)
                    if (dto.getContent() != null && !dto.getContent().isBlank()) {
                        parseRfpContent(dto.getId()).subscribe(
                                null,
                                err -> log.warn("자동 파싱 실패 rfp={}: {}", dto.getId(), err.getMessage())
                        );
                    }
                });
    }

    /**
     * 파일 확장자를 추출 (소문자).
     */
    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "";
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }

    // ══════════════════════════════════════════════════════════════
    // Sprint A: 업로드 후 자동 파싱 파이프라인
    // RFP 콘텐츠를 LLM /api/rfp/parse로 보내고 반환된 chunks를 DB에 저장
    // 상태 전이: UPLOADED → PARSING → PARSED (실패 시 → FAILED)
    // ══════════════════════════════════════════════════════════════

    /**
     * RFP 콘텐츠를 LLM 파싱 서비스로 보내고 문서 청크를 생성한다.
     * <p>
     * [멱등성 보장] 동일 rfpId로 여러 번 호출해도 결과는 1번만 실행:
     * - UPLOADED/NEEDS_REANALYSIS → PARSING 전이 후 실행
     * - PARSING/EXTRACTING 중이면 "이미 처리 중" 반환 (중복 방지)
     * - 그 외 상태면 조용히 skip
     */
    @Transactional
    public Mono<Void> parseRfpContent(String rfpId) {
        return rfpRepository.findById(rfpId)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + rfpId)))
                .flatMap(rfp -> {
                    String currentStatus = rfp.getStatus();

                    // [멱등성] 이미 진행 중이면 중복 실행 방지
                    if ("PARSING".equals(currentStatus) || "EXTRACTING".equals(currentStatus)) {
                        log.info("이미 처리 중 ({}), 중복 파싱 건너뜀: rfp={}", currentStatus, rfpId);
                        return Mono.empty();
                    }

                    String text = rfp.getContent();
                    if (text == null || text.isBlank()) {
                        return Mono.error(CustomException.badRequest("파싱할 콘텐츠가 없습니다: " + rfpId));
                    }

                    // 상태 전이 가능 여부 확인 (UPLOADED/NEEDS_REANALYSIS → PARSING)
                    if (RfpStateMachine.isTransitionAllowed(currentStatus, "PARSING")) {
                        return rfpRepository.updateStatus(rfpId, "PARSING")
                                .then(callLlmParse(rfpId, text, rfp.getFileType()))
                                .flatMap(chunks -> saveChunks(rfpId, chunks))
                                .then(rfpRepository.updateStatus(rfpId, "PARSED"))
                                .doOnSuccess(v -> log.info("파싱 완료: rfp={}", rfpId));
                    } else {
                        log.info("상태 전이 불가 ({} → PARSING), 파싱 건너뜀: rfp={}", currentStatus, rfpId);
                        return Mono.empty();
                    }
                })
                .onErrorResume(err -> {
                    log.error("파싱 실패: rfp={}, error={}", rfpId, err.getMessage());
                    return rfpRepository.findById(rfpId)
                            .flatMap(rfp -> {
                                if (RfpStateMachine.isTransitionAllowed(rfp.getStatus(), "FAILED")) {
                                    // [에러 분리] 사용자 메시지 vs 개발자 메시지
                                    rfp.setFailureReason(toUserFriendlyError(err));
                                    rfp.setFailureReasonDev(err.getClass().getSimpleName() + ": " + err.getMessage());
                                    rfp.setRetryable(isRetryableError(err));
                                    rfp.setStatus("FAILED");
                                    rfp.setNew(false); // 기존 엔티티 UPDATE
                                    return rfpRepository.save(rfp).then();
                                }
                                return Mono.empty();
                            });
                });
    }

    /**
     * FAILED 상태에서 파싱 재시도 (retryable=true인 경우만).
     * 상태를 UPLOADED로 되돌린 뒤 parseRfpContent()를 호출한다.
     */
    @Transactional
    public Mono<Void> retryParse(String rfpId) {
        return rfpRepository.findById(rfpId)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + rfpId)))
                .flatMap(rfp -> {
                    if (!"FAILED".equals(rfp.getStatus())) {
                        return Mono.error(CustomException.badRequest(
                                "재시도는 FAILED 상태에서만 가능합니다 (현재: " + rfp.getStatus() + ")"));
                    }
                    if (!Boolean.TRUE.equals(rfp.getRetryable())) {
                        return Mono.error(CustomException.badRequest(
                                "이 실패는 재시도할 수 없습니다: " + rfp.getFailureReason()));
                    }
                    // FAILED → UPLOADED 전이 후 다시 파싱 트리거
                    rfp.setFailureReason(null);
                    rfp.setFailureReasonDev(null);
                    rfp.setRetryable(false);
                    rfp.setStatus("UPLOADED");
                    rfp.setNew(false);
                    return rfpRepository.save(rfp)
                            .then(Mono.defer(() -> parseRfpContent(rfpId)));
                });
    }

    /**
     * 에러를 사용자 친화적 메시지로 변환.
     */
    private String toUserFriendlyError(Throwable err) {
        String msg = err.getMessage();
        if (msg == null) return "알 수 없는 오류가 발생했습니다.";
        if (msg.contains("timeout") || msg.contains("Timeout")) {
            return "AI 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (msg.contains("Connection refused") || msg.contains("connection")) {
            return "AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (msg.contains("429") || msg.contains("Too Many")) {
            return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (msg.contains("표 구조") || msg.contains("parse error")) {
            return "문서에서 구조를 해석하지 못했습니다. 텍스트 기반 파일로 다시 업로드해 주세요.";
        }
        return "문서 분석 중 오류가 발생했습니다: " + truncate(msg, 100);
    }

    /**
     * 재시도 가능한 에러인지 판단.
     * timeout, 네트워크, 429는 재시도 가능. 파서 오류는 불가.
     */
    private boolean isRetryableError(Throwable err) {
        String msg = err.getMessage();
        if (msg == null) return false;
        return msg.contains("timeout") || msg.contains("Timeout")
                || msg.contains("Connection refused") || msg.contains("connection")
                || msg.contains("429") || msg.contains("Too Many")
                || msg.contains("503") || msg.contains("Service Unavailable");
    }

    private String truncate(String s, int maxLen) {
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "…";
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
                .failureReasonDev(entity.getFailureReasonDev())
                .retryable(entity.getRetryable())
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
