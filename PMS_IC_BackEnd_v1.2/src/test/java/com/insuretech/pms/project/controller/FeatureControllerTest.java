package com.insuretech.pms.project.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.project.dto.FeatureDto;
import com.insuretech.pms.project.service.FeatureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FeatureController.class)
@DisplayName("FeatureController Tests")
class FeatureControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FeatureService featureService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String EPIC_ID = "epic-001";
    private static final String FEATURE_ID = "feature-001";
    private static final String WBS_GROUP_ID = "group-001";

    private FeatureDto testFeature;
    private FeatureDto testFeature2;

    @BeforeEach
    void setUp() {
        testFeature = FeatureDto.builder()
                .id(FEATURE_ID)
                .epicId(EPIC_ID)
                .name("User Authentication")
                .description("Implement user authentication feature")
                .status("OPEN")
                .priority("HIGH")
                .orderNum(0)
                .build();

        testFeature2 = FeatureDto.builder()
                .id("feature-002")
                .epicId(EPIC_ID)
                .wbsGroupId(WBS_GROUP_ID)
                .name("Password Reset")
                .description("Implement password reset feature")
                .status("IN_PROGRESS")
                .priority("MEDIUM")
                .orderNum(1)
                .build();
    }

    @Test
    @WithMockUser
    @DisplayName("GET /epics/{epicId}/features should return features for epic")
    void testGetFeaturesByEpic() throws Exception {
        List<FeatureDto> features = Arrays.asList(testFeature, testFeature2);
        when(featureService.getFeaturesByEpic(EPIC_ID)).thenReturn(features);

        mockMvc.perform(get("/api/epics/{epicId}/features", EPIC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(FEATURE_ID))
                .andExpect(jsonPath("$.data[0].name").value("User Authentication"));

        verify(featureService).getFeaturesByEpic(EPIC_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /wbs/groups/{wbsGroupId}/features should return features for WBS group")
    void testGetFeaturesByWbsGroup() throws Exception {
        List<FeatureDto> features = Arrays.asList(testFeature2);
        when(featureService.getFeaturesByWbsGroup(WBS_GROUP_ID)).thenReturn(features);

        mockMvc.perform(get("/api/wbs/groups/{wbsGroupId}/features", WBS_GROUP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].wbsGroupId").value(WBS_GROUP_ID));

        verify(featureService).getFeaturesByWbsGroup(WBS_GROUP_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /epics/{epicId}/features/unlinked should return unlinked features")
    void testGetUnlinkedFeatures() throws Exception {
        List<FeatureDto> unlinkedFeatures = Arrays.asList(testFeature);
        when(featureService.getUnlinkedFeaturesByEpic(EPIC_ID)).thenReturn(unlinkedFeatures);

        mockMvc.perform(get("/api/epics/{epicId}/features/unlinked", EPIC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].wbsGroupId").doesNotExist());

        verify(featureService).getUnlinkedFeaturesByEpic(EPIC_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /features/{featureId} should return feature by ID")
    void testGetFeature() throws Exception {
        when(featureService.getFeatureById(FEATURE_ID)).thenReturn(testFeature);

        mockMvc.perform(get("/api/features/{featureId}", FEATURE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(FEATURE_ID))
                .andExpect(jsonPath("$.data.name").value("User Authentication"));

        verify(featureService).getFeatureById(FEATURE_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /epics/{epicId}/features should create feature")
    void testCreateFeature() throws Exception {
        when(featureService.createFeature(eq(EPIC_ID), any(FeatureDto.class))).thenReturn(testFeature);

        mockMvc.perform(post("/api/epics/{epicId}/features", EPIC_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testFeature)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(FEATURE_ID));

        verify(featureService).createFeature(eq(EPIC_ID), any(FeatureDto.class));
    }

    @Test
    @WithMockUser(roles = "BUSINESS_ANALYST")
    @DisplayName("POST /epics/{epicId}/features should allow BA to create feature")
    void testCreateFeatureByBA() throws Exception {
        when(featureService.createFeature(eq(EPIC_ID), any(FeatureDto.class))).thenReturn(testFeature);

        mockMvc.perform(post("/api/epics/{epicId}/features", EPIC_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testFeature)))
                .andExpect(status().isCreated());

        verify(featureService).createFeature(eq(EPIC_ID), any(FeatureDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("PUT /features/{featureId} should update feature")
    void testUpdateFeature() throws Exception {
        testFeature.setStatus("IN_PROGRESS");
        when(featureService.updateFeature(eq(FEATURE_ID), any(FeatureDto.class))).thenReturn(testFeature);

        mockMvc.perform(put("/api/features/{featureId}", FEATURE_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testFeature)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        verify(featureService).updateFeature(eq(FEATURE_ID), any(FeatureDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /features/{featureId} should delete feature")
    void testDeleteFeature() throws Exception {
        doNothing().when(featureService).deleteFeature(FEATURE_ID);

        mockMvc.perform(delete("/api/features/{featureId}", FEATURE_ID)
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(featureService).deleteFeature(FEATURE_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /features/{featureId}/link-wbs-group/{wbsGroupId} should link feature to WBS group")
    void testLinkToWbsGroup() throws Exception {
        testFeature.setWbsGroupId(WBS_GROUP_ID);
        when(featureService.linkToWbsGroup(FEATURE_ID, WBS_GROUP_ID)).thenReturn(testFeature);

        mockMvc.perform(post("/api/features/{featureId}/link-wbs-group/{wbsGroupId}", FEATURE_ID, WBS_GROUP_ID)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.wbsGroupId").value(WBS_GROUP_ID));

        verify(featureService).linkToWbsGroup(FEATURE_ID, WBS_GROUP_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /features/{featureId}/link-wbs-group should unlink feature from WBS group")
    void testUnlinkFromWbsGroup() throws Exception {
        testFeature.setWbsGroupId(null);
        when(featureService.unlinkFromWbsGroup(FEATURE_ID)).thenReturn(testFeature);

        mockMvc.perform(delete("/api/features/{featureId}/link-wbs-group", FEATURE_ID)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.wbsGroupId").doesNotExist());

        verify(featureService).unlinkFromWbsGroup(FEATURE_ID);
    }
}
