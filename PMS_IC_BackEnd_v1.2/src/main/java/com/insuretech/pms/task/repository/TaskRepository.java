package com.insuretech.pms.task.repository;

import com.insuretech.pms.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
    @Query("SELECT COUNT(t) FROM Task t WHERE t.column.project.id IN :projectIds")
    long countByProjectIdIn(@Param("projectIds") List<String> projectIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.column.project.id IN :projectIds AND t.status = :status")
    long countByProjectIdInAndStatus(@Param("projectIds") List<String> projectIds, @Param("status") Task.TaskStatus status);
}