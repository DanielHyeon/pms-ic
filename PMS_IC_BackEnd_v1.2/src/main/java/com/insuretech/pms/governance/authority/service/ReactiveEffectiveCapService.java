package com.insuretech.pms.governance.authority.service;

import com.insuretech.pms.governance.authority.dto.EffectiveCapabilityDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveEffectiveCapService {

    private final DatabaseClient databaseClient;

    public Flux<EffectiveCapabilityDto> getEffectiveCapabilities(String projectId, String userId) {
        String sql = """
                SELECT ec.project_id, ec.user_id, ec.capability_id, ec.source_type, ec.source_id,
                       c.code AS capability_code, c.name AS capability_name
                FROM governance.v_effective_caps ec
                JOIN governance.capabilities c ON c.id = ec.capability_id
                WHERE ec.project_id = :projectId AND ec.user_id = :userId
                ORDER BY ec.source_type, c.code
                """;

        return databaseClient.sql(sql)
                .bind("projectId", projectId)
                .bind("userId", userId)
                .map(row -> EffectiveCapabilityDto.builder()
                        .projectId(row.get("project_id", String.class))
                        .userId(row.get("user_id", String.class))
                        .capabilityId(row.get("capability_id", String.class))
                        .capabilityCode(row.get("capability_code", String.class))
                        .capabilityName(row.get("capability_name", String.class))
                        .sourceType(row.get("source_type", String.class))
                        .sourceId(row.get("source_id", String.class))
                        .build())
                .all();
    }
}
