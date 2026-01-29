package com.insuretech.pms.common.reactive.entity;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Getter
@Setter
public abstract class R2dbcBaseEntity {

    @CreatedDate
    private LocalDateTime createdAt;

    @Nullable
    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Nullable
    private String createdBy;

    @Nullable
    private String updatedBy;
}
