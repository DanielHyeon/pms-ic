package com.insuretech.pms.chat.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response format specification for structured output
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponseFormat {
    private String type;            // "json_object" | "json_schema"
    private Map<String, Object> jsonSchema;

    public static ResponseFormat jsonObject() {
        return ResponseFormat.builder()
                .type("json_object")
                .build();
    }

    public static ResponseFormat jsonSchema(Map<String, Object> schema) {
        return ResponseFormat.builder()
                .type("json_schema")
                .jsonSchema(schema)
                .build();
    }

    /**
     * Convert to Map for OpenAI API request
     */
    public Map<String, Object> toMap() {
        if ("json_schema".equals(type) && jsonSchema != null) {
            return Map.of("type", type, "json_schema", jsonSchema);
        }
        return Map.of("type", type != null ? type : "json_object");
    }
}
