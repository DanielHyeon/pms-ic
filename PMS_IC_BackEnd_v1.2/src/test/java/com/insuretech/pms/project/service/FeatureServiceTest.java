package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.FeatureDto;
import com.insuretech.pms.project.entity.Epic;
import com.insuretech.pms.project.entity.Feature;
import com.insuretech.pms.project.repository.EpicRepository;
import com.insuretech.pms.project.repository.FeatureRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FeatureService Tests")
class FeatureServiceTest {

    @Mock
    private FeatureRepository featureRepository;

    @Mock
    private EpicRepository epicRepository;

    @InjectMocks
    private FeatureService featureService;

    private static final String EPIC_ID = "epic-001";
    private static final String FEATURE_ID = "feature-001";
    private static final String WBS_GROUP_ID = "wbs-group-001";

    private Epic testEpic;
    private Feature testFeature;
    private Feature testFeatureLinked;

    @BeforeEach
    void setUp() {
        testEpic = Epic.builder()
                .id(EPIC_ID)
                .name("User Management Epic")
                .status(Epic.EpicStatus.ACTIVE)
                .build();

        testFeature = Feature.builder()
                .id(FEATURE_ID)
                .epic(testEpic)
                .name("Login Feature")
                .description("User login functionality")
                .status(Feature.FeatureStatus.OPEN)
                .priority(Feature.Priority.HIGH)
                .orderNum(0)
                .build();

        testFeatureLinked = Feature.builder()
                .id("feature-002")
                .epic(testEpic)
                .name("Profile Feature")
                .wbsGroupId(WBS_GROUP_ID)
                .status(Feature.FeatureStatus.IN_PROGRESS)
                .priority(Feature.Priority.MEDIUM)
                .orderNum(1)
                .build();
    }

    @Nested
    @DisplayName("Get Features")
    class GetFeaturesTests {

        @Test
        @DisplayName("Should get features by epic ID")
        void shouldGetFeaturesByEpic() {
            when(featureRepository.findByEpicIdOrderByOrderNumAsc(EPIC_ID))
                    .thenReturn(Arrays.asList(testFeature, testFeatureLinked));

            List<FeatureDto> result = featureService.getFeaturesByEpic(EPIC_ID);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).getName()).isEqualTo("Login Feature");
            assertThat(result.get(1).getName()).isEqualTo("Profile Feature");
        }

        @Test
        @DisplayName("Should get features by WBS group ID")
        void shouldGetFeaturesByWbsGroup() {
            when(featureRepository.findByWbsGroupId(WBS_GROUP_ID))
                    .thenReturn(Arrays.asList(testFeatureLinked));

            List<FeatureDto> result = featureService.getFeaturesByWbsGroup(WBS_GROUP_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Profile Feature");
            assertThat(result.get(0).getWbsGroupId()).isEqualTo(WBS_GROUP_ID);
        }

        @Test
        @DisplayName("Should get unlinked features by epic ID")
        void shouldGetUnlinkedFeaturesByEpic() {
            when(featureRepository.findUnlinkedByEpicId(EPIC_ID))
                    .thenReturn(Arrays.asList(testFeature));

            List<FeatureDto> result = featureService.getUnlinkedFeaturesByEpic(EPIC_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getWbsGroupId()).isNull();
        }

        @Test
        @DisplayName("Should get feature by ID")
        void shouldGetFeatureById() {
            when(featureRepository.findById(FEATURE_ID))
                    .thenReturn(Optional.of(testFeature));

            FeatureDto result = featureService.getFeatureById(FEATURE_ID);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(FEATURE_ID);
            assertThat(result.getName()).isEqualTo("Login Feature");
        }

        @Test
        @DisplayName("Should throw exception when feature not found")
        void shouldThrowExceptionWhenFeatureNotFound() {
            when(featureRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> featureService.getFeatureById("non-existent"))
                    .isInstanceOf(CustomException.class);
        }
    }

    @Nested
    @DisplayName("Create Feature")
    class CreateFeatureTests {

        @Test
        @DisplayName("Should create new feature")
        void shouldCreateFeature() {
            FeatureDto request = FeatureDto.builder()
                    .name("Registration Feature")
                    .description("User registration functionality")
                    .status("OPEN")
                    .priority("HIGH")
                    .build();

            when(epicRepository.findById(EPIC_ID)).thenReturn(Optional.of(testEpic));
            when(featureRepository.countByEpicId(EPIC_ID)).thenReturn(2L);
            when(featureRepository.save(any(Feature.class))).thenAnswer(invocation -> {
                Feature saved = invocation.getArgument(0);
                saved.setId("feature-new");
                return saved;
            });

            FeatureDto result = featureService.createFeature(EPIC_ID, request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Registration Feature");
            verify(featureRepository, times(1)).save(any(Feature.class));
        }

        @Test
        @DisplayName("Should throw exception when epic not found")
        void shouldThrowExceptionWhenEpicNotFound() {
            FeatureDto request = FeatureDto.builder()
                    .name("Test Feature")
                    .build();

            when(epicRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> featureService.createFeature("non-existent", request))
                    .isInstanceOf(CustomException.class);
        }
    }

    @Nested
    @DisplayName("Update Feature")
    class UpdateFeatureTests {

        @Test
        @DisplayName("Should update feature name and description")
        void shouldUpdateFeature() {
            FeatureDto request = FeatureDto.builder()
                    .name("Updated Feature Name")
                    .description("Updated description")
                    .build();

            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            when(featureRepository.save(any(Feature.class))).thenReturn(testFeature);

            FeatureDto result = featureService.updateFeature(FEATURE_ID, request);

            assertThat(result).isNotNull();
            verify(featureRepository, times(1)).save(any(Feature.class));
        }

        @Test
        @DisplayName("Should update feature status and priority")
        void shouldUpdateFeatureStatusAndPriority() {
            FeatureDto request = FeatureDto.builder()
                    .status("COMPLETED")
                    .priority("LOW")
                    .build();

            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            when(featureRepository.save(any(Feature.class))).thenReturn(testFeature);

            FeatureDto result = featureService.updateFeature(FEATURE_ID, request);

            assertThat(result).isNotNull();
            verify(featureRepository, times(1)).save(any(Feature.class));
        }
    }

    @Nested
    @DisplayName("Delete Feature")
    class DeleteFeatureTests {

        @Test
        @DisplayName("Should delete feature")
        void shouldDeleteFeature() {
            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            doNothing().when(featureRepository).delete(testFeature);

            featureService.deleteFeature(FEATURE_ID);

            verify(featureRepository, times(1)).delete(testFeature);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent feature")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            when(featureRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> featureService.deleteFeature("non-existent"))
                    .isInstanceOf(CustomException.class);
        }
    }

    @Nested
    @DisplayName("WBS Group Linking")
    class WbsGroupLinkingTests {

        @Test
        @DisplayName("Should link feature to WBS group")
        void shouldLinkFeatureToWbsGroup() {
            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            when(featureRepository.save(any(Feature.class))).thenAnswer(invocation -> {
                Feature saved = invocation.getArgument(0);
                return saved;
            });

            FeatureDto result = featureService.linkToWbsGroup(FEATURE_ID, WBS_GROUP_ID);

            assertThat(result).isNotNull();
            verify(featureRepository, times(1)).save(argThat(feature ->
                    WBS_GROUP_ID.equals(feature.getWbsGroupId())
            ));
        }

        @Test
        @DisplayName("Should unlink feature from WBS group")
        void shouldUnlinkFeatureFromWbsGroup() {
            testFeature.setWbsGroupId(WBS_GROUP_ID);

            when(featureRepository.findById(FEATURE_ID)).thenReturn(Optional.of(testFeature));
            when(featureRepository.save(any(Feature.class))).thenAnswer(invocation -> {
                Feature saved = invocation.getArgument(0);
                return saved;
            });

            FeatureDto result = featureService.unlinkFromWbsGroup(FEATURE_ID);

            assertThat(result).isNotNull();
            verify(featureRepository, times(1)).save(argThat(feature ->
                    feature.getWbsGroupId() == null
            ));
        }

        @Test
        @DisplayName("Should throw exception when linking non-existent feature")
        void shouldThrowExceptionWhenLinkingNonExistent() {
            when(featureRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> featureService.linkToWbsGroup("non-existent", WBS_GROUP_ID))
                    .isInstanceOf(CustomException.class);
        }
    }
}
