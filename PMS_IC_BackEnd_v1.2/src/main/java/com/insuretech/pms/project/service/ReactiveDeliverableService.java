package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.DeliverableDto;
import com.insuretech.pms.project.reactive.entity.R2dbcDeliverable;
import com.insuretech.pms.project.reactive.entity.R2dbcPhase;
import com.insuretech.pms.project.reactive.repository.ReactiveDeliverableRepository;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDeliverableService {

    private final ReactiveDeliverableRepository deliverableRepository;
    private final ReactivePhaseRepository phaseRepository;
    private final DeliverableOutboxService outboxService;

    public Flux<DeliverableDto> getDeliverablesByPhase(String phaseId) {
        return deliverableRepository.findByPhaseId(phaseId)
                .map(DeliverableDto::from);
    }

    public Mono<DeliverableDto> getDeliverableById(String deliverableId) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .map(DeliverableDto::from);
    }

    /**
     * Create deliverable with RAG indexing outbox event (atomic transaction)
     */
    @Transactional
    public Mono<DeliverableDto> createDeliverable(String phaseId, DeliverableDto request, String uploadedBy) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .flatMap(phase -> {
                    String deliverableId = UUID.randomUUID().toString();
                    R2dbcDeliverable deliverable = R2dbcDeliverable.builder()
                            .id(deliverableId)
                            .phaseId(phaseId)
                            .name(request.getName())
                            .description(request.getDescription())
                            .type(request.getType())
                            .status("PENDING")
                            .fileName(request.getFileName())
                            .fileSize(request.getFileSize())
                            .uploadedBy(uploadedBy)
                            .ragStatus(R2dbcDeliverable.RagStatus.PENDING.name())
                            .ragDocId("deliverable:" + deliverableId)
                            .build();

                    // Save deliverable and create outbox event atomically
                    return deliverableRepository.save(deliverable)
                            .flatMap(saved -> outboxService.createUploadEvent(saved, phase.getProjectId())
                                    .thenReturn(saved));
                })
                .map(DeliverableDto::from)
                .doOnSuccess(dto -> log.info("Created deliverable: {} for phase: {} with RAG indexing event",
                        dto.getId(), phaseId));
    }

    @Transactional
    public Mono<DeliverableDto> updateDeliverable(String deliverableId, DeliverableDto request) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .flatMap(deliverable -> {
                    boolean fileChanged = false;

                    if (request.getName() != null) deliverable.setName(request.getName());
                    if (request.getDescription() != null) deliverable.setDescription(request.getDescription());
                    if (request.getType() != null) deliverable.setType(request.getType());
                    if (request.getStatus() != null) deliverable.setStatus(request.getStatus());

                    // If file changed, trigger version update event
                    if (request.getFileName() != null && !request.getFileName().equals(deliverable.getFileName())) {
                        deliverable.setFileName(request.getFileName());
                        deliverable.setFileSize(request.getFileSize());
                        deliverable.setRagVersion(deliverable.getRagVersion() + 1);
                        deliverable.setRagStatus(R2dbcDeliverable.RagStatus.PENDING.name());
                        fileChanged = true;
                    }

                    final boolean needsReindex = fileChanged;

                    return deliverableRepository.save(deliverable)
                            .flatMap(saved -> {
                                if (needsReindex) {
                                    // Get project ID via phase
                                    return phaseRepository.findById(saved.getPhaseId())
                                            .flatMap(phase -> outboxService.createVersionUpdateEvent(saved, phase.getProjectId()))
                                            .thenReturn(saved);
                                }
                                return Mono.just(saved);
                            });
                })
                .map(DeliverableDto::from)
                .doOnSuccess(dto -> log.info("Updated deliverable: {}", deliverableId));
    }

    /**
     * Approve or reject deliverable with RAG metadata update event (atomic transaction)
     */
    @Transactional
    public Mono<DeliverableDto> approveDeliverable(String deliverableId, boolean approved, String approver) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .flatMap(deliverable -> {
                    deliverable.setStatus(approved ? "APPROVED" : "REJECTED");
                    deliverable.setApprover(approver);
                    deliverable.setApprovedAt(LocalDateTime.now());

                    return deliverableRepository.save(deliverable)
                            .flatMap(saved -> {
                                // Get project ID and create appropriate event
                                return phaseRepository.findById(saved.getPhaseId())
                                        .flatMap(phase -> {
                                            if (approved) {
                                                // Create approval event for RAG metadata update
                                                return outboxService.createApprovalEvent(saved, phase.getProjectId());
                                            } else {
                                                // Create rejection event for RAG metadata update
                                                return outboxService.createRejectionEvent(saved, phase.getProjectId());
                                            }
                                        })
                                        .thenReturn(saved);
                            });
                })
                .map(DeliverableDto::from)
                .doOnSuccess(dto -> log.info("Deliverable {} {}", deliverableId, approved ? "approved" : "rejected"));
    }

    /**
     * Delete deliverable with RAG deletion event (atomic transaction)
     */
    @Transactional
    public Mono<Void> deleteDeliverable(String deliverableId) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .flatMap(deliverable -> {
                    // Get project ID for the delete event
                    return phaseRepository.findById(deliverable.getPhaseId())
                            .flatMap(phase -> {
                                // Create delete event first, then delete the deliverable
                                return outboxService.createDeleteEvent(deliverableId, phase.getProjectId())
                                        .then(deliverableRepository.deleteById(deliverableId));
                            });
                })
                .doOnSuccess(v -> log.info("Deleted deliverable: {} with RAG deletion event", deliverableId));
    }

    /**
     * Get deliverable RAG status
     */
    public Mono<DeliverableDto> getDeliverableWithRagStatus(String deliverableId) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .map(DeliverableDto::from);
    }
}
