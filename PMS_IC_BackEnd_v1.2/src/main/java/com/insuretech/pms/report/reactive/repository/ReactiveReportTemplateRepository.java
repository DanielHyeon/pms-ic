package com.insuretech.pms.report.reactive.repository;

import com.insuretech.pms.report.reactive.entity.R2dbcReportTemplate;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface ReactiveReportTemplateRepository extends ReactiveCrudRepository<R2dbcReportTemplate, UUID> {

    Flux<R2dbcReportTemplate> findByReportTypeAndIsActiveTrue(String reportType);

    Flux<R2dbcReportTemplate> findByScopeAndIsActiveTrue(String scope);

    Flux<R2dbcReportTemplate> findByOrganizationIdAndIsActiveTrue(String organizationId);

    Mono<R2dbcReportTemplate> findByReportTypeAndIsDefaultTrue(String reportType);

    Flux<R2dbcReportTemplate> findByIsActiveTrue();

    @Query("SELECT * FROM report.report_templates WHERE is_active = true AND (scope = 'GLOBAL' OR organization_id = :organizationId)")
    Flux<R2dbcReportTemplate> findAvailableTemplates(String organizationId);

    @Query("UPDATE report.report_templates SET is_active = false WHERE id = :id")
    Mono<Void> deactivateTemplate(UUID id);

    @Query("UPDATE report.report_templates SET is_default = false WHERE report_type = :reportType")
    Mono<Void> clearDefaultForReportType(String reportType);
}
