package com.insuretech.pms.governance.authority.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SoD(직무분리) 사전 검증 경고 DTO.
 * 역할 부여 또는 위임 생성 시, 기존 유효 권한과 충돌하는 SoD 규칙이 발견되면 반환됨.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SodWarningDto {

    /** SoD 규칙 ID */
    private String ruleId;

    /** 충돌하는 권한 A의 ID */
    private String capabilityAId;

    /** 충돌하는 권한 A의 코드 */
    private String capabilityACode;

    /** 충돌하는 권한 B의 ID */
    private String capabilityBId;

    /** 충돌하는 권한 B의 코드 */
    private String capabilityBCode;

    /** 심각도 (HIGH, MEDIUM, LOW) */
    private String severity;

    /** 차단 여부 — true면 해당 작업을 진행할 수 없음 */
    private boolean blocking;

    /** SoD 규칙 설명 */
    private String description;
}
