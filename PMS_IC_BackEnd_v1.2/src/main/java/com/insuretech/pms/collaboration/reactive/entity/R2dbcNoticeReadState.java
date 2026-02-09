package com.insuretech.pms.collaboration.reactive.entity;

import lombok.*;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

/**
 * Notice read-state entity. Composite PK (notice_id, user_id).
 * Standalone -- no base entity, no @Id (composite key handled by repository queries).
 */
@Table(name = "notice_read_state", schema = "project")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcNoticeReadState {

    @Column("notice_id")
    private String noticeId;

    @Column("user_id")
    private String userId;

    @Column("read_at")
    private LocalDateTime readAt;
}
