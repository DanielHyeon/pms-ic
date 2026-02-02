package com.insuretech.pms.chat.gateway;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing vLLM configuration dynamically.
 * Supports separate lightweight and medium model configurations.
 */
@Slf4j
@Service
public class VllmConfigService {

    @Value("${llm.workers.vllm.url:http://localhost:8001}")
    private String defaultUrl;

    @Value("${llm.workers.vllm.enabled:false}")
    private boolean defaultEnabled;

    @Value("${llm.workers.vllm.model:Qwen/Qwen2.5-7B-Instruct}")
    private String defaultModel;

    // Dynamic configuration storage - separate lightweight and medium
    @Getter
    private volatile String lightweightModel;

    @Getter
    private volatile String mediumModel;

    @Getter
    private volatile String currentUrl;

    @Getter
    private volatile boolean enabled;

    @Getter
    private volatile Instant lastUpdated;

    // Available vLLM models (HuggingFace format)
    private static final List<VllmModelInfo> AVAILABLE_MODELS = List.of(
            // Lightweight models
            new VllmModelInfo(
                    "Qwen/Qwen3-4B",
                    "Qwen3 4B",
                    "4B",
                    "Fast responses with thinking mode support. Recommended for general tasks.",
                    "lightweight",
                    true,
                    true
            ),
            // Medium models
            new VllmModelInfo(
                    "Qwen/Qwen3-8B",
                    "Qwen3 8B",
                    "8B",
                    "Strong reasoning and Korean language support. Good for complex tasks.",
                    "medium",
                    true,
                    true
            ),
            new VllmModelInfo(
                    "google/gemma-3-12b-it",
                    "Gemma 3 12B",
                    "12B",
                    "High quality responses with 128K context. Requires HF license agreement.",
                    "medium",
                    true,
                    true
            ),
            new VllmModelInfo(
                    "Qwen/Qwen2.5-7B-Instruct",
                    "Qwen2.5 7B (Legacy)",
                    "7B",
                    "Previous generation model. Stable and well-tested.",
                    "medium",
                    true,
                    true
            )
    );

    // Track model change history
    private final ConcurrentHashMap<String, ModelChangeRecord> changeHistory = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        // Initialize with defaults - lightweight uses first lightweight model, medium uses default
        this.lightweightModel = AVAILABLE_MODELS.stream()
                .filter(m -> "lightweight".equals(m.category()))
                .findFirst()
                .map(VllmModelInfo::modelId)
                .orElse("Qwen/Qwen3-4B");

        this.mediumModel = defaultModel;
        this.currentUrl = defaultUrl;
        this.enabled = defaultEnabled;
        this.lastUpdated = Instant.now();

        log.info("VllmConfigService initialized: lightweight={}, medium={}, url={}, enabled={}",
                lightweightModel, mediumModel, currentUrl, enabled);
    }

    /**
     * Get current model based on context (for backward compatibility)
     */
    public String getCurrentModel() {
        // Default to medium model for general use
        return mediumModel;
    }

    /**
     * Change the lightweight vLLM model
     */
    public VllmConfigChangeResult changeLightweightModel(String newModel) {
        if (newModel == null || newModel.isBlank()) {
            throw new IllegalArgumentException("Model name cannot be empty");
        }

        String previousModel = this.lightweightModel;
        this.lightweightModel = newModel;
        this.lastUpdated = Instant.now();

        changeHistory.put(
                "lightweight-" + lastUpdated.toString(),
                new ModelChangeRecord(previousModel, newModel, lastUpdated)
        );

        log.info("vLLM lightweight model changed: {} -> {}", previousModel, newModel);

        return new VllmConfigChangeResult(
                "success",
                previousModel,
                newModel,
                lastUpdated,
                "Lightweight model configuration updated."
        );
    }

    /**
     * Change the medium vLLM model
     */
    public VllmConfigChangeResult changeMediumModel(String newModel) {
        if (newModel == null || newModel.isBlank()) {
            throw new IllegalArgumentException("Model name cannot be empty");
        }

        String previousModel = this.mediumModel;
        this.mediumModel = newModel;
        this.lastUpdated = Instant.now();

        changeHistory.put(
                "medium-" + lastUpdated.toString(),
                new ModelChangeRecord(previousModel, newModel, lastUpdated)
        );

        log.info("vLLM medium model changed: {} -> {}", previousModel, newModel);

        return new VllmConfigChangeResult(
                "success",
                previousModel,
                newModel,
                lastUpdated,
                "Medium model configuration updated."
        );
    }

    /**
     * Change the vLLM model (backward compatible - changes medium model)
     */
    public VllmConfigChangeResult changeModel(String newModel) {
        return changeMediumModel(newModel);
    }

    /**
     * Update vLLM server URL
     */
    public void updateUrl(String newUrl) {
        if (newUrl == null || newUrl.isBlank()) {
            throw new IllegalArgumentException("URL cannot be empty");
        }
        String previousUrl = this.currentUrl;
        this.currentUrl = newUrl;
        this.lastUpdated = Instant.now();
        log.info("vLLM URL changed: {} -> {}", previousUrl, newUrl);
    }

    /**
     * Enable or disable vLLM
     */
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        this.lastUpdated = Instant.now();
        log.info("vLLM enabled status changed to: {}", enabled);
    }

    /**
     * Get available models
     */
    public List<VllmModelInfo> getAvailableModels() {
        return AVAILABLE_MODELS;
    }

    /**
     * Get current configuration as a map
     */
    public Map<String, Object> getCurrentConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("lightweightModel", lightweightModel);
        config.put("mediumModel", mediumModel);
        config.put("currentModel", mediumModel); // backward compatibility
        config.put("url", currentUrl);
        config.put("enabled", enabled);
        config.put("lastUpdated", lastUpdated.toString());
        return config;
    }

    // Record classes
    public record VllmModelInfo(
            String modelId,
            String displayName,
            String size,
            String description,
            String category,
            boolean supportsToolCalling,
            boolean supportsJsonSchema
    ) {}

    public record VllmConfigChangeResult(
            String status,
            String previousModel,
            String currentModel,
            Instant timestamp,
            String message
    ) {}

    public record ModelChangeRecord(
            String previousModel,
            String newModel,
            Instant timestamp
    ) {}
}
