package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.TemplateSetDto;
import com.insuretech.pms.project.entity.*;
import com.insuretech.pms.project.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TemplateService Tests")
class TemplateServiceTest {

    @Mock
    private TemplateSetRepository templateSetRepository;

    @Mock
    private PhaseTemplateRepository phaseTemplateRepository;

    @Mock
    private WbsGroupTemplateRepository wbsGroupTemplateRepository;

    @Mock
    private WbsItemTemplateRepository wbsItemTemplateRepository;

    @Mock
    private PhaseRepository phaseRepository;

    @Mock
    private WbsGroupRepository wbsGroupRepository;

    @Mock
    private WbsItemRepository wbsItemRepository;

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private TemplateService templateService;

    private static final String TEMPLATE_SET_ID = "template-001";
    private static final String PROJECT_ID = "project-001";
    private static final String PHASE_TEMPLATE_ID = "phase-tmpl-001";
    private static final String GROUP_TEMPLATE_ID = "group-tmpl-001";

    private TemplateSet testTemplateSet;
    private PhaseTemplate testPhaseTemplate;
    private WbsGroupTemplate testGroupTemplate;
    private WbsItemTemplate testItemTemplate;
    private Project testProject;

    @BeforeEach
    void setUp() {
        testTemplateSet = TemplateSet.builder()
                .id(TEMPLATE_SET_ID)
                .name("Insurance Claims Template")
                .description("Standard template for insurance claims projects")
                .category(TemplateSet.TemplateCategory.INSURANCE_DEVELOPMENT)
                .status(TemplateSet.TemplateStatus.ACTIVE)
                .version("1.0")
                .isDefault(false)
                .build();

        testPhaseTemplate = PhaseTemplate.builder()
                .id(PHASE_TEMPLATE_ID)
                .templateSet(testTemplateSet)
                .name("Analysis Phase")
                .description("Requirements analysis phase")
                .relativeOrder(0)
                .defaultDurationDays(30)
                .build();

        testGroupTemplate = WbsGroupTemplate.builder()
                .id(GROUP_TEMPLATE_ID)
                .phaseTemplate(testPhaseTemplate)
                .name("Requirements Gathering")
                .description("Gather and document requirements")
                .relativeOrder(0)
                .defaultWeight(100)
                .build();

        testItemTemplate = WbsItemTemplate.builder()
                .id("item-tmpl-001")
                .groupTemplate(testGroupTemplate)
                .name("Stakeholder Interviews")
                .relativeOrder(0)
                .defaultWeight(100)
                .estimatedHours(16)
                .build();

        testProject = Project.builder()
                .id(PROJECT_ID)
                .name("Test Project")
                .build();
    }

    @Nested
    @DisplayName("Get Template Sets")
    class GetTemplateSetsTests {

        @Test
        @DisplayName("Should get all active template sets")
        void shouldGetAllActiveTemplateSets() {
            when(templateSetRepository.findByStatus(TemplateSet.TemplateStatus.ACTIVE))
                    .thenReturn(Arrays.asList(testTemplateSet));
            when(phaseTemplateRepository.findByTemplateSetIdOrderByRelativeOrderAsc(TEMPLATE_SET_ID))
                    .thenReturn(Collections.emptyList());

            List<TemplateSetDto> result = templateService.getAllTemplateSets();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Insurance Claims Template");
        }

        @Test
        @DisplayName("Should get template sets by category")
        void shouldGetTemplateSetsByCategory() {
            when(templateSetRepository.findByCategoryAndStatus(
                    TemplateSet.TemplateCategory.INSURANCE_DEVELOPMENT,
                    TemplateSet.TemplateStatus.ACTIVE))
                    .thenReturn(Arrays.asList(testTemplateSet));
            when(phaseTemplateRepository.findByTemplateSetIdOrderByRelativeOrderAsc(TEMPLATE_SET_ID))
                    .thenReturn(Collections.emptyList());

            List<TemplateSetDto> result = templateService.getTemplateSetsByCategory("INSURANCE_DEVELOPMENT");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCategory()).isEqualTo("INSURANCE_DEVELOPMENT");
        }

        @Test
        @DisplayName("Should get template set by ID with details")
        void shouldGetTemplateSetByIdWithDetails() {
            when(templateSetRepository.findById(TEMPLATE_SET_ID))
                    .thenReturn(Optional.of(testTemplateSet));
            when(phaseTemplateRepository.findByTemplateSetIdOrderByRelativeOrderAsc(TEMPLATE_SET_ID))
                    .thenReturn(Arrays.asList(testPhaseTemplate));
            when(wbsGroupTemplateRepository.findByPhaseTemplateIdOrderByRelativeOrderAsc(PHASE_TEMPLATE_ID))
                    .thenReturn(Arrays.asList(testGroupTemplate));
            when(wbsItemTemplateRepository.findByGroupTemplateIdOrderByRelativeOrderAsc(GROUP_TEMPLATE_ID))
                    .thenReturn(Arrays.asList(testItemTemplate));

            TemplateSetDto result = templateService.getTemplateSetById(TEMPLATE_SET_ID);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Insurance Claims Template");
            assertThat(result.getPhases()).hasSize(1);
            assertThat(result.getPhases().get(0).getWbsGroups()).hasSize(1);
        }

        @Test
        @DisplayName("Should throw exception when template set not found")
        void shouldThrowExceptionWhenNotFound() {
            when(templateSetRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> templateService.getTemplateSetById("non-existent"))
                    .isInstanceOf(CustomException.class);
        }
    }

    @Nested
    @DisplayName("Create Template Set")
    class CreateTemplateSetTests {

        @Test
        @DisplayName("Should create new template set")
        void shouldCreateTemplateSet() {
            TemplateSetDto request = TemplateSetDto.builder()
                    .name("New Template")
                    .description("A new project template")
                    .category("CUSTOM")
                    .build();

            when(templateSetRepository.save(any(TemplateSet.class))).thenAnswer(invocation -> {
                TemplateSet saved = invocation.getArgument(0);
                saved.setId("template-new");
                return saved;
            });

            TemplateSetDto result = templateService.createTemplateSet(request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("New Template");
            assertThat(result.getVersion()).isEqualTo("1.0");
            verify(templateSetRepository, times(1)).save(any(TemplateSet.class));
        }

        @Test
        @DisplayName("Should create template set with custom version")
        void shouldCreateTemplateSetWithCustomVersion() {
            TemplateSetDto request = TemplateSetDto.builder()
                    .name("Versioned Template")
                    .category("INSURANCE_DEVELOPMENT")
                    .version("2.0")
                    .isDefault(true)
                    .build();

            when(templateSetRepository.save(any(TemplateSet.class))).thenAnswer(invocation -> {
                TemplateSet saved = invocation.getArgument(0);
                saved.setId("template-new");
                return saved;
            });

            TemplateSetDto result = templateService.createTemplateSet(request);

            assertThat(result).isNotNull();
            verify(templateSetRepository, times(1)).save(argThat(ts ->
                    "2.0".equals(ts.getVersion()) && ts.getIsDefault()
            ));
        }
    }

    @Nested
    @DisplayName("Delete Template Set")
    class DeleteTemplateSetTests {

        @Test
        @DisplayName("Should delete template set")
        void shouldDeleteTemplateSet() {
            when(templateSetRepository.findById(TEMPLATE_SET_ID))
                    .thenReturn(Optional.of(testTemplateSet));
            doNothing().when(templateSetRepository).delete(testTemplateSet);

            templateService.deleteTemplateSet(TEMPLATE_SET_ID);

            verify(templateSetRepository, times(1)).delete(testTemplateSet);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent template")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            when(templateSetRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> templateService.deleteTemplateSet("non-existent"))
                    .isInstanceOf(CustomException.class);
        }
    }

    @Nested
    @DisplayName("Apply Template to Project")
    class ApplyTemplateTests {

        @Test
        @DisplayName("Should apply template to project")
        void shouldApplyTemplateToProject() {
            LocalDate startDate = LocalDate.of(2026, 1, 1);

            when(templateSetRepository.findById(TEMPLATE_SET_ID))
                    .thenReturn(Optional.of(testTemplateSet));
            when(projectRepository.findById(PROJECT_ID))
                    .thenReturn(Optional.of(testProject));
            when(phaseTemplateRepository.findByTemplateSetIdOrderByRelativeOrderAsc(TEMPLATE_SET_ID))
                    .thenReturn(Arrays.asList(testPhaseTemplate));
            when(phaseRepository.save(any(Phase.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(wbsGroupTemplateRepository.findByPhaseTemplateIdOrderByRelativeOrderAsc(PHASE_TEMPLATE_ID))
                    .thenReturn(Arrays.asList(testGroupTemplate));
            when(wbsGroupRepository.save(any(WbsGroup.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(wbsItemTemplateRepository.findByGroupTemplateIdOrderByRelativeOrderAsc(GROUP_TEMPLATE_ID))
                    .thenReturn(Arrays.asList(testItemTemplate));
            when(wbsItemRepository.save(any(WbsItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

            templateService.applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, startDate);

            verify(phaseRepository, times(1)).save(any(Phase.class));
            verify(wbsGroupRepository, times(1)).save(any(WbsGroup.class));
            verify(wbsItemRepository, times(1)).save(any(WbsItem.class));
        }

        @Test
        @DisplayName("Should apply template with current date when no start date provided")
        void shouldApplyTemplateWithCurrentDate() {
            when(templateSetRepository.findById(TEMPLATE_SET_ID))
                    .thenReturn(Optional.of(testTemplateSet));
            when(projectRepository.findById(PROJECT_ID))
                    .thenReturn(Optional.of(testProject));
            when(phaseTemplateRepository.findByTemplateSetIdOrderByRelativeOrderAsc(TEMPLATE_SET_ID))
                    .thenReturn(Collections.emptyList());

            templateService.applyTemplateToProject(TEMPLATE_SET_ID, PROJECT_ID, null);

            verify(templateSetRepository, times(1)).findById(TEMPLATE_SET_ID);
            verify(projectRepository, times(1)).findById(PROJECT_ID);
        }

        @Test
        @DisplayName("Should throw exception when template not found for apply")
        void shouldThrowExceptionWhenTemplateNotFoundForApply() {
            when(templateSetRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    templateService.applyTemplateToProject("non-existent", PROJECT_ID, LocalDate.now()))
                    .isInstanceOf(CustomException.class);
        }

        @Test
        @DisplayName("Should throw exception when project not found for apply")
        void shouldThrowExceptionWhenProjectNotFoundForApply() {
            when(templateSetRepository.findById(TEMPLATE_SET_ID))
                    .thenReturn(Optional.of(testTemplateSet));
            when(projectRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    templateService.applyTemplateToProject(TEMPLATE_SET_ID, "non-existent", LocalDate.now()))
                    .isInstanceOf(CustomException.class);
        }
    }
}
