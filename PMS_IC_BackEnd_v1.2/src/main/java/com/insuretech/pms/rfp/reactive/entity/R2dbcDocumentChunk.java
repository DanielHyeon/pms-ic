package com.insuretech.pms.rfp.reactive.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;

@Table(name = "rfp_document_chunks", schema = "rfp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class R2dbcDocumentChunk implements Persistable<String> {

    @Id
    @Column("id")
    private String id;

    // save() 호출 시 INSERT/UPDATE 판단용 플래그
    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @Column("rfp_id")
    private String rfpId;

    @Nullable
    @Column("version_id")
    private String versionId;

    @Nullable
    @Column("section_id")
    private String sectionId;

    @Nullable
    @Column("paragraph_id")
    private String paragraphId;

    @Column("chunk_order")
    @Builder.Default
    private Integer chunkOrder = 0;

    @Nullable
    @Column("heading")
    private String heading;

    @Column("content")
    private String content;

    @Nullable
    @Column("page_number")
    private Integer pageNumber;

    @Column("chunk_type")
    @Builder.Default
    private String chunkType = "PARAGRAPH";

    @Nullable
    @Column("token_count")
    private Integer tokenCount;

    @Column("created_at")
    private LocalDateTime createdAt;
}
