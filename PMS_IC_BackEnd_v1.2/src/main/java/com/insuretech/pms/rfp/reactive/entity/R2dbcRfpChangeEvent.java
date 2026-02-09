package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "rfp_change_events", schema = "rfp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcRfpChangeEvent {

    @Id
    @Column("id")
    private String id;

    @Column("rfp_id")
    private String rfpId;

    @Column("change_type")
    private String changeType;

    @Nullable
    @Column("reason")
    private String reason;

    @Nullable
    @Column("from_version_id")
    private String fromVersionId;

    @Nullable
    @Column("to_version_id")
    private String toVersionId;

    @Nullable
    @Column("impact_snapshot")
    private String impactSnapshot;

    @Nullable
    @Column("changed_by")
    private String changedBy;

    @Column("changed_at")
    private LocalDateTime changedAt;
}
