package com.insuretech.pms.task.repository;

import com.insuretech.pms.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByColumnIdOrderByOrderNumAsc(String columnId);
    List<Task> findByAssigneeId(String assigneeId);
    List<Task> findByAssigneeIdAndStatusNot(String assigneeId, Task.TaskStatus status);
    List<Task> findBySprintId(String sprintId);
    int countByColumnIdAndStatusNot(String columnId, Task.TaskStatus status);
    int countBySprintIdAndStatusNot(String sprintId, Task.TaskStatus status);

    // Lineage: find tasks by project via KanbanColumn relationship
    List<Task> findByColumn_ProjectId(String projectId);

    // Progress: find tasks linked to a requirement
    List<Task> findByRequirementId(String requirementId);

    // Dashboard: count tasks by status
    long countByStatus(Task.TaskStatus status);

    // ===== Tenant-Aware Dashboard Methods =====

    // Project-scoped task counting (for single project dashboard)
    long countByColumn_ProjectId(String projectId);
    long countByColumn_ProjectIdAndStatus(String projectId, Task.TaskStatus status);

    // Multi-project counting (for portfolio dashboard)
    @Query("SELECT COUNT(t) FROM Task t WHERE t.column.projectId IN :projectIds")
    long countByProjectIdIn(@Param("projectIds") List<String> projectIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.column.projectId IN :projectIds AND t.status = :status")
    long countByProjectIdInAndStatus(@Param("projectIds") List<String> projectIds, @Param("status") Task.TaskStatus status);

    // ===== Part-based queries =====

    @Query("SELECT COUNT(t) FROM Task t WHERE t.partId = :partId")
    int countByPartId(@Param("partId") String partId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.partId = :partId AND t.status = :status")
    int countByPartIdAndStatus(@Param("partId") String partId, @Param("status") String status);

    List<Task> findByPartId(String partId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.partId = :partId AND t.dueDate < :today AND t.status <> 'DONE'")
    int countOverdueByPartId(@Param("partId") String partId, @Param("today") LocalDate today);

    // ===== Track-based queries for weighted progress calculation =====

    // Count tasks by project and track type
    @Query("SELECT COUNT(t) FROM Task t WHERE t.column.projectId = :projectId AND t.trackType = :trackType")
    long countByProjectIdAndTrackType(@Param("projectId") String projectId, @Param("trackType") Task.TrackType trackType);

    // Count completed tasks (DONE status) by project and track type
    @Query("SELECT COUNT(t) FROM Task t WHERE t.column.projectId = :projectId AND t.trackType = :trackType AND t.status = 'DONE'")
    long countCompletedByProjectIdAndTrackType(@Param("projectId") String projectId, @Param("trackType") Task.TrackType trackType);

    // Calculate completion rate by track type for a project
    // Returns 0.0 if no tasks exist for the track type
    @Query("SELECT COALESCE(" +
           "CAST(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) AS double) * 100.0 / " +
           "NULLIF(CAST(COUNT(*) AS double), 0), 0.0) " +
           "FROM Task t WHERE t.column.projectId = :projectId AND t.trackType = :trackType")
    Double calculateCompletionRateByTrackType(@Param("projectId") String projectId, @Param("trackType") Task.TrackType trackType);
}