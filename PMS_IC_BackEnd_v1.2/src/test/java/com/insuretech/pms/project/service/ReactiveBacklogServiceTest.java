package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.BacklogDto;
import com.insuretech.pms.project.dto.BacklogItemDto;
import com.insuretech.pms.project.reactive.entity.R2dbcBacklog;
import com.insuretech.pms.project.reactive.entity.R2dbcBacklogItem;
import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import com.insuretech.pms.project.reactive.repository.ReactiveBacklogItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveBacklogRepository;
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
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveBacklogService Tests")
class ReactiveBacklogServiceTest {

    @Mock
    private ReactiveBacklogRepository backlogRepository;

    @Mock
    private ReactiveBacklogItemRepository backlogItemRepository;

    @Mock
    private ReactiveProjectRepository projectRepository;

    @InjectMocks
    private ReactiveBacklogService backlogService;

    private R2dbcProject testProject;
    private R2dbcBacklog testBacklog;
    private R2dbcBacklogItem testBacklogItem;
    private String projectId;
    private String backlogId;
    private String itemId;

    @BeforeEach
    void setUp() {
        R2dbcTestDataFactory.resetCounter();
        testProject = R2dbcTestDataFactory.defaultProject();
        projectId = testProject.getId();
        testBacklog = R2dbcTestDataFactory.defaultBacklog(projectId);
        backlogId = testBacklog.getId();
        testBacklogItem = R2dbcTestDataFactory.defaultBacklogItem(backlogId);
        itemId = testBacklogItem.getId();
    }

    // ========== Backlog Operations ==========

    @Nested
    @DisplayName("getBacklogsByProject")
    class GetBacklogsByProject {

        @Test
        @DisplayName("should return backlogs for project")
        void shouldReturnBacklogsForProject() {
            R2dbcBacklog backlog1 = R2dbcTestDataFactory.backlog().projectId(projectId).build();
            R2dbcBacklog backlog2 = R2dbcTestDataFactory.backlog().projectId(projectId).build();

            when(backlogRepository.findByProjectId(projectId))
                    .thenReturn(Flux.just(backlog1, backlog2));

            StepVerifier.create(backlogService.getBacklogsByProject(projectId))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(backlog1.getId()))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(backlog2.getId()))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty flux when no backlogs exist")
        void shouldReturnEmptyFluxWhenNoBacklogsExist() {
            when(backlogRepository.findByProjectId(projectId))
                    .thenReturn(Flux.empty());

            StepVerifier.create(backlogService.getBacklogsByProject(projectId))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getActiveBacklog")
    class GetActiveBacklog {

        @Test
        @DisplayName("should return active backlog")
        void shouldReturnActiveBacklog() {
            testBacklog.setStatus("ACTIVE");

            when(backlogRepository.findActiveBacklogByProjectId(projectId))
                    .thenReturn(Mono.just(testBacklog));

            StepVerifier.create(backlogService.getActiveBacklog(projectId))
                    .assertNext(dto -> {
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                        assertThat(dto.getStatus()).isEqualTo("ACTIVE");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when no active backlog")
        void shouldThrowErrorWhenNoActiveBacklog() {
            when(backlogRepository.findActiveBacklogByProjectId(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.getActiveBacklog(projectId))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("getBacklogById")
    class GetBacklogById {

        @Test
        @DisplayName("should return backlog when found")
        void shouldReturnBacklogWhenFound() {
            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.just(testBacklog));

            StepVerifier.create(backlogService.getBacklogById(backlogId))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(backlogId))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when not found")
        void shouldThrowErrorWhenNotFound() {
            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.getBacklogById(backlogId))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("createBacklog")
    class CreateBacklog {

        @Test
        @DisplayName("should create backlog successfully")
        void shouldCreateBacklogSuccessfully() {
            BacklogDto request = new BacklogDto();
            request.setName("Sprint Backlog");
            request.setDescription("Sprint backlog description");

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));
            when(backlogRepository.save(any(R2dbcBacklog.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.createBacklog(projectId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getName()).isEqualTo("Sprint Backlog");
                        assertThat(dto.getProjectId()).isEqualTo(projectId);
                        assertThat(dto.getStatus()).isEqualTo("ACTIVE");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should use default name when not provided")
        void shouldUseDefaultNameWhenNotProvided() {
            BacklogDto request = new BacklogDto();

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.just(testProject));
            when(backlogRepository.save(any(R2dbcBacklog.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.createBacklog(projectId, request))
                    .assertNext(dto -> assertThat(dto.getName()).isEqualTo("Product Backlog"))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when project not found")
        void shouldThrowErrorWhenProjectNotFound() {
            BacklogDto request = new BacklogDto();

            when(projectRepository.findById(projectId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.createBacklog(projectId, request))
                    .expectError(CustomException.class)
                    .verify();

            verify(backlogRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("updateBacklog")
    class UpdateBacklog {

        @Test
        @DisplayName("should update backlog successfully")
        void shouldUpdateBacklogSuccessfully() {
            BacklogDto request = new BacklogDto();
            request.setName("Updated Backlog");
            request.setDescription("Updated description");

            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.just(testBacklog));
            when(backlogRepository.save(any(R2dbcBacklog.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.updateBacklog(backlogId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getName()).isEqualTo("Updated Backlog");
                        assertThat(dto.getDescription()).isEqualTo("Updated description");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when backlog not found")
        void shouldThrowErrorWhenBacklogNotFound() {
            BacklogDto request = new BacklogDto();

            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.updateBacklog(backlogId, request))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("deleteBacklog")
    class DeleteBacklog {

        @Test
        @DisplayName("should delete backlog and items successfully")
        void shouldDeleteBacklogAndItemsSuccessfully() {
            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.just(testBacklog));
            when(backlogItemRepository.deleteByBacklogId(backlogId))
                    .thenReturn(Mono.empty());
            when(backlogRepository.deleteById(backlogId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.deleteBacklog(backlogId))
                    .verifyComplete();

            verify(backlogItemRepository).deleteByBacklogId(backlogId);
            verify(backlogRepository).deleteById(backlogId);
        }

        @Test
        @DisplayName("should throw error when backlog not found")
        void shouldThrowErrorWhenBacklogNotFound() {
            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.deleteBacklog(backlogId))
                    .expectError(CustomException.class)
                    .verify();

            verify(backlogItemRepository, never()).deleteByBacklogId(anyString());
        }
    }

    // ========== Backlog Item Operations ==========

    @Nested
    @DisplayName("getItemsByBacklog")
    class GetItemsByBacklog {

        @Test
        @DisplayName("should return items for backlog")
        void shouldReturnItemsForBacklog() {
            R2dbcBacklogItem item1 = R2dbcTestDataFactory.backlogItem().backlogId(backlogId).build();
            R2dbcBacklogItem item2 = R2dbcTestDataFactory.backlogItem().backlogId(backlogId).build();

            when(backlogItemRepository.findByBacklogIdOrderByPriorityOrderAsc(backlogId))
                    .thenReturn(Flux.just(item1, item2));

            StepVerifier.create(backlogService.getItemsByBacklog(backlogId))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(item1.getId()))
                    .assertNext(dto -> assertThat(dto.getId()).isEqualTo(item2.getId()))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getItemsByBacklogAndStatus")
    class GetItemsByBacklogAndStatus {

        @Test
        @DisplayName("should return items by backlog and status")
        void shouldReturnItemsByBacklogAndStatus() {
            String status = "SELECTED";
            R2dbcBacklogItem item = R2dbcTestDataFactory.backlogItem()
                    .backlogId(backlogId)
                    .status(status)
                    .build();

            when(backlogItemRepository.findByBacklogIdAndStatus(backlogId, status))
                    .thenReturn(Flux.just(item));

            StepVerifier.create(backlogService.getItemsByBacklogAndStatus(backlogId, status))
                    .assertNext(dto -> assertThat(dto.getStatus()).isEqualTo(status))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getItemsBySprint")
    class GetItemsBySprint {

        @Test
        @DisplayName("should return items by sprint")
        void shouldReturnItemsBySprint() {
            String sprintId = "sprint-123";
            R2dbcBacklogItem item = R2dbcTestDataFactory.backlogItem()
                    .sprintId(sprintId)
                    .build();

            when(backlogItemRepository.findBySprintId(sprintId))
                    .thenReturn(Flux.just(item));

            StepVerifier.create(backlogService.getItemsBySprint(sprintId))
                    .assertNext(dto -> assertThat(dto.getSprintId()).isEqualTo(sprintId))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("createItem")
    class CreateItem {

        @Test
        @DisplayName("should create item successfully")
        void shouldCreateItemSuccessfully() {
            BacklogItemDto request = new BacklogItemDto();
            request.setRequirementId("req-123");
            request.setStoryPoints(5);

            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.just(testBacklog));
            when(backlogItemRepository.findMaxPriorityOrderByBacklogId(backlogId))
                    .thenReturn(Mono.just(3));
            when(backlogItemRepository.save(any(R2dbcBacklogItem.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.createItem(backlogId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getBacklogId()).isEqualTo(backlogId);
                        assertThat(dto.getRequirementId()).isEqualTo("req-123");
                        assertThat(dto.getPriorityOrder()).isEqualTo(4);
                        assertThat(dto.getStatus()).isEqualTo("BACKLOG");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when backlog not found")
        void shouldThrowErrorWhenBacklogNotFound() {
            BacklogItemDto request = new BacklogItemDto();

            when(backlogRepository.findById(backlogId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.createItem(backlogId, request))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("updateItem")
    class UpdateItem {

        @Test
        @DisplayName("should update item successfully")
        void shouldUpdateItemSuccessfully() {
            BacklogItemDto request = new BacklogItemDto();
            request.setStoryPoints(8);
            request.setStatus("SELECTED");

            when(backlogItemRepository.findById(itemId))
                    .thenReturn(Mono.just(testBacklogItem));
            when(backlogItemRepository.save(any(R2dbcBacklogItem.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.updateItem(itemId, request))
                    .assertNext(dto -> {
                        assertThat(dto.getStoryPoints()).isEqualTo(8);
                        assertThat(dto.getStatus()).isEqualTo("SELECTED");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw error when item not found")
        void shouldThrowErrorWhenItemNotFound() {
            BacklogItemDto request = new BacklogItemDto();

            when(backlogItemRepository.findById(itemId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.updateItem(itemId, request))
                    .expectError(CustomException.class)
                    .verify();
        }
    }

    @Nested
    @DisplayName("selectItemForSprint")
    class SelectItemForSprint {

        @Test
        @DisplayName("should select item for sprint")
        void shouldSelectItemForSprint() {
            when(backlogItemRepository.findById(itemId))
                    .thenReturn(Mono.just(testBacklogItem));
            when(backlogItemRepository.save(any(R2dbcBacklogItem.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.selectItemForSprint(itemId))
                    .assertNext(dto -> assertThat(dto.getStatus()).isEqualTo("SELECTED"))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("assignItemToSprint")
    class AssignItemToSprint {

        @Test
        @DisplayName("should assign item to sprint")
        void shouldAssignItemToSprint() {
            String sprintId = "sprint-123";

            when(backlogItemRepository.findById(itemId))
                    .thenReturn(Mono.just(testBacklogItem));
            when(backlogItemRepository.save(any(R2dbcBacklogItem.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

            StepVerifier.create(backlogService.assignItemToSprint(itemId, sprintId))
                    .assertNext(dto -> {
                        assertThat(dto.getSprintId()).isEqualTo(sprintId);
                        assertThat(dto.getStatus()).isEqualTo("SPRINT");
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("deleteItem")
    class DeleteItem {

        @Test
        @DisplayName("should delete item successfully")
        void shouldDeleteItemSuccessfully() {
            when(backlogItemRepository.findById(itemId))
                    .thenReturn(Mono.just(testBacklogItem));
            when(backlogItemRepository.deleteById(itemId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.deleteItem(itemId))
                    .verifyComplete();

            verify(backlogItemRepository).deleteById(itemId);
        }

        @Test
        @DisplayName("should throw error when item not found")
        void shouldThrowErrorWhenItemNotFound() {
            when(backlogItemRepository.findById(itemId))
                    .thenReturn(Mono.empty());

            StepVerifier.create(backlogService.deleteItem(itemId))
                    .expectError(CustomException.class)
                    .verify();

            verify(backlogItemRepository, never()).deleteById(anyString());
        }
    }

    // ========== Statistics ==========

    @Nested
    @DisplayName("countItemsByBacklog")
    class CountItemsByBacklog {

        @Test
        @DisplayName("should return count of items")
        void shouldReturnCountOfItems() {
            when(backlogItemRepository.countByBacklogId(backlogId))
                    .thenReturn(Mono.just(10L));

            StepVerifier.create(backlogService.countItemsByBacklog(backlogId))
                    .assertNext(count -> assertThat(count).isEqualTo(10L))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("countItemsByBacklogAndStatus")
    class CountItemsByBacklogAndStatus {

        @Test
        @DisplayName("should return count by status")
        void shouldReturnCountByStatus() {
            when(backlogItemRepository.countByBacklogIdAndStatus(backlogId, "SELECTED"))
                    .thenReturn(Mono.just(5L));

            StepVerifier.create(backlogService.countItemsByBacklogAndStatus(backlogId, "SELECTED"))
                    .assertNext(count -> assertThat(count).isEqualTo(5L))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("sumStoryPointsForSelectedItems")
    class SumStoryPointsForSelectedItems {

        @Test
        @DisplayName("should return sum of story points")
        void shouldReturnSumOfStoryPoints() {
            when(backlogItemRepository.sumStoryPointsForSelectedItems(backlogId))
                    .thenReturn(Mono.just(21));

            StepVerifier.create(backlogService.sumStoryPointsForSelectedItems(backlogId))
                    .assertNext(sum -> assertThat(sum).isEqualTo(21))
                    .verifyComplete();
        }
    }
}
