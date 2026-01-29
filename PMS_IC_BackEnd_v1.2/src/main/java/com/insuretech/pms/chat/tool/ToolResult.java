package com.insuretech.pms.chat.tool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of tool execution
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolResult {
    private String toolCallId;
    private String toolName;
    private boolean success;
    private String output;
    private String error;

    public static ToolResult success(String toolCallId, String toolName, String output) {
        return ToolResult.builder()
                .toolCallId(toolCallId)
                .toolName(toolName)
                .success(true)
                .output(output)
                .build();
    }

    public static ToolResult failure(String toolCallId, String toolName, String error) {
        return ToolResult.builder()
                .toolCallId(toolCallId)
                .toolName(toolName)
                .success(false)
                .error(error)
                .build();
    }

    public String getContent() {
        return success ? output : "Error: " + error;
    }
}
