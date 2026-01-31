package com.insuretech.pms.chat.reactive.entity;

import com.insuretech.pms.common.reactive.entity.R2dbcBaseEntity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table(name = "chat_messages", schema = "chat")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcChatMessage extends R2dbcBaseEntity implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    @Column("session_id")
    private String sessionId;

    @Column("role")
    private String role;

    @Column("content")
    private String content;

    @Column("trace_id")
    private String traceId;

    @Column("engine")
    private String engine;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    /**
     * Mark this entity as persisted (not new).
     * Call this after loading from database.
     */
    public void markAsPersisted() {
        this.isNew = false;
    }

    public enum Role {
        USER, ASSISTANT
    }

    public static R2dbcChatMessage createUserMessage(String sessionId, String content) {
        return R2dbcChatMessage.builder()
                .sessionId(sessionId)
                .role(Role.USER.name())
                .content(content)
                .build();
    }

    public static R2dbcChatMessage createAssistantMessage(String sessionId, String content) {
        return R2dbcChatMessage.builder()
                .sessionId(sessionId)
                .role(Role.ASSISTANT.name())
                .content(content)
                .build();
    }
}
