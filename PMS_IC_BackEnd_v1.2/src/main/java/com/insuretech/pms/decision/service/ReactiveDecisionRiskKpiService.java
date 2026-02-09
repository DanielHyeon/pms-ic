package com.insuretech.pms.decision.service;

import com.insuretech.pms.decision.dto.DecisionRiskKpiDto;
import com.insuretech.pms.decision.reactive.repository.ReactiveDecisionRepository;
import com.insuretech.pms.decision.reactive.repository.ReactiveEscalationLinkRepository;
import com.insuretech.pms.decision.reactive.repository.ReactiveRiskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ReactiveDecisionRiskKpiService {

    private final ReactiveDecisionRepository decisionRepository;
    private final ReactiveRiskRepository riskRepository;
    private final ReactiveEscalationLinkRepository escalationRepository;

    public Mono<DecisionRiskKpiDto> getKpi(String projectId) {
        return Mono.zip(
                decisionRepository.countByProjectId(projectId),
                decisionRepository.countByProjectIdAndStatus(projectId, "PROPOSED")
                        .zipWith(decisionRepository.countByProjectIdAndStatus(projectId, "UNDER_REVIEW"),
                                Long::sum),
                riskRepository.countByProjectId(projectId),
                riskRepository.countCriticalRisks(projectId),
                decisionRepository.avgDecisionTimeHours(projectId).defaultIfEmpty(0.0),
                escalationRepository.countEscalationsByProject(projectId)
        ).map(tuple -> DecisionRiskKpiDto.builder()
                .totalDecisions(tuple.getT1())
                .pendingDecisions(tuple.getT2())
                .totalRisks(tuple.getT3())
                .criticalRisks(tuple.getT4())
                .avgDecisionTimeHours(tuple.getT5())
                .escalationCount(tuple.getT6())
                .build());
    }
}
