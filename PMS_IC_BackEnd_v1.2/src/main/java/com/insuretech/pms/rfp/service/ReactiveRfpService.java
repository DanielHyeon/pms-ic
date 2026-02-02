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
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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
                .flatMap(rfp -> rfpRepository.delete(rfp))
                .doOnSuccess(v -> log.info("Deleted RFP: {}", id));
    }

    public Mono<Void> updateStatus(String id, String status) {
        return rfpRepository.updateStatus(id, status)
                .doOnSuccess(v -> log.info("Updated RFP status: {} to {}", id, status));
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
