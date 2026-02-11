package com.insuretech.pms.governance.authority.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * 사용자 권한 상세 조회 응답 DTO (User 360).
 * 특정 사용자의 소속, 역할, 직접 권한, 위임 권한, 유효 권한을 통합 조회.
 *
 * @see <a href="§10.7 사용자 권한 상세 조회">설계서 22_역할권한관리_화면설계.md</a>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAuthorityDto {

    private String userId;
    private String userName;

    /** 소속 파트 목록 */
    private List<PartMembershipInfo> partMemberships;

    /** 부여된 역할 목록 (preset 권한 포함) */
    private List<RoleInfo> roles;

    /** 직접 부여된 개별 권한 */
    private List<DirectCapabilityInfo> directCapabilities;

    /** 위임받은 권한 */
    private List<DelegatedCapabilityInfo> delegatedCapabilities;

    /** 유효 권한 (우선순위 적용된 최종 목록) */
    private List<EffectiveCapabilityInfo> effectiveCapabilities;

    // ================ 중첩 DTO ================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartMembershipInfo {
        private String partId;
        private String partName;
        private String membershipType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleInfo {
        private String roleId;
        private String roleCode;
        private String roleName;
        private String grantedBy;
        private String grantedByName;
        private OffsetDateTime grantedAt;
        /** 역할에 포함된 preset 권한 코드 목록 */
        private List<String> presetCapabilities;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DirectCapabilityInfo {
        private String capabilityId;
        private String capabilityCode;
        private String capabilityName;
        private String grantedBy;
        private String grantedByName;
        private OffsetDateTime grantedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DelegatedCapabilityInfo {
        private String delegationId;
        private String capabilityCode;
        private String capabilityName;
        private String delegator;
        private String approver;
        private ScopeInfo scope;
        private String durationType;
        private LocalDate endDate;
        /** 만료까지 남은 일수 (상시 위임이면 null) */
        private Integer daysRemaining;
        /** 재위임 출처 (null이면 원본 위임) */
        private String parentDelegationId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScopeInfo {
        private String type;
        private String partName;
        private String functionDescription;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EffectiveCapabilityInfo {
        private String capabilityId;
        private String code;
        private String name;
        /** ROLE_PRESET, DIRECT, DELEGATION */
        private String source;
        /** 우선순위: 1=위임, 2=직접, 3=역할 */
        private int priority;
        /** source별 추가 정보 */
        private String roleName;
        private String delegatorName;
        private ScopeInfo scope;
        /** 동일 Capability가 여러 출처에서 존재하면 중복 출처 목록 */
        private List<DuplicateSourceInfo> duplicateSources;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DuplicateSourceInfo {
        private String source;
        private int priority;
        private String roleName;
        private String delegatorName;
    }
}
