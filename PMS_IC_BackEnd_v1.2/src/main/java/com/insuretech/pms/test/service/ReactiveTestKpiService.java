package com.insuretech.pms.test.service;

import com.insuretech.pms.test.dto.TestKpiDto;
import com.insuretech.pms.test.reactive.repository.ReactiveTestCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveTestKpiService {

    private final ReactiveTestCaseRepository testCaseRepository;

    /**
     * Aggregate test KPIs for a project using Mono.zip().
     */
    public Mono<TestKpiDto> getKpi(String projectId) {
        return Mono.zip(
                testCaseRepository.countByProjectId(projectId),
                testCaseRepository.countByProjectIdAndLastOutcome(projectId, "PASSED"),
                testCaseRepository.countByProjectIdAndLastOutcome(projectId, "FAILED"),
                testCaseRepository.countByProjectIdAndLastOutcome(projectId, "BLOCKED"),
                testCaseRepository.countByProjectIdAndLastOutcome(projectId, "SKIPPED"),
                testCaseRepository.countByProjectIdAndLastOutcome(projectId, "NOT_RUN")
        ).map(tuple -> {
            long total = tuple.getT1();
            long passed = tuple.getT2();
            long failed = tuple.getT3();
            long blocked = tuple.getT4();
            long skipped = tuple.getT5();
            long notRun = tuple.getT6();

            long executed = total - notRun;
            double passRate = executed > 0 ? (double) passed / executed * 100.0 : 0.0;
            double executionRate = total > 0 ? (double) executed / total * 100.0 : 0.0;

            return TestKpiDto.builder()
                    .total(total)
                    .passed(passed)
                    .failed(failed)
                    .blocked(blocked)
                    .skipped(skipped)
                    .notRun(notRun)
                    .passRate(Math.round(passRate * 100.0) / 100.0)
                    .executionRate(Math.round(executionRate * 100.0) / 100.0)
                    .build();
        });
    }
}
