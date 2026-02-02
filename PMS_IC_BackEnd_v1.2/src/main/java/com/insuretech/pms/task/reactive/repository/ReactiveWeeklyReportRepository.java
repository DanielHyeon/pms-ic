package com.insuretech.pms.task.reactive.repository;

import com.insuretech.pms.task.reactive.entity.R2dbcWeeklyReport;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;

@Repository
public interface ReactiveWeeklyReportRepository extends ReactiveCrudRepository<R2dbcWeeklyReport, String> {

    Flux<R2dbcWeeklyReport> findByProjectIdOrderByWeekStartDateDesc(String projectId);

    Flux<R2dbcWeeklyReport> findBySprintIdOrderByWeekStartDateDesc(String sprintId);

    Mono<R2dbcWeeklyReport> findByProjectIdAndWeekStartDate(String projectId, LocalDate weekStartDate);

    Mono<R2dbcWeeklyReport> findBySprintIdAndWeekStartDate(String sprintId, LocalDate weekStartDate);

    @Query("SELECT * FROM task.weekly_reports WHERE project_id = :projectId AND week_start_date BETWEEN :startDate AND :endDate ORDER BY week_start_date DESC")
    Flux<R2dbcWeeklyReport> findByProjectIdAndWeekStartDateBetween(String projectId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT * FROM task.weekly_reports WHERE sprint_id = :sprintId AND week_start_date BETWEEN :startDate AND :endDate ORDER BY week_start_date DESC")
    Flux<R2dbcWeeklyReport> findBySprintIdAndWeekStartDateBetween(String sprintId, LocalDate startDate, LocalDate endDate);
}
