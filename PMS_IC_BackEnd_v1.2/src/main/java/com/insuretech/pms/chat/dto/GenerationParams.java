package com.insuretech.pms.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * LLM generation parameters
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerationParams {
    @Builder.Default
    private Double temperature = 0.2;

    @Builder.Default
    private Double topP = 0.9;

    @Builder.Default
    private Integer maxTokens = 768;

    private List<String> stop;

    public static GenerationParams defaults() {
        return GenerationParams.builder().build();
    }

    public static GenerationParams creative() {
        return GenerationParams.builder()
                .temperature(0.8)
                .topP(0.95)
                .maxTokens(1024)
                .build();
    }

    public static GenerationParams precise() {
        return GenerationParams.builder()
                .temperature(0.1)
                .topP(0.8)
                .maxTokens(512)
                .build();
    }
}
