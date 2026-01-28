package com.insuretech.pms.project.controller;

import com.insuretech.pms.project.entity.Epic;
import com.insuretech.pms.project.entity.Feature;
import com.insuretech.pms.project.service.IntegrationService;
import com.insuretech.pms.task.entity.UserStory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IntegrationController.class)
@DisplayName("IntegrationController Tests")
class IntegrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IntegrationService integrationService;

    private static final String PROJECT_ID = "project-001";
    private static final String PHASE_ID = "phase-001";
    private static final String EPIC_ID = "epic-001";
    private static final String FEATURE_ID = "feature-001";
    private static final String WBS_GROUP_ID = "group-001";
    private static final String WBS_ITEM_ID = "item-001";
    private static final String STORY_ID = "story-001";

    private Epic testEpic;
    private Feature testFeature;
    private UserStory testStory;
    private IntegrationService.PhaseIntegrationSummary testSummary;

    @BeforeEach
    void setUp() {
        testEpic = new Epic();
        testEpic.setId(EPIC_ID);
        testEpic.setName("Authentication Epic");
        testEpic.setStatus(Epic.EpicStatus.ACTIVE);

        testFeature = new Feature();
        testFeature.setId(FEATURE_ID);
        testFeature.setName("Login Feature");
        testFeature.setStatus(Feature.FeatureStatus.OPEN);

        testStory = new UserStory();
        testStory.setId(STORY_ID);
        testStory.setTitle("User Login Story");

        testSummary = IntegrationService.PhaseIntegrationSummary.builder()
                .linkedEpics(Arrays.asList(EPIC_ID))
                .totalEpics(2)
                .totalFeatures(5)
                .linkedFeatures(3)
                .totalStories(10)
                .linkedStories(6)
                .totalWbsGroups(4)
                .build();
    }

    // ============ Epic-Phase Integration Tests ============

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /integration/epic-phase should link epic to phase")
    void testLinkEpicToPhase() throws Exception {
        doNothing().when(integrationService).linkEpicToPhase(EPIC_ID, PHASE_ID);

        mockMvc.perform(post("/api/integration/epic-phase")
                        .with(csrf())
                        .param("epicId", EPIC_ID)
                        .param("phaseId", PHASE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Epic linked to Phase successfully"));

        verify(integrationService).linkEpicToPhase(EPIC_ID, PHASE_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /integration/epic-phase/{epicId} should unlink epic from phase")
    void testUnlinkEpicFromPhase() throws Exception {
        doNothing().when(integrationService).unlinkEpicFromPhase(EPIC_ID);

        mockMvc.perform(delete("/api/integration/epic-phase/{epicId}", EPIC_ID)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Epic unlinked from Phase successfully"));

        verify(integrationService).unlinkEpicFromPhase(EPIC_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /integration/phases/{phaseId}/epics should return epics by phase")
    void testGetEpicsByPhase() throws Exception {
        List<Epic> epics = Arrays.asList(testEpic);
        when(integrationService.getEpicsByPhase(PHASE_ID)).thenReturn(epics);

        mockMvc.perform(get("/api/integration/phases/{phaseId}/epics", PHASE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(EPIC_ID));

        verify(integrationService).getEpicsByPhase(PHASE_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /integration/projects/{projectId}/epics/unlinked should return unlinked epics")
    void testGetUnlinkedEpics() throws Exception {
        List<Epic> unlinkedEpics = Arrays.asList(testEpic);
        when(integrationService.getUnlinkedEpics(PROJECT_ID)).thenReturn(unlinkedEpics);

        mockMvc.perform(get("/api/integration/projects/{projectId}/epics/unlinked", PROJECT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Authentication Epic"));

        verify(integrationService).getUnlinkedEpics(PROJECT_ID);
    }

    // ============ Feature-WbsGroup Integration Tests ============

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /integration/feature-group should link feature to WBS group")
    void testLinkFeatureToWbsGroup() throws Exception {
        doNothing().when(integrationService).linkFeatureToWbsGroup(FEATURE_ID, WBS_GROUP_ID);

        mockMvc.perform(post("/api/integration/feature-group")
                        .with(csrf())
                        .param("featureId", FEATURE_ID)
                        .param("wbsGroupId", WBS_GROUP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Feature linked to WBS Group successfully"));

        verify(integrationService).linkFeatureToWbsGroup(FEATURE_ID, WBS_GROUP_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /integration/feature-group/{featureId} should unlink feature from WBS group")
    void testUnlinkFeatureFromWbsGroup() throws Exception {
        doNothing().when(integrationService).unlinkFeatureFromWbsGroup(FEATURE_ID);

        mockMvc.perform(delete("/api/integration/feature-group/{featureId}", FEATURE_ID)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Feature unlinked from WBS Group successfully"));

        verify(integrationService).unlinkFeatureFromWbsGroup(FEATURE_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /integration/wbs-groups/{wbsGroupId}/features should return features by WBS group")
    void testGetFeaturesByWbsGroup() throws Exception {
        List<Feature> features = Arrays.asList(testFeature);
        when(integrationService.getFeaturesByWbsGroup(WBS_GROUP_ID)).thenReturn(features);

        mockMvc.perform(get("/api/integration/wbs-groups/{wbsGroupId}/features", WBS_GROUP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(FEATURE_ID));

        verify(integrationService).getFeaturesByWbsGroup(WBS_GROUP_ID);
    }

    // ============ Story-WbsItem Integration Tests ============

    @Test
    @WithMockUser(roles = "DEVELOPER")
    @DisplayName("POST /integration/story-item should link story to WBS item")
    void testLinkStoryToWbsItem() throws Exception {
        doNothing().when(integrationService).linkStoryToWbsItem(STORY_ID, WBS_ITEM_ID);

        mockMvc.perform(post("/api/integration/story-item")
                        .with(csrf())
                        .param("storyId", STORY_ID)
                        .param("wbsItemId", WBS_ITEM_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Story linked to WBS Item successfully"));

        verify(integrationService).linkStoryToWbsItem(STORY_ID, WBS_ITEM_ID);
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    @DisplayName("DELETE /integration/story-item/{storyId} should unlink story from WBS item")
    void testUnlinkStoryFromWbsItem() throws Exception {
        doNothing().when(integrationService).unlinkStoryFromWbsItem(STORY_ID);

        mockMvc.perform(delete("/api/integration/story-item/{storyId}", STORY_ID)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Story unlinked from WBS Item successfully"));

        verify(integrationService).unlinkStoryFromWbsItem(STORY_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /integration/wbs-items/{wbsItemId}/stories should return stories by WBS item")
    void testGetStoriesByWbsItem() throws Exception {
        List<UserStory> stories = Arrays.asList(testStory);
        when(integrationService.getStoriesByWbsItem(WBS_ITEM_ID)).thenReturn(stories);

        mockMvc.perform(get("/api/integration/wbs-items/{wbsItemId}/stories", WBS_ITEM_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(STORY_ID));

        verify(integrationService).getStoriesByWbsItem(WBS_ITEM_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /integration/projects/{projectId}/stories/unlinked should return unlinked stories")
    void testGetUnlinkedStories() throws Exception {
        List<UserStory> unlinkedStories = Arrays.asList(testStory);
        when(integrationService.getUnlinkedStories(PROJECT_ID)).thenReturn(unlinkedStories);

        mockMvc.perform(get("/api/integration/projects/{projectId}/stories/unlinked", PROJECT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].title").value("User Login Story"));

        verify(integrationService).getUnlinkedStories(PROJECT_ID);
    }

    // ============ Integration Summary Test ============

    @Test
    @WithMockUser
    @DisplayName("GET /integration/phases/{phaseId}/summary should return phase integration summary")
    void testGetPhaseIntegrationSummary() throws Exception {
        when(integrationService.getPhaseIntegrationSummary(PHASE_ID, PROJECT_ID)).thenReturn(testSummary);

        mockMvc.perform(get("/api/integration/phases/{phaseId}/summary", PHASE_ID)
                        .param("projectId", PROJECT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalEpics").value(2))
                .andExpect(jsonPath("$.data.linkedEpics.length()").value(1))
                .andExpect(jsonPath("$.data.totalFeatures").value(5))
                .andExpect(jsonPath("$.data.linkedFeatures").value(3))
                .andExpect(jsonPath("$.data.totalStories").value(10))
                .andExpect(jsonPath("$.data.linkedStories").value(6))
                .andExpect(jsonPath("$.data.totalWbsGroups").value(4));

        verify(integrationService).getPhaseIntegrationSummary(PHASE_ID, PROJECT_ID);
    }

    // ============ Authorization Tests ============

    @Test
    @WithMockUser(roles = "SPONSOR")
    @DisplayName("SPONSOR should be able to link epic to phase")
    void testSponsorCanLinkEpicToPhase() throws Exception {
        doNothing().when(integrationService).linkEpicToPhase(EPIC_ID, PHASE_ID);

        mockMvc.perform(post("/api/integration/epic-phase")
                        .with(csrf())
                        .param("epicId", EPIC_ID)
                        .param("phaseId", PHASE_ID))
                .andExpect(status().isOk());

        verify(integrationService).linkEpicToPhase(EPIC_ID, PHASE_ID);
    }

    @Test
    @WithMockUser(roles = "PMO_HEAD")
    @DisplayName("PMO_HEAD should be able to link feature to WBS group")
    void testPMOHeadCanLinkFeatureToWbsGroup() throws Exception {
        doNothing().when(integrationService).linkFeatureToWbsGroup(FEATURE_ID, WBS_GROUP_ID);

        mockMvc.perform(post("/api/integration/feature-group")
                        .with(csrf())
                        .param("featureId", FEATURE_ID)
                        .param("wbsGroupId", WBS_GROUP_ID))
                .andExpect(status().isOk());

        verify(integrationService).linkFeatureToWbsGroup(FEATURE_ID, WBS_GROUP_ID);
    }
}
