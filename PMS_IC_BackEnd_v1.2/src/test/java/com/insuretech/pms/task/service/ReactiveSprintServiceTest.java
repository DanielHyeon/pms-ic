package com.insuretech.pms.task.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.support.R2dbcTestDataFactory;
import com.insuretech.pms.task.dto.SprintDto;
import com.insuretech.pms.task.reactive.entity.R2dbcSprint;
import com.insuretech.pms.task.reactive.repository.ReactiveSprintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveSprintService Tests")
class ReactiveSprintServiceTest {

    @Mock
    private ReactiveSprintRepository sprintRepository;

    @Mock
    private ReactiveProjectRepository projectRepository;

    @InjectMocks
    private ReactiveSprintService sprintService;

    private R2dbcProject testProject;
    private R2dbcSprint testSprint;
    private String projectId;
    private String sprintId;

    @BeforeEach
    void setUp() {
        R2dbcTestDataFactory.resetCounter();
        testProject = R2dbcTestDataFactory.defaultProject();
        projectId = testProject.getId();
        testSprint = R2dbcTestDataFactory.defaultSprint(projectId);
        sprintId = testSprint.getId();
    }

    @Nested
    @DisplayName("getSprintsByProject")
    class GetSprintsByProject {

        @Test
        @DisplayName("should return sprints for project")
        void shouldReturnSprintsForProject() {
            R2dbcSprint sprint1 = R2dbcTestDataFactory.sprint().projectId(projectId).build();
            R2dbcSprint sprint2 = R2dbcTestDataFactory.sprint().projectId(projectId).build();

            when(sprintRepository.findByProjectIdOrderByStartDateDesc(projectId))
                    .thenReturn(Flux.just(sprint1, sprint2));

            StepVerifier.create(sprintService.getSprintsByProject(projectId))
                    .assertNext(dto -> {
                        assertThat(dto.getId()).isEqualTo(sprint1.getId());
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                    })
                    .assertNext(dto -> {
                        assertThat(dto.getId()).isEqualTo(sprint2.getId());
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                    })
                    .verifyComplete();

            verify(sprintRepository).findByProjectIdOrderByStartDateDesc(projectId);
        }

        @Test
        @DisplayName("should return empty flux when no sprints exist")
        void shouldReturnEmptyFluxWhenNoSprintsExist() {
            when(sprintRepository.findByProjectIdOrderByStartDateDesc(projectId))
                    .thenReturn(Flux.empty());

            StepVerifier.create(sprintService.getSprintsByProject(projectId))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getSprintsByProjectAndStatus")
    class GetSprintsByProjectAndStatus {

        @Test
        @DisplayName("should return sprints by project and status")
        void shouldReturnSprintsByProjectAndStatus() {
            String status = "ACTIVE";
            R2dbcSprint sprint = R2dbcTestDataFactory.sprint()
                    .projectId(projectId)
                    .status(status)
                    .build();

            when(sprintRepository.findByProjectIdAndStatus(projectId, status))
                    .thenReturn(Flux.just(sprint));

            StepVerifier.create(sprintService.getSprintsByProjectAndStatus(projectId, status))
                    .assertNext(dto -> {
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                        assertThat(dto.getStatus()).isEqualTo(status);
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getActiveSprint")
    class GetActiveSprint {

        @Test
        @DisplayName("should return active sprint")
        void shouldReturnActiveSprint() {
            R2dbcSprint activeSprint = R2dbcTestDataFactory.sprint()
                    .projectId(projectId)
                    .status("ACTIVE")
                    .build();

            when(sprintRepository.findByProjectIdAndStatusEquals(projectId, "ACTIVE"))
                    .thenReturn(Mono.just(activeSprint));

            StepVerifier.create(sprintService.getActiveSprint(projectId))
                    .assertNext(dto -> {
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                        assertThat(dto.getStatus()).isEqualTo("ACTIVE");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty when no active sprint")
        void shouldReturnEmptyWhenNoActiveSprint() {
            when(sprintRepository.findByProjectIdAndStatusEquals(projectId, "ACTIVE"))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.getActiveSprint(projectId))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getSprintById")
    class GetSprintById {

        @Test
        @DisplayName("should return sprint when found")
        void shouldReturnSprintWhenFound() {
            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.just(testSprint));

            StepVerifier.create(sprintService.getSprintById(sprintId))
                    .assertNext(dto -> {
                        assertThat(dto.getId()).isEqualTo(sprintId);
                        assertThat(dto.getName()).isEqualTo(testSprint.getName());
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when not found")
        void shouldThrowErrorWhenNotFound() {
            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.getSprintById(sprintId))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("createSprint")
    class CreateSprint {

        @Test
        @DisplayName("should create sprint successfully")
        void shouldCreateSprintSuccessfully() {
            SprintDto request = new SprintDto();
            request.setName("Sprint 1");
            request.setGoal("Complete feature X");
            request.setStartDate(LocalDate.now());
            request.setEndDate(LocalDate.now().plusDays(14));

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));
            when(sprintRepository.save(any(R2dbcSprint.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(sprintService.createSprint(projectId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getName()).isEqualTo("Sprint 1");
                        assertThat(dto.getGoal()).isEqualTo("Complete feature X");
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                        assertThat(dto.getStatus()).isEqualTo("PLANNED");
                    })
                    .verifyComplete();

            verify(projectRepository).findById(projectId);
            verify(sprintRepository).save(any(R2dbcSprint.class));
        }

        @Test
        @DisplayName("should throw error when project not found")
        void shouldThrowErrorWhenProjectNotFound() {
            SprintDto request = new SprintDto();
            request.setName("Sprint 1");

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.createSprint(projectId, request))
                    .expectError(CustomException.class)
                    .verify();

            verify(sprintRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("updateSprint")
    class UpdateSprint {

        @Test
        @DisplayName("should update sprint successfully")
        void shouldUpdateSprintSuccessfully() {
            SprintDto request = new SprintDto();
            request.setName("Updated Sprint");
            request.setGoal("Updated Goal");

            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.just(testSprint));
            when(sprintRepository.save(any(R2dbcSprint.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(sprintService.updateSprint(sprintId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getName()).isEqualTo("Updated Sprint");
                        assertThat(dto.getGoal()).isEqualTo("Updated Goal");
                    })
                    .verifyComplete();

            verify(sprintRepository).save(any(R2dbcSprint.class));
        }

        @Test
        @DisplayName("should throw error when sprint not found")
        void shouldThrowErrorWhenSprintNotFound() {
            SprintDto request = new SprintDto();
            request.setName("Updated Sprint");

            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.updateSprint(sprintId, request))
                    .expectError(CustomException.class)
                    .verify();

            verify(sprintRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("startSprint")
    class StartSprint {

        @Test
        @DisplayName("should start sprint successfully")
        void shouldStartSprintSuccessfully() {
            testSprint.setStatus("PLANNED");

            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.just(testSprint));
            when(sprintRepository.save(any(R2dbcSprint.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(sprintService.startSprint(sprintId))
                    .assertNext(dto -> {
                        assertThat(dto.getStatus()).isEqualTo("ACTIVE");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when sprint not found")
        void shouldThrowErrorWhenSprintNotFound() {
            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.startSprint(sprintId))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("completeSprint")
    class CompleteSprint {

        @Test
        @DisplayName("should complete sprint successfully")
        void shouldCompleteSprintSuccessfully() {
            testSprint.setStatus("ACTIVE");

            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.just(testSprint));
            when(sprintRepository.save(any(R2dbcSprint.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(sprintService.completeSprint(sprintId))
                    .assertNext(dto -> {
                        assertThat(dto.getStatus()).isEqualTo("COMPLETED");
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("cancelSprint")
    class CancelSprint {

        @Test
        @DisplayName("should cancel sprint successfully")
        void shouldCancelSprintSuccessfully() {
            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.just(testSprint));
            when(sprintRepository.save(any(R2dbcSprint.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(sprintService.cancelSprint(sprintId))
                    .assertNext(dto -> {
                        assertThat(dto.getStatus()).isEqualTo("CANCELLED");
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("deleteSprint")
    class DeleteSprint {

        @Test
        @DisplayName("should delete sprint successfully")
        void shouldDeleteSprintSuccessfully() {
            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.just(testSprint));
            when(sprintRepository.deleteById(sprintId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.deleteSprint(sprintId))
                    .verifyComplete();

            verify(sprintRepository).deleteById(sprintId);
        }

        @Test
        @DisplayName("should throw error when sprint not found for deletion")
        void shouldThrowErrorWhenSprintNotFoundForDeletion() {
            when(sprintRepository.findById(sprintId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(sprintService.deleteSprint(sprintId))
                    .expectError(CustomException.class)
                    .verify();

            verify(sprintRepository, never()).deleteById(anyString());
        }
    }
}
