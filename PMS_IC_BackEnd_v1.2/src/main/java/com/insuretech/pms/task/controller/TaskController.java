package com.insuretech.pms.task.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.task.dto.KanbanColumnResponse;
import com.insuretech.pms.task.dto.TaskRequest;
import com.insuretech.pms.task.dto.TaskResponse;
import com.insuretech.pms.task.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Tasks", description = "태스크 관리 API")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "태스크 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getAllTasks() {
        List<TaskResponse> tasks = taskService.getAllTasks();
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    @Operation(summary = "태스크 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(@RequestBody TaskRequest request) {
        TaskResponse task = taskService.createTask(request);
        return ResponseEntity.ok(ApiResponse.success("Task created", task));
    }

    @Operation(summary = "태스크 수정")
    @PutMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable String taskId,
            @RequestBody TaskRequest request) {
        TaskResponse task = taskService.updateTask(taskId, request);
        return ResponseEntity.ok(ApiResponse.success("Task updated", task));
    }

    @Operation(summary = "태스크 삭제")
    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable String taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("Task deleted", null));
    }

    @Operation(summary = "태스크 컬럼 이동")
    @PutMapping("/{taskId}/move")
    public ResponseEntity<ApiResponse<TaskResponse>> moveTask(
            @PathVariable String taskId,
            @RequestBody Map<String, String> request) {
        String toColumn = request.get("toColumn");
        TaskResponse task = taskService.moveTask(taskId, toColumn);
        return ResponseEntity.ok(ApiResponse.success("Task moved", task));
    }

    @Operation(summary = "칸반 컬럼 목록 조회")
    @GetMapping("/columns")
    public ResponseEntity<ApiResponse<List<KanbanColumnResponse>>> getColumns() {
        List<KanbanColumnResponse> columns = taskService.getAllColumns();
        return ResponseEntity.ok(ApiResponse.success(columns));
    }
}