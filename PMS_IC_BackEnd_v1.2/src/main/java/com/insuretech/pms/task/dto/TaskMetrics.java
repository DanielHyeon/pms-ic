package com.insuretech.pms.task.dto;

import com.insuretech.pms.task.reactive.entity.R2dbcTask;
import com.insuretech.pms.task.reactive.entity.R2dbcWeeklyReport;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object encapsulating task count metrics.
 * Eliminates data clumps where task status counts are passed together.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskMetrics {

    private int total;
    private int completed;
    private int inProgress;
    private int todo;
    private int blocked;
    private double completionRate;

    /**
     * Calculate metrics from a list of tasks
     *
     * @param tasks List of tasks to analyze
     * @return TaskMetrics with calculated values
     */
    public static TaskMetrics fromTasks(List<R2dbcTask> tasks) {
        int total = tasks.size();
        int completed = (int) tasks.stream()
                .filter(t -> "DONE".equals(t.getStatus()))
                .count();
        int inProgress = (int) tasks.stream()
                .filter(t -> "IN_PROGRESS".equals(t.getStatus()))
                .count();
        int todo = (int) tasks.stream()
                .filter(t -> "TODO".equals(t.getStatus()))
                .count();
        int blocked = (int) tasks.stream()
                .filter(t -> "REVIEW".equals(t.getStatus()))
                .count();
        double completionRate = total > 0 ? (completed * 100.0) / total : 0.0;

        return TaskMetrics.builder()
                .total(total)
                .completed(completed)
                .inProgress(inProgress)
                .todo(todo)
                .blocked(blocked)
                .completionRate(completionRate)
                .build();
    }

    /**
     * Apply metrics to a WeeklyReport entity
     *
     * @param report The report to update
     */
    public void applyTo(R2dbcWeeklyReport report) {
        report.setTotalTasks(this.total);
        report.setCompletedTasks(this.completed);
        report.setInProgressTasks(this.inProgress);
        report.setTodoTasks(this.todo);
        report.setBlockedTasks(this.blocked);
        report.setCompletionRate(this.completionRate);
    }
}
