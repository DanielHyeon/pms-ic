package com.insuretech.pms.project.reactive.service;

import com.insuretech.pms.project.reactive.entity.R2dbcProject;

import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import com.insuretech.pms.report.dto.*;
import com.insuretech.pms.report.dto.DashboardSection.Completeness;
import com.insuretech.pms.report.dto.DashboardSection.DashboardMeta;
import com.insuretech.pms.report.dto.DashboardSection.DashboardWarning;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * Service for dashboard statistics from real database data.
 * All responses follow the DashboardSection contract with asOf/scope/completeness/warnings.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDashboardService {

    private final ReactiveProjectRepository projectRepository;
    private final DatabaseClient databaseClient;

    // ========== Aggregation Endpoint ==========

    public Mono<ProjectDashboardDto> getFullDashboard(String projectId) {
        return Mono.zip(
                safeSection("stats", () -> getProjectStatsSection(projectId)),
                safeSection("phaseProgress", () -> getPhaseProgress(projectId)),
                safeSection("sprintVelocity", () -> getSprintVelocity(projectId)),
                safeSection("burndown", () -> getActiveBurndown(projectId)),
                safeSection("partStats", () -> getPartStats(projectId)),
                safeSection("wbsGroupStats", () -> getWbsGroupStats(projectId)),
                safeSection("insights", () -> getInsights(projectId))
        ).map(tuple -> ProjectDashboardDto.builder()
                .stats(tuple.getT1())
                .phaseProgress(tuple.getT2())
                .sprintVelocity(tuple.getT3())
                .burndown(tuple.getT4())
                .partStats(tuple.getT5())
                .wbsGroupStats(tuple.getT6())
                .insights(tuple.getT7())
                .build());
    }

    private <T> Mono<DashboardSection<T>> safeSection(String sectionName,
            Supplier<Mono<DashboardSection<T>>> sectionSupplier) {
        long start = System.currentTimeMillis();
        return sectionSupplier.get()
                .doOnNext(section -> {
                    if (section.getMeta() != null) {
                        section.getMeta().setComputeMs(System.currentTimeMillis() - start);
                    }
                })
                .onErrorResume(ex -> {
                    log.error("Dashboard section '{}' failed: {}", sectionName, ex.getMessage());
                    return Mono.just(DashboardSection.<T>builder()
                            .data(null)
                            .meta(DashboardMeta.builder()
                                    .asOf(LocalDateTime.now())
                                    .completeness(Completeness.NO_DATA)
                                    .computeMs(System.currentTimeMillis() - start)
                                    .usedFallback(false)
                                    .warnings(List.of(new DashboardWarning(
                                            "SECTION_QUERY_FAILED",
                                            sectionName + " query failed: " + ex.getMessage())))
                                    .build())
                            .build());
                });
    }

    private <T> DashboardSection<T> wrapSection(T data, LocalDateTime asOf,
            String scope, List<String> sources, List<String> queryIds,
            Completeness completeness, List<DashboardWarning> warnings) {
        return DashboardSection.<T>builder()
                .data(data)
                .meta(DashboardMeta.builder()
                        .asOf(asOf)
                        .scope(scope)
                        .sources(sources)
                        .queryIds(queryIds)
                        .completeness(completeness)
                        .warnings(warnings != null ? warnings : new ArrayList<>())
                        .usedFallback(false)
                        .build())
                .build();
    }

    // ========== Section: Project Stats (wrapped) ==========

    public Mono<DashboardSection<DashboardStats>> getProjectStatsSection(String projectId) {
        return getProjectStats(projectId).map(stats ->
                wrapSection(stats, LocalDateTime.now(),
                        "project:" + projectId,
                        List.of("project.projects", "project.wbs_tasks", "project.issues"),
                        List.of("DASH_PROJECT_STATS_V1"),
                        Completeness.COMPLETE,
                        new ArrayList<>()));
    }

    // ========== Section: Phase Progress ==========

    public Mono<DashboardSection<PhaseProgressDto>> getPhaseProgress(String projectId) {
        String query = """
                SELECT
                    ph.id, ph.name, ph.order_num, ph.track_type,
                    ph.progress as reported_progress,
                    ph.status, ph.gate_status, ph.start_date, ph.end_date,
                    task_agg.derived_progress,
                    task_agg.task_count
                FROM project.phases ph
                LEFT JOIN (
                    SELECT wt.phase_id,
                           ROUND(AVG(wt.progress)) as derived_progress,
                           COUNT(*) as task_count
                    FROM project.wbs_tasks wt
                    JOIN project.phases ph2 ON wt.phase_id = ph2.id
                    WHERE ph2.project_id = :projectId
                    GROUP BY wt.phase_id
                ) task_agg ON task_agg.phase_id = ph.id
                WHERE ph.project_id = :projectId AND ph.parent_id IS NULL
                ORDER BY ph.order_num ASC
                """;

        return databaseClient.sql(query)
                .bind("projectId", projectId)
                .fetch()
                .all()
                .collectList()
                .map(rows -> {
                    List<DashboardWarning> warnings = new ArrayList<>();
                    List<PhaseProgressDto.PhaseMetric> phases = new ArrayList<>();

                    for (Map<String, Object> row : rows) {
                        Integer reportedProgress = row.get("reported_progress") != null
                                ? ((Number) row.get("reported_progress")).intValue() : 0;
                        Long taskCount = row.get("task_count") != null
                                ? ((Number) row.get("task_count")).longValue() : 0L;
                        Integer derivedProgress = taskCount > 0 && row.get("derived_progress") != null
                                ? ((Number) row.get("derived_progress")).intValue() : null;

                        String phaseStatus = (String) row.get("status");
                        LocalDate endDate = row.get("end_date") != null ? (LocalDate) row.get("end_date") : null;

                        StatusDerivation.StatusResult sr = StatusDerivation.derivePhaseStatus(
                                reportedProgress, endDate, phaseStatus);

                        if (derivedProgress != null && Math.abs(reportedProgress - derivedProgress) > 20) {
                            warnings.add(new DashboardWarning(
                                    "PROGRESS_DIVERGENCE",
                                    "Phase '" + row.get("name") + "': reported (" + reportedProgress +
                                            "%) diverges from task-derived (" + derivedProgress + "%) by >20 points"));
                        }

                        phases.add(PhaseProgressDto.PhaseMetric.builder()
                                .phaseId((String) row.get("id"))
                                .phaseName((String) row.get("name"))
                                .orderNum(row.get("order_num") != null ? ((Number) row.get("order_num")).intValue() : 0)
                                .trackType((String) row.get("track_type"))
                                .reportedProgress(reportedProgress)
                                .derivedProgress(derivedProgress)
                                .plannedProgress(100)
                                .status(phaseStatus)
                                .derivedStatus(sr.getStatus())
                                .statusReasons(sr.getReasons())
                                .gateStatus((String) row.get("gate_status"))
                                .startDate(row.get("start_date") != null ? (LocalDate) row.get("start_date") : null)
                                .endDate(endDate)
                                .build());
                    }

                    Completeness c = phases.isEmpty() ? Completeness.NO_DATA : Completeness.COMPLETE;
                    return wrapSection(
                            PhaseProgressDto.builder().phases(phases).build(),
                            LocalDateTime.now(), "project:" + projectId,
                            List.of("project.phases", "project.wbs_tasks"),
                            List.of("DASH_PHASE_PROGRESS_V1"), c, warnings);
                });
    }

    // ========== Section: Part Leader Stats ==========

    public Mono<DashboardSection<PartStatsDto>> getPartStats(String projectId) {
        String query = """
                SELECT p.id as part_id, p.name as part_name,
                       p.leader_id, p.leader_name,
                       COUNT(us.id) as total_tasks,
                       COUNT(CASE WHEN us.status = 'DONE' THEN 1 END) as completed,
                       COUNT(CASE WHEN us.status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                       COUNT(CASE WHEN us.status = 'BLOCKED' THEN 1 END) as blocked
                FROM project.parts p
                LEFT JOIN task.user_stories us ON us.part_id = p.id
                WHERE p.project_id = :projectId AND p.status = 'ACTIVE'
                GROUP BY p.id, p.name, p.leader_id, p.leader_name
                ORDER BY p.name ASC
                """;

        return databaseClient.sql(query)
                .bind("projectId", projectId)
                .fetch()
                .all()
                .collectList()
                .map(rows -> {
                    List<PartStatsDto.PartLeaderMetric> parts = new ArrayList<>();
                    for (Map<String, Object> row : rows) {
                        long total = ((Number) row.get("total_tasks")).longValue();
                        long completed = ((Number) row.get("completed")).longValue();
                        long inProgress = ((Number) row.get("in_progress")).longValue();
                        long blocked = ((Number) row.get("blocked")).longValue();

                        StatusDerivation.StatusResult sr = StatusDerivation.derivePartStatus(blocked, total, inProgress);

                        parts.add(PartStatsDto.PartLeaderMetric.builder()
                                .partId((String) row.get("part_id"))
                                .partName((String) row.get("part_name"))
                                .leaderId((String) row.get("leader_id"))
                                .leaderName((String) row.get("leader_name"))
                                .totalTasks(total).completedTasks(completed)
                                .inProgressTasks(inProgress).blockedTasks(blocked)
                                .status(sr.getStatus()).statusReasons(sr.getReasons())
                                .build());
                    }

                    Completeness c = parts.isEmpty() ? Completeness.NO_DATA : Completeness.COMPLETE;
                    return wrapSection(PartStatsDto.builder().parts(parts).build(),
                            LocalDateTime.now(), "project:" + projectId,
                            List.of("project.parts", "task.user_stories"),
                            List.of("DASH_PART_STATS_V1"), c, new ArrayList<>());
                });
    }

    // ========== Section: WBS Group Stats ==========

    public Mono<DashboardSection<WbsGroupStatsDto>> getWbsGroupStats(String projectId) {
        String query = """
                SELECT wg.id, wg.name, wg.progress,
                       ph.track_type,
                       u.name as assignee_name
                FROM project.wbs_groups wg
                JOIN project.phases ph ON wg.phase_id = ph.id
                LEFT JOIN (
                    SELECT wi.group_id, MIN(au.name) as name
                    FROM project.wbs_items wi
                    JOIN auth.users au ON wi.assignee_id = au.id
                    GROUP BY wi.group_id
                ) u ON u.group_id = wg.id
                WHERE ph.project_id = :projectId
                ORDER BY ph.order_num, wg.order_num
                """;

        return databaseClient.sql(query)
                .bind("projectId", projectId)
                .fetch()
                .all()
                .collectList()
                .map(rows -> {
                    List<WbsGroupStatsDto.WbsGroupMetric> groups = new ArrayList<>();
                    for (Map<String, Object> row : rows) {
                        int progress = row.get("progress") != null ? ((Number) row.get("progress")).intValue() : 0;
                        groups.add(WbsGroupStatsDto.WbsGroupMetric.builder()
                                .groupId((String) row.get("id"))
                                .groupName((String) row.get("name"))
                                .trackType((String) row.get("track_type"))
                                .progress(progress)
                                .assigneeName(row.get("assignee_name") != null ? (String) row.get("assignee_name") : null)
                                .status(progress >= 100 ? "normal" : progress >= 30 ? "normal" : "warning")
                                .statusReasons(new ArrayList<>())
                                .build());
                    }

                    Completeness c = groups.isEmpty() ? Completeness.NO_DATA : Completeness.COMPLETE;
                    return wrapSection(WbsGroupStatsDto.builder().groups(groups).build(),
                            LocalDateTime.now(), "project:" + projectId,
                            List.of("project.wbs_groups", "project.phases"),
                            List.of("DASH_WBS_GROUP_STATS_V1"), c, new ArrayList<>());
                });
    }

    // ========== Section: Sprint Velocity ==========

    public Mono<DashboardSection<SprintVelocityDto>> getSprintVelocity(String projectId) {
        String query = """
                SELECT s.id as sprint_id, s.name as sprint_name, s.status,
                       SUM(COALESCE(us.story_points, 0)) as planned_points,
                       SUM(CASE WHEN us.status = 'DONE' THEN COALESCE(us.story_points, 0) ELSE 0 END) as completed_points,
                       COUNT(us.id) as story_count,
                       COUNT(CASE WHEN us.story_points IS NULL THEN 1 END) as null_points_count
                FROM task.sprints s
                LEFT JOIN task.user_stories us ON us.sprint_id = s.id
                WHERE s.project_id = :projectId
                GROUP BY s.id, s.name, s.status, s.start_date
                ORDER BY s.start_date ASC
                """;

        return databaseClient.sql(query)
                .bind("projectId", projectId)
                .fetch()
                .all()
                .collectList()
                .flatMap(rows -> {
                    if (rows.isEmpty()) {
                        return Mono.just(wrapSection(
                                SprintVelocityDto.builder().sprints(new ArrayList<>()).build(),
                                LocalDateTime.now(), "project:" + projectId,
                                List.of("task.sprints", "task.user_stories"),
                                List.of("DASH_SPRINT_VELOCITY_V1"),
                                Completeness.NO_DATA, new ArrayList<>()));
                    }

                    List<String> sprintIds = rows.stream()
                            .map(r -> (String) r.get("sprint_id"))
                            .collect(Collectors.toList());

                    return getWeeklyReportVelocities(sprintIds)
                            .map(velocityMap -> {
                                List<DashboardWarning> warnings = new ArrayList<>();
                                List<SprintVelocityDto.SprintMetric> sprints = new ArrayList<>();

                                for (Map<String, Object> row : rows) {
                                    String sprintId = (String) row.get("sprint_id");
                                    long nullPtsCount = ((Number) row.get("null_points_count")).longValue();

                                    if (nullPtsCount > 0) {
                                        warnings.add(new DashboardWarning("STORY_POINTS_NULL",
                                                nullPtsCount + " stories in " + row.get("sprint_name") + " have no story_points"));
                                    }

                                    Double velocity = velocityMap.get(sprintId);
                                    sprints.add(SprintVelocityDto.SprintMetric.builder()
                                            .sprintId(sprintId)
                                            .sprintName((String) row.get("sprint_name"))
                                            .status((String) row.get("status"))
                                            .plannedPoints(((Number) row.get("planned_points")).intValue())
                                            .completedPoints(((Number) row.get("completed_points")).intValue())
                                            .velocity(velocity)
                                            .velocitySource(velocity != null ? "weekly_reports" : "unavailable")
                                            .build());
                                }

                                Completeness c = sprints.stream().anyMatch(s -> s.getVelocity() == null)
                                        ? Completeness.PARTIAL : Completeness.COMPLETE;

                                return wrapSection(SprintVelocityDto.builder().sprints(sprints).build(),
                                        LocalDateTime.now(), "project:" + projectId,
                                        List.of("task.sprints", "task.user_stories", "task.weekly_reports"),
                                        List.of("DASH_SPRINT_VELOCITY_V1", "DASH_SPRINT_VELOCITY_WR_V1"),
                                        c, warnings);
                            });
                });
    }

    private Mono<Map<String, Double>> getWeeklyReportVelocities(List<String> sprintIds) {
        if (sprintIds.isEmpty()) return Mono.just(new HashMap<>());

        StringBuilder sb = new StringBuilder("SELECT sprint_id, AVG(velocity) as avg_velocity FROM task.weekly_reports WHERE sprint_id IN (");
        for (int i = 0; i < sprintIds.size(); i++) {
            sb.append(i > 0 ? ", " : "").append(":sid").append(i);
        }
        sb.append(") GROUP BY sprint_id");

        var spec = databaseClient.sql(sb.toString());
        for (int i = 0; i < sprintIds.size(); i++) {
            spec = spec.bind("sid" + i, sprintIds.get(i));
        }

        return spec.fetch().all().collectList()
                .map(rows -> {
                    Map<String, Double> result = new HashMap<>();
                    for (Map<String, Object> row : rows) {
                        result.put((String) row.get("sprint_id"), ((Number) row.get("avg_velocity")).doubleValue());
                    }
                    return result;
                })
                .onErrorResume(ex -> {
                    log.warn("Weekly reports velocity query failed: {}", ex.getMessage());
                    return Mono.just(new HashMap<>());
                });
    }

    // ========== Section: Burndown ==========

    public Mono<DashboardSection<BurndownDto>> getActiveBurndown(String projectId) {
        String sprintQuery = """
                SELECT id, name, start_date, end_date
                FROM task.sprints
                WHERE project_id = :projectId AND status = 'ACTIVE'
                ORDER BY start_date DESC LIMIT 1
                """;

        return databaseClient.sql(sprintQuery)
                .bind("projectId", projectId)
                .fetch()
                .one()
                .flatMap(sprintRow -> {
                    String sprintId = (String) sprintRow.get("id");
                    String sprintName = (String) sprintRow.get("name");
                    LocalDate startDate = (LocalDate) sprintRow.get("start_date");
                    LocalDate endDate = (LocalDate) sprintRow.get("end_date");
                    return getBurndownForSprint(sprintId, sprintName, startDate, endDate, projectId);
                })
                .defaultIfEmpty(wrapSection(null, LocalDateTime.now(), "project:" + projectId,
                        List.of("task.sprints"), List.of("DASH_BURNDOWN_V1"),
                        Completeness.NO_DATA,
                        List.of(new DashboardWarning("NO_ACTIVE_SPRINT", "No active sprint found"))));
    }

    private Mono<DashboardSection<BurndownDto>> getBurndownForSprint(
            String sprintId, String sprintName, LocalDate startDate, LocalDate endDate, String projectId) {

        String query = """
                WITH sprint_info AS (
                    SELECT COALESCE(SUM(COALESCE(us.story_points, 0)), 0) as total_points,
                           COUNT(us.id) as story_count
                    FROM task.user_stories us WHERE us.sprint_id = :sprintId
                ),
                daily_done AS (
                    SELECT DATE(us.updated_at) as done_date,
                           SUM(COALESCE(us.story_points, 0)) as points_done
                    FROM task.user_stories us
                    WHERE us.sprint_id = :sprintId AND us.status = 'DONE'
                    GROUP BY DATE(us.updated_at)
                )
                SELECT si.total_points, si.story_count, dd.done_date, dd.points_done
                FROM sprint_info si LEFT JOIN daily_done dd ON true
                ORDER BY dd.done_date ASC
                """;

        return databaseClient.sql(query)
                .bind("sprintId", sprintId)
                .fetch().all().collectList()
                .map(rows -> {
                    int totalPoints = 0;
                    long storyCount = 0;
                    Map<LocalDate, Integer> dailyDoneMap = new HashMap<>();

                    for (Map<String, Object> row : rows) {
                        totalPoints = ((Number) row.get("total_points")).intValue();
                        storyCount = ((Number) row.get("story_count")).longValue();
                        if (row.get("done_date") != null) {
                            dailyDoneMap.put((LocalDate) row.get("done_date"),
                                    ((Number) row.get("points_done")).intValue());
                        }
                    }

                    if (storyCount == 0) {
                        return wrapSection((BurndownDto) null, LocalDateTime.now(), "project:" + projectId,
                                List.of("task.sprints", "task.user_stories"), List.of("DASH_BURNDOWN_V1"),
                                Completeness.NO_DATA,
                                List.of(new DashboardWarning("NO_STORIES", "No user stories in active sprint")));
                    }

                    BurndownDto burndown = buildBurndownWithContinuousDates(
                            startDate, endDate, totalPoints, dailyDoneMap, sprintId, sprintName);

                    return wrapSection(burndown, LocalDateTime.now(), "project:" + projectId,
                            List.of("task.sprints", "task.user_stories"), List.of("DASH_BURNDOWN_V1"),
                            Completeness.PARTIAL,
                            List.of(new DashboardWarning("BURNDOWN_APPROXIMATE",
                                    "Based on updated_at proxy, not status change history")));
                });
    }

    private BurndownDto buildBurndownWithContinuousDates(
            LocalDate start, LocalDate end, int totalPoints,
            Map<LocalDate, Integer> dailyDoneMap, String sprintId, String sprintName) {

        List<BurndownDto.BurndownPoint> points = new ArrayList<>();
        int cumDone = 0;
        LocalDate effectiveEnd = end.isBefore(LocalDate.now()) ? end : LocalDate.now();
        long totalDays = ChronoUnit.DAYS.between(start, end);
        if (totalDays == 0) totalDays = 1;

        for (LocalDate d = start; !d.isAfter(effectiveEnd); d = d.plusDays(1)) {
            cumDone += dailyDoneMap.getOrDefault(d, 0);
            int remaining = totalPoints - cumDone;
            long dayIndex = ChronoUnit.DAYS.between(start, d);
            int ideal = totalPoints - (int) (totalPoints * dayIndex / totalDays);

            points.add(BurndownDto.BurndownPoint.builder()
                    .date(d).remainingPoints(remaining).idealPoints(ideal).build());
        }

        return BurndownDto.builder()
                .sprintId(sprintId).sprintName(sprintName)
                .startDate(start).endDate(end)
                .totalPoints(totalPoints).dataPoints(points)
                .isApproximate(true).build();
    }

    // ========== Section: AI Insights ==========

    public Mono<DashboardSection<List<InsightDto>>> getInsights(String projectId) {
        return Mono.zip(
                getOverduePhaseInsights(projectId),
                getRecentCompletionInsights(projectId),
                getBlockedTaskInsights(projectId)
        ).map(tuple -> {
            List<InsightDto> insights = new ArrayList<>();
            insights.addAll(tuple.getT1());
            insights.addAll(tuple.getT2());
            insights.addAll(tuple.getT3());

            Completeness c = insights.isEmpty() ? Completeness.NO_DATA
                    : insights.size() < 3 ? Completeness.PARTIAL : Completeness.COMPLETE;

            return wrapSection(insights, LocalDateTime.now(), "project:" + projectId,
                    List.of("project.phases", "project.wbs_tasks"), List.of("DASH_INSIGHTS_V1"),
                    c, new ArrayList<>());
        });
    }

    private Mono<List<InsightDto>> getOverduePhaseInsights(String projectId) {
        String query = """
                SELECT id, name, progress, end_date, (CURRENT_DATE - end_date) as overdue_days
                FROM project.phases
                WHERE project_id = :projectId AND end_date < CURRENT_DATE
                  AND status != 'COMPLETED' AND parent_id IS NULL
                """;

        return databaseClient.sql(query).bind("projectId", projectId).fetch().all().collectList()
                .map(rows -> {
                    if (rows.isEmpty()) return List.<InsightDto>of();
                    List<String> ids = rows.stream().map(r -> (String) r.get("id")).collect(Collectors.toList());
                    double avgProg = rows.stream().mapToInt(r -> r.get("progress") != null ? ((Number) r.get("progress")).intValue() : 0).average().orElse(0);
                    double avgOverdue = rows.stream().mapToInt(r -> r.get("overdue_days") != null ? ((Number) r.get("overdue_days")).intValue() : 0).average().orElse(0);

                    return List.of(InsightDto.builder()
                            .type("RISK").severity("HIGH")
                            .title(rows.size() + " phase(s) overdue")
                            .description(rows.size() + " phases past end date (avg progress " + Math.round(avgProg) + "%, avg " + Math.round(avgOverdue) + " days overdue)")
                            .generatedAt(LocalDateTime.now()).dataSource("project.phases")
                            .evidence(InsightDto.InsightEvidence.builder().entityIds(ids).metrics(Map.of("avgProgress", avgProg, "overdueDays", avgOverdue, "count", rows.size())).build())
                            .build());
                }).onErrorResume(ex -> { log.warn("Overdue phase insights failed: {}", ex.getMessage()); return Mono.just(List.of()); });
    }

    private Mono<List<InsightDto>> getRecentCompletionInsights(String projectId) {
        String query = """
                SELECT id, name FROM project.phases
                WHERE project_id = :projectId AND status = 'COMPLETED'
                  AND updated_at >= CURRENT_DATE - INTERVAL '7 days' AND parent_id IS NULL
                """;

        return databaseClient.sql(query).bind("projectId", projectId).fetch().all().collectList()
                .map(rows -> {
                    if (rows.isEmpty()) return List.<InsightDto>of();
                    List<String> names = rows.stream().map(r -> (String) r.get("name")).collect(Collectors.toList());
                    return List.of(InsightDto.builder()
                            .type("ACHIEVEMENT").severity("LOW")
                            .title("Recent milestone: " + String.join(", ", names))
                            .description(rows.size() + " phase(s) completed in the last 7 days")
                            .generatedAt(LocalDateTime.now()).dataSource("project.phases")
                            .evidence(InsightDto.InsightEvidence.builder().entityIds(rows.stream().map(r -> (String) r.get("id")).collect(Collectors.toList())).metrics(Map.of("count", rows.size())).build())
                            .build());
                }).onErrorResume(ex -> { log.warn("Completion insights failed: {}", ex.getMessage()); return Mono.just(List.of()); });
    }

    private Mono<List<InsightDto>> getBlockedTaskInsights(String projectId) {
        String query = """
                SELECT COUNT(*) as blocked_count FROM project.wbs_tasks wt
                JOIN project.phases ph ON wt.phase_id = ph.id
                WHERE ph.project_id = :projectId AND wt.status = 'BLOCKED'
                """;

        return databaseClient.sql(query).bind("projectId", projectId).fetch().one()
                .map(row -> {
                    long cnt = ((Number) row.get("blocked_count")).longValue();
                    if (cnt == 0) return List.<InsightDto>of();
                    return List.of(InsightDto.builder()
                            .type("RECOMMENDATION").severity(cnt >= 5 ? "HIGH" : "MEDIUM")
                            .title(cnt + " blocked task(s) need attention")
                            .description("Resolve " + cnt + " blocked tasks to maintain project velocity")
                            .generatedAt(LocalDateTime.now()).dataSource("project.wbs_tasks")
                            .evidence(InsightDto.InsightEvidence.builder().entityIds(List.of()).metrics(Map.of("blockedCount", cnt)).build())
                            .build());
                }).onErrorResume(ex -> { log.warn("Blocked task insights failed: {}", ex.getMessage()); return Mono.just(List.of()); });
    }

    // ========== Existing: Portfolio Stats ==========

    public Mono<DashboardStats> getPortfolioStats() {
        return Mono.zip(getProjectStatsAgg(), getTaskStats(null), getIssueStats(null), getBudgetStats(null))
                .map(tuple -> {
                    Map<String, Object> ps = tuple.getT1(), ts = tuple.getT2(), is = tuple.getT3(), bs = tuple.getT4();
                    @SuppressWarnings("unchecked") Map<String, Long> pByStatus = (Map<String, Long>) ps.get("byStatus");
                    @SuppressWarnings("unchecked") Map<String, Long> tByStatus = (Map<String, Long>) ts.get("byStatus");
                    return DashboardStats.builder()
                            .isPortfolioView(true).projectId(null).projectName(null)
                            .totalProjects((Long) ps.get("total")).activeProjects((Long) ps.get("active")).projectsByStatus(pByStatus)
                            .totalTasks((Long) ts.get("total")).completedTasks((Long) ts.get("completed")).inProgressTasks((Long) ts.get("inProgress"))
                            .avgProgress((Integer) ts.get("avgProgress")).tasksByStatus(tByStatus)
                            .totalIssues((Long) is.get("total")).openIssues((Long) is.get("open")).highPriorityIssues((Long) is.get("highPriority"))
                            .budgetTotal((BigDecimal) bs.get("total"))
                            .budgetSpent(null).budgetExecutionRate(null)
                            .build();
                });
    }

    // ========== Existing: Project Stats ==========

    public Mono<DashboardStats> getProjectStats(String projectId) {
        return Mono.zip(
                projectRepository.findById(projectId).defaultIfEmpty(R2dbcProject.builder().build()),
                getTaskStats(projectId), getIssueStats(projectId), getBudgetStats(projectId)
        ).map(tuple -> {
            R2dbcProject project = tuple.getT1();
            Map<String, Object> ts = tuple.getT2(), is = tuple.getT3(), bs = tuple.getT4();
            @SuppressWarnings("unchecked") Map<String, Long> tByStatus = (Map<String, Long>) ts.get("byStatus");
            return DashboardStats.builder()
                    .isPortfolioView(false).projectId(projectId).projectName(project.getName())
                    .totalProjects(1L).activeProjects(1L)
                    .projectsByStatus(Map.of(project.getStatus() != null ? project.getStatus() : "UNKNOWN", 1L))
                    .totalTasks((Long) ts.get("total")).completedTasks((Long) ts.get("completed")).inProgressTasks((Long) ts.get("inProgress"))
                    .avgProgress(project.getProgress() != null ? project.getProgress() : (Integer) ts.get("avgProgress"))
                    .tasksByStatus(tByStatus)
                    .totalIssues((Long) is.get("total")).openIssues((Long) is.get("open")).highPriorityIssues((Long) is.get("highPriority"))
                    .budgetTotal((BigDecimal) bs.get("total"))
                    .budgetSpent(null).budgetExecutionRate(null)
                    .build();
        });
    }

    // ========== Existing: Weighted Progress (fixed: uses track_type column) ==========

    public Mono<WeightedProgressDto> getWeightedProgress(String projectId) {
        String query = """
                WITH track_stats AS (
                    SELECT
                        ph.track_type as track,
                        COUNT(*) as total_tasks,
                        COUNT(CASE WHEN wt.status = 'COMPLETED' THEN 1 END) as completed_tasks,
                        AVG(COALESCE(wt.progress, 0)) as avg_progress
                    FROM project.wbs_tasks wt
                    JOIN project.wbs_groups wg ON wt.group_id = wg.id
                    JOIN project.phases ph ON wt.phase_id = ph.id
                    WHERE ph.project_id = :projectId
                    GROUP BY ph.track_type
                ),
                project_weights AS (
                    SELECT ai_weight, si_weight, (1 - ai_weight - si_weight) as common_weight
                    FROM project.projects WHERE id = :projectId
                )
                SELECT ts.track, ts.total_tasks, ts.completed_tasks, ts.avg_progress,
                       pw.ai_weight, pw.si_weight, pw.common_weight
                FROM track_stats ts CROSS JOIN project_weights pw
                """;

        return databaseClient.sql(query).bind("projectId", projectId).fetch().all().collectList()
                .flatMap(rows -> {
                    if (rows.isEmpty()) return getDefaultWeightedProgress(projectId);

                    long aiTotal = 0, aiCompleted = 0, siTotal = 0, siCompleted = 0, commonTotal = 0, commonCompleted = 0;
                    double aiProgress = 0, siProgress = 0, commonProgress = 0;
                    BigDecimal aiWeight = new BigDecimal("0.70"), siWeight = new BigDecimal("0.30"), commonWeight = BigDecimal.ZERO;

                    for (Map<String, Object> row : rows) {
                        String track = (String) row.get("track");
                        long total = ((Number) row.get("total_tasks")).longValue();
                        long completed = ((Number) row.get("completed_tasks")).longValue();
                        double progress = ((Number) row.get("avg_progress")).doubleValue();

                        if (row.get("ai_weight") != null) {
                            aiWeight = (BigDecimal) row.get("ai_weight");
                            siWeight = (BigDecimal) row.get("si_weight");
                            commonWeight = (BigDecimal) row.get("common_weight");
                        }

                        switch (track) {
                            case "AI" -> { aiTotal = total; aiCompleted = completed; aiProgress = progress; }
                            case "SI" -> { siTotal = total; siCompleted = completed; siProgress = progress; }
                            default -> { commonTotal = total; commonCompleted = completed; commonProgress = progress; }
                        }
                    }

                    double wp = aiProgress * aiWeight.doubleValue() + siProgress * siWeight.doubleValue() + commonProgress * commonWeight.doubleValue();
                    return Mono.just(WeightedProgressDto.builder()
                            .aiProgress(aiProgress).siProgress(siProgress).commonProgress(commonProgress).weightedProgress(wp)
                            .aiWeight(aiWeight).siWeight(siWeight).commonWeight(commonWeight)
                            .aiTotalTasks(aiTotal).aiCompletedTasks(aiCompleted)
                            .siTotalTasks(siTotal).siCompletedTasks(siCompleted)
                            .commonTotalTasks(commonTotal).commonCompletedTasks(commonCompleted)
                            .totalTasks(aiTotal + siTotal + commonTotal).completedTasks(aiCompleted + siCompleted + commonCompleted)
                            .build());
                });
    }

    private Mono<WeightedProgressDto> getDefaultWeightedProgress(String projectId) {
        return projectRepository.findById(projectId)
                .map(project -> WeightedProgressDto.builder()
                        .aiProgress(0.0).siProgress(0.0).commonProgress(0.0).weightedProgress(0.0)
                        .aiWeight(project.getAiWeight() != null ? project.getAiWeight() : new BigDecimal("0.70"))
                        .siWeight(project.getSiWeight() != null ? project.getSiWeight() : new BigDecimal("0.30"))
                        .commonWeight(BigDecimal.ZERO)
                        .aiTotalTasks(0L).aiCompletedTasks(0L).siTotalTasks(0L).siCompletedTasks(0L)
                        .commonTotalTasks(0L).commonCompletedTasks(0L).totalTasks(0L).completedTasks(0L).build())
                .defaultIfEmpty(WeightedProgressDto.builder()
                        .aiProgress(0.0).siProgress(0.0).commonProgress(0.0).weightedProgress(0.0)
                        .aiWeight(new BigDecimal("0.70")).siWeight(new BigDecimal("0.30")).commonWeight(BigDecimal.ZERO)
                        .totalTasks(0L).completedTasks(0L).build());
    }

    // ========== Private Helpers ==========

    private Mono<Map<String, Object>> getProjectStatsAgg() {
        return databaseClient.sql("""
                SELECT COUNT(*) as total,
                    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'PLANNING' THEN 1 END) as planning,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'ON_HOLD' THEN 1 END) as on_hold,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
                FROM project.projects
                """).fetch().one().map(row -> {
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", ((Number) row.get("total")).longValue());
            stats.put("active", ((Number) row.get("active")).longValue());
            Map<String, Long> byStatus = new HashMap<>();
            byStatus.put("PLANNING", ((Number) row.get("planning")).longValue());
            byStatus.put("IN_PROGRESS", ((Number) row.get("active")).longValue());
            byStatus.put("COMPLETED", ((Number) row.get("completed")).longValue());
            byStatus.put("ON_HOLD", ((Number) row.get("on_hold")).longValue());
            byStatus.put("CANCELLED", ((Number) row.get("cancelled")).longValue());
            stats.put("byStatus", byStatus);
            return stats;
        }).defaultIfEmpty(Map.of("total", 0L, "active", 0L, "byStatus", Map.of()));
    }

    private Mono<Map<String, Object>> getTaskStats(String projectId) {
        String query = projectId != null
                ? """
                    SELECT COUNT(*) as total, COUNT(CASE WHEN wt.status = 'COMPLETED' THEN 1 END) as completed,
                        COUNT(CASE WHEN wt.status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                        COUNT(CASE WHEN wt.status = 'NOT_STARTED' THEN 1 END) as not_started,
                        COALESCE(AVG(wt.progress), 0) as avg_progress
                    FROM project.wbs_tasks wt JOIN project.phases p ON wt.phase_id = p.id WHERE p.project_id = :projectId
                  """
                : """
                    SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                        COUNT(CASE WHEN status = 'NOT_STARTED' THEN 1 END) as not_started,
                        COALESCE(AVG(progress), 0) as avg_progress
                    FROM project.wbs_tasks
                  """;

        var spec = databaseClient.sql(query);
        if (projectId != null) spec = spec.bind("projectId", projectId);

        return spec.fetch().one().map(row -> {
            Map<String, Object> stats = new HashMap<>();
            long total = ((Number) row.get("total")).longValue();
            long completed = ((Number) row.get("completed")).longValue();
            long inProgress = ((Number) row.get("in_progress")).longValue();
            stats.put("total", total); stats.put("completed", completed); stats.put("inProgress", inProgress);
            stats.put("avgProgress", total > 0 ? (int) Math.round(((Number) row.get("avg_progress")).doubleValue()) : 0);
            Map<String, Long> byStatus = new HashMap<>();
            byStatus.put("COMPLETED", completed); byStatus.put("IN_PROGRESS", inProgress);
            byStatus.put("NOT_STARTED", ((Number) row.get("not_started")).longValue());
            stats.put("byStatus", byStatus);
            return stats;
        }).defaultIfEmpty(Map.of("total", 0L, "completed", 0L, "inProgress", 0L, "avgProgress", 0, "byStatus", Map.of()));
    }

    private Mono<Map<String, Object>> getIssueStats(String projectId) {
        String query = projectId != null
                ? "SELECT COUNT(*) as total, COUNT(CASE WHEN status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as open, COUNT(CASE WHEN priority = 'HIGH' AND status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as high_priority FROM project.issues WHERE project_id = :projectId"
                : "SELECT COUNT(*) as total, COUNT(CASE WHEN status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as open, COUNT(CASE WHEN priority = 'HIGH' AND status IN ('OPEN', 'IN_PROGRESS') THEN 1 END) as high_priority FROM project.issues";

        var spec = databaseClient.sql(query);
        if (projectId != null) spec = spec.bind("projectId", projectId);

        return spec.fetch().one().map(row -> {
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", ((Number) row.get("total")).longValue());
            stats.put("open", ((Number) row.get("open")).longValue());
            stats.put("highPriority", ((Number) row.get("high_priority")).longValue());
            return stats;
        }).defaultIfEmpty(Map.of("total", 0L, "open", 0L, "highPriority", 0L));
    }

    private Mono<Map<String, Object>> getBudgetStats(String projectId) {
        String query = projectId != null
                ? "SELECT COALESCE(budget, 0) as total FROM project.projects WHERE id = :projectId"
                : "SELECT COALESCE(SUM(budget), 0) as total FROM project.projects";

        var spec = databaseClient.sql(query);
        if (projectId != null) spec = spec.bind("projectId", projectId);

        return spec.fetch().one().map(row -> {
            Map<String, Object> stats = new HashMap<>();
            BigDecimal total = (BigDecimal) row.get("total");
            stats.put("total", total != null ? total : BigDecimal.ZERO);
            stats.put("spent", null);
            stats.put("executionRate", null);
            return stats;
        }).defaultIfEmpty(Map.of("total", BigDecimal.ZERO));
    }
}
