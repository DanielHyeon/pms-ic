package com.insuretech.pms.chat.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
