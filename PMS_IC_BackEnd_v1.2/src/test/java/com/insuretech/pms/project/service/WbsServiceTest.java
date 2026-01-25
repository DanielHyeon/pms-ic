package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.WbsGroupDto;
import com.insuretech.pms.project.dto.WbsItemDto;
import com.insuretech.pms.project.dto.WbsTaskDto;
import com.insuretech.pms.project.entity.Phase;
import com.insuretech.pms.project.entity.WbsGroup;
import com.insuretech.pms.project.entity.WbsItem;
import com.insuretech.pms.project.entity.WbsTask;
import com.insuretech.pms.project.repository.PhaseRepository;
import com.insuretech.pms.project.repository.WbsGroupRepository;
import com.insuretech.pms.project.repository.WbsItemRepository;
import com.insuretech.pms.project.repository.WbsTaskRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WbsService Tests")
class WbsServiceTest {

    @Mock
    private WbsGroupRepository wbsGroupRepository;

    @Mock
    private WbsItemRepository wbsItemRepository;

    @Mock
    private WbsTaskRepository wbsTaskRepository;

    @Mock
    private PhaseRepository phaseRepository;

    @InjectMocks
    private WbsService wbsService;

    private static final String PHASE_ID = "phase-001";
    private static final String GROUP_ID = "group-001";
    private static final String ITEM_ID = "item-001";
    private static final String TASK_ID = "task-001";

    private Phase testPhase;
    private WbsGroup testGroup;
    private WbsItem testItem;
    private WbsTask testTask;

    @BeforeEach
    void setUp() {
        testPhase = Phase.builder()
                .id(PHASE_ID)
                .name("Analysis Phase")
                .build();

        testGroup = WbsGroup.builder()
                .id(GROUP_ID)
                .phase(testPhase)
                .code("1.1")
                .name("Requirements Analysis")
                .status(WbsGroup.WbsStatus.IN_PROGRESS)
                .progress(30)
                .weight(100)
                .orderNum(0)
                .build();

        testItem = WbsItem.builder()
                .id(ITEM_ID)
                .group(testGroup)
                .phase(testPhase)
                .code("1.1.1")
                .name("Gather Requirements")
                .status(WbsGroup.WbsStatus.IN_PROGRESS)
                .progress(50)
                .weight(100)
                .orderNum(0)
                .build();

        testTask = WbsTask.builder()
                .id(TASK_ID)
                .item(testItem)
                .group(testGroup)
                .phase(testPhase)
                .code("1.1.1.1")
                .name("Interview Stakeholders")
                .status(WbsGroup.WbsStatus.COMPLETED)
                .progress(100)
                .weight(100)
                .orderNum(0)
                .build();
    }

    @Nested
    @DisplayName("WBS Group Operations")
    class WbsGroupTests {

        @Test
        @DisplayName("Should get groups by phase ID")
        void shouldGetGroupsByPhase() {
            when(wbsGroupRepository.findByPhaseIdOrderByOrderNumAsc(PHASE_ID))
                    .thenReturn(Arrays.asList(testGroup));

            List<WbsGroupDto> result = wbsService.getGroupsByPhase(PHASE_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Requirements Analysis");
            assertThat(result.get(0).getCode()).isEqualTo("1.1");
        }

        @Test
        @DisplayName("Should get group by ID")
        void shouldGetGroupById() {
            when(wbsGroupRepository.findById(GROUP_ID))
                    .thenReturn(Optional.of(testGroup));

            WbsGroupDto result = wbsService.getGroupById(GROUP_ID);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(GROUP_ID);
            assertThat(result.getName()).isEqualTo("Requirements Analysis");
        }

        @Test
        @DisplayName("Should throw exception when group not found")
        void shouldThrowExceptionWhenGroupNotFound() {
            when(wbsGroupRepository.findById("non-existent"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> wbsService.getGroupById("non-existent"))
                    .isInstanceOf(CustomException.class);
        }

        @Test
        @DisplayName("Should create new group")
        void shouldCreateGroup() {
            WbsGroupDto request = WbsGroupDto.builder()
                    .code("1.2")
                    .name("Design")
                    .description("Design phase work")
                    .status("NOT_STARTED")
                    .weight(100)
                    .build();

            when(phaseRepository.findById(PHASE_ID)).thenReturn(Optional.of(testPhase));
            when(wbsGroupRepository.countByPhaseId(PHASE_ID)).thenReturn(1L);
            when(wbsGroupRepository.save(any(WbsGroup.class))).thenAnswer(invocation -> {
                WbsGroup saved = invocation.getArgument(0);
                saved.setId("group-new");
                return saved;
            });

            WbsGroupDto result = wbsService.createGroup(PHASE_ID, request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Design");
            verify(wbsGroupRepository, times(1)).save(any(WbsGroup.class));
        }

        @Test
        @DisplayName("Should update existing group")
        void shouldUpdateGroup() {
            WbsGroupDto request = WbsGroupDto.builder()
                    .name("Updated Name")
                    .progress(50)
                    .build();

            when(wbsGroupRepository.findById(GROUP_ID)).thenReturn(Optional.of(testGroup));
            when(wbsGroupRepository.save(any(WbsGroup.class))).thenReturn(testGroup);

            WbsGroupDto result = wbsService.updateGroup(GROUP_ID, request);

            assertThat(result).isNotNull();
            verify(wbsGroupRepository, times(1)).save(any(WbsGroup.class));
        }

        @Test
        @DisplayName("Should delete group")
        void shouldDeleteGroup() {
            when(wbsGroupRepository.findById(GROUP_ID)).thenReturn(Optional.of(testGroup));
            doNothing().when(wbsGroupRepository).delete(testGroup);

            wbsService.deleteGroup(GROUP_ID);

            verify(wbsGroupRepository, times(1)).delete(testGroup);
        }
    }

    @Nested
    @DisplayName("WBS Item Operations")
    class WbsItemTests {

        @Test
        @DisplayName("Should get items by group ID")
        void shouldGetItemsByGroup() {
            when(wbsItemRepository.findByGroupIdOrderByOrderNumAsc(GROUP_ID))
                    .thenReturn(Arrays.asList(testItem));

            List<WbsItemDto> result = wbsService.getItemsByGroup(GROUP_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Gather Requirements");
        }

        @Test
        @DisplayName("Should get item by ID")
        void shouldGetItemById() {
            when(wbsItemRepository.findById(ITEM_ID))
                    .thenReturn(Optional.of(testItem));

            WbsItemDto result = wbsService.getItemById(ITEM_ID);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(ITEM_ID);
        }

        @Test
        @DisplayName("Should create new item")
        void shouldCreateItem() {
            WbsItemDto request = WbsItemDto.builder()
                    .code("1.1.2")
                    .name("Document Requirements")
                    .status("NOT_STARTED")
                    .weight(100)
                    .estimatedHours(16)
                    .build();

            when(wbsGroupRepository.findById(GROUP_ID)).thenReturn(Optional.of(testGroup));
            when(wbsItemRepository.countByGroupId(GROUP_ID)).thenReturn(1L);
            when(wbsItemRepository.save(any(WbsItem.class))).thenAnswer(invocation -> {
                WbsItem saved = invocation.getArgument(0);
                saved.setId("item-new");
                return saved;
            });

            WbsItemDto result = wbsService.createItem(GROUP_ID, request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Document Requirements");
            verify(wbsItemRepository, times(1)).save(any(WbsItem.class));
        }

        @Test
        @DisplayName("Should update existing item")
        void shouldUpdateItem() {
            WbsItemDto request = WbsItemDto.builder()
                    .name("Updated Item Name")
                    .progress(75)
                    .actualHours(12)
                    .build();

            when(wbsItemRepository.findById(ITEM_ID)).thenReturn(Optional.of(testItem));
            when(wbsItemRepository.save(any(WbsItem.class))).thenReturn(testItem);

            WbsItemDto result = wbsService.updateItem(ITEM_ID, request);

            assertThat(result).isNotNull();
            verify(wbsItemRepository, times(1)).save(any(WbsItem.class));
        }

        @Test
        @DisplayName("Should delete item")
        void shouldDeleteItem() {
            when(wbsItemRepository.findById(ITEM_ID)).thenReturn(Optional.of(testItem));
            doNothing().when(wbsItemRepository).delete(testItem);

            wbsService.deleteItem(ITEM_ID);

            verify(wbsItemRepository, times(1)).delete(testItem);
        }
    }

    @Nested
    @DisplayName("WBS Task Operations")
    class WbsTaskTests {

        @Test
        @DisplayName("Should get tasks by item ID")
        void shouldGetTasksByItem() {
            when(wbsTaskRepository.findByItemIdOrderByOrderNumAsc(ITEM_ID))
                    .thenReturn(Arrays.asList(testTask));

            List<WbsTaskDto> result = wbsService.getTasksByItem(ITEM_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Interview Stakeholders");
        }

        @Test
        @DisplayName("Should get task by ID")
        void shouldGetTaskById() {
            when(wbsTaskRepository.findById(TASK_ID))
                    .thenReturn(Optional.of(testTask));

            WbsTaskDto result = wbsService.getTaskById(TASK_ID);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(TASK_ID);
            assertThat(result.getProgress()).isEqualTo(100);
        }

        @Test
        @DisplayName("Should create new task")
        void shouldCreateTask() {
            WbsTaskDto request = WbsTaskDto.builder()
                    .code("1.1.1.2")
                    .name("Analyze Feedback")
                    .status("NOT_STARTED")
                    .weight(100)
                    .estimatedHours(8)
                    .build();

            when(wbsItemRepository.findById(ITEM_ID)).thenReturn(Optional.of(testItem));
            when(wbsTaskRepository.countByItemId(ITEM_ID)).thenReturn(1L);
            when(wbsTaskRepository.save(any(WbsTask.class))).thenAnswer(invocation -> {
                WbsTask saved = invocation.getArgument(0);
                saved.setId("task-new");
                return saved;
            });

            WbsTaskDto result = wbsService.createTask(ITEM_ID, request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Analyze Feedback");
            verify(wbsTaskRepository, times(1)).save(any(WbsTask.class));
        }

        @Test
        @DisplayName("Should update existing task")
        void shouldUpdateTask() {
            WbsTaskDto request = WbsTaskDto.builder()
                    .name("Updated Task")
                    .progress(100)
                    .linkedTaskId("linked-task-001")
                    .build();

            when(wbsTaskRepository.findById(TASK_ID)).thenReturn(Optional.of(testTask));
            when(wbsTaskRepository.save(any(WbsTask.class))).thenReturn(testTask);

            WbsTaskDto result = wbsService.updateTask(TASK_ID, request);

            assertThat(result).isNotNull();
            verify(wbsTaskRepository, times(1)).save(any(WbsTask.class));
        }

        @Test
        @DisplayName("Should delete task")
        void shouldDeleteTask() {
            when(wbsTaskRepository.findById(TASK_ID)).thenReturn(Optional.of(testTask));
            doNothing().when(wbsTaskRepository).delete(testTask);

            wbsService.deleteTask(TASK_ID);

            verify(wbsTaskRepository, times(1)).delete(testTask);
        }
    }

    @Nested
    @DisplayName("Progress Calculation")
    class ProgressCalculationTests {

        @Test
        @DisplayName("Should recalculate group progress from items")
        void shouldRecalculateGroupProgress() {
            WbsItem item1 = WbsItem.builder()
                    .id("item-1")
                    .progress(100)
                    .weight(50)
                    .build();
            WbsItem item2 = WbsItem.builder()
                    .id("item-2")
                    .progress(50)
                    .weight(50)
                    .build();

            when(wbsGroupRepository.findById(GROUP_ID)).thenReturn(Optional.of(testGroup));
            when(wbsItemRepository.findByGroupIdOrderByOrderNumAsc(GROUP_ID))
                    .thenReturn(Arrays.asList(item1, item2));
            when(wbsGroupRepository.save(any(WbsGroup.class))).thenReturn(testGroup);

            wbsService.recalculateGroupProgress(GROUP_ID);

            verify(wbsGroupRepository, times(1)).save(argThat(group ->
                    group.getProgress() == 75 // (100*50 + 50*50) / 100 = 75
            ));
        }

        @Test
        @DisplayName("Should set progress to 0 when no items exist")
        void shouldSetProgressToZeroWhenNoItems() {
            when(wbsGroupRepository.findById(GROUP_ID)).thenReturn(Optional.of(testGroup));
            when(wbsItemRepository.findByGroupIdOrderByOrderNumAsc(GROUP_ID))
                    .thenReturn(Arrays.asList());
            when(wbsGroupRepository.save(any(WbsGroup.class))).thenReturn(testGroup);

            wbsService.recalculateGroupProgress(GROUP_ID);

            verify(wbsGroupRepository, times(1)).save(argThat(group ->
                    group.getProgress() == 0
            ));
        }
    }
}
