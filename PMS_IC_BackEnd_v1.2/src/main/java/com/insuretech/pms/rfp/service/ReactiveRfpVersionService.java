package com.insuretech.pms.rfp.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.rfp.dto.RfpVersionDto;
import com.insuretech.pms.rfp.reactive.entity.R2dbcRfpVersion;
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
                .doOnSuccess(dto -> log.info("Created RFP version {} for rfp {}", dto.getVersionLabel(), rfpId));
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
