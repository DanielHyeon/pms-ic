package com.insuretech.pms.test.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.test.dto.TestCaseDto;
import com.insuretech.pms.test.dto.TestCaseSummaryDto;
import com.insuretech.pms.test.dto.TestStepDto;
import com.insuretech.pms.test.reactive.entity.R2dbcTestCase;
import com.insuretech.pms.test.reactive.entity.R2dbcTestStep;
import com.insuretech.pms.test.reactive.repository.ReactiveTestCaseRepository;
import com.insuretech.pms.test.reactive.repository.ReactiveTestStepRepository;
import com.insuretech.pms.test.reactive.repository.ReactiveTestSuiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveTestCaseService {

    private final ReactiveTestCaseRepository testCaseRepository;
    private final ReactiveTestStepRepository testStepRepository;
    private final ReactiveTestSuiteRepository testSuiteRepository;

    // Valid definition_status transitions: DRAFT -> READY -> DEPRECATED
    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "DRAFT", List.of("READY"),
            "READY", List.of("DEPRECATED"),
            "DEPRECATED", List.of()
    );

    /**
     * List test cases for a project (lightweight summary DTOs).
     */
    public Flux<TestCaseSummaryDto> listTestCases(String projectId, String suiteId) {
        Flux<R2dbcTestCase> cases;
        if (suiteId != null && !suiteId.isBlank()) {
            cases = testCaseRepository.findByProjectIdAndSuiteId(projectId, suiteId);
        } else {
            cases = testCaseRepository.findByProjectIdOrderByTestCaseCodeAsc(projectId);
        }
        return cases.map(TestCaseSummaryDto::from);
    }

    /**
     * Get a single test case with its steps.
     */
    public Mono<TestCaseDto> getTestCase(String testCaseId) {
        return testCaseRepository.findById(testCaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test case not found: " + testCaseId)))
                .flatMap(entity ->
                    testStepRepository.findByTestCaseIdOrderByStepNumberAsc(entity.getId())
                            .map(TestStepDto::from)
                            .collectList()
                            .map(steps -> {
                                TestCaseDto dto = TestCaseDto.from(entity);
                                dto.setSteps(steps);
                                return dto;
                            })
                );
    }

    /**
     * Create a test case with optional steps.
     */
    @Transactional
    public Mono<TestCaseDto> createTestCase(String projectId, TestCaseDto request, String userId) {
        // Validate suite exists
        return testSuiteRepository.findById(request.getSuiteId())
                .switchIfEmpty(Mono.error(CustomException.notFound("Test suite not found: " + request.getSuiteId())))
                .flatMap(suite -> {
                    // Check test_case_code uniqueness within project
                    return testCaseRepository.existsByProjectIdAndTestCaseCode(projectId, request.getTestCaseCode())
                            .flatMap(exists -> {
                                if (Boolean.TRUE.equals(exists)) {
                                    return Mono.error(CustomException.conflict(
                                            "Test case code already exists: " + request.getTestCaseCode()));
                                }

                                R2dbcTestCase testCase = R2dbcTestCase.builder()
                                        .id(UUID.randomUUID().toString())
                                        .projectId(projectId)
                                        .suiteId(request.getSuiteId())
                                        .testCaseCode(request.getTestCaseCode())
                                        .title(request.getTitle())
                                        .description(request.getDescription())
                                        .preconditions(request.getPreconditions())
                                        .testType(request.getTestType() != null ? request.getTestType() : "MANUAL")
                                        .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                                        .definitionStatus("DRAFT")
                                        .lastOutcome("NOT_RUN")
                                        .assigneeId(request.getAssigneeId())
                                        .phaseId(request.getPhaseId())
                                        .estimatedDuration(request.getEstimatedDuration())
                                        .build();
                                testCase.setCreatedBy(userId);
                                testCase.setUpdatedBy(userId);

                                return testCaseRepository.save(testCase)
                                        .flatMap(saved -> {
                                            if (request.getSteps() != null && !request.getSteps().isEmpty()) {
                                                return saveSteps(saved.getId(), request.getSteps())
                                                        .collectList()
                                                        .map(steps -> {
                                                            TestCaseDto dto = TestCaseDto.from(saved);
                                                            dto.setSteps(steps);
                                                            return dto;
                                                        });
                                            }
                                            return Mono.just(TestCaseDto.from(saved));
                                        });
                            });
                })
                .doOnSuccess(dto -> log.info("Created test case: {} for project: {}", dto.getId(), projectId));
    }

    /**
     * Update a test case metadata and optionally replace steps.
     */
    @Transactional
    public Mono<TestCaseDto> updateTestCase(String testCaseId, TestCaseDto request, String userId) {
        return testCaseRepository.findById(testCaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test case not found: " + testCaseId)))
                .flatMap(tc -> {
                    if (request.getTitle() != null) tc.setTitle(request.getTitle());
                    if (request.getDescription() != null) tc.setDescription(request.getDescription());
                    if (request.getPreconditions() != null) tc.setPreconditions(request.getPreconditions());
                    if (request.getTestType() != null) tc.setTestType(request.getTestType());
                    if (request.getPriority() != null) tc.setPriority(request.getPriority());
                    if (request.getAssigneeId() != null) tc.setAssigneeId(request.getAssigneeId());
                    if (request.getPhaseId() != null) tc.setPhaseId(request.getPhaseId());
                    if (request.getEstimatedDuration() != null) tc.setEstimatedDuration(request.getEstimatedDuration());
                    tc.setUpdatedBy(userId);

                    return testCaseRepository.save(tc)
                            .flatMap(saved -> {
                                // Replace steps if provided
                                if (request.getSteps() != null) {
                                    return testStepRepository.deleteByTestCaseId(saved.getId())
                                            .then(saveSteps(saved.getId(), request.getSteps())
                                                    .collectList()
                                                    .map(steps -> {
                                                        TestCaseDto dto = TestCaseDto.from(saved);
                                                        dto.setSteps(steps);
                                                        return dto;
                                                    }));
                                }
                                return getTestCase(saved.getId());
                            });
                })
                .doOnSuccess(dto -> log.info("Updated test case: {}", testCaseId));
    }

    /**
     * Delete a test case.
     */
    @Transactional
    public Mono<Void> deleteTestCase(String testCaseId) {
        return testCaseRepository.findById(testCaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test case not found: " + testCaseId)))
                .flatMap(tc -> testCaseRepository.deleteById(testCaseId))
                .doOnSuccess(v -> log.info("Deleted test case: {}", testCaseId));
    }

    /**
     * Transition definition status (DRAFT -> READY -> DEPRECATED).
     */
    @Transactional
    public Mono<TestCaseDto> transitionStatus(String testCaseId, String targetStatus, String userId) {
        return testCaseRepository.findById(testCaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test case not found: " + testCaseId)))
                .flatMap(tc -> {
                    List<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(tc.getDefinitionStatus(), List.of());
                    if (!allowed.contains(targetStatus)) {
                        return Mono.error(CustomException.badRequest(
                                "Invalid transition from " + tc.getDefinitionStatus() + " to " + targetStatus
                                        + ". Allowed: " + allowed));
                    }
                    tc.setDefinitionStatus(targetStatus);
                    tc.setUpdatedBy(userId);
                    return testCaseRepository.save(tc);
                })
                .map(TestCaseDto::from)
                .doOnSuccess(dto -> log.info("Transitioned test case {} to {}", testCaseId, targetStatus));
    }

    /**
     * Update last_outcome and run_count after a test run.
     * Called internally by ReactiveTestRunService.
     */
    @Transactional
    public Mono<R2dbcTestCase> updateOutcomeAfterRun(String testCaseId, String result) {
        return testCaseRepository.findById(testCaseId)
                .flatMap(tc -> {
                    tc.setLastOutcome(result);
                    tc.setRunCount(tc.getRunCount() + 1);
                    tc.setLastRunAt(LocalDateTime.now());
                    return testCaseRepository.save(tc);
                });
    }

    private Flux<TestStepDto> saveSteps(String testCaseId, List<TestStepDto> steps) {
        return Flux.fromIterable(steps)
                .map(stepDto -> {
                    R2dbcTestStep step = R2dbcTestStep.builder()
                            .id(UUID.randomUUID().toString())
                            .testCaseId(testCaseId)
                            .stepNumber(stepDto.getStepNumber())
                            .action(stepDto.getAction())
                            .expectedResult(stepDto.getExpectedResult())
                            .testData(stepDto.getTestData())
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return step;
                })
                .flatMap(testStepRepository::save)
                .map(TestStepDto::from);
    }
}
