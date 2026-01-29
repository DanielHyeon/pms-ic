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
}
