package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.ProjectDto;
import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.support.R2dbcTestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveProjectService Tests")
class ReactiveProjectServiceTest {

    @Mock
    private ReactiveProjectRepository projectRepository;

    @Mock
    private TransactionalOperator transactionalOperator;

    @InjectMocks
    private ReactiveProjectService projectService;

    private R2dbcProject testProject;
    private String projectId;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        R2dbcTestDataFactory.resetCounter();
        testProject = R2dbcTestDataFactory.defaultProject();
        projectId = testProject.getId();

        // Mock transactional operator to pass through the Mono/Flux
        lenient().when(transactionalOperator.transactional(any(Mono.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Nested
    @DisplayName("getAllProjects")
    class GetAllProjects {

        @Test
        @DisplayName("should return all projects")
        void shouldReturnAllProjects() {
            R2dbcProject project1 = R2dbcTestDataFactory.project().build();
            R2dbcProject project2 = R2dbcTestDataFactory.project().build();

            when(projectRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(Flux.just(project1, project2));

            StepVerifier.create(projectService.getAllProjects())
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(project1.getId()))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(project2.getId()))
                    .verifyComplete();

            verify(projectRepository).findAllByOrderByCreatedAtDesc();
        }

        @Test
        @DisplayName("should return empty flux when no projects exist")
        void shouldReturnEmptyFluxWhenNoProjectsExist() {
            when(projectRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(Flux.empty());

            StepVerifier.create(projectService.getAllProjects())
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getProjectsByStatus")
    class GetProjectsByStatus {

        @Test
        @DisplayName("should return projects by status")
        void shouldReturnProjectsByStatus() {
            String status = "ACTIVE";
            R2dbcProject project = R2dbcTestDataFactory.project()
                    .status(status)
                    .build();

            when(projectRepository.findByStatusOrderByCreatedAtDesc(status))
                    .thenReturn(Flux.just(project));

            StepVerifier.create(projectService.getProjectsByStatus(status))
                    .assertNext(dto -> assertThat(dto.getStatus()).isEqualTo(status))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getProjectById")
    class GetProjectById {

        @Test
        @DisplayName("should return project when found")
        void shouldReturnProjectWhenFound() {
            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));

            StepVerifier.create(projectService.getProjectById(projectId))
                    .assertNext(dto -> {
                        assertThat(dto.getId()).isEqualTo(projectId);
                        assertThat(dto.getName()).isEqualTo(testProject.getName());
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when not found")
        void shouldThrowErrorWhenNotFound() {
            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(projectService.getProjectById(projectId))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("createProject")
    class CreateProject {

        @Test
        @DisplayName("should create project successfully")
        void shouldCreateProjectSuccessfully() {
            ProjectDto request = ProjectDto.builder()
                    .name("New Project")
                    .description("Project Description")
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusMonths(6))
                    .budget(BigDecimal.valueOf(100000))
                    .build();

            when(projectRepository.save(any(R2dbcProject.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(projectService.createProject(request))
                    .assertNext(dto -> {
                        assertThat(dto.getName()).isEqualTo("New Project");
                        assertThat(dto.getDescription()).isEqualTo("Project Description");
                        assertThat(dto.getStatus()).isEqualTo("PLANNING");
                        assertThat(dto.getProgress()).isEqualTo(0);
                    })
                    .verifyComplete();

            verify(projectRepository).save(any(R2dbcProject.class));
        }

        @Test
        @DisplayName("should use provided status when creating")
        void shouldUseProvidedStatusWhenCreating() {
            ProjectDto request = ProjectDto.builder()
                    .name("New Project")
                    .status("ACTIVE")
                    .build();

            when(projectRepository.save(any(R2dbcProject.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(projectService.createProject(request))
                    .assertNext(dto -> assertThat(dto.getStatus()).isEqualTo("ACTIVE"))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("updateProject")
    class UpdateProject {

        @Test
        @DisplayName("should update project successfully")
        void shouldUpdateProjectSuccessfully() {
            ProjectDto request = ProjectDto.builder()
                    .name("Updated Project")
                    .description("Updated Description")
                    .status("ACTIVE")
                    .build();

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));
            when(projectRepository.save(any(R2dbcProject.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(projectService.updateProject(projectId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getName()).isEqualTo("Updated Project");
                        assertThat(dto.getDescription()).isEqualTo("Updated Description");
                        assertThat(dto.getStatus()).isEqualTo("ACTIVE");
                    })
                    .verifyComplete();

            verify(projectRepository).save(any(R2dbcProject.class));
        }

        @Test
        @DisplayName("should throw error when project not found")
        void shouldThrowErrorWhenProjectNotFound() {
            ProjectDto request = ProjectDto.builder()
                    .name("Updated Project")
                    .build();

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(projectService.updateProject(projectId, request))
                    .expectError(CustomException.class)
                    .verify();

            verify(projectRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("deleteProject")
    class DeleteProject {

        @Test
        @DisplayName("should delete project successfully")
        void shouldDeleteProjectSuccessfully() {
            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));
            when(projectRepository.delete(testProject))
                    .thenReturn(Mono.empty());

            StepVerifier.create(projectService.deleteProject(projectId))
                    .verifyComplete();

            verify(projectRepository).delete(testProject);
        }

        @Test
        @DisplayName("should throw error when project not found for deletion")
        void shouldThrowErrorWhenProjectNotFoundForDeletion() {
            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(projectService.deleteProject(projectId))
                    .expectError(CustomException.class)
                    .verify();

            verify(projectRepository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("setDefaultProject")
    class SetDefaultProject {

        @Test
        @DisplayName("should set default project successfully")
        void shouldSetDefaultProjectSuccessfully() {
            when(projectRepository.clearDefaultProject())
                    .thenReturn(Mono.empty());
            when(projectRepository.setDefaultProject(projectId))
                    .thenReturn(Mono.empty());
            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));

            StepVerifier.create(projectService.setDefaultProject(projectId))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(projectId))
                    .verifyComplete();

            verify(projectRepository).clearDefaultProject();
            verify(projectRepository).setDefaultProject(projectId);
        }
    }

    @Nested
    @DisplayName("getDefaultProject")
    class GetDefaultProject {

        @Test
        @DisplayName("should return default project")
        void shouldReturnDefaultProject() {
            testProject.setIsDefault(true);

            when(projectRepository.findByIsDefaultTrue())
                    .thenReturn(Mono.just(testProject));

            StepVerifier.create(projectService.getDefaultProject())
                    .assertNext(dto -> {
                        assertThat(dto.getId()).isEqualTo(projectId);
                        assertThat(dto.getIsDefault()).isTrue();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty when no default project")
        void shouldReturnEmptyWhenNoDefaultProject() {
            when(projectRepository.findByIsDefaultTrue())
                    .thenReturn(Mono.empty());

            StepVerifier.create(projectService.getDefaultProject())
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("updateProgress")
    class UpdateProgress {

        @Test
        @DisplayName("should update progress successfully")
        void shouldUpdateProgressSuccessfully() {
            Integer progress = 50;

            when(projectRepository.updateProgress(projectId, progress))
                    .thenReturn(Mono.empty());

            StepVerifier.create(projectService.updateProgress(projectId, progress))
                    .verifyComplete();

            verify(projectRepository).updateProgress(projectId, progress);
        }
    }
}
