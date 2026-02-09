package com.insuretech.pms.pmo.service;

import com.insuretech.pms.pmo.dto.PmoHealthDto;
import com.insuretech.pms.pmo.dto.PmoPortfolioDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactivePmoService {

    private final DatabaseClient databaseClient;

    private static final String CALC_VERSION = "1.0";

    public Mono<PmoPortfolioDto> getPortfolio() {
        return databaseClient.sql("""
                SELECT p.id, p.name, p.status,
                    (SELECT COUNT(*) FROM task.tasks t WHERE t.project_id = p.id) as total_tasks,
                    (SELECT COUNT(*) FROM task.tasks t WHERE t.project_id = p.id AND t.status = 'DONE') as completed_tasks,
                    (SELECT COUNT(*) FROM project.issues i WHERE i.project_id = p.id AND i.status NOT IN ('CLOSED','RESOLVED')) as open_issues,
                    (SELECT COUNT(*) FROM task.tasks t WHERE t.project_id = p.id AND t.due_date < CURRENT_DATE AND t.status NOT IN ('DONE','CANCELLED')) as overdue_tasks
                FROM project.projects p
                WHERE p.status NOT IN ('CLOSED', 'CANCELLED')
                ORDER BY p.name
                """)
                .fetch().all()
                .map(row -> {
                    long total = ((Number) row.getOrDefault("total_tasks", 0)).longValue();
                    long completed = ((Number) row.getOrDefault("completed_tasks", 0)).longValue();
                    long openIssues = ((Number) row.getOrDefault("open_issues", 0)).longValue();
                    long overdue = ((Number) row.getOrDefault("overdue_tasks", 0)).longValue();
                    double progress = total > 0 ? (completed * 100.0 / total) : 0;

                    double scheduleScore = computeScheduleScore(overdue, total);
                    double qualityScore = computeQualityScore(openIssues);
                    double overallScore = (scheduleScore + qualityScore + 70 + 70 + 70) / 5.0;
                    String grade = gradeFromScore(overallScore);

                    return PmoPortfolioDto.ProjectHealthSummary.builder()
                            .projectId((String) row.get("id"))
                            .projectName((String) row.get("name"))
                            .status((String) row.get("status"))
                            .healthGrade(grade)
                            .healthScore(Math.round(overallScore * 10) / 10.0)
                            .scheduleScore(Math.round(scheduleScore * 10) / 10.0)
                            .costScore(70.0)
                            .qualityScore(Math.round(qualityScore * 10) / 10.0)
                            .riskScore(70.0)
                            .resourceScore(70.0)
                            .totalTasks((int) total)
                            .completedTasks((int) completed)
                            .progressPct(Math.round(progress * 10) / 10.0)
                            .openIssues((int) openIssues)
                            .criticalRisks(0)
                            .build();
                })
                .collectList()
                .map(projects -> {
                    long red = projects.stream().filter(p -> "F".equals(p.getHealthGrade()) || "D".equals(p.getHealthGrade())).count();
                    long yellow = projects.stream().filter(p -> "C".equals(p.getHealthGrade())).count();
                    long green = projects.stream().filter(p -> "A".equals(p.getHealthGrade()) || "B".equals(p.getHealthGrade())).count();
                    double avg = projects.stream().mapToDouble(PmoPortfolioDto.ProjectHealthSummary::getHealthScore).average().orElse(0);

                    return PmoPortfolioDto.builder()
                            .totalProjects(projects.size())
                            .activeProjects(projects.size())
                            .redProjects((int) red)
                            .yellowProjects((int) yellow)
                            .greenProjects((int) green)
                            .avgHealthScore(Math.round(avg * 10) / 10.0)
                            .projects(projects)
                            .build();
                });
    }

    public Mono<PmoHealthDto> getProjectHealth(String projectId) {
        return databaseClient.sql("""
                SELECT p.id, p.name, p.status,
                    (SELECT COUNT(*) FROM task.tasks t WHERE t.project_id = p.id) as total_tasks,
                    (SELECT COUNT(*) FROM task.tasks t WHERE t.project_id = p.id AND t.status = 'DONE') as completed_tasks,
                    (SELECT COUNT(*) FROM task.tasks t WHERE t.project_id = p.id AND t.due_date < CURRENT_DATE AND t.status NOT IN ('DONE','CANCELLED')) as overdue_tasks,
                    (SELECT COUNT(*) FROM project.issues i WHERE i.project_id = p.id AND i.status NOT IN ('CLOSED','RESOLVED')) as open_issues
                FROM project.projects p
                WHERE p.id = :projectId
                """)
                .bind("projectId", projectId)
                .fetch().one()
                .map(row -> {
                    long total = ((Number) row.getOrDefault("total_tasks", 0)).longValue();
                    long overdue = ((Number) row.getOrDefault("overdue_tasks", 0)).longValue();
                    long openIssues = ((Number) row.getOrDefault("open_issues", 0)).longValue();

                    double scheduleScore = computeScheduleScore(overdue, total);
                    double qualityScore = computeQualityScore(openIssues);
                    double costScore = 70.0;
                    double riskScore = 70.0;
                    double resourceScore = 70.0;
                    double overall = (scheduleScore + costScore + qualityScore + riskScore + resourceScore) / 5.0;

                    return PmoHealthDto.builder()
                            .projectId((String) row.get("id"))
                            .projectName((String) row.get("name"))
                            .overallScore(Math.round(overall * 10) / 10.0)
                            .grade(gradeFromScore(overall))
                            .scheduleScore(Math.round(scheduleScore * 10) / 10.0)
                            .costScore(costScore)
                            .qualityScore(Math.round(qualityScore * 10) / 10.0)
                            .riskScore(riskScore)
                            .resourceScore(resourceScore)
                            .trend("STABLE")
                            .calculatedAt(LocalDateTime.now())
                            .calcVersion(CALC_VERSION)
                            .dimensions(List.of(
                                    buildDimension("SCHEDULE", scheduleScore, overdue, total),
                                    buildDimension("COST", costScore, 0, 0),
                                    buildDimension("QUALITY", qualityScore, openIssues, 0),
                                    buildDimension("RISK", riskScore, 0, 0),
                                    buildDimension("RESOURCE", resourceScore, 0, 0)
                            ))
                            .build();
                });
    }

    public Flux<PmoHealthDto> getHealthMatrix() {
        return databaseClient.sql("""
                SELECT p.id FROM project.projects p
                WHERE p.status NOT IN ('CLOSED', 'CANCELLED')
                ORDER BY p.name
                """)
                .fetch().all()
                .flatMap(row -> getProjectHealth((String) row.get("id")));
    }

    private double computeScheduleScore(long overdue, long total) {
        if (total == 0) return 80.0;
        double overdueRatio = (double) overdue / total;
        if (overdueRatio > 0.3) return 30.0;
        if (overdueRatio > 0.2) return 50.0;
        if (overdueRatio > 0.1) return 65.0;
        if (overdueRatio > 0.05) return 75.0;
        return 90.0;
    }

    private double computeQualityScore(long openIssues) {
        if (openIssues > 20) return 30.0;
        if (openIssues > 10) return 50.0;
        if (openIssues > 5) return 65.0;
        if (openIssues > 2) return 75.0;
        return 90.0;
    }

    private String gradeFromScore(double score) {
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 65) return "C";
        if (score >= 50) return "D";
        return "F";
    }

    private PmoHealthDto.DimensionDetail buildDimension(String name, double score, long metric1, long metric2) {
        String status = score >= 80 ? "GREEN" : score >= 60 ? "YELLOW" : "RED";
        return PmoHealthDto.DimensionDetail.builder()
                .dimension(name)
                .score(Math.round(score * 10) / 10.0)
                .status(status)
                .build();
    }
}
