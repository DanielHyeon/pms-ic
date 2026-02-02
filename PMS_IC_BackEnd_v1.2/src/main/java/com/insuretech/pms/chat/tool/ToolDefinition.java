package com.insuretech.pms.chat.tool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Represents a tool that can be called by the LLM
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolDefinition {
    private String name;
    private String description;
    private Map<String, Object> parameters;
    private boolean requiresAuth;
    private String[] requiredRoles;

    public static ToolDefinition function(String name, String description, Map<String, Object> parameters) {
        return ToolDefinition.builder()
                .name(name)
                .description(description)
                .parameters(parameters)
                .requiresAuth(false)
                .build();
    }

    public Map<String, Object> toOpenAiFormat() {
        return Map.of(
                "type", "function",
                "function", Map.of(
                        "name", name,
                        "description", description,
                        "parameters", parameters != null ? parameters : Map.of()
                )
        );
    }
}
