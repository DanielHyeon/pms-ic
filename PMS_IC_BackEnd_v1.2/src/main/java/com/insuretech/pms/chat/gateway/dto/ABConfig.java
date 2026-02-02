package com.insuretech.pms.chat.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A/B testing configuration
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ABConfig {
    private String primary;         // Primary engine ("vllm" | "gguf")
    private String shadow;          // Shadow engine
    private boolean shadowCollect;  // Collect shadow results

    public static ABConfig defaults() {
        return ABConfig.builder()
                .primary("vllm")
                .shadow("gguf")
                .shadowCollect(true)
                .build();
    }
}
