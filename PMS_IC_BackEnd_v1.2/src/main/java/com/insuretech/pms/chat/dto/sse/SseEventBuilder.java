package com.insuretech.pms.chat.dto.sse;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;

/**
 * Utility for building standard SSE events
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SseEventBuilder {

    private final ObjectMapper objectMapper;

    public ServerSentEvent<String> meta(MetaEvent event) {
        return ServerSentEvent.<String>builder()
                .event("meta")
                .data(toJson(event))
                .build();
    }

    public ServerSentEvent<String> delta(DeltaEvent event) {
        return ServerSentEvent.<String>builder()
                .event("delta")
                .data(toJson(event))
                .build();
    }

    public ServerSentEvent<String> deltaText(String text) {
        return delta(DeltaEvent.text(text));
    }

    public ServerSentEvent<String> done(DoneEvent event) {
        return ServerSentEvent.<String>builder()
                .event("done")
                .data(toJson(event))
                .build();
    }

    public ServerSentEvent<String> doneStop() {
        return done(DoneEvent.stop());
    }

    public ServerSentEvent<String> error(ErrorEvent event) {
        return ServerSentEvent.<String>builder()
                .event("error")
                .data(toJson(event))
                .build();
    }

    public ServerSentEvent<String> error(String code, String message, String traceId) {
        return error(ErrorEvent.of(code, message, traceId));
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize SSE event: {}", e.getMessage());
            return "{}";
        }
    }
}
