package com.insuretech.pms.test.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.test.dto.TestRunDto;
import com.insuretech.pms.test.dto.TestRunStepResultDto;
import com.insuretech.pms.test.reactive.entity.R2dbcTestRun;
import com.insuretech.pms.test.reactive.entity.R2dbcTestRunStepResult;
import com.insuretech.pms.test.reactive.repository.ReactiveTestCaseRepository;
import com.insuretech.pms.test.reactive.repository.ReactiveTestRunRepository;
import com.insuretech.pms.test.reactive.repository.ReactiveTestRunStepResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveTestRunService {

    private final ReactiveTestRunRepository testRunRepository;
    private final ReactiveTestRunStepResultRepository stepResultRepository;
    private final ReactiveTestCaseRepository testCaseRepository;
    private final ReactiveTestCaseService testCaseService;

    /**
     * List runs for a test case (timeline view).
     */
    public Flux<TestRunDto> listRuns(String testCaseId) {
        return testRunRepository.findByTestCaseIdOrderByCreatedAtDesc(testCaseId)
                .map(TestRunDto::from);
    }

    /**
     * Get a single run with step results.
     */
    public Mono<TestRunDto> getRun(String runId) {
        return testRunRepository.findById(runId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test run not found: " + runId)))
                .flatMap(run ->
                    stepResultRepository.findByTestRunIdOrderByStepNumberAsc(run.getId())
                            .map(TestRunStepResultDto::from)
                            .collectList()
                            .map(results -> {
                                TestRunDto dto = TestRunDto.from(run);
                                dto.setStepResults(results);
                                return dto;
                            })
                );
    }

    /**
     * Record a detailed test run with step-by-step results.
     * Allocates a sequential run_number and updates the test case last_outcome.
     */
    @Transactional
    public Mono<TestRunDto> createRun(String projectId, String testCaseId, TestRunDto request, String userId) {
        return testCaseRepository.findById(testCaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test case not found: " + testCaseId)))
                .flatMap(tc -> {
                    if ("DRAFT".equals(tc.getDefinitionStatus())) {
                        return Mono.error(CustomException.badRequest(
                                "Cannot run a test case in DRAFT status. Transition to READY first."));
                    }
                    if ("DEPRECATED".equals(tc.getDefinitionStatus())) {
                        return Mono.error(CustomException.badRequest(
                                "Cannot run a deprecated test case."));
                    }
                    return testRunRepository.findMaxRunNumberByTestCaseId(testCaseId);
                })
                .flatMap(maxRunNumber -> {
                    int nextRunNumber = maxRunNumber + 1;
                    R2dbcTestRun run = R2dbcTestRun.builder()
                            .id(UUID.randomUUID().toString())
                            .testCaseId(testCaseId)
                            .projectId(projectId)
                            .runNumber(nextRunNumber)
                            .mode("DETAILED")
                            .result(request.getResult())
                            .executorId(userId)
                            .environment(request.getEnvironment())
                            .startedAt(request.getStartedAt() != null ? request.getStartedAt() : LocalDateTime.now())
                            .finishedAt(request.getFinishedAt())
                            .durationSeconds(request.getDurationSeconds())
                            .notes(request.getNotes())
                            .createdAt(LocalDateTime.now())
                            .build();

                    return testRunRepository.save(run)
                            .flatMap(savedRun -> {
                                // Save step results if provided
                                if (request.getStepResults() != null && !request.getStepResults().isEmpty()) {
                                    return saveStepResults(savedRun.getId(), request.getStepResults())
                                            .collectList()
                                            .flatMap(results ->
                                                // Update test case outcome
                                                testCaseService.updateOutcomeAfterRun(testCaseId, savedRun.getResult())
                                                        .thenReturn(savedRun)
                                            )
                                            .map(TestRunDto::from);
                                }
                                // Update test case outcome even without step results
                                return testCaseService.updateOutcomeAfterRun(testCaseId, savedRun.getResult())
                                        .thenReturn(savedRun)
                                        .map(TestRunDto::from);
                            });
                })
                .doOnSuccess(dto -> log.info("Created test run #{} for case: {}", dto.getRunNumber(), testCaseId));
    }

    /**
     * Quick run: record a bulk result without step-by-step details.
     */
    @Transactional
    public Mono<TestRunDto> quickRun(String projectId, String testCaseId, String result,
                                     String environment, String notes, String userId) {
        return testCaseRepository.findById(testCaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test case not found: " + testCaseId)))
                .flatMap(tc -> {
                    if ("DRAFT".equals(tc.getDefinitionStatus())) {
                        return Mono.error(CustomException.badRequest(
                                "Cannot run a test case in DRAFT status. Transition to READY first."));
                    }
                    if ("DEPRECATED".equals(tc.getDefinitionStatus())) {
                        return Mono.error(CustomException.badRequest(
                                "Cannot run a deprecated test case."));
                    }
                    return testRunRepository.findMaxRunNumberByTestCaseId(testCaseId);
                })
                .flatMap(maxRunNumber -> {
                    int nextRunNumber = maxRunNumber + 1;
                    LocalDateTime now = LocalDateTime.now();

                    R2dbcTestRun run = R2dbcTestRun.builder()
                            .id(UUID.randomUUID().toString())
                            .testCaseId(testCaseId)
                            .projectId(projectId)
                            .runNumber(nextRunNumber)
                            .mode("QUICK")
                            .result(result)
                            .executorId(userId)
                            .environment(environment)
                            .startedAt(now)
                            .finishedAt(now)
                            .notes(notes)
                            .createdAt(now)
                            .build();

                    return testRunRepository.save(run)
                            .flatMap(savedRun ->
                                testCaseService.updateOutcomeAfterRun(testCaseId, savedRun.getResult())
                                        .thenReturn(savedRun)
                            )
                            .map(TestRunDto::from);
                })
                .doOnSuccess(dto -> log.info("Quick run #{} for case: {} result: {}",
                        dto.getRunNumber(), testCaseId, result));
    }

    private Flux<TestRunStepResultDto> saveStepResults(String runId, List<TestRunStepResultDto> stepResults) {
        return Flux.fromIterable(stepResults)
                .map(dto -> R2dbcTestRunStepResult.builder()
                        .id(UUID.randomUUID().toString())
                        .testRunId(runId)
                        .testStepId(dto.getTestStepId())
                        .stepNumber(dto.getStepNumber())
                        .actualResult(dto.getActualResult())
                        .status(dto.getStatus())
                        .screenshotPath(dto.getScreenshotPath())
                        .notes(dto.getNotes())
                        .build())
                .flatMap(stepResultRepository::save)
                .map(TestRunStepResultDto::from);
    }
}
