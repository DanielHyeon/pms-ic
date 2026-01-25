package com.insuretech.pms.project.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.project.dto.TemplateSetDto;
import com.insuretech.pms.project.service.TemplateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TemplateController.class)
@DisplayName("TemplateController Tests")
class TemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TemplateService templateService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String TEMPLATE_SET_ID = "template-001";
    private static final String PROJECT_ID = "project-001";

    private TemplateSetDto testTemplateSet;
    private TemplateSetDto testTemplateSet2;

    @BeforeEach
    void setUp() {
        testTemplateSet = TemplateSetDto.builder()
                .id(TEMPLATE_SET_ID)
                .name("Insurance Development Template")
                .description("Standard template for insurance development projects")
                .category("INSURANCE_DEVELOPMENT")
                .status("ACTIVE")
                .version("1.0")
                .isDefault(true)
                .tags(new String[]{"insurance", "development"})
                .build();

        testTemplateSet2 = TemplateSetDto.builder()
                .id("template-002")
                .name("AI Project Template")
                .description("Template for AI/ML projects")
                .category("AI_PROJECT")
                .status("ACTIVE")
                .version("1.0")
                .isDefault(false)
                .tags(new String[]{"ai", "ml"})
                .build();
    }

    @Test
    @WithMockUser
    @DisplayName("GET /templates should return all active template sets")
    void testGetAllTemplateSets() throws Exception {
        List<TemplateSetDto> templates = Arrays.asList(testTemplateSet, testTemplateSet2);
        when(templateService.getAllTemplateSets()).thenReturn(templates);

        mockMvc.perform(get("/api/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(TEMPLATE_SET_ID))
                .andExpect(jsonPath("$.data[0].name").value("Insurance Development Template"));

        verify(templateService).getAllTemplateSets();
    }

    @Test
    @WithMockUser
    @DisplayName("GET /templates/category/{category} should return templates by category")
    void testGetTemplateSetsByCategory() throws Exception {
        List<TemplateSetDto> templates = Arrays.asList(testTemplateSet);
        when(templateService.getTemplateSetsByCategory("INSURANCE_DEVELOPMENT")).thenReturn(templates);

        mockMvc.perform(get("/api/templates/category/{category}", "INSURANCE_DEVELOPMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].category").value("INSURANCE_DEVELOPMENT"));

        verify(templateService).getTemplateSetsByCategory("INSURANCE_DEVELOPMENT");
    }

    @Test
    @WithMockUser
    @DisplayName("GET /templates/{templateSetId} should return template set by ID")
    void testGetTemplateSet() throws Exception {
        when(templateService.getTemplateSetById(TEMPLATE_SET_ID)).thenReturn(testTemplateSet);

        mockMvc.perform(get("/api/templates/{templateSetId}", TEMPLATE_SET_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(TEMPLATE_SET_ID))
                .andExpect(jsonPath("$.data.name").value("Insurance Development Template"))
                .andExpect(jsonPath("$.data.isDefault").value(true));

        verify(templateService).getTemplateSetById(TEMPLATE_SET_ID);
    }

    @Test
    @WithMockUser(roles = "PMO_HEAD")
    @DisplayName("POST /templates should create template set")
    void testCreateTemplateSet() throws Exception {
        when(templateService.createTemplateSet(any(TemplateSetDto.class))).thenReturn(testTemplateSet);

        mockMvc.perform(post("/api/templates")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testTemplateSet)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(TEMPLATE_SET_ID));

        verify(templateService).createTemplateSet(any(TemplateSetDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /templates should allow ADMIN to create template set")
    void testCreateTemplateSetByAdmin() throws Exception {
        when(templateService.createTemplateSet(any(TemplateSetDto.class))).thenReturn(testTemplateSet);

        mockMvc.perform(post("/api/templates")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testTemplateSet)))
                .andExpect(status().isCreated());

        verify(templateService).createTemplateSet(any(TemplateSetDto.class));
    }

    @Test
    @WithMockUser(roles = "PMO_HEAD")
    @DisplayName("DELETE /templates/{templateSetId} should delete template set")
    void testDeleteTemplateSet() throws Exception {
        doNothing().when(templateService).deleteTemplateSet(TEMPLATE_SET_ID);

        mockMvc.perform(delete("/api/templates/{templateSetId}", TEMPLATE_SET_ID)
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(templateService).deleteTemplateSet(TEMPLATE_SET_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /templates/{templateSetId}/apply should apply template to project")
    void testApplyTemplateToProject() throws Exception {
        LocalDate startDate = LocalDate.now();
        doNothing().when(templateService).applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, startDate);

        mockMvc.perform(post("/api/templates/{templateSetId}/apply", TEMPLATE_SET_ID)
                        .with(csrf())
                        .param("projectId", PROJECT_ID)
                        .param("startDate", startDate.toString()))
                .andExpect(status().isOk());

        verify(templateService).applyTemplateToProject(eq(TEMPLATE_SET_ID), eq(PROJECT_ID), any(LocalDate.class));
    }

    @Test
    @WithMockUser(roles = "PMO_HEAD")
    @DisplayName("POST /templates/{templateSetId}/apply should allow PMO_HEAD to apply template")
    void testApplyTemplateToProjectByPMOHead() throws Exception {
        doNothing().when(templateService).applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, null);

        mockMvc.perform(post("/api/templates/{templateSetId}/apply", TEMPLATE_SET_ID)
                        .with(csrf())
                        .param("projectId", PROJECT_ID))
                .andExpect(status().isOk());

        verify(templateService).applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, null);
    }

    @Test
    @WithMockUser(roles = "SPONSOR")
    @DisplayName("POST /templates/{templateSetId}/apply should allow SPONSOR to apply template")
    void testApplyTemplateToProjectBySponsor() throws Exception {
        doNothing().when(templateService).applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, null);

        mockMvc.perform(post("/api/templates/{templateSetId}/apply", TEMPLATE_SET_ID)
                        .with(csrf())
                        .param("projectId", PROJECT_ID))
                .andExpect(status().isOk());

        verify(templateService).applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, null);
    }
}
