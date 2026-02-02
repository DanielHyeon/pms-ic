package com.insuretech.pms.chat.dto.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Token usage information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsageInfo {
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
}
