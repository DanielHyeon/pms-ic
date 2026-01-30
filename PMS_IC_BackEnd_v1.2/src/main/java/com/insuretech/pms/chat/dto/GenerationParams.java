package com.insuretech.pms.chat.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * LLM generation parameters for controlling response behavior.
 * All parameters have sensible defaults and validation constraints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerationParams {

    /**
     * Controls randomness in generation.
     * Lower values (0.1) = more focused/deterministic.
     * Higher values (0.9) = more creative/random.
     */
    @DecimalMin(value = "0.0", message = "Temperature must be at least 0.0")
    @DecimalMax(value = "2.0", message = "Temperature cannot exceed 2.0")
    @Builder.Default
    private Double temperature = 0.2;

    /**
     * Nucleus sampling: cumulative probability threshold.
     * Lower values = more focused on high-probability tokens.
     */
    @DecimalMin(value = "0.0", message = "Top-P must be at least 0.0")
    @DecimalMax(value = "1.0", message = "Top-P cannot exceed 1.0")
    @Builder.Default
    private Double topP = 0.9;

    /**
     * Maximum number of tokens to generate.
     * Higher values allow longer responses but increase latency.
     */
    @Min(value = 1, message = "Max tokens must be at least 1")
    @Max(value = 8192, message = "Max tokens cannot exceed 8192")
    @Builder.Default
    private Integer maxTokens = 768;

    /**
     * Stop sequences that terminate generation.
     */
    @Size(max = 10, message = "Cannot specify more than 10 stop sequences")
    private List<@Size(max = 50, message = "Each stop sequence cannot exceed 50 characters") String> stop;

    /**
     * Creates default generation parameters.
     */
    public static GenerationParams defaults() {
        return GenerationParams.builder().build();
    }

    /**
     * Creates parameters optimized for creative responses.
     */
    public static GenerationParams creative() {
        return GenerationParams.builder()
                .temperature(0.8)
                .topP(0.95)
                .maxTokens(1024)
                .build();
    }

    /**
     * Creates parameters optimized for precise/deterministic responses.
     */
    public static GenerationParams precise() {
        return GenerationParams.builder()
                .temperature(0.1)
                .topP(0.8)
                .maxTokens(512)
                .build();
    }

    /**
     * Creates parameters for code generation.
     */
    public static GenerationParams coding() {
        return GenerationParams.builder()
                .temperature(0.1)
                .topP(0.9)
                .maxTokens(2048)
                .build();
    }
}
