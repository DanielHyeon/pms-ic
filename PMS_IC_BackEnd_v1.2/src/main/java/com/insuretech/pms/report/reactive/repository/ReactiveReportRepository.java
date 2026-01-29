package com.insuretech.pms.report.reactive.repository;

import com.insuretech.pms.report.reactive.entity.R2dbcReport;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface ReactiveReportRepository extends ReactiveCrudRepository<R2dbcReport, UUID> {

    Flux<R2dbcReport> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Flux<R2dbcReport> findByProjectIdAndReportType(String projectId, String reportType);

    Flux<R2dbcReport> findByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcReport> findByProjectIdAndReportScope(String projectId, String reportScope);

    Flux<R2dbcReport> findByTemplateId(UUID templateId);

    @Query("SELECT * FROM report.reports WHERE project_id = :projectId AND period_start >= :startDate AND period_end <= :endDate ORDER BY created_at DESC")
    Flux<R2dbcReport> findByProjectIdAndPeriod(String projectId, LocalDate startDate, LocalDate endDate);

    @Query("UPDATE report.reports SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(UUID id, String status);

    @Query("UPDATE report.reports SET status = 'PUBLISHED', published_at = NOW() WHERE id = :id")
    Mono<Void> publishReport(UUID id);

    Mono<Long> countByProjectId(String projectId);

    Mono<Long> countByProjectIdAndStatus(String projectId, String status);
}
