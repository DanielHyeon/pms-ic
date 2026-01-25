package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.FeatureDto;
import com.insuretech.pms.project.entity.Epic;
import com.insuretech.pms.project.entity.Feature;
import com.insuretech.pms.project.repository.EpicRepository;
import com.insuretech.pms.project.repository.FeatureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeatureService {

    private final FeatureRepository featureRepository;
    private final EpicRepository epicRepository;

    @Transactional(readOnly = true)
    public List<FeatureDto> getFeaturesByEpic(String epicId) {
        return featureRepository.findByEpicIdOrderByOrderNumAsc(epicId).stream()
                .map(FeatureDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeatureDto> getFeaturesByWbsGroup(String wbsGroupId) {
        return featureRepository.findByWbsGroupId(wbsGroupId).stream()
                .map(FeatureDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeatureDto> getUnlinkedFeaturesByEpic(String epicId) {
        return featureRepository.findUnlinkedByEpicId(epicId).stream()
                .map(FeatureDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FeatureDto getFeatureById(String featureId) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));
        return FeatureDto.from(feature);
    }

    @Transactional
    public FeatureDto createFeature(String epicId, FeatureDto request) {
        Epic epic = epicRepository.findById(epicId)
                .orElseThrow(() -> CustomException.notFound("Epic not found: " + epicId));

        long existingCount = featureRepository.countByEpicId(epicId);

        Feature feature = Feature.builder()
                .epic(epic)
                .name(request.getName())
                .description(request.getDescription())
                .status(parseFeatureStatus(request.getStatus()))
                .priority(parseFeaturePriority(request.getPriority()))
                .orderNum(request.getOrderNum() != null ? request.getOrderNum() : (int) existingCount)
                .wbsGroupId(request.getWbsGroupId())
                .build();

        return FeatureDto.from(featureRepository.save(feature));
    }

    @Transactional
    public FeatureDto updateFeature(String featureId, FeatureDto request) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));

        if (request.getName() != null) feature.setName(request.getName());
        if (request.getDescription() != null) feature.setDescription(request.getDescription());
        if (request.getStatus() != null) feature.setStatus(parseFeatureStatus(request.getStatus()));
        if (request.getPriority() != null) feature.setPriority(parseFeaturePriority(request.getPriority()));
        if (request.getOrderNum() != null) feature.setOrderNum(request.getOrderNum());
        if (request.getWbsGroupId() != null) feature.setWbsGroupId(request.getWbsGroupId());

        return FeatureDto.from(featureRepository.save(feature));
    }

    @Transactional
    public void deleteFeature(String featureId) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));
        featureRepository.delete(feature);
    }

    @Transactional
    public FeatureDto linkToWbsGroup(String featureId, String wbsGroupId) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));
        feature.setWbsGroupId(wbsGroupId);
        return FeatureDto.from(featureRepository.save(feature));
    }

    @Transactional
    public FeatureDto unlinkFromWbsGroup(String featureId) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));
        feature.setWbsGroupId(null);
        return FeatureDto.from(featureRepository.save(feature));
    }

    private Feature.FeatureStatus parseFeatureStatus(String status) {
        if (status == null || status.isBlank()) {
            return Feature.FeatureStatus.OPEN;
        }
        return Feature.FeatureStatus.valueOf(status);
    }

    private Feature.Priority parseFeaturePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            return Feature.Priority.MEDIUM;
        }
        return Feature.Priority.valueOf(priority);
    }
}
