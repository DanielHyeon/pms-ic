package com.insuretech.pms.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatChunk {
    private String id;
    private String sessionId;
    private String content;
    private ChunkType type;
    private boolean done;
    private Double confidence;

    public enum ChunkType {
        TOKEN,      // Regular text token
        THINKING,   // Model reasoning (optional display)
        ERROR,      // Error message
        DONE        // Final chunk indicating completion
    }

    public static ChatChunk token(String sessionId, String id, String content) {
        return ChatChunk.builder()
                .id(id)
                .sessionId(sessionId)
                .content(content)
                .type(ChunkType.TOKEN)
                .done(false)
                .build();
    }

    public static ChatChunk done(String sessionId, String id, Double confidence) {
        return ChatChunk.builder()
                .id(id)
                .sessionId(sessionId)
                .content("")
                .type(ChunkType.DONE)
                .done(true)
                .confidence(confidence)
                .build();
    }

    public static ChatChunk error(String sessionId, String id, String errorMessage) {
        return ChatChunk.builder()
                .id(id)
                .sessionId(sessionId)
                .content(errorMessage)
                .type(ChunkType.ERROR)
                .done(true)
                .build();
    }
}
