package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.ReportMetricsHistory;
import com.insuretech.pms.report.entity.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ReportMetricsHistory entity
 */
@Repository
public interface ReportMetricsRepository extends JpaRepository<ReportMetricsHistory, UUID> {

    // Find by project and date range
    @Query("SELECT m FROM ReportMetricsHistory m WHERE m.projectId = :projectId " +
           "AND m.metricDate BETWEEN :startDate AND :endDate " +
           "ORDER BY m.metricDate ASC")
    List<ReportMetricsHistory> findByProjectIdAndDateRange(
            @Param("projectId") String projectId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find by project, date, and type
    Optional<ReportMetricsHistory> findByProjectIdAndMetricDateAndReportType(
            String projectId, LocalDate metricDate, ReportType reportType);

    // Find latest metrics for project
    @Query("SELECT m FROM ReportMetricsHistory m WHERE m.projectId = :projectId " +
           "AND m.reportType = :reportType " +
           "ORDER BY m.metricDate DESC LIMIT 1")
    Optional<ReportMetricsHistory> findLatestMetrics(
            @Param("projectId") String projectId,
            @Param("reportType") ReportType reportType);

    // Find weekly metrics for project
    @Query("SELECT m FROM ReportMetricsHistory m WHERE m.projectId = :projectId " +
           "AND m.reportType = 'WEEKLY' " +
           "AND m.metricDate >= :startDate " +
           "ORDER BY m.metricDate ASC")
    List<ReportMetricsHistory> findWeeklyMetrics(
            @Param("projectId") String projectId,
            @Param("startDate") LocalDate startDate);

    // Find monthly metrics for project
    @Query("SELECT m FROM ReportMetricsHistory m WHERE m.projectId = :projectId " +
           "AND m.reportType = 'MONTHLY' " +
           "AND m.fiscalYear = :year " +
           "ORDER BY m.fiscalMonth ASC")
    List<ReportMetricsHistory> findMonthlyMetricsForYear(
            @Param("projectId") String projectId,
            @Param("year") Integer year);

    // Find by scope
    @Query("SELECT m FROM ReportMetricsHistory m WHERE m.projectId = :projectId " +
           "AND m.scopeType = :scopeType " +
           "AND m.scopeId = :scopeId " +
           "AND m.metricDate BETWEEN :startDate AND :endDate " +
           "ORDER BY m.metricDate ASC")
    List<ReportMetricsHistory> findByScopeAndDateRange(
            @Param("projectId") String projectId,
            @Param("scopeType") String scopeType,
            @Param("scopeId") String scopeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Aggregate velocity trend
    @Query("SELECT AVG(m.velocity) FROM ReportMetricsHistory m WHERE m.projectId = :projectId " +
           "AND m.reportType = :reportType " +
           "AND m.metricDate >= :startDate")
    Double getAverageVelocity(
            @Param("projectId") String projectId,
            @Param("reportType") ReportType reportType,
            @Param("startDate") LocalDate startDate);

    // Delete old metrics
    @Query("DELETE FROM ReportMetricsHistory m WHERE m.metricDate < :cutoffDate")
    void deleteOldMetrics(@Param("cutoffDate") LocalDate cutoffDate);
}
