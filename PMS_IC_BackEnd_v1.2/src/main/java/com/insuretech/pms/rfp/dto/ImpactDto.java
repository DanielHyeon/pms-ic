package com.insuretech.pms.rfp.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * RFP 변경 영향 분석 DTO.
 * 변경 이벤트 목록 + 영향 범위 스냅샷을 포함한다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImpactDto {

    private List<ChangeEventItem> changeEvents;
    private ImpactSnapshot impactSnapshot;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangeEventItem {
        private String id;
        private String changeType;
        private String reason;
        private EvidenceDto.ActorDto changedBy;
        private LocalDateTime changedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImpactSnapshot {
        private long affectedRequirements;
        private long affectedEpics;
        private long affectedWbs;
        private long affectedSprints;
        private long affectedTests;
    }
}
