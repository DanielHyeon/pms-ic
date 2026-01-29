package com.insuretech.pms.chat.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tool definition for LLM function calling
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolDefinition {
    private String type;            // "function"
    private FunctionDef function;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FunctionDef {
        private String name;
        private String description;
        private Map<String, Object> parameters;  // JSON Schema
    }

    public static ToolDefinition function(String name, String description, Map<String, Object> parameters) {
        return ToolDefinition.builder()
                .type("function")
                .function(FunctionDef.builder()
                        .name(name)
                        .description(description)
                        .parameters(parameters)
                        .build())
                .build();
    }

    /**
     * Convert to Map for OpenAI API request
     */
    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("type", type != null ? type : "function");
        if (function != null) {
            Map<String, Object> funcMap = new HashMap<>();
            funcMap.put("name", function.getName());
            funcMap.put("description", function.getDescription());
            if (function.getParameters() != null) {
                funcMap.put("parameters", function.getParameters());
            }
            map.put("function", funcMap);
        }
        return map;
    }

    /**
     * Convert list of ToolDefinitions to list of Maps
     */
    public static List<Map<String, Object>> toMapList(List<ToolDefinition> tools) {
        if (tools == null) return null;
        return tools.stream().map(ToolDefinition::toMap).toList();
    }
}
