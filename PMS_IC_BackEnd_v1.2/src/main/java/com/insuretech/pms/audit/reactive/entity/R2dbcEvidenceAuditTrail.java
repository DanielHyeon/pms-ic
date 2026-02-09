package com.insuretech.pms.audit.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "evidence_audit_trail", schema = "audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcEvidenceAuditTrail {

    @Id
    @Column("id")
    private String id;

    @Column("project_id")
    private String projectId;

    @Column("user_id")
    private String userId;

    @Column("event_type")
    private String eventType;

    @Nullable
    @Column("package_id")
    private String packageId;

    @Nullable
    @Column("evidence_ids")
    private String evidenceIds;

    @Nullable
    @Column("filter_snapshot")
    private String filterSnapshot;

    @Nullable
    @Column("ip_address")
    private String ipAddress;

    @Nullable
    @Column("proxy_ip")
    private String proxyIp;

    @Nullable
    @Column("user_agent")
    private String userAgent;

    @Column("created_at")
    private LocalDateTime createdAt;
}
