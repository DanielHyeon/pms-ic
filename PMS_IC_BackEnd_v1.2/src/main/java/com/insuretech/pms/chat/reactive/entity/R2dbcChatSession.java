package com.insuretech.pms.chat.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

@Table(name = "chat_sessions", schema = "chat")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcChatSession extends R2dbcBaseEntity {

    @Id
    @Column("id")
    private String id;

    @Column("user_id")
    private String userId;

    @Nullable
    @Column("title")
    private String title;

    @Column("active")
    @Builder.Default
    private Boolean active = true;
}
