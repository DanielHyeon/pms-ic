package com.insuretech.pms.task.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.support.R2dbcTestDataFactory;
import com.insuretech.pms.task.dto.CreateUserStoryRequest;
import com.insuretech.pms.task.dto.UpdateUserStoryRequest;
import com.insuretech.pms.task.reactive.entity.R2dbcUserStory;
import com.insuretech.pms.task.reactive.repository.ReactiveUserStoryRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveUserStoryService Tests")
class ReactiveUserStoryServiceTest {

    @Mock
    private ReactiveUserStoryRepository userStoryRepository;

    @Mock
    private ReactiveProjectRepository projectRepository;

    @InjectMocks
    private ReactiveUserStoryService userStoryService;

    private R2dbcProject testProject;
    private R2dbcUserStory testUserStory;
    private String projectId;
    private String storyId;

    @BeforeEach
    void setUp() {
        R2dbcTestDataFactory.resetCounter();
        testProject = R2dbcTestDataFactory.defaultProject();
        projectId = testProject.getId();
        testUserStory = R2dbcTestDataFactory.defaultUserStory(projectId);
        storyId = testUserStory.getId();
    }

    @Nested
    @DisplayName("getUserStoriesByProject")
    class GetUserStoriesByProject {

        @Test
        @DisplayName("should return user stories for project")
        void shouldReturnUserStoriesForProject() {
            R2dbcUserStory story1 = R2dbcTestDataFactory.userStory().projectId(projectId).build();
            R2dbcUserStory story2 = R2dbcTestDataFactory.userStory().projectId(projectId).build();

            when(userStoryRepository.findByProjectIdOrderByPriorityOrderAsc(projectId))
                    .thenReturn(Flux.just(story1, story2));

            StepVerifier.create(userStoryService.getUserStoriesByProject(projectId))
                    .assertNext(response -> {
                        assertThat(response.getId()).isEqualTo(story1.getId());
                        assertThat(response.getProjectId()).isEqualTo(projectId);
                    })
                    .assertNext(response -> {
                        assertThat(response.getId()).isEqualTo(story2.getId());
                        assertThat(response.getProjectId()).isEqualTo(projectId);
                    })
                    .verifyComplete();

            verify(userStoryRepository).findByProjectIdOrderByPriorityOrderAsc(projectId);
        }

        @Test
        @DisplayName("should return empty flux when no stories exist")
        void shouldReturnEmptyFluxWhenNoStoriesExist() {
            when(userStoryRepository.findByProjectIdOrderByPriorityOrderAsc(projectId))
                    .thenReturn(Flux.empty());

            StepVerifier.create(userStoryService.getUserStoriesByProject(projectId))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getUserStoryById")
    class GetUserStoryById {

        @Test
        @DisplayName("should return user story when found")
        void shouldReturnUserStoryWhenFound() {
            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));

            StepVerifier.create(userStoryService.getUserStoryById(storyId))
                    .assertNext(response -> {
                        assertThat(response.getId()).isEqualTo(storyId);
                        assertThat(response.getTitle()).isEqualTo(testUserStory.getTitle());
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when not found")
        void shouldThrowErrorWhenNotFound() {
            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(userStoryService.getUserStoryById(storyId))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("createUserStory")
    class CreateUserStory {

        @Test
        @DisplayName("should create user story successfully")
        void shouldCreateUserStorySuccessfully() {
            CreateUserStoryRequest request = new CreateUserStoryRequest();
            request.setProjectId(projectId);
            request.setTitle("New User Story");
            request.setDescription("As a user, I want...");
            request.setEpic("Epic 1");
            request.setPriority(R2dbcUserStory.Priority.HIGH);
            request.setStoryPoints(5);

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));
            when(userStoryRepository.findMaxPriorityOrderByProjectIdAndStatus(projectId, "IDEA"))
                    .thenReturn(Mono.just(0));
            when(userStoryRepository.save(any(R2dbcUserStory.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(userStoryService.createUserStory(request))
                    .assertNext(response -> {
                        assertThat(response.getTitle()).isEqualTo("New User Story");
                        assertThat(response.getProjectId()).isEqualTo(projectId);
                        assertThat(response.getStatus()).isEqualTo("IDEA");
                        assertThat(response.getPriority()).isEqualTo("HIGH");
                    })
                    .verifyComplete();

            verify(projectRepository).findById(projectId);
            verify(userStoryRepository).save(any(R2dbcUserStory.class));
        }

        @Test
        @DisplayName("should throw error when project not found")
        void shouldThrowErrorWhenProjectNotFound() {
            CreateUserStoryRequest request = new CreateUserStoryRequest();
            request.setProjectId(projectId);
            request.setTitle("New User Story");
            request.setEpic("Epic 1");
            request.setPriority(R2dbcUserStory.Priority.HIGH);

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(userStoryService.createUserStory(request))
                    .expectError(CustomException.class)
                    .verify();

            verify(userStoryRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("updateUserStory")
    class UpdateUserStory {

        @Test
        @DisplayName("should update user story successfully")
        void shouldUpdateUserStorySuccessfully() {
            UpdateUserStoryRequest request = new UpdateUserStoryRequest();
            request.setTitle("Updated Title");
            request.setDescription("Updated Description");

            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));
            when(userStoryRepository.save(any(R2dbcUserStory.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(userStoryService.updateUserStory(storyId, request))
                    .assertNext(response -> {
                        assertThat(response.getTitle()).isEqualTo("Updated Title");
                        assertThat(response.getDescription()).isEqualTo("Updated Description");
                    })
                    .verifyComplete();

            verify(userStoryRepository).save(any(R2dbcUserStory.class));
        }

        @Test
        @DisplayName("should throw error when story not found")
        void shouldThrowErrorWhenStoryNotFound() {
            UpdateUserStoryRequest request = new UpdateUserStoryRequest();
            request.setTitle("Updated Title");

            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(userStoryService.updateUserStory(storyId, request))
                    .expectError(CustomException.class)
                    .verify();

            verify(userStoryRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("assignToSprint")
    class AssignToSprint {

        @Test
        @DisplayName("should assign user story to sprint")
        void shouldAssignUserStoryToSprint() {
            String sprintId = "sprint-123";

            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));
            when(userStoryRepository.save(any(R2dbcUserStory.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(userStoryService.assignToSprint(storyId, sprintId))
                    .assertNext(response -> {
                        assertThat(response.getSprintId()).isEqualTo(sprintId);
                        assertThat(response.getStatus()).isEqualTo("IN_SPRINT");
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("removeFromSprint")
    class RemoveFromSprint {

        @Test
        @DisplayName("should remove user story from sprint")
        void shouldRemoveUserStoryFromSprint() {
            testUserStory.setSprintId("sprint-123");
            testUserStory.setStatus("IN_SPRINT");

            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));
            when(userStoryRepository.save(any(R2dbcUserStory.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(userStoryService.removeFromSprint(storyId))
                    .assertNext(response -> {
                        assertThat(response.getSprintId()).isNull();
                        assertThat(response.getStatus()).isEqualTo("READY");
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("updateStatus")
    class UpdateStatus {

        @Test
        @DisplayName("should update user story status")
        void shouldUpdateUserStoryStatus() {
            String newStatus = "IN_PROGRESS";

            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));
            when(userStoryRepository.save(any(R2dbcUserStory.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(userStoryService.updateStatus(storyId, newStatus))
                    .assertNext(response -> {
                        assertThat(response.getStatus()).isEqualTo(newStatus);
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("linkToWbsItem")
    class LinkToWbsItem {

        @Test
        @DisplayName("should link user story to WBS item")
        void shouldLinkUserStoryToWbsItem() {
            String wbsItemId = "wbs-item-123";

            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));
            when(userStoryRepository.save(any(R2dbcUserStory.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(userStoryService.linkToWbsItem(storyId, wbsItemId))
                    .assertNext(response -> {
                        assertThat(response.getId()).isEqualTo(storyId);
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("deleteUserStory")
    class DeleteUserStory {

        @Test
        @DisplayName("should delete user story successfully")
        void shouldDeleteUserStorySuccessfully() {
            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.just(testUserStory));
            when(userStoryRepository.deleteById(storyId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(userStoryService.deleteUserStory(storyId))
                    .verifyComplete();

            verify(userStoryRepository).deleteById(storyId);
        }

        @Test
        @DisplayName("should throw error when story not found for deletion")
        void shouldThrowErrorWhenStoryNotFoundForDeletion() {
            when(userStoryRepository.findById(storyId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(userStoryService.deleteUserStory(storyId))
                    .expectError(CustomException.class)
                    .verify();

            verify(userStoryRepository, never()).deleteById(anyString());
        }
    }

    @Nested
    @DisplayName("getUserStoriesByProjectAndStatus")
    class GetUserStoriesByProjectAndStatus {

        @Test
        @DisplayName("should return user stories by project and status")
        void shouldReturnUserStoriesByProjectAndStatus() {
            String status = "IN_PROGRESS";
            R2dbcUserStory story = R2dbcTestDataFactory.userStory()
                    .projectId(projectId)
                    .status(status)
                    .build();

            when(userStoryRepository.findByProjectIdAndStatusOrderByPriorityOrderAsc(projectId, status))
                    .thenReturn(Flux.just(story));

            StepVerifier.create(userStoryService.getUserStoriesByProjectAndStatus(projectId, status))
                    .assertNext(response -> {
                        assertThat(response.getProjectId()).isEqualTo(projectId);
                        assertThat(response.getStatus()).isEqualTo(status);
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getUserStoriesBySprint")
    class GetUserStoriesBySprint {

        @Test
        @DisplayName("should return user stories by sprint")
        void shouldReturnUserStoriesBySprint() {
            String sprintId = "sprint-123";
            R2dbcUserStory story = R2dbcTestDataFactory.userStory()
                    .projectId(projectId)
                    .sprintId(sprintId)
                    .build();

            when(userStoryRepository.findBySprintId(sprintId))
                    .thenReturn(Flux.just(story));

            StepVerifier.create(userStoryService.getUserStoriesBySprint(sprintId))
                    .assertNext(response -> {
                        assertThat(response.getSprintId()).isEqualTo(sprintId);
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getUnlinkedUserStories")
    class GetUnlinkedUserStories {

        @Test
        @DisplayName("should return unlinked user stories")
        void shouldReturnUnlinkedUserStories() {
            R2dbcUserStory unlinkedStory = R2dbcTestDataFactory.userStory()
                    .projectId(projectId)
                    .wbsItemId(null)
                    .build();

            when(userStoryRepository.findByProjectIdAndWbsItemIdIsNull(projectId))
                    .thenReturn(Flux.just(unlinkedStory));

            StepVerifier.create(userStoryService.getUnlinkedUserStories(projectId))
                    .assertNext(response -> {
                        assertThat(response.getProjectId()).isEqualTo(projectId);
                    })
                    .verifyComplete();
        }
    }
}
