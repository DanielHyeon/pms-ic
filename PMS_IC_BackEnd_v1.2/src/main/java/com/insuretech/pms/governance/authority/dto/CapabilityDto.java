package com.insuretech.pms.governance.authority.dto;

import com.insuretech.pms.governance.authority.entity.R2dbcCapability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a governance capability (permission unit).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CapabilityDto {

    private String id;
    private String code;
    private String name;
    private String category;
    private String description;
    private boolean isDelegatable;
    private boolean allowRedelegation;

    /**
     * Factory method to create a CapabilityDto from an R2dbcCapability entity.
     */
    public static CapabilityDto from(R2dbcCapability entity) {
        return CapabilityDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .category(entity.getCategory())
                .description(entity.getDescription())
                .isDelegatable(entity.isDelegatable())
                .allowRedelegation(entity.isAllowRedelegation())
                .build();
    }
}
