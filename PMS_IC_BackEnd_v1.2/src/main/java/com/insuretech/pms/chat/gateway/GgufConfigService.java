package com.insuretech.pms.chat.gateway;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for managing GGUF configuration dynamically.
 * Allows runtime enable/disable of GGUF engine.
 */
@Slf4j
@Service
public class GgufConfigService {

    @Value("${llm.workers.gguf.url:http://localhost:8000}")
    private String defaultUrl;

    @Value("${llm.workers.gguf.enabled:true}")
    private boolean defaultEnabled;

    @Value("${llm.workers.gguf.model:gemma-3-12b}")
    private String defaultModel;

    @Value("${llm.workers.gguf.tool-calling:false}")
    private boolean toolCalling;

    @Value("${llm.workers.gguf.json-schema:false}")
    private boolean jsonSchema;

    @Getter
    private volatile String currentUrl;

    @Getter
    private volatile String currentModel;

    @Getter
    private volatile boolean enabled;

    @Getter
    private volatile Instant lastUpdated;

    @PostConstruct
    public void init() {
        this.currentUrl = defaultUrl;
        this.currentModel = defaultModel;
        this.enabled = defaultEnabled;
        this.lastUpdated = Instant.now();

        log.info("GgufConfigService initialized: model={}, url={}, enabled={}",
                currentModel, currentUrl, enabled);
    }

    /**
     * Enable or disable GGUF engine
     */
    public void setEnabled(boolean enabled) {
        boolean previous = this.enabled;
        this.enabled = enabled;
        this.lastUpdated = Instant.now();
        log.info("GGUF enabled status changed: {} -> {}", previous, enabled);
    }

    /**
     * Update GGUF server URL
     */
    public void updateUrl(String newUrl) {
        if (newUrl == null || newUrl.isBlank()) {
            throw new IllegalArgumentException("URL cannot be empty");
        }
        String previousUrl = this.currentUrl;
        this.currentUrl = newUrl;
        this.lastUpdated = Instant.now();
        log.info("GGUF URL changed: {} -> {}", previousUrl, newUrl);
    }

    /**
     * Update GGUF model
     */
    public void updateModel(String newModel) {
        if (newModel == null || newModel.isBlank()) {
            throw new IllegalArgumentException("Model cannot be empty");
        }
        String previousModel = this.currentModel;
        this.currentModel = newModel;
        this.lastUpdated = Instant.now();
        log.info("GGUF model changed: {} -> {}", previousModel, newModel);
    }

    /**
     * Check if GGUF supports tool calling
     */
    public boolean supportsToolCalling() {
        return toolCalling;
    }

    /**
     * Check if GGUF supports JSON schema
     */
    public boolean supportsJsonSchema() {
        return jsonSchema;
    }

    /**
     * Get current configuration as a map
     */
    public Map<String, Object> getCurrentConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("model", currentModel);
        config.put("url", currentUrl);
        config.put("enabled", enabled);
        config.put("toolCalling", toolCalling);
        config.put("jsonSchema", jsonSchema);
        config.put("lastUpdated", lastUpdated.toString());
        return config;
    }
}
