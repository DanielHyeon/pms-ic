package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.RfpVersionDto;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfpChangeEvent;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfpVersion;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRfpChangeEventRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRfpRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRfpVersionRepository;
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
public class ReactiveRfpVersionService {

    private final ReactiveRfpVersionRepository versionRepository;
    private final ReactiveRfpRepository rfpRepository;
    private final ReactiveRfpChangeEventRepository changeEventRepository;

    /**
     * List all versions for an RFP, ordered by upload date descending.
     */
    public Flux<RfpVersionDto> listVersions(String rfpId) {
        return versionRepository.findByRfpIdOrderByUploadedAtDesc(rfpId)
                .map(RfpVersionDto::from);
    }

    /**
     * Get a single version by ID.
     */
    public Mono<RfpVersionDto> getVersionById(String versionId) {
        return versionRepository.findById(versionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("RFP version not found: " + versionId)))
                .map(RfpVersionDto::from);
    }

    /**
     * Create a new version. Generates the next version label (v1.0, v1.1, v1.2, ...).
     */
    @Transactional
    public Mono<RfpVersionDto> createVersion(String rfpId, String fileName, String filePath,
                                              String fileType, Long fileSize, String checksum,
                                              String uploadedBy) {
        return generateNextVersionLabel(rfpId)
                .flatMap(label -> {
                    R2dbcRfpVersion version = R2dbcRfpVersion.builder()
                            .id(UUID.randomUUID().toString())
                            .rfpId(rfpId)
                            .versionLabel(label)
                            .fileName(fileName)
                            .filePath(filePath)
                            .fileType(fileType)
                            .fileSize(fileSize)
                            .checksum(checksum)
                            .uploadedBy(uploadedBy)
                            .uploadedAt(LocalDateTime.now())
                            .createdAt(LocalDateTime.now())
                            .build();
                    return versionRepository.save(version);
                })
                .map(RfpVersionDto::from)
                .flatMap(dto -> triggerReanalysisIfConfirmed(rfpId, dto.getId()).thenReturn(dto))
                .doOnSuccess(dto -> log.info("Created RFP version {} for rfp {}", dto.getVersionLabel(), rfpId));
    }

    /**
     * CONFIRMED 상태의 RFP에 새 버전이 업로드되면 NEEDS_REANALYSIS로 자동 전이.
     * 변경 이벤트도 함께 기록한다.
     */
    private Mono<Void> triggerReanalysisIfConfirmed(String rfpId, String newVersionId) {
        return rfpRepository.findById(rfpId)
                .flatMap(rfp -> {
                    if (!"CONFIRMED".equals(rfp.getStatus())) {
                        return Mono.empty();
                    }
                    // 상태 전이: CONFIRMED → NEEDS_REANALYSIS
                    if (!RfpStateMachine.isTransitionAllowed(rfp.getStatus(), "NEEDS_REANALYSIS")) {
                        return Mono.empty();
                    }
                    rfp.setPreviousStatus(rfp.getStatus());
                    rfp.setStatus("NEEDS_REANALYSIS");
                    return rfpRepository.save(rfp)
                            .then(recordChangeEvent(rfpId, newVersionId));
                })
                .then();
    }

    /**
     * 버전 변경에 의한 재분석 필요 이벤트를 rfp_change_events에 기록.
     */
    private Mono<Void> recordChangeEvent(String rfpId, String newVersionId) {
        R2dbcRfpChangeEvent event = R2dbcRfpChangeEvent.builder()
                .id(UUID.randomUUID().toString())
                .rfpId(rfpId)
                .changeType("VERSION_UPDATED")
                .reason("새 버전 업로드로 인한 재분석 필요")
                .toVersionId(newVersionId)
                .changedBy("system")
                .changedAt(LocalDateTime.now())
                .build();
        return changeEventRepository.save(event).then();
    }

    /**
     * Generate the next version label based on the count of existing versions.
     * First version: v1.0, subsequent: v1.1, v1.2, etc.
     */
    private Mono<String> generateNextVersionLabel(String rfpId) {
        return versionRepository.countByRfpId(rfpId)
                .defaultIfEmpty(0L)
                .map(count -> {
                    if (count == 0) {
                        return "v1.0";
                    }
                    return String.format("v1.%d", count);
                });
    }
}
