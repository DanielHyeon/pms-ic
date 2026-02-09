package com.insuretech.pms.decision.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EscalationChainDto {
    private String entityType;
    private String entityId;
    private List<Link> chain;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Link {
        private String sourceType;
        private String sourceId;
        private String targetType;
        private String targetId;
        private String escalatedBy;
        private String reason;
        private LocalDateTime createdAt;
    }
}
