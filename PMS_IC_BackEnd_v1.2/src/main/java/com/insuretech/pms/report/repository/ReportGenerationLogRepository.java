package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.GenerationMode;
import com.insuretech.pms.report.entity.ReportGenerationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository for ReportGenerationLog entity
 */
@Repository
public interface ReportGenerationLogRepository extends JpaRepository<ReportGenerationLog, UUID> {

    // Find by user
    Page<ReportGenerationLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    // Find by report
    List<ReportGenerationLog> findByReportIdOrderByCreatedAtDesc(UUID reportId);

    // Find by status
    List<ReportGenerationLog> findByStatusOrderByCreatedAtDesc(String status);

    // Find failed generations
    @Query("SELECT l FROM ReportGenerationLog l WHERE l.status = 'FAILED' " +
           "AND l.createdAt >= :since " +
           "ORDER BY l.createdAt DESC")
    List<ReportGenerationLog> findRecentFailures(@Param("since") LocalDateTime since);

    // Find by mode
    Page<ReportGenerationLog> findByGenerationModeOrderByCreatedAtDesc(
            GenerationMode mode, Pageable pageable);

    // Statistics
    @Query("SELECT AVG(l.totalDurationMs) FROM ReportGenerationLog l " +
           "WHERE l.status = 'SUCCESS' AND l.createdAt >= :since")
    Double getAverageGenerationTime(@Param("since") LocalDateTime since);

    @Query("SELECT SUM(l.llmTokensUsed) FROM ReportGenerationLog l WHERE l.createdAt >= :since")
    Long getTotalTokensUsed(@Param("since") LocalDateTime since);

    // Count by mode and status
    @Query("SELECT COUNT(l) FROM ReportGenerationLog l " +
           "WHERE l.generationMode = :mode AND l.status = :status " +
           "AND l.createdAt >= :since")
    long countByModeAndStatus(
            @Param("mode") GenerationMode mode,
            @Param("status") String status,
            @Param("since") LocalDateTime since);

    // Cleanup old logs
    @Modifying
    @Query("DELETE FROM ReportGenerationLog l WHERE l.createdAt < :cutoff")
    int deleteOldLogs(@Param("cutoff") LocalDateTime cutoff);
}
