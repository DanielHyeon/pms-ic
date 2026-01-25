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

    // Find default template for role
    @Query("SELECT t FROM ReportTemplate t WHERE t.isActive = true " +
           "AND t.reportType = :reportType " +
           "AND :role = ANY(t.targetRoles) " +
           "AND t.isDefault = true")
    Optional<ReportTemplate> findDefaultTemplateForRole(
            @Param("reportType") ReportType reportType,
            @Param("role") String role);

    // Find templates for role
    @Query("SELECT t FROM ReportTemplate t WHERE t.isActive = true " +
           "AND t.reportType = :reportType " +
           "AND :role = ANY(t.targetRoles) " +
           "ORDER BY t.isDefault DESC, t.name ASC")
    List<ReportTemplate> findTemplatesForRole(
            @Param("reportType") ReportType reportType,
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
