package com.insuretech.pms.auth.dto;

import com.insuretech.pms.auth.reactive.entity.R2dbcPermission;
import lombok.Builder;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
public class PermissionDto {

    private String id;
    private String category;
    private String name;
    private String description;
    private String resource;
    private String action;
    private Map<String, Boolean> roles;

    public static PermissionDto fromEntity(R2dbcPermission permission) {
        return PermissionDto.builder()
                .id(permission.getId())
                .category(permission.getCategory())
                .name(permission.getName())
                .description(permission.getDescription())
                .resource(permission.getResource())
                .action(permission.getAction())
                .roles(new HashMap<>())
                .build();
    }
}
