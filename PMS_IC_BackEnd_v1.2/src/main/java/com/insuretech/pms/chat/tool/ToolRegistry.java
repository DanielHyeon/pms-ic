package com.insuretech.pms.chat.tool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry for managing available tools
 */
@Slf4j
@Component
public class ToolRegistry {

    private final Map<String, ToolExecutor> tools = new ConcurrentHashMap<>();

    public ToolRegistry(List<ToolExecutor> executors) {
        executors.forEach(this::register);
        log.info("Registered {} tools: {}", tools.size(), tools.keySet());
    }

    public void register(ToolExecutor executor) {
        tools.put(executor.getName(), executor);
        log.debug("Registered tool: {}", executor.getName());
    }

    public Optional<ToolExecutor> get(String name) {
        return Optional.ofNullable(tools.get(name));
    }

    public List<ToolDefinition> getAllDefinitions() {
        return tools.values().stream()
                .map(ToolExecutor::getDefinition)
                .toList();
    }

    public List<Map<String, Object>> toOpenAiFormat() {
        return tools.values().stream()
                .map(ToolExecutor::getDefinition)
                .map(ToolDefinition::toOpenAiFormat)
                .toList();
    }

    public boolean hasTools() {
        return !tools.isEmpty();
    }

    public Set<String> getToolNames() {
        return new HashSet<>(tools.keySet());
    }
}
