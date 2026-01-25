package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.entity.*;
import com.insuretech.pms.project.repository.*;
import com.insuretech.pms.task.entity.UserStory;
import com.insuretech.pms.task.repository.UserStoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("IntegrationService Tests")
class IntegrationServiceTest {

    @Mock
    private EpicRepository epicRepository;

    @Mock
    private FeatureRepository featureRepository;

    @Mock
    private WbsGroupRepository wbsGroupRepository;

    @Mock
    private WbsItemRepository wbsItemRepository;

    @Mock
    private UserStoryRepository userStoryRepository;

    @InjectMocks
    private IntegrationService integrationService;

    private static final String PROJECT_ID = "project-001";
    private static final String PHASE_ID = "phase-001";
    private static final String EPIC_ID = "epic-001";
    private static final String FEATURE_ID = "feature-001";
    private static final String WBS_GROUP_ID = "wbs-group-001";
    private static final String WBS_ITEM_ID = "wbs-item-001";
    private static final String STORY_ID = "story-001";

    private Epic testEpic;
    private Feature testFeature;
    private WbsGroup testWbsGroup;
    private WbsItem testWbsItem;
    private UserStory testStory;

    @BeforeEach
    void setUp() {
        testEpic = Epic.builder()
                .id(EPIC_ID)
                .name("Test Epic")
                .projectId(PROJECT_ID)
                .build();

        testFeature = Feature.builder()
                .id(FEATURE_ID)
                .name("Test Feature")
                .build();

        testWbsGroup = WbsGroup.builder()
                .id(WBS_GROUP_ID)
                .name("Test WBS Group")
                .build();

        testWbsItem = WbsItem.builder()
                .id(WBS_ITEM_ID)
                .group(testWbsGroup)
                .name("Test WBS Item")
                .build();

        testStory = UserStory.builder()
                .id(STORY_ID)
                .title("Test Story")
                .projectId(PROJECT_ID)
                .build();
    }

    @Nested
    @DisplayName("Epic-Phase Integration")
    class EpicPhaseIntegrationTests {

        @Test
        @DisplayName("Should link epic to phase")
        void shouldLinkEpicToPhase() {
            when(epicRepository.findById(EPIC_ID)).thenReturn(Optional.of(testEpic));
            when(epicRepository.save(any(Epic.class))).thenReturn(testEpic);

            integrationService.linkEpicToPhase(EPIC_ID, PHASE_ID);

            verify(epicRepository, times(1)).save(argThat(epic ->
                    PHASE_ID.equals(epic.getPhaseId())
            ));
        }

        @Test
        @DisplayName("Should unlink epic from phase")
        void shouldUnlinkEpicFromPhase() {
            testEpic.setPhaseId(PHASE_ID);

            when(epicRepository.findById(EPIC_ID)).thenReturn(Optional.of(testEpic));
            when(epicRepository.save(any(Epic.class))).thenReturn(testEpic);

            integrationService.unlinkEpicFromPhase(EPIC_ID);

            verify(epicRepository, times(1)).save(argThat(epic ->
                    epic.getPhaseId() == null
            ));
        }

        @Test
        @DisplayName("Should throw exception when linking non-existent epic")
        void shouldThrowExceptionWhenLinkingNonExistentEpic() {
            when(epicRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> integrationService.linkEpicToPhase("non-existent", PHASE_ID))
                    .isInstanceOf(CustomException.class);
        }

        @Test
        @DisplayName("Should get epics by phase")
        void shouldGetEpicsByPhase() {
            testEpic.setPhaseId(PHASE_ID);

            when(epicRepository.findByPhaseId(PHASE_ID))
                    .thenReturn(Arrays.asList(testEpic));

            List<Epic> result = integrationService.getEpicsByPhase(PHASE_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(EPIC_ID);
        }

        @Test
        @DisplayName("Should get unlinked epics")
        void shouldGetUnlinkedEpics() {
            when(epicRepository.findUnlinkedByProjectId(PROJECT_ID))
                    .thenReturn(Arrays.asList(testEpic));

            List<Epic> result = integrationService.getUnlinkedEpics(PROJECT_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getPhaseId()).isNull();
        }
    }

    @Nested
    @DisplayName("Feature-WbsGroup Integration")
    class FeatureWbsGroupIntegrationTests {

        @Test
        @DisplayName("Should link feature to WBS group")
        void shouldLinkFeatureToWbsGroup() {
            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            when(featureRepository.save(any(Feature.class))).thenReturn(testFeature);

            integrationService.linkFeatureToWbsGroup(FEATURE_ID, WBS_GROUP_ID);

            verify(featureRepository, times(1)).save(argThat(feature ->
                    WBS_GROUP_ID.equals(feature.getWbsGroupId())
            ));
        }

        @Test
        @DisplayName("Should unlink feature from WBS group")
        void shouldUnlinkFeatureFromWbsGroup() {
            testFeature.setWbsGroupId(WBS_GROUP_ID);

            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            when(featureRepository.save(any(Feature.class))).thenReturn(testFeature);

            integrationService.unlinkFeatureFromWbsGroup(FEATURE_ID);

            verify(featureRepository, times(1)).save(argThat(feature ->
                    feature.getWbsGroupId() == null
            ));
        }

        @Test
        @DisplayName("Should throw exception when linking non-existent feature")
        void shouldThrowExceptionWhenLinkingNonExistentFeature() {
            when(featureRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> integrationService.linkFeatureToWbsGroup("non-existent", WBS_GROUP_ID))
                    .isInstanceOf(CustomException.class);
        }

        @Test
        @DisplayName("Should get features by WBS group")
        void shouldGetFeaturesByWbsGroup() {
            testFeature.setWbsGroupId(WBS_GROUP_ID);

            when(featureRepository.findByWbsGroupId(WBS_GROUP_ID))
                    .thenReturn(Arrays.asList(testFeature));

            List<Feature> result = integrationService.getFeaturesByWbsGroup(WBS_GROUP_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getWbsGroupId()).isEqualTo(WBS_GROUP_ID);
        }
    }

    @Nested
    @DisplayName("Story-WbsItem Integration")
    class StoryWbsItemIntegrationTests {

        @Test
        @DisplayName("Should link story to WBS item")
        void shouldLinkStoryToWbsItem() {
            when(userStoryRepository.findById(STORY_ID)).thenReturn(Optional.of(testStory));
            when(userStoryRepository.save(any(UserStory.class))).thenReturn(testStory);

            integrationService.linkStoryToWbsItem(STORY_ID, WBS_ITEM_ID);

            verify(userStoryRepository, times(1)).save(argThat(story ->
                    WBS_ITEM_ID.equals(story.getWbsItemId())
            ));
        }

        @Test
        @DisplayName("Should unlink story from WBS item")
        void shouldUnlinkStoryFromWbsItem() {
            testStory.setWbsItemId(WBS_ITEM_ID);

            when(userStoryRepository.findById(STORY_ID)).thenReturn(Optional.of(testStory));
            when(userStoryRepository.save(any(UserStory.class))).thenReturn(testStory);

            integrationService.unlinkStoryFromWbsItem(STORY_ID);

            verify(userStoryRepository, times(1)).save(argThat(story ->
                    story.getWbsItemId() == null
            ));
        }

        @Test
        @DisplayName("Should throw exception when linking non-existent story")
        void shouldThrowExceptionWhenLinkingNonExistentStory() {
            when(userStoryRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> integrationService.linkStoryToWbsItem("non-existent", WBS_ITEM_ID))
                    .isInstanceOf(CustomException.class);
        }

        @Test
        @DisplayName("Should get stories by WBS item")
        void shouldGetStoriesByWbsItem() {
            testStory.setWbsItemId(WBS_ITEM_ID);

            when(userStoryRepository.findByWbsItemId(WBS_ITEM_ID))
                    .thenReturn(Arrays.asList(testStory));

            List<UserStory> result = integrationService.getStoriesByWbsItem(WBS_ITEM_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getWbsItemId()).isEqualTo(WBS_ITEM_ID);
        }

        @Test
        @DisplayName("Should get unlinked stories")
        void shouldGetUnlinkedStories() {
            when(userStoryRepository.findByProjectIdAndWbsItemIdIsNull(PROJECT_ID))
                    .thenReturn(Arrays.asList(testStory));

            List<UserStory> result = integrationService.getUnlinkedStories(PROJECT_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getWbsItemId()).isNull();
        }
    }

    @Nested
    @DisplayName("Phase Integration Summary")
    class PhaseIntegrationSummaryTests {

        @Test
        @DisplayName("Should get phase integration summary")
        void shouldGetPhaseIntegrationSummary() {
            testEpic.setPhaseId(PHASE_ID);
            Epic epicWithFeature = Epic.builder()
                    .id(EPIC_ID)
                    .name("Epic with Feature")
                    .projectId(PROJECT_ID)
                    .phaseId(PHASE_ID)
                    .build();

            Feature linkedFeature = Feature.builder()
                    .id(FEATURE_ID)
                    .name("Linked Feature")
                    .wbsGroupId(WBS_GROUP_ID)
                    .build();

            when(epicRepository.findByPhaseId(PHASE_ID))
                    .thenReturn(Arrays.asList(epicWithFeature));
            when(epicRepository.findByProjectId(PROJECT_ID))
                    .thenReturn(Arrays.asList(epicWithFeature));
            when(wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(PHASE_ID))
                    .thenReturn(Arrays.asList(testWbsGroup));
            when(featureRepository.findByEpicIdOrderByOrderNumAsc(EPIC_ID))
                    .thenReturn(Arrays.asList(linkedFeature));
            when(wbsItemRepository.findByGroupIdOrderByOrderNumAsc(WBS_GROUP_ID))
                    .thenReturn(Arrays.asList(testWbsItem));
            when(userStoryRepository.findByWbsItemId(WBS_ITEM_ID))
                    .thenReturn(Arrays.asList(testStory));
            when(userStoryRepository.findByProjectId(PROJECT_ID))
                    .thenReturn(Arrays.asList(testStory));

            IntegrationService.PhaseIntegrationSummary result =
                    integrationService.getPhaseIntegrationSummary(PHASE_ID, PROJECT_ID);

            assertThat(result).isNotNull();
            assertThat(result.getTotalEpics()).isEqualTo(1);
            assertThat(result.getLinkedEpics()).hasSize(1);
            assertThat(result.getTotalFeatures()).isEqualTo(1);
            assertThat(result.getLinkedFeatures()).isEqualTo(1);
            assertThat(result.getTotalWbsGroups()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should handle empty phase with no links")
        void shouldHandleEmptyPhase() {
            when(epicRepository.findByPhaseId(PHASE_ID))
                    .thenReturn(Collections.emptyList());
            when(epicRepository.findByProjectId(PROJECT_ID))
                    .thenReturn(Collections.emptyList());
            when(wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(PHASE_ID))
                    .thenReturn(Collections.emptyList());
            when(userStoryRepository.findByProjectId(PROJECT_ID))
                    .thenReturn(Collections.emptyList());

            IntegrationService.PhaseIntegrationSummary result =
                    integrationService.getPhaseIntegrationSummary(PHASE_ID, PROJECT_ID);

            assertThat(result).isNotNull();
            assertThat(result.getTotalEpics()).isEqualTo(0);
            assertThat(result.getLinkedEpics()).isEmpty();
            assertThat(result.getTotalFeatures()).isEqualTo(0);
            assertThat(result.getTotalWbsGroups()).isEqualTo(0);
        }
    }
}
