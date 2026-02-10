package com.insuretech.pms.rfp.service;

import com.insuretech.pms.lineage.dto.LineageGraphDto;
import com.insuretech.pms.lineage.dto.LineageTreeDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;

/**
 * Neo4j 기반 RFP → Requirement 리니지 그래프 서비스 (스텁).
 *
 * 현재는 로깅 전용 스텁으로, 실제 Neo4j 연동은 후속 스프린트에서 활성화한다.
 */
@Slf4j
@Service
public class ReactiveRfpNeo4jLineageService {

    public ReactiveRfpNeo4jLineageService() {
        log.info("[RfpLineage] 리니지 스텁 서비스 초기화 완료");
    }

    // ========================================================================
    // 오케스트레이터: 후보 확정 시 호출 (현재 로깅 스텁)
    // ========================================================================

    /**
     * 후보(candidate)가 확정되어 실제 요구사항이 될 때 호출하는 오케스트레이터.
     * 현재는 로깅만 수행한다 — 실제 Neo4j 연동은 후속 스프린트에서 활성화.
     */
    public Mono<Void> onCandidatesConfirmed(String rfpId, String rfpTitle, String projectId,
                                             List<RequirementInfo> requirements) {
        int count = (requirements != null) ? requirements.size() : 0;
        log.info("[RfpLineage] 후보 확정 이벤트 수신: rfpId={}, projectId={}, 요구사항 {}건 (스텁 — Neo4j 연동 비활성화)",
                rfpId, projectId, count);
        return Mono.empty();
    }

    // ========================================================================
    // 그래프 조회 (현재 빈 응답 스텁)
    // ========================================================================

    /**
     * 프로젝트별 RFP 리니지 그래프를 조회한다 (현재 빈 그래프 반환).
     */
    public Mono<LineageGraphDto> getLineageGraph(String projectId) {
        log.debug("[RfpLineage] 리니지 그래프 조회 요청: projectId={} (스텁)", projectId);
        return Mono.just(LineageGraphDto.builder()
                .nodes(Collections.emptyList())
                .edges(Collections.emptyList())
                .statistics(LineageGraphDto.LineageStatisticsDto.builder().build())
                .build());
    }

    /**
     * 업스트림 추적 (현재 빈 트리 반환).
     */
    public Mono<LineageTreeDto> getUpstream(String nodeType, String nodeId, int depth) {
        log.debug("[RfpLineage] 업스트림 추적 요청: {}:{} (스텁)", nodeType, nodeId);
        return Mono.just(emptyTree());
    }

    /**
     * 다운스트림 추적 (현재 빈 트리 반환).
     */
    public Mono<LineageTreeDto> getDownstream(String nodeType, String nodeId, int depth) {
        log.debug("[RfpLineage] 다운스트림 추적 요청: {}:{} (스텁)", nodeType, nodeId);
        return Mono.just(emptyTree());
    }

    private LineageTreeDto emptyTree() {
        return LineageTreeDto.builder()
                .nodes(Collections.emptyList())
                .edges(Collections.emptyList())
                .maxDepth(0)
                .totalNodes(0)
                .build();
    }

    // ========================================================================
    // 내부 DTO: 후보 확정 시 전달할 요구사항 정보
    // ========================================================================

    /**
     * onCandidatesConfirmed()에 전달할 요구사항 정보 레코드.
     *
     * @param reqId 요구사항 ID
     * @param code  요구사항 코드 (예: REQ-ABCDE123-0001)
     * @param title 요구사항 제목
     */
    public record RequirementInfo(String reqId, String code, String title) {
    }
}
