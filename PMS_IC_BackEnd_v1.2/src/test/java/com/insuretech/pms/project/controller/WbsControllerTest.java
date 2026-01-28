package com.insuretech.pms.project.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.project.dto.WbsGroupDto;
import com.insuretech.pms.project.dto.WbsItemDto;
import com.insuretech.pms.project.dto.WbsTaskDto;
import com.insuretech.pms.project.service.WbsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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

@WebMvcTest(WbsController.class)
@DisplayName("WbsController Tests")
class WbsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WbsService wbsService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String PHASE_ID = "phase-001";
    private static final String GROUP_ID = "group-001";
    private static final String ITEM_ID = "item-001";
    private static final String TASK_ID = "task-001";

    private WbsGroupDto testGroup;
    private WbsItemDto testItem;
    private WbsTaskDto testTask;

    @BeforeEach
    void setUp() {
        testGroup = WbsGroupDto.builder()
                .id(GROUP_ID)
                .phaseId(PHASE_ID)
                .code("1.1")
                .name("Analysis")
                .description("Analysis phase work")
                .status("NOT_STARTED")
                .progress(0)
                .weight(100)
                .orderNum(0)
                .plannedStartDate(LocalDate.now())
                .plannedEndDate(LocalDate.now().plusDays(30))
                .build();

        testItem = WbsItemDto.builder()
                .id(ITEM_ID)
                .groupId(GROUP_ID)
                .phaseId(PHASE_ID)
                .code("1.1.1")
                .name("Requirements Gathering")
                .description("Gather requirements from stakeholders")
                .status("NOT_STARTED")
                .progress(0)
                .weight(100)
                .orderNum(0)
                .estimatedHours(40)
                .build();

        testTask = WbsTaskDto.builder()
                .id(TASK_ID)
                .itemId(ITEM_ID)
                .groupId(GROUP_ID)
                .phaseId(PHASE_ID)
                .code("1.1.1.1")
                .name("Interview stakeholders")
                .description("Conduct interviews")
                .status("NOT_STARTED")
                .progress(0)
                .weight(100)
                .orderNum(0)
                .estimatedHours(8)
                .build();
    }

    // ============ WBS Group Tests ============

    @Test
    @WithMockUser
    @DisplayName("GET /phases/{phaseId}/wbs/groups should return groups for phase")
    void testGetGroupsByPhase() throws Exception {
        List<WbsGroupDto> groups = Arrays.asList(testGroup);
        when(wbsService.getGroupsByPhase(PHASE_ID)).thenReturn(groups);

        mockMvc.perform(get("/api/phases/{phaseId}/wbs/groups", PHASE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(GROUP_ID))
                .andExpect(jsonPath("$.data[0].name").value("Analysis"));

        verify(wbsService).getGroupsByPhase(PHASE_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /wbs/groups/{groupId} should return group by ID")
    void testGetGroup() throws Exception {
        when(wbsService.getGroupById(GROUP_ID)).thenReturn(testGroup);

        mockMvc.perform(get("/api/wbs/groups/{groupId}", GROUP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(GROUP_ID))
                .andExpect(jsonPath("$.data.code").value("1.1"));

        verify(wbsService).getGroupById(GROUP_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /phases/{phaseId}/wbs/groups should create group")
    void testCreateGroup() throws Exception {
        when(wbsService.createGroup(eq(PHASE_ID), any(WbsGroupDto.class))).thenReturn(testGroup);

        mockMvc.perform(post("/api/phases/{phaseId}/wbs/groups", PHASE_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testGroup)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(GROUP_ID));

        verify(wbsService).createGroup(eq(PHASE_ID), any(WbsGroupDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("PUT /wbs/groups/{groupId} should update group")
    void testUpdateGroup() throws Exception {
        testGroup.setName("Updated Analysis");
        when(wbsService.updateGroup(eq(GROUP_ID), any(WbsGroupDto.class))).thenReturn(testGroup);

        mockMvc.perform(put("/api/wbs/groups/{groupId}", GROUP_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testGroup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Updated Analysis"));

        verify(wbsService).updateGroup(eq(GROUP_ID), any(WbsGroupDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /wbs/groups/{groupId} should delete group")
    void testDeleteGroup() throws Exception {
        doNothing().when(wbsService).deleteGroup(GROUP_ID);

        mockMvc.perform(delete("/api/wbs/groups/{groupId}", GROUP_ID)
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(wbsService).deleteGroup(GROUP_ID);
    }

    // ============ WBS Item Tests ============

    @Test
    @WithMockUser
    @DisplayName("GET /wbs/groups/{groupId}/items should return items for group")
    void testGetItemsByGroup() throws Exception {
        List<WbsItemDto> items = Arrays.asList(testItem);
        when(wbsService.getItemsByGroup(GROUP_ID)).thenReturn(items);

        mockMvc.perform(get("/api/wbs/groups/{groupId}/items", GROUP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(ITEM_ID));

        verify(wbsService).getItemsByGroup(GROUP_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /wbs/items/{itemId} should return item by ID")
    void testGetItem() throws Exception {
        when(wbsService.getItemById(ITEM_ID)).thenReturn(testItem);

        mockMvc.perform(get("/api/wbs/items/{itemId}", ITEM_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(ITEM_ID))
                .andExpect(jsonPath("$.data.code").value("1.1.1"));

        verify(wbsService).getItemById(ITEM_ID);
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("POST /wbs/groups/{groupId}/items should create item")
    void testCreateItem() throws Exception {
        when(wbsService.createItem(eq(GROUP_ID), any(WbsItemDto.class))).thenReturn(testItem);

        mockMvc.perform(post("/api/wbs/groups/{groupId}/items", GROUP_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testItem)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(ITEM_ID));

        verify(wbsService).createItem(eq(GROUP_ID), any(WbsItemDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("PUT /wbs/items/{itemId} should update item")
    void testUpdateItem() throws Exception {
        testItem.setProgress(50);
        when(wbsService.updateItem(eq(ITEM_ID), any(WbsItemDto.class))).thenReturn(testItem);

        mockMvc.perform(put("/api/wbs/items/{itemId}", ITEM_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testItem)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progress").value(50));

        verify(wbsService).updateItem(eq(ITEM_ID), any(WbsItemDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /wbs/items/{itemId} should delete item")
    void testDeleteItem() throws Exception {
        doNothing().when(wbsService).deleteItem(ITEM_ID);

        mockMvc.perform(delete("/api/wbs/items/{itemId}", ITEM_ID)
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(wbsService).deleteItem(ITEM_ID);
    }

    // ============ WBS Task Tests ============

    @Test
    @WithMockUser
    @DisplayName("GET /wbs/items/{itemId}/tasks should return tasks for item")
    void testGetTasksByItem() throws Exception {
        List<WbsTaskDto> tasks = Arrays.asList(testTask);
        when(wbsService.getTasksByItem(ITEM_ID)).thenReturn(tasks);

        mockMvc.perform(get("/api/wbs/items/{itemId}/tasks", ITEM_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(TASK_ID));

        verify(wbsService).getTasksByItem(ITEM_ID);
    }

    @Test
    @WithMockUser
    @DisplayName("GET /wbs/tasks/{taskId} should return task by ID")
    void testGetTask() throws Exception {
        when(wbsService.getTaskById(TASK_ID)).thenReturn(testTask);

        mockMvc.perform(get("/api/wbs/tasks/{taskId}", TASK_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(TASK_ID))
                .andExpect(jsonPath("$.data.code").value("1.1.1.1"));

        verify(wbsService).getTaskById(TASK_ID);
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    @DisplayName("POST /wbs/items/{itemId}/tasks should create task")
    void testCreateTask() throws Exception {
        when(wbsService.createTask(eq(ITEM_ID), any(WbsTaskDto.class))).thenReturn(testTask);

        mockMvc.perform(post("/api/wbs/items/{itemId}/tasks", ITEM_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testTask)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(TASK_ID));

        verify(wbsService).createTask(eq(ITEM_ID), any(WbsTaskDto.class));
    }

    @Test
    @WithMockUser(roles = "DEVELOPER")
    @DisplayName("PUT /wbs/tasks/{taskId} should update task")
    void testUpdateTask() throws Exception {
        testTask.setStatus("IN_PROGRESS");
        when(wbsService.updateTask(eq(TASK_ID), any(WbsTaskDto.class))).thenReturn(testTask);

        mockMvc.perform(put("/api/wbs/tasks/{taskId}", TASK_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testTask)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        verify(wbsService).updateTask(eq(TASK_ID), any(WbsTaskDto.class));
    }

    @Test
    @WithMockUser(roles = "PM")
    @DisplayName("DELETE /wbs/tasks/{taskId} should delete task")
    void testDeleteTask() throws Exception {
        doNothing().when(wbsService).deleteTask(TASK_ID);

        mockMvc.perform(delete("/api/wbs/tasks/{taskId}", TASK_ID)
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(wbsService).deleteTask(TASK_ID);
    }
}
