package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.DeliverableDto;
import com.insuretech.pms.project.reactive.entity.R2dbcDeliverable;
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

    public Flux<DeliverableDto> getDeliverablesByPhase(String phaseId) {
        return deliverableRepository.findByPhaseId(phaseId)
                .map(DeliverableDto::from);
    }

    public Mono<DeliverableDto> getDeliverableById(String deliverableId) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .map(DeliverableDto::from);
    }

    @Transactional
    public Mono<DeliverableDto> createDeliverable(String phaseId, DeliverableDto request, String uploadedBy) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .flatMap(phase -> {
                    R2dbcDeliverable deliverable = R2dbcDeliverable.builder()
                            .id(UUID.randomUUID().toString())
                            .phaseId(phaseId)
                            .name(request.getName())
                            .description(request.getDescription())
                            .type(request.getType())
                            .status("PENDING")
                            .fileName(request.getFileName())
                            .fileSize(request.getFileSize())
                            .uploadedBy(uploadedBy)
                            .build();
                    return deliverableRepository.save(deliverable);
                })
                .map(DeliverableDto::from)
                .doOnSuccess(dto -> log.info("Created deliverable: {} for phase: {}", dto.getId(), phaseId));
    }

    @Transactional
    public Mono<DeliverableDto> updateDeliverable(String deliverableId, DeliverableDto request) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .flatMap(deliverable -> {
                    if (request.getName() != null) deliverable.setName(request.getName());
                    if (request.getDescription() != null) deliverable.setDescription(request.getDescription());
                    if (request.getType() != null) deliverable.setType(request.getType());
                    if (request.getStatus() != null) deliverable.setStatus(request.getStatus());
                    return deliverableRepository.save(deliverable);
                })
                .map(DeliverableDto::from)
                .doOnSuccess(dto -> log.info("Updated deliverable: {}", deliverableId));
    }

    @Transactional
    public Mono<DeliverableDto> approveDeliverable(String deliverableId, boolean approved, String approver) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .flatMap(deliverable -> {
                    deliverable.setStatus(approved ? "APPROVED" : "REJECTED");
                    deliverable.setApprover(approver);
                    deliverable.setApprovedAt(LocalDateTime.now());
                    return deliverableRepository.save(deliverable);
                })
                .map(DeliverableDto::from)
                .doOnSuccess(dto -> log.info("Deliverable {} {}", deliverableId, approved ? "approved" : "rejected"));
    }

    @Transactional
    public Mono<Void> deleteDeliverable(String deliverableId) {
        return deliverableRepository.findById(deliverableId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Deliverable not found: " + deliverableId)))
                .flatMap(deliverable -> deliverableRepository.deleteById(deliverableId))
                .doOnSuccess(v -> log.info("Deleted deliverable: {}", deliverableId));
    }
}
