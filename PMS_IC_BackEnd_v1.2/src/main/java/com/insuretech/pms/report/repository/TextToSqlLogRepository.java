package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.TextToSqlLog;
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
 * Repository for TextToSqlLog entity
 */
@Repository
public interface TextToSqlLogRepository extends JpaRepository<TextToSqlLog, UUID> {

    // Find by user
    Page<TextToSqlLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    // Find by user and project
    Page<TextToSqlLog> findByUserIdAndProjectIdOrderByCreatedAtDesc(
            String userId, String projectId, Pageable pageable);

    // Find by status
    List<TextToSqlLog> findByExecutionStatusOrderByCreatedAtDesc(String status);

    // Find failed queries
    @Query("SELECT l FROM TextToSqlLog l WHERE l.executionStatus = 'FAILED' " +
           "ORDER BY l.createdAt DESC")
    Page<TextToSqlLog> findFailedQueries(Pageable pageable);

    // Find rejected queries (security violations)
    @Query("SELECT l FROM TextToSqlLog l WHERE l.executionStatus = 'REJECTED' " +
           "ORDER BY l.createdAt DESC")
    Page<TextToSqlLog> findRejectedQueries(Pageable pageable);

    // Find queries with sanitization
    List<TextToSqlLog> findByWasSanitizedTrueOrderByCreatedAtDesc();

    // Statistics - average generation time
    @Query("SELECT AVG(l.generationMs) FROM TextToSqlLog l WHERE l.createdAt >= :since")
    Double getAverageGenerationTime(@Param("since") LocalDateTime since);

    // Statistics - success rate
    @Query("SELECT COUNT(l) FROM TextToSqlLog l WHERE l.executionStatus = 'SUCCESS' " +
           "AND l.createdAt >= :since")
    long countSuccessfulQueries(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(l) FROM TextToSqlLog l WHERE l.createdAt >= :since")
    long countTotalQueries(@Param("since") LocalDateTime since);

    // Cleanup old logs
    @Modifying
    @Query("DELETE FROM TextToSqlLog l WHERE l.createdAt < :cutoff")
    int deleteOldLogs(@Param("cutoff") LocalDateTime cutoff);
}
