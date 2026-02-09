package com.insuretech.pms.test.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.test.dto.TestSuiteDto;
import com.insuretech.pms.test.reactive.entity.R2dbcTestSuite;
import com.insuretech.pms.test.reactive.repository.ReactiveTestCaseRepository;
import com.insuretech.pms.test.reactive.repository.ReactiveTestSuiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveTestSuiteService {

    private final ReactiveTestSuiteRepository suiteRepository;
    private final ReactiveTestCaseRepository testCaseRepository;

    /**
     * List all active suites for a project, enriched with test case count.
     */
    public Flux<TestSuiteDto> listSuites(String projectId) {
        return suiteRepository.findByProjectIdOrderByOrderNumAsc(projectId)
                .flatMap(this::enrichWithCount);
    }

    /**
     * Get a single suite by id.
     */
    public Mono<TestSuiteDto> getSuite(String suiteId) {
        return suiteRepository.findById(suiteId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test suite not found: " + suiteId)))
                .flatMap(this::enrichWithCount);
    }

    /**
     * Create a new test suite.
     */
    @Transactional
    public Mono<TestSuiteDto> createSuite(String projectId, TestSuiteDto request, String userId) {
        R2dbcTestSuite suite = R2dbcTestSuite.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .name(request.getName())
                .description(request.getDescription())
                .suiteType(request.getSuiteType() != null ? request.getSuiteType() : "GENERAL")
                .status("ACTIVE")
                .phaseId(request.getPhaseId())
                .ownerId(request.getOwnerId() != null ? request.getOwnerId() : userId)
                .orderNum(request.getOrderNum() != null ? request.getOrderNum() : 0)
                .build();
        suite.setCreatedBy(userId);
        suite.setUpdatedBy(userId);

        return suiteRepository.save(suite)
                .map(TestSuiteDto::from)
                .doOnSuccess(dto -> log.info("Created test suite: {} for project: {}", dto.getId(), projectId));
    }

    /**
     * Update an existing test suite.
     */
    @Transactional
    public Mono<TestSuiteDto> updateSuite(String suiteId, TestSuiteDto request, String userId) {
        return suiteRepository.findById(suiteId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test suite not found: " + suiteId)))
                .flatMap(suite -> {
                    if (request.getName() != null) suite.setName(request.getName());
                    if (request.getDescription() != null) suite.setDescription(request.getDescription());
                    if (request.getSuiteType() != null) suite.setSuiteType(request.getSuiteType());
                    if (request.getPhaseId() != null) suite.setPhaseId(request.getPhaseId());
                    if (request.getOwnerId() != null) suite.setOwnerId(request.getOwnerId());
                    if (request.getOrderNum() != null) suite.setOrderNum(request.getOrderNum());
                    suite.setUpdatedBy(userId);
                    return suiteRepository.save(suite);
                })
                .flatMap(this::enrichWithCount)
                .doOnSuccess(dto -> log.info("Updated test suite: {}", suiteId));
    }

    /**
     * Archive (soft-delete) a test suite.
     */
    @Transactional
    public Mono<Void> archiveSuite(String suiteId, String userId) {
        return suiteRepository.findById(suiteId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Test suite not found: " + suiteId)))
                .flatMap(suite -> {
                    suite.setStatus("ARCHIVED");
                    suite.setUpdatedBy(userId);
                    return suiteRepository.save(suite);
                })
                .then()
                .doOnSuccess(v -> log.info("Archived test suite: {}", suiteId));
    }

    private Mono<TestSuiteDto> enrichWithCount(R2dbcTestSuite entity) {
        return testCaseRepository.countBySuiteId(entity.getId())
                .map(count -> {
                    TestSuiteDto dto = TestSuiteDto.from(entity);
                    dto.setTestCaseCount(count);
                    return dto;
                });
    }
}
