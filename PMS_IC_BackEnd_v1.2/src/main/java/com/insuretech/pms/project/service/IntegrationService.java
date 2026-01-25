package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.entity.Epic;
import com.insuretech.pms.project.entity.Feature;
import com.insuretech.pms.project.entity.WbsGroup;
import com.insuretech.pms.project.entity.WbsItem;
import com.insuretech.pms.project.repository.*;
import com.insuretech.pms.task.entity.UserStory;
import com.insuretech.pms.task.repository.UserStoryRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final EpicRepository epicRepository;
    private final FeatureRepository featureRepository;
    private final WbsGroupRepository wbsGroupRepository;
    private final WbsItemRepository wbsItemRepository;
    private final UserStoryRepository userStoryRepository;

    // ============ Epic-Phase Integration ============

    @Transactional
    public void linkEpicToPhase(String epicId, String phaseId) {
        Epic epic = epicRepository.findById(epicId)
                .orElseThrow(() -> CustomException.notFound("Epic not found: " + epicId));
        epic.setPhaseId(phaseId);
        epicRepository.save(epic);
    }

    @Transactional
    public void unlinkEpicFromPhase(String epicId) {
        Epic epic = epicRepository.findById(epicId)
                .orElseThrow(() -> CustomException.notFound("Epic not found: " + epicId));
        epic.setPhaseId(null);
        epicRepository.save(epic);
    }

    @Transactional(readOnly = true)
    public List<Epic> getEpicsByPhase(String phaseId) {
        return epicRepository.findByPhaseId(phaseId);
    }

    @Transactional(readOnly = true)
    public List<Epic> getUnlinkedEpics(String projectId) {
        return epicRepository.findUnlinkedByProjectId(projectId);
    }

    // ============ Feature-WbsGroup Integration ============

    @Transactional
    public void linkFeatureToWbsGroup(String featureId, String wbsGroupId) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));
        feature.setWbsGroupId(wbsGroupId);
        featureRepository.save(feature);
    }

    @Transactional
    public void unlinkFeatureFromWbsGroup(String featureId) {
        Feature feature = featureRepository.findById(featureId)
                .orElseThrow(() -> CustomException.notFound("Feature not found: " + featureId));
        feature.setWbsGroupId(null);
        featureRepository.save(feature);
    }

    @Transactional(readOnly = true)
    public List<Feature> getFeaturesByWbsGroup(String wbsGroupId) {
        return featureRepository.findByWbsGroupId(wbsGroupId);
    }

    // ============ Story-WbsItem Integration ============

    @Transactional
    public void linkStoryToWbsItem(String storyId, String wbsItemId) {
        UserStory story = userStoryRepository.findById(storyId)
                .orElseThrow(() -> CustomException.notFound("User Story not found: " + storyId));
        story.setWbsItemId(wbsItemId);
        userStoryRepository.save(story);
    }

    @Transactional
    public void unlinkStoryFromWbsItem(String storyId) {
        UserStory story = userStoryRepository.findById(storyId)
                .orElseThrow(() -> CustomException.notFound("User Story not found: " + storyId));
        story.setWbsItemId(null);
        userStoryRepository.save(story);
    }

    @Transactional(readOnly = true)
    public List<UserStory> getStoriesByWbsItem(String wbsItemId) {
        return userStoryRepository.findByWbsItemId(wbsItemId);
    }

    @Transactional(readOnly = true)
    public List<UserStory> getUnlinkedStories(String projectId) {
        return userStoryRepository.findByProjectIdAndWbsItemIdIsNull(projectId);
    }

    // ============ Phase Integration Summary ============

    @Transactional(readOnly = true)
    public PhaseIntegrationSummary getPhaseIntegrationSummary(String phaseId, String projectId) {
        List<Epic> linkedEpics = epicRepository.findByPhaseId(phaseId);
        List<Epic> allEpics = epicRepository.findByProjectId(projectId);

        List<WbsGroup> wbsGroups = wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(phaseId);

        long totalFeatures = 0;
        long linkedFeatures = 0;
        long totalStories = 0;
        long linkedStories = 0;

        for (Epic epic : linkedEpics) {
            List<Feature> features = featureRepository.findByEpicIdOrderByOrderNumAsc(epic.getId());
            totalFeatures += features.size();
            linkedFeatures += features.stream().filter(f -> f.getWbsGroupId() != null).count();
        }

        for (WbsGroup group : wbsGroups) {
            List<WbsItem> items = wbsItemRepository.findByGroupIdOrderByOrderNumAsc(group.getId());
            for (WbsItem item : items) {
                List<UserStory> stories = userStoryRepository.findByWbsItemId(item.getId());
                linkedStories += stories.size();
            }
        }

        totalStories = userStoryRepository.findByProjectId(projectId).size();

        return PhaseIntegrationSummary.builder()
                .linkedEpics(linkedEpics.stream().map(Epic::getId).collect(Collectors.toList()))
                .totalEpics(allEpics.size())
                .totalFeatures((int) totalFeatures)
                .linkedFeatures((int) linkedFeatures)
                .totalStories((int) totalStories)
                .linkedStories((int) linkedStories)
                .totalWbsGroups(wbsGroups.size())
                .build();
    }

    @Data
    @Builder
    public static class PhaseIntegrationSummary {
        private List<String> linkedEpics;
        private int totalEpics;
        private int totalFeatures;
        private int linkedFeatures;
        private int totalStories;
        private int linkedStories;
        private int totalWbsGroups;
    }
}
