package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.Report;
import com.insuretech.pms.report.entity.ReportScope;
import com.insuretech.pms.report.entity.ReportStatus;
import com.insuretech.pms.report.entity.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Report entity
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    // Basic finders
    List<Report> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<Report> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    Page<Report> findByProjectId(String projectId, Pageable pageable);

    // By type and scope
    List<Report> findByProjectIdAndReportType(String projectId, ReportType reportType);

    List<Report> findByProjectIdAndReportScope(String projectId, ReportScope reportScope);

    // By status
    List<Report> findByProjectIdAndStatus(String projectId, ReportStatus status);

    Page<Report> findByProjectIdAndStatus(String projectId, ReportStatus status, Pageable pageable);

    // By period
    @Query("SELECT r FROM Report r WHERE r.projectId = :projectId " +
           "AND r.periodStart >= :startDate AND r.periodEnd <= :endDate " +
           "ORDER BY r.createdAt DESC")
    List<Report> findByProjectIdAndPeriod(
            @Param("projectId") String projectId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // By creator and type
    List<Report> findByCreatedByAndReportType(String createdBy, ReportType reportType);

    // Search with multiple criteria
    @Query("SELECT r FROM Report r WHERE r.projectId = :projectId " +
           "AND (:reportType IS NULL OR r.reportType = :reportType) " +
           "AND (:reportScope IS NULL OR r.reportScope = :reportScope) " +
           "AND (:status IS NULL OR r.status = :status) " +
           "AND (:createdBy IS NULL OR r.createdBy = :createdBy) " +
           "ORDER BY r.createdAt DESC")
    Page<Report> searchReports(
            @Param("projectId") String projectId,
            @Param("reportType") ReportType reportType,
            @Param("reportScope") ReportScope reportScope,
            @Param("status") ReportStatus status,
            @Param("createdBy") String createdBy,
            Pageable pageable);

    // Check for existing report in period
    @Query("SELECT r FROM Report r WHERE r.projectId = :projectId " +
           "AND r.createdBy = :userId " +
           "AND r.reportType = :reportType " +
           "AND r.periodStart = :periodStart " +
           "AND r.periodEnd = :periodEnd")
    Optional<Report> findExistingReport(
            @Param("projectId") String projectId,
            @Param("userId") String userId,
            @Param("reportType") ReportType reportType,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd);

    // Statistics
    @Query("SELECT COUNT(r) FROM Report r WHERE r.projectId = :projectId AND r.reportType = :reportType")
    long countByProjectIdAndReportType(
            @Param("projectId") String projectId,
            @Param("reportType") ReportType reportType);

    // For individual scope
    List<Report> findByScopeUserIdOrderByCreatedAtDesc(String userId);

    // For team scope
    List<Report> findByScopeTeamIdOrderByCreatedAtDesc(String teamId);
}
