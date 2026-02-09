package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.CreateRfpRequest;
import com.insuretech.pms.rfp.dto.RfpDto;
import com.insuretech.pms.rfp.dto.UpdateRfpRequest;
import com.insuretech.pms.rfp.enums.ProcessingStatus;
import com.insuretech.pms.rfp.enums.RfpStatus;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfp;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRfpRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveRfpService {

    private final ReactiveRfpRepository rfpRepository;
    private final ReactiveRequirementRepository requirementRepository;

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
                .status(request.getStatus() != null ? request.getStatus() : "DRAFT")
                .processingStatus(request.getProcessingStatus() != null ? request.getProcessingStatus() : "PENDING")
                .tenantId(projectId)
                .build();

        return rfpRepository.save(rfp)
                .flatMap(this::toDtoWithCount)
                .doOnSuccess(dto -> log.info("Created RFP: {} for project: {}", dto.getId(), projectId));
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
     * Transition RFP status with state machine validation (design spec section 4).
     */
    @Transactional
    public Mono<Void> updateStatus(String id, String newStatus) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .flatMap(rfp -> {
                    String currentStatus = rfp.getStatus();
                    RfpStateMachine.validateTransition(currentStatus, newStatus);

                    // ON_HOLD: preserve previous status for restoration
                    if ("ON_HOLD".equals(newStatus)) {
                        rfp.setPreviousStatus(currentStatus);
                    }

                    // FAILED: require failure reason (set via separate method)
                    if ("FAILED".equals(newStatus) && rfp.getFailureReason() == null) {
                        log.warn("RFP {} transitioning to FAILED without reason", id);
                    }

                    return rfpRepository.updateStatus(id, newStatus);
                })
                .doOnSuccess(v -> log.info("Updated RFP status: {} to {}", id, newStatus));
    }

    /**
     * Transition with failure reason (for FAILED status).
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
     * Resume from ON_HOLD by restoring previous status.
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

    /**
     * Get allowed next statuses for an RFP.
     */
    public Mono<List<String>> getAllowedTransitions(String id) {
        return rfpRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP not found: " + id)))
                .map(rfp -> RfpStateMachine.getAllowedTransitions(rfp.getStatus()));
    }

    public Mono<Void> updateProcessingStatus(String id, String processingStatus, String message) {
        return rfpRepository.updateProcessingStatus(id, processingStatus, message);
    }

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
