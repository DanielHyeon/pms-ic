package com.insuretech.pms.chat.tool.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.chat.tool.*;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Tool for getting project status information
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GetProjectStatusTool implements ToolExecutor {

    private final ReactiveProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "getProjectStatus";
    }

    @Override
    public ToolDefinition getDefinition() {
        return ToolDefinition.builder()
                .name(getName())
                .description("Get the current status and details of a project")
                .parameters(Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "projectId", Map.of(
                                        "type", "string",
                                        "description", "The ID of the project to get status for"
                                )
                        ),
                        "required", new String[]{"projectId"}
                ))
                .requiresAuth(true)
                .requiredRoles(new String[]{"MEMBER", "VIEWER"})
                .build();
    }

    @Override
    public Mono<ToolResult> execute(String toolCallId, Map<String, Object> arguments, ToolContext context) {
        String projectId = (String) arguments.get("projectId");

        if (projectId == null || projectId.isBlank()) {
            projectId = context.getProjectId();
        }

        if (projectId == null || projectId.isBlank()) {
            return Mono.just(ToolResult.failure(toolCallId, getName(), "Project ID is required"));
        }

        final String finalProjectId = projectId;

        return projectRepository.findById(finalProjectId)
                .flatMap(project -> {
                    try {
                        Map<String, Object> statusInfo = Map.of(
                                "id", project.getId(),
                                "name", project.getName(),
                                "status", project.getStatus() != null ? project.getStatus() : "N/A",
                                "startDate", project.getStartDate() != null ? project.getStartDate().toString() : "N/A",
                                "endDate", project.getEndDate() != null ? project.getEndDate().toString() : "N/A"
                        );

                        String output = objectMapper.writeValueAsString(statusInfo);
                        return Mono.just(ToolResult.success(toolCallId, getName(), output));
                    } catch (Exception e) {
                        return Mono.just(ToolResult.failure(toolCallId, getName(), "Failed to serialize project status"));
                    }
                })
                .switchIfEmpty(Mono.just(ToolResult.failure(toolCallId, getName(), "Project not found: " + finalProjectId)))
                .onErrorResume(e -> {
                    log.error("Error getting project status: {}", e.getMessage());
                    return Mono.just(ToolResult.failure(toolCallId, getName(), e.getMessage()));
                });
    }
}
