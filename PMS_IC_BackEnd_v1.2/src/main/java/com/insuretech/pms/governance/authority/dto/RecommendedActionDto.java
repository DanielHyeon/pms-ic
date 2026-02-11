package com.insuretech.pms.governance.authority.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 거버넌스 검증 결과에 대한 권장 조치 DTO.
 * 각 finding에 대해 어떤 조치를 취해야 하는지 안내함.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendedActionDto {

    /** 조치 유형 (REVOKE_DELEGATION, REASSIGN_ROLE, CHANGE_APPROVER 등) */
    private String actionType;

    /** 조치 대상 엔티티 ID (delegation_id, user_role_id 등) */
    private String targetId;

    /** 조치 설명 (한글) */
    private String description;

    /** 우선순위 (HIGH, MEDIUM, LOW) */
    private String priority;
}
