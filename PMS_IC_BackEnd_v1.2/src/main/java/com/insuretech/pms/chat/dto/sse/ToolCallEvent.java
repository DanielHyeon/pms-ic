package com.insuretech.pms.chat.dto.sse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tool call information within a delta event
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolCallEvent {
    private String id;
    private String name;
    private String arguments;   // JSON string
}
