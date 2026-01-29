package com.insuretech.pms.chat.tool;

import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Interface for tool executors
 */
public interface ToolExecutor {

    /**
     * Get the name of this tool
     */
    String getName();

    /**
     * Get the tool definition for LLM
     */
    ToolDefinition getDefinition();

    /**
     * Execute the tool with given arguments
     */
    Mono<ToolResult> execute(String toolCallId, Map<String, Object> arguments, ToolContext context);
}
