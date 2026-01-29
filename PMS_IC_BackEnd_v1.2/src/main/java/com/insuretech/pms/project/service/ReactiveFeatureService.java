package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.FeatureDto;
import com.insuretech.pms.project.reactive.entity.R2dbcFeature;
import com.insuretech.pms.project.reactive.repository.ReactiveEpicRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveFeatureRepository;
import com.insuretech.pms.project.reactive.repository.ReactivePartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveFeatureService {

    private final ReactiveFeatureRepository featureRepository;
    private final ReactiveEpicRepository epicRepository;
    private final ReactivePartRepository partRepository;

    public Flux<FeatureDto> getFeaturesByEpic(String epicId) {
        return featureRepository.findByEpicIdOrderByOrderNumAsc(epicId)
                .flatMap(this::enrichWithPartName);
    }

    public Flux<FeatureDto> getFeaturesByPart(String partId) {
        return featureRepository.findByPartIdOrderByOrderNumAsc(partId)
                .flatMap(this::enrichWithPartName);
    }

    public Flux<FeatureDto> getFeaturesByProject(String projectId) {
        return featureRepository.findByProjectIdOrdered(projectId)
                .flatMap(this::enrichWithPartName);
    }

    public Flux<FeatureDto> getUnlinkedFeaturesByEpic(String epicId) {
        return featureRepository.findUnlinkedByEpicId(epicId)
                .flatMap(this::enrichWithPartName);
    }

    public Mono<FeatureDto> getFeatureById(String featureId) {
        return featureRepository.findById(featureId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Feature not found: " + featureId)))
                .flatMap(this::enrichWithPartName);
    }

    @Transactional
    public Mono<FeatureDto> createFeature(String epicId, FeatureDto request) {
        return epicRepository.findById(epicId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Epic not found: " + epicId)))
                .flatMap(epic -> featureRepository.countByEpicId(epicId)
                        .flatMap(count -> {
                            R2dbcFeature feature = R2dbcFeature.builder()
                                    .id(UUID.randomUUID().toString())
                                    .epicId(epicId)
                                    .partId(request.getPartId())
                                    .wbsGroupId(request.getWbsGroupId())
                                    .name(request.getName())
                                    .description(request.getDescription())
                                    .status(request.getStatus() != null ? request.getStatus() : "OPEN")
                                    .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                                    .orderNum(request.getOrderNum() != null ? request.getOrderNum() : count.intValue())
                                    .build();
                            return featureRepository.save(feature);
                        }))
                .flatMap(this::enrichWithPartName)
                .doOnSuccess(dto -> log.info("Created feature: {} for epic: {}", dto.getId(), epicId));
    }

    @Transactional
    public Mono<FeatureDto> updateFeature(String featureId, FeatureDto request) {
        return featureRepository.findById(featureId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Feature not found: " + featureId)))
                .flatMap(feature -> {
                    if (request.getName() != null) feature.setName(request.getName());
                    if (request.getDescription() != null) feature.setDescription(request.getDescription());
                    if (request.getStatus() != null) feature.setStatus(request.getStatus());
                    if (request.getPriority() != null) feature.setPriority(request.getPriority());
                    if (request.getOrderNum() != null) feature.setOrderNum(request.getOrderNum());
                    if (request.getPartId() != null) feature.setPartId(request.getPartId());
                    if (request.getWbsGroupId() != null) feature.setWbsGroupId(request.getWbsGroupId());
                    return featureRepository.save(feature);
                })
                .flatMap(this::enrichWithPartName)
                .doOnSuccess(dto -> log.info("Updated feature: {}", featureId));
    }

    @Transactional
    public Mono<FeatureDto> linkFeatureToWbsGroup(String featureId, String wbsGroupId) {
        return featureRepository.findById(featureId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Feature not found: " + featureId)))
                .flatMap(feature -> {
                    feature.setWbsGroupId(wbsGroupId);
                    return featureRepository.save(feature);
                })
                .flatMap(this::enrichWithPartName)
                .doOnSuccess(dto -> log.info("Linked feature {} to WBS group {}", featureId, wbsGroupId));
    }

    @Transactional
    public Mono<FeatureDto> unlinkFeatureFromWbsGroup(String featureId) {
        return featureRepository.findById(featureId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Feature not found: " + featureId)))
                .flatMap(feature -> {
                    feature.setWbsGroupId(null);
                    return featureRepository.save(feature);
                })
                .flatMap(this::enrichWithPartName)
                .doOnSuccess(dto -> log.info("Unlinked feature {} from WBS group", featureId));
    }

    @Transactional
    public Mono<Void> deleteFeature(String featureId) {
        return featureRepository.findById(featureId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Feature not found: " + featureId)))
                .flatMap(feature -> featureRepository.deleteById(featureId))
                .doOnSuccess(v -> log.info("Deleted feature: {}", featureId));
    }

    private Mono<FeatureDto> enrichWithPartName(R2dbcFeature feature) {
        if (feature.getPartId() == null) {
            return Mono.just(FeatureDto.from(feature));
        }
        return partRepository.findById(feature.getPartId())
                .map(part -> FeatureDto.from(feature, part.getName()))
                .defaultIfEmpty(FeatureDto.from(feature));
    }
}
