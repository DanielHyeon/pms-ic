package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.ReportTemplate;
import com.insuretech.pms.report.entity.ReportType;
import com.insuretech.pms.report.entity.TemplateScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ReportTemplate entity
 */
@Repository
public interface ReportTemplateRepository extends JpaRepository<ReportTemplate, UUID> {

    // Find active templates
    List<ReportTemplate> findByIsActiveTrueOrderByNameAsc();

    // Find by scope
    List<ReportTemplate> findByScopeAndIsActiveTrueOrderByNameAsc(TemplateScope scope);

    // Find by report type
    List<ReportTemplate> findByReportTypeAndIsActiveTrueOrderByNameAsc(ReportType reportType);

    // Find by scope and type
    List<ReportTemplate> findByScopeAndReportTypeAndIsActiveTrueOrderByNameAsc(
            TemplateScope scope, ReportType reportType);

    // Find default template for role (native query for PostgreSQL array)
    @Query(value = "SELECT * FROM report.report_templates t WHERE t.is_active = true " +
           "AND t.report_type = :reportType " +
           "AND :role = ANY(t.target_roles) " +
           "AND t.is_default = true", nativeQuery = true)
    Optional<ReportTemplate> findDefaultTemplateForRole(
            @Param("reportType") String reportType,
            @Param("role") String role);

    // Find templates for role (native query for PostgreSQL array)
    @Query(value = "SELECT * FROM report.report_templates t WHERE t.is_active = true " +
           "AND t.report_type = :reportType " +
           "AND :role = ANY(t.target_roles) " +
           "ORDER BY t.is_default DESC, t.name ASC", nativeQuery = true)
    List<ReportTemplate> findTemplatesForRole(
            @Param("reportType") String reportType,
            @Param("role") String role);

    // Find by creator
    List<ReportTemplate> findByCreatedByAndIsActiveTrueOrderByNameAsc(String createdBy);

    // Find personal templates
    @Query("SELECT t FROM ReportTemplate t WHERE t.scope = 'PERSONAL' " +
           "AND t.createdBy = :userId " +
           "AND t.isActive = true " +
           "ORDER BY t.name ASC")
    List<ReportTemplate> findPersonalTemplates(@Param("userId") String userId);

    // Find system templates
    @Query("SELECT t FROM ReportTemplate t WHERE t.scope = 'SYSTEM' " +
           "AND t.isActive = true " +
           "ORDER BY t.name ASC")
    List<ReportTemplate> findSystemTemplates();

    // Find organization templates
    @Query("SELECT t FROM ReportTemplate t WHERE t.scope = 'ORGANIZATION' " +
           "AND t.organizationId = :organizationId " +
           "AND t.isActive = true " +
           "ORDER BY t.name ASC")
    List<ReportTemplate> findOrganizationTemplates(@Param("organizationId") String organizationId);

    // Check name uniqueness for user
    boolean existsByNameAndCreatedByAndIdNot(String name, String createdBy, UUID id);
}
