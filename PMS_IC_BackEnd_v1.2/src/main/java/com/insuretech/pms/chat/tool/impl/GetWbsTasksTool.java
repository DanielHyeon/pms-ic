package com.insuretech.pms.chat.tool.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.chat.tool.*;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsGroupRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.*;

/**
 * Tool for searching WBS tasks by keywords and getting task assignment information
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GetWbsTasksTool implements ToolExecutor {

    private final ReactiveWbsTaskRepository taskRepository;
    private final ReactivePhaseRepository phaseRepository;
    private final ReactiveWbsGroupRepository groupRepository;
    private final ReactiveWbsItemRepository itemRepository;
    private final ReactiveUserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "getWbsTasks";
    }

    @Override
    public ToolDefinition getDefinition() {
        return ToolDefinition.builder()
                .name(getName())
                .description("Search WBS tasks by keywords to find task details including assignee information. " +
                        "Use this tool when user asks about who is working on a specific task, " +
                        "task status, progress, or any task-related questions.")
                .parameters(Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "keyword", Map.of(
                                        "type", "string",
                                        "description", "Search keyword to find tasks (matches task name or description)"
                                ),
                                "projectId", Map.of(
                                        "type", "string",
                                        "description", "The project ID to search tasks in (optional, uses current project if not provided)"
                                )
                        ),
                        "required", new String[]{"keyword"}
                ))
                .requiresAuth(true)
                .requiredRoles(new String[]{"MEMBER", "VIEWER"})
                .build();
    }

    @Override
    public Mono<ToolResult> execute(String toolCallId, Map<String, Object> arguments, ToolContext context) {
        String keyword = (String) arguments.get("keyword");
        String projectId = (String) arguments.get("projectId");

        if (keyword == null || keyword.isBlank()) {
            return Mono.just(ToolResult.failure(toolCallId, getName(), "Search keyword is required"));
        }

        if (projectId == null || projectId.isBlank()) {
            projectId = context.getProjectId();
        }

        if (projectId == null || projectId.isBlank()) {
            return Mono.just(ToolResult.failure(toolCallId, getName(), "Project ID is required"));
        }

        final String finalProjectId = projectId;
        log.info("Searching WBS tasks with keyword '{}' in project '{}'", keyword, finalProjectId);

        return taskRepository.searchByKeyword(finalProjectId, keyword)
                .flatMap(this::enrichTaskWithDetails)
                .collectList()
                .flatMap(tasks -> {
                    if (tasks.isEmpty()) {
                        return Mono.just(ToolResult.success(toolCallId, getName(),
                                "No tasks found matching keyword: " + keyword));
                    }
                    try {
                        Map<String, Object> result = Map.of(
                                "totalFound", tasks.size(),
                                "keyword", keyword,
                                "tasks", tasks
                        );
                        String output = objectMapper.writeValueAsString(result);
                        return Mono.just(ToolResult.success(toolCallId, getName(), output));
                    } catch (Exception e) {
                        log.error("Failed to serialize task results", e);
                        return Mono.just(ToolResult.failure(toolCallId, getName(), "Failed to serialize results"));
                    }
                })
                .onErrorResume(e -> {
                    log.error("Error searching WBS tasks: {}", e.getMessage(), e);
                    return Mono.just(ToolResult.failure(toolCallId, getName(), e.getMessage()));
                });
    }

    private Mono<Map<String, Object>> enrichTaskWithDetails(R2dbcWbsTask task) {
        return Mono.zip(
                phaseRepository.findById(task.getPhaseId()).defaultIfEmpty(null),
                groupRepository.findById(task.getGroupId()).defaultIfEmpty(null),
                itemRepository.findById(task.getItemId()).defaultIfEmpty(null),
                task.getAssigneeId() != null
                        ? userRepository.findById(task.getAssigneeId()).defaultIfEmpty(null)
                        : Mono.just(Optional.empty())
        ).map(tuple -> {
            Map<String, Object> taskInfo = new LinkedHashMap<>();

            // Basic task info
            taskInfo.put("taskId", task.getId());
            taskInfo.put("taskCode", task.getCode());
            taskInfo.put("taskName", task.getName());
            taskInfo.put("description", task.getDescription() != null ? task.getDescription() : "");
            taskInfo.put("status", task.getStatus());
            taskInfo.put("progress", task.getProgress() + "%");

            // Dates
            if (task.getPlannedStartDate() != null) {
                taskInfo.put("plannedStartDate", task.getPlannedStartDate().toString());
            }
            if (task.getPlannedEndDate() != null) {
                taskInfo.put("plannedEndDate", task.getPlannedEndDate().toString());
            }

            // Estimated hours
            if (task.getEstimatedHours() != null) {
                taskInfo.put("estimatedHours", task.getEstimatedHours() + " hours");
            }

            // Assignee info
            Object assigneeObj = tuple.getT4();
            if (assigneeObj != null && !(assigneeObj instanceof Optional && ((Optional<?>) assigneeObj).isEmpty())) {
                if (assigneeObj instanceof com.insuretech.pms.auth.reactive.entity.R2dbcUser user) {
                    taskInfo.put("assigneeId", user.getId());
                    taskInfo.put("assigneeName", user.getName());
                    taskInfo.put("assigneeEmail", user.getEmail());
                    taskInfo.put("assigneeRole", user.getRole());
                } else {
                    taskInfo.put("assigneeId", task.getAssigneeId());
                    taskInfo.put("assigneeName", "Unknown");
                }
            } else {
                taskInfo.put("assigneeId", null);
                taskInfo.put("assigneeName", "Not assigned");
            }

            // Phase info
            if (tuple.getT1() != null) {
                taskInfo.put("phaseName", tuple.getT1().getName());
                taskInfo.put("phaseId", tuple.getT1().getId());
            }

            // Group info
            if (tuple.getT2() != null) {
                taskInfo.put("groupName", tuple.getT2().getName());
                taskInfo.put("groupId", tuple.getT2().getId());
            }

            // Item info
            if (tuple.getT3() != null) {
                taskInfo.put("itemName", tuple.getT3().getName());
                taskInfo.put("itemId", tuple.getT3().getId());
            }

            return taskInfo;
        });
    }
}
