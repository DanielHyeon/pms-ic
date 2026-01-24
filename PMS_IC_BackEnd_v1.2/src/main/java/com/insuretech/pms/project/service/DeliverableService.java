package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.common.service.FileStorageService;
import com.insuretech.pms.common.service.FileStorageService.StorageResult;
import com.insuretech.pms.project.dto.DeliverableDto;
import com.insuretech.pms.project.dto.DeliverableUploadRequest;
import com.insuretech.pms.project.entity.Deliverable;
import com.insuretech.pms.project.entity.Phase;
import com.insuretech.pms.project.entity.ProjectMember;
import com.insuretech.pms.project.entity.ProjectMember.ProjectRole;
import com.insuretech.pms.project.repository.DeliverableRepository;
import com.insuretech.pms.project.repository.PhaseRepository;
import com.insuretech.pms.project.repository.ProjectMemberRepository;
import com.insuretech.pms.rag.service.RAGIndexingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliverableService {

    private static final String DELIVERABLES_SUBDIRECTORY = "deliverables";

    private final DeliverableRepository deliverableRepository;
    private final PhaseRepository phaseRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final RAGIndexingService ragIndexingService;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<DeliverableDto> getDeliverablesByPhase(String phaseId) {
        ensurePhaseExists(phaseId);
        return deliverableRepository.findByPhaseId(phaseId).stream()
                .map(DeliverableDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Upload a deliverable with consolidated request parameters.
     *
     * @param phaseId The phase ID
     * @param file The file to upload
     * @param request Upload request containing name, description, type, etc.
     * @return The uploaded deliverable DTO
     */
    @Transactional
    public DeliverableDto uploadDeliverable(String phaseId, MultipartFile file, DeliverableUploadRequest request) {
        return uploadDeliverableInternal(
                phaseId,
                request.getDeliverableId(),
                file,
                request.getName(),
                request.getDescription(),
                request.getType(),
                request.getUploadedBy()
        );
    }

    /**
     * @deprecated Use {@link #uploadDeliverable(String, MultipartFile, DeliverableUploadRequest)} instead
     */
    @Deprecated
    @Transactional
    public DeliverableDto uploadDeliverable(
            String phaseId,
            String deliverableId,
            MultipartFile file,
            String name,
            String description,
            String type,
            String uploadedBy
    ) {
        return uploadDeliverableInternal(phaseId, deliverableId, file, name, description, type, uploadedBy);
    }

    private DeliverableDto uploadDeliverableInternal(
            String phaseId,
            String deliverableId,
            MultipartFile file,
            String name,
            String description,
            String type,
            String uploadedBy
    ) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + phaseId));

        Deliverable deliverable = resolveDeliverable(deliverableId, phase, name, description, type);

        // Use common FileStorageService for file storage
        StorageResult storageResult = fileStorageService.storeFile(file, DELIVERABLES_SUBDIRECTORY);

        deliverable.setFileName(storageResult.getOriginalFileName());
        deliverable.setFilePath(storageResult.getFilePath());
        deliverable.setFileSize(storageResult.getFileSize());
        deliverable.setUploadedBy(uploadedBy);
        deliverable.setStatus(Deliverable.DeliverableStatus.IN_REVIEW);

        Deliverable saved = deliverableRepository.save(deliverable);
        log.info("Deliverable uploaded: {} (phase={})", saved.getId(), phaseId);

        // Trigger RAG indexing asynchronously
        Path filePath = Paths.get(storageResult.getFilePath());
        triggerRAGIndexing(saved, phase, uploadedBy, filePath);

        return DeliverableDto.from(saved);
    }

    /**
     * Trigger RAG indexing for uploaded deliverable with access control metadata
     */
    private void triggerRAGIndexing(Deliverable deliverable, Phase phase, String uploadedBy, Path filePath) {
        try {
            String projectId = phase.getProject().getId();

            // Get uploader's project role for access control
            ProjectRole uploaderRole = projectMemberRepository
                    .findByProjectIdAndUserId(projectId, uploadedBy)
                    .map(ProjectMember::getRole)
                    .orElse(ProjectRole.MEMBER);

            // Build metadata
            Map<String, String> metadata = new HashMap<>();
            metadata.put("title", deliverable.getFileName());
            metadata.put("phase_id", phase.getId());
            metadata.put("phase_name", phase.getName());
            metadata.put("project_id", projectId);
            metadata.put("project_name", phase.getProject().getName());
            metadata.put("file_type", fileStorageService.getFileExtension(deliverable.getFileName()));
            metadata.put("category", deliverable.getType() != null ? deliverable.getType().name() : "DOCUMENT");
            metadata.put("created_at", LocalDateTime.now().toString());

            // Index with access control
            boolean indexed = ragIndexingService.indexFile(
                    deliverable.getId(),
                    filePath,
                    metadata,
                    projectId,
                    uploadedBy,
                    uploaderRole
            );

            if (indexed) {
                log.info("RAG indexing successful for deliverable: {} (project={}, role={})",
                        deliverable.getId(), projectId, uploaderRole);
            } else {
                log.warn("RAG indexing returned false for deliverable: {}", deliverable.getId());
            }

        } catch (Exception e) {
            // Don't fail the upload if RAG indexing fails
            log.error("RAG indexing failed for deliverable: {}", deliverable.getId(), e);
        }
    }

    @Transactional
    public DeliverableDto updateDeliverable(String phaseId, String deliverableId, String name, String description, String status) {
        ensurePhaseExists(phaseId);
        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> CustomException.notFound("Deliverable not found: " + deliverableId));

        if (!deliverable.getPhase().getId().equals(phaseId)) {
            throw CustomException.badRequest("Phase ID does not match deliverable.");
        }

        if (name != null && !name.isBlank()) {
            deliverable.setName(name);
        }
        if (description != null) {
            deliverable.setDescription(description);
        }
        if (status != null && !status.isBlank()) {
            deliverable.setStatus(Deliverable.DeliverableStatus.valueOf(status));
        }

        Deliverable saved = deliverableRepository.save(deliverable);
        log.info("Deliverable updated: {} (phase={})", saved.getId(), phaseId);
        return DeliverableDto.from(saved);
    }

    @Transactional
    public DeliverableDto approveDeliverable(String deliverableId, boolean approved, String approver) {
        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> CustomException.notFound("Deliverable not found: " + deliverableId));

        deliverable.setStatus(approved ? Deliverable.DeliverableStatus.APPROVED : Deliverable.DeliverableStatus.REJECTED);
        deliverable.setApprover(approver);
        deliverable.setApprovedAt(LocalDateTime.now());

        Deliverable saved = deliverableRepository.save(deliverable);
        log.info("Deliverable approval updated: {} -> {}", saved.getId(), saved.getStatus());
        return DeliverableDto.from(saved);
    }

    @Transactional(readOnly = true)
    public Deliverable getDeliverable(String deliverableId) {
        return deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> CustomException.notFound("Deliverable not found: " + deliverableId));
    }

    @Transactional(readOnly = true)
    public Resource loadDeliverableFile(Deliverable deliverable) {
        if (deliverable.getFilePath() == null) {
            throw CustomException.badRequest("File has not been uploaded.");
        }
        return fileStorageService.loadFile(deliverable.getFilePath());
    }

    private void ensurePhaseExists(String phaseId) {
        if (!phaseRepository.existsById(phaseId)) {
            throw CustomException.notFound("Phase not found: " + phaseId);
        }
    }

    private Deliverable resolveDeliverable(
            String deliverableId,
            Phase phase,
            String name,
            String description,
            String type
    ) {
        if (deliverableId != null && !deliverableId.isBlank()) {
            Deliverable existing = deliverableRepository.findById(deliverableId)
                    .orElseThrow(() -> CustomException.notFound("Deliverable not found: " + deliverableId));
            if (!existing.getPhase().getId().equals(phase.getId())) {
                throw CustomException.badRequest("Phase ID does not match deliverable.");
            }
            if (name != null && !name.isBlank()) {
                existing.setName(name);
            }
            if (description != null) {
                existing.setDescription(description);
            }
            if (type != null && !type.isBlank()) {
                existing.setType(Deliverable.DeliverableType.valueOf(type));
            }
            return existing;
        }

        if (name == null || name.isBlank()) {
            throw CustomException.badRequest("Deliverable name is required.");
        }

        Deliverable.DeliverableType deliverableType = Deliverable.DeliverableType.DOCUMENT;
        if (type != null && !type.isBlank()) {
            deliverableType = Deliverable.DeliverableType.valueOf(type);
        }

        return Deliverable.builder()
                .phase(phase)
                .name(name)
                .description(description)
                .type(deliverableType)
                .status(Deliverable.DeliverableStatus.PENDING)
                .build();
    }
}
