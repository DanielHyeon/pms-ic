package com.insuretech.pms.view.service;

import com.insuretech.pms.common.security.ReactiveProjectSecurityService;
import com.insuretech.pms.project.reactive.entity.R2dbcBacklogItem;
import com.insuretech.pms.project.reactive.entity.R2dbcEpic;
import com.insuretech.pms.project.reactive.repository.ReactiveBacklogItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveBacklogRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveEpicRepository;
import com.insuretech.pms.task.reactive.entity.R2dbcSprint;
import com.insuretech.pms.task.reactive.entity.R2dbcUserStory;
import com.insuretech.pms.task.reactive.repository.ReactiveSprintRepository;
import com.insuretech.pms.task.reactive.repository.ReactiveUserStoryRepository;
import com.insuretech.pms.view.dto.PmWorkboardView;
import com.insuretech.pms.view.dto.PmoPortfolioView;
import com.insuretech.pms.view.dto.PoBacklogView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

/**
 * View Model builder service implementing 3-layer architecture:
 * Layer 1 (ScopedQuery): scope-filtered data retrieval
 * Layer 2 (Aggregator): KPI/rollup calculation
 * Layer 3 (Presenter): role-specific DTO assembly + warnings
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ViewService {

    private final ReactiveProjectSecurityService securityService;
    private final ReactiveUserStoryRepository storyRepository;
    private final ReactiveEpicRepository epicRepository;
    private final ReactiveBacklogRepository backlogRepository;
    private final ReactiveBacklogItemRepository backlogItemRepository;
    private final ReactiveSprintRepository sprintRepository;
    private final DatabaseClient databaseClient;

    // ==================== PO Backlog View ====================

    public Mono<PoBacklogView> buildPoBacklogView(String projectId) {
        // Layer 1: Scoped queries (PO sees full project)
        Mono<List<R2dbcUserStory>> storiesMono = storyRepository.findByProjectId(projectId)
                .collectList();
        Mono<List<R2dbcEpic>> epicsMono = epicRepository.findByProjectId(projectId)
                .collectList();
        Mono<List<R2dbcBacklogItem>> backlogItemsMono = backlogRepository
                .findActiveBacklogByProjectId(projectId)
                .flatMapMany(backlog -> backlogItemRepository.findByBacklogIdOrderByPriorityOrderAsc(backlog.getId()))
                .collectList()
                .defaultIfEmpty(Collections.emptyList());

        return Mono.zip(storiesMono, epicsMono, backlogItemsMono)
                .map(tuple -> {
                    List<R2dbcUserStory> stories = tuple.getT1();
                    List<R2dbcEpic> epics = tuple.getT2();
                    List<R2dbcBacklogItem> items = tuple.getT3();

                    // Layer 2: Aggregation
                    long totalItems = items.size();
                    long withReq = items.stream().filter(i -> i.getRequirementId() != null).count();
                    double reqCoverage = totalItems > 0 ? (withReq * 100.0 / totalItems) : 0;

                    // Story decomposition: items that have at least 1 linked story
                    Set<String> itemsWithStory = stories.stream()
                            .filter(s -> s.getBacklogItemId() != null)
                            .map(R2dbcUserStory::getBacklogItemId)
                            .collect(Collectors.toSet());
                    double decomRate = totalItems > 0 ? (itemsWithStory.size() * 100.0 / totalItems) : 0;

                    // Map stories by backlog_item_id
                    Map<String, List<R2dbcUserStory>> storiesByItem = stories.stream()
                            .filter(s -> s.getBacklogItemId() != null)
                            .collect(Collectors.groupingBy(R2dbcUserStory::getBacklogItemId));

                    // Map stories by epic_id
                    Map<String, List<R2dbcUserStory>> storiesByEpic = stories.stream()
                            .filter(s -> s.getEpicId() != null)
                            .collect(Collectors.groupingBy(R2dbcUserStory::getEpicId));

                    // Layer 3: Presenter - build DTOs
                    List<PoBacklogView.BacklogItemView> itemViews = items.stream()
                            .map(item -> {
                                List<R2dbcUserStory> linked = storiesByItem.getOrDefault(item.getId(), Collections.emptyList());
                                int completedCount = (int) linked.stream().filter(s -> "DONE".equals(s.getStatus())).count();
                                int totalPts = linked.stream().mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
                                int completedPts = linked.stream()
                                        .filter(s -> "DONE".equals(s.getStatus()))
                                        .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();

                                return PoBacklogView.BacklogItemView.builder()
                                        .id(item.getId())
                                        .status(item.getStatus())
                                        .stories(linked.stream().map(s -> PoBacklogView.StoryRef.builder()
                                                .id(s.getId())
                                                .title(s.getTitle())
                                                .status(s.getStatus())
                                                .storyPoints(s.getStoryPoints())
                                                .build()).collect(Collectors.toList()))
                                        .storyCount(linked.size())
                                        .completedStoryCount(completedCount)
                                        .totalStoryPoints(totalPts)
                                        .completedStoryPoints(completedPts)
                                        .build();
                            })
                            .collect(Collectors.toList());

                    List<PoBacklogView.EpicSummary> epicSummaries = epics.stream()
                            .map(epic -> {
                                List<R2dbcUserStory> epicStories = storiesByEpic.getOrDefault(epic.getId(), Collections.emptyList());
                                int doneCount = (int) epicStories.stream().filter(s -> "DONE".equals(s.getStatus())).count();
                                double completedRate = epicStories.isEmpty() ? 0 : (doneCount * 100.0 / epicStories.size());
                                return PoBacklogView.EpicSummary.builder()
                                        .id(epic.getId())
                                        .name(epic.getName())
                                        .progress(epic.getProgress())
                                        .storyCount(epicStories.size())
                                        .completedStoryRate(Math.round(completedRate * 10) / 10.0)
                                        .build();
                            })
                            .collect(Collectors.toList());

                    List<PoBacklogView.StoryRef> unlinked = stories.stream()
                            .filter(s -> s.getBacklogItemId() == null)
                            .map(s -> PoBacklogView.StoryRef.builder()
                                    .id(s.getId()).title(s.getTitle()).status(s.getStatus())
                                    .storyPoints(s.getStoryPoints()).build())
                            .collect(Collectors.toList());

                    List<PoBacklogView.Warning> warnings = new ArrayList<>();
                    if (reqCoverage < 80) {
                        warnings.add(PoBacklogView.Warning.builder()
                                .type("LOW_REQUIREMENT_COVERAGE").message("Requirement coverage below 80%").build());
                    }
                    if (!unlinked.isEmpty()) {
                        warnings.add(PoBacklogView.Warning.builder()
                                .type("UNLINKED_STORIES").message(unlinked.size() + " stories not linked to backlog items").build());
                    }

                    return PoBacklogView.builder()
                            .projectId(projectId)
                            .summary(PoBacklogView.Summary.builder()
                                    .totalBacklogItems(totalItems)
                                    .pendingItems(totalItems - items.stream().filter(i -> "DONE".equals(i.getStatus()) || "COMPLETED".equals(i.getStatus())).count())
                                    .approvedItems(items.stream().filter(i -> "DONE".equals(i.getStatus()) || "COMPLETED".equals(i.getStatus())).count())
                                    .requirementCoverage(Math.round(reqCoverage * 10) / 10.0)
                                    .epicCount(epics.size())
                                    .storyDecompositionRate(Math.round(decomRate * 10) / 10.0)
                                    .build())
                            .backlogItems(itemViews)
                            .epics(epicSummaries)
                            .unlinkedStories(unlinked)
                            .warnings(warnings)
                            .build();
                });
    }

    // ==================== PM Workboard View ====================

    public Mono<PmWorkboardView> buildPmWorkboardView(String projectId) {
        return securityService.getAllowedPartIds(projectId)
                .flatMap(allowedPartIds -> {
                    // Layer 1: Scoped queries (filtered by allowedPartIds)
                    Mono<List<R2dbcUserStory>> storiesMono = storyRepository.findByProjectId(projectId)
                            .filter(s -> allowedPartIds.isEmpty() || s.getPartId() == null || allowedPartIds.contains(s.getPartId()))
                            .collectList();
                    Mono<R2dbcSprint> activeSprintMono = sprintRepository
                            .findByProjectIdAndStatusEquals(projectId, "ACTIVE")
                            .defaultIfEmpty(R2dbcSprint.builder().build());
                    Mono<Map<String, String>> partNamesMono = queryPartNames(projectId);
                    Mono<Map<String, Integer>> partMemberCountsMono = queryPartMemberCounts(projectId);

                    return Mono.zip(storiesMono, activeSprintMono, partNamesMono, partMemberCountsMono)
                            .map(tuple -> {
                                List<R2dbcUserStory> stories = tuple.getT1();
                                R2dbcSprint activeSprint = tuple.getT2();
                                Map<String, String> partNames = tuple.getT3();
                                Map<String, Integer> partMemberCounts = tuple.getT4();

                                boolean hasActiveSprint = activeSprint.getId() != null;

                                // Layer 2: Aggregation
                                List<R2dbcUserStory> sprintStories = hasActiveSprint
                                        ? stories.stream().filter(s -> activeSprint.getId().equals(s.getSprintId())).collect(Collectors.toList())
                                        : Collections.emptyList();
                                List<R2dbcUserStory> backlogStories = stories.stream()
                                        .filter(s -> s.getSprintId() == null || !hasActiveSprint || !activeSprint.getId().equals(s.getSprintId()))
                                        .filter(s -> !"DONE".equals(s.getStatus()) && !"CANCELLED".equals(s.getStatus()))
                                        .collect(Collectors.toList());

                                int sprintTotalPts = sprintStories.stream()
                                        .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
                                int sprintCompletedPts = sprintStories.stream()
                                        .filter(s -> "DONE".equals(s.getStatus()))
                                        .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();

                                // Part workload
                                Map<String, PmWorkboardView.PartWorkload> workload = new HashMap<>();
                                for (String partId : allowedPartIds) {
                                    List<R2dbcUserStory> partStories = stories.stream()
                                            .filter(s -> partId.equals(s.getPartId()))
                                            .collect(Collectors.toList());
                                    int pts = partStories.stream()
                                            .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
                                    workload.put(partId, PmWorkboardView.PartWorkload.builder()
                                            .stories(partStories.size())
                                            .storyPoints(pts)
                                            .members(partMemberCounts.getOrDefault(partId, 0))
                                            .build());
                                }

                                // Layer 3: Presenter
                                List<PmWorkboardView.Warning> warnings = new ArrayList<>();
                                stories.stream()
                                        .filter(s -> s.getPartId() == null)
                                        .forEach(s -> warnings.add(PmWorkboardView.Warning.builder()
                                                .type("UNASSIGNED_PART").storyId(s.getId())
                                                .message("Unassigned part for story").build()));

                                return PmWorkboardView.builder()
                                        .projectId(projectId)
                                        .scopedPartIds(allowedPartIds)
                                        .summary(PmWorkboardView.Summary.builder()
                                                .totalStories(stories.size())
                                                .inSprintStories(sprintStories.size())
                                                .backlogStories(backlogStories.size())
                                                .activeSprintName(hasActiveSprint ? activeSprint.getName() : null)
                                                .sprintVelocity(sprintTotalPts)
                                                .partWorkload(workload)
                                                .build())
                                        .activeSprint(hasActiveSprint ? PmWorkboardView.SprintView.builder()
                                                .id(activeSprint.getId())
                                                .name(activeSprint.getName())
                                                .status(activeSprint.getStatus())
                                                .startDate(activeSprint.getStartDate())
                                                .endDate(activeSprint.getEndDate())
                                                .stories(sprintStories.stream().map(s -> PmWorkboardView.SprintStory.builder()
                                                        .id(s.getId()).title(s.getTitle()).status(s.getStatus())
                                                        .storyPoints(s.getStoryPoints())
                                                        .assigneeId(s.getAssigneeId())
                                                        .partName(partNames.get(s.getPartId()))
                                                        .build()).collect(Collectors.toList()))
                                                .totalPoints(sprintTotalPts)
                                                .completedPoints(sprintCompletedPts)
                                                .build() : null)
                                        .backlogStories(backlogStories.stream().map(s -> PmWorkboardView.BacklogStory.builder()
                                                .id(s.getId()).title(s.getTitle()).status(s.getStatus())
                                                .storyPoints(s.getStoryPoints())
                                                .partName(partNames.get(s.getPartId()))
                                                .readyForSprint(s.getPartId() != null && "READY".equals(s.getStatus()))
                                                .blockingReason(s.getPartId() == null ? "Part not assigned" : null)
                                                .build()).collect(Collectors.toList()))
                                        .warnings(warnings)
                                        .build();
                            });
                });
    }

    // ==================== PMO Portfolio View ====================

    public Mono<PmoPortfolioView> buildPmoPortfolioView(String projectId) {
        // Layer 1: PMO sees full project (read-only)
        Mono<List<R2dbcUserStory>> storiesMono = storyRepository.findByProjectId(projectId).collectList();
        Mono<List<R2dbcEpic>> epicsMono = epicRepository.findByProjectId(projectId).collectList();
        Mono<List<R2dbcBacklogItem>> backlogItemsMono = backlogRepository
                .findActiveBacklogByProjectId(projectId)
                .flatMapMany(b -> backlogItemRepository.findByBacklogIdOrderByPriorityOrderAsc(b.getId()))
                .collectList()
                .defaultIfEmpty(Collections.emptyList());
        Mono<Map<String, String>> partNamesMono = queryPartNames(projectId);
        Mono<Map<String, Integer>> partMemberCountsMono = queryPartMemberCounts(projectId);

        return Mono.zip(storiesMono, epicsMono, backlogItemsMono, partNamesMono, partMemberCountsMono)
                .map(tuple -> {
                    List<R2dbcUserStory> stories = tuple.getT1();
                    List<R2dbcEpic> epics = tuple.getT2();
                    List<R2dbcBacklogItem> items = tuple.getT3();
                    Map<String, String> partNames = tuple.getT4();
                    Map<String, Integer> partMemberCounts = tuple.getT5();

                    long totalStories = stories.size();
                    long totalItems = items.size();

                    // Layer 2: Coverage KPIs
                    long itemsWithReq = items.stream().filter(i -> i.getRequirementId() != null).count();
                    double reqTrace = totalItems > 0 ? (itemsWithReq * 100.0 / totalItems) : 0;

                    Set<String> itemsWithStory = stories.stream()
                            .filter(s -> s.getBacklogItemId() != null)
                            .map(R2dbcUserStory::getBacklogItemId).collect(Collectors.toSet());
                    double decomRate = totalItems > 0 ? (itemsWithStory.size() * 100.0 / totalItems) : 0;

                    long storiesWithEpic = stories.stream().filter(s -> s.getEpicId() != null).count();
                    double epicCoverage = totalStories > 0 ? (storiesWithEpic * 100.0 / totalStories) : 0;

                    long storiesWithPart = stories.stream().filter(s -> s.getPartId() != null).count();
                    double partAssignment = totalStories > 0 ? (storiesWithPart * 100.0 / totalStories) : 0;

                    long storiesInSprint = stories.stream().filter(s -> s.getSprintId() != null).count();
                    double sprintRate = totalStories > 0 ? (storiesInSprint * 100.0 / totalStories) : 0;

                    long doneStories = stories.stream().filter(s -> "DONE".equals(s.getStatus())).count();
                    double overallProgress = totalStories > 0 ? (doneStories * 100.0 / totalStories) : 0;

                    // Layer 2: Data Quality - Integrity
                    int nullEpicStories = (int) stories.stream().filter(s -> s.getEpicId() == null).count();
                    int nullPartStories = (int) stories.stream().filter(s -> s.getPartId() == null).count();
                    int unlinkedStories = (int) stories.stream().filter(s -> s.getBacklogItemId() == null).count();
                    int unlinkedItems = (int) (totalItems - itemsWithStory.size());

                    // Score calculation: integrity × 0.6 + readiness × 0.4
                    int integrityScore = 100; // No invalid refs (would need integrity views to check)
                    int readinessScore = Math.max(0, 100
                            - (nullEpicStories * 5) - (nullPartStories * 5)
                            - (unlinkedStories * 5) - (unlinkedItems * 3));
                    int totalScore = (int) (integrityScore * 0.6 + readinessScore * 0.4);

                    // Layer 3: Presenter
                    List<PmoPortfolioView.KpiEntry> coverageKpis = List.of(
                            buildKpi("Requirement Traceability", reqTrace, "%", 80,
                                    "backlog_items WITH requirement_id / total backlog_items",
                                    "Ratio of backlog items linked to requirements"),
                            buildKpi("Story Decomposition Rate", decomRate, "%", 70,
                                    "backlog_items WITH >=1 story / total backlog_items",
                                    "Ratio of backlog items decomposed into stories"),
                            buildKpi("Epic Coverage", epicCoverage, "%", 80,
                                    "stories WITH epic_id / total stories",
                                    "Ratio of stories assigned to an epic"),
                            buildKpi("Part Assignment Rate", partAssignment, "%", 90,
                                    "stories WITH part_id / total stories",
                                    "Ratio of stories assigned to a part"),
                            buildKpi("Sprint Commitment Rate", sprintRate, "%", 50,
                                    "stories WITH sprint_id / total stories",
                                    "Ratio of stories committed to a sprint")
                    );

                    // Part comparison
                    Set<String> allPartIds = stories.stream()
                            .map(R2dbcUserStory::getPartId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());
                    List<PmoPortfolioView.PartComparison> partComparisons = allPartIds.stream()
                            .map(partId -> {
                                List<R2dbcUserStory> partStories = stories.stream()
                                        .filter(s -> partId.equals(s.getPartId()))
                                        .collect(Collectors.toList());
                                int pts = partStories.stream()
                                        .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
                                int donePts = partStories.stream()
                                        .filter(s -> "DONE".equals(s.getStatus()))
                                        .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0).sum();
                                double compRate = pts > 0 ? (donePts * 100.0 / pts) : 0;
                                return PmoPortfolioView.PartComparison.builder()
                                        .partId(partId)
                                        .partName(partNames.getOrDefault(partId, partId))
                                        .stories(partStories.size())
                                        .storyPoints(pts)
                                        .completedPoints(donePts)
                                        .completionRate(Math.round(compRate * 10) / 10.0)
                                        .memberCount(partMemberCounts.getOrDefault(partId, 0))
                                        .build();
                            })
                            .collect(Collectors.toList());

                    // Warnings
                    List<PmoPortfolioView.Warning> warnings = new ArrayList<>();
                    if (totalScore < 50) {
                        warnings.add(PmoPortfolioView.Warning.builder()
                                .type("LOW_DATA_QUALITY").value((double) totalScore)
                                .message("Data quality score below threshold").build());
                    }
                    if (reqTrace < 80) {
                        warnings.add(PmoPortfolioView.Warning.builder()
                                .type("LOW_REQUIREMENT_TRACE").value(reqTrace)
                                .message("Requirement traceability below 80%").build());
                    }
                    if (epicCoverage < 80) {
                        warnings.add(PmoPortfolioView.Warning.builder()
                                .type("LOW_EPIC_COVERAGE").value(epicCoverage)
                                .message("Epic coverage below 80%").build());
                    }

                    // Data quality issues
                    List<PmoPortfolioView.DataIssue> issues = new ArrayList<>();
                    if (nullEpicStories > 0) {
                        issues.add(PmoPortfolioView.DataIssue.builder()
                                .severity("WARNING").category("readiness")
                                .issue(nullEpicStories + " stories without epic assignment").build());
                    }
                    if (nullPartStories > 0) {
                        issues.add(PmoPortfolioView.DataIssue.builder()
                                .severity("WARNING").category("readiness")
                                .issue(nullPartStories + " stories without part assignment").build());
                    }

                    return PmoPortfolioView.builder()
                            .projectId(projectId)
                            .summary(PmoPortfolioView.Summary.builder()
                                    .overallProgress(Math.round(overallProgress * 10) / 10.0)
                                    .requirementTraceability(Math.round(reqTrace * 10) / 10.0)
                                    .storyDecompositionRate(Math.round(decomRate * 10) / 10.0)
                                    .epicCoverage(Math.round(epicCoverage * 10) / 10.0)
                                    .dataQualityScore(totalScore)
                                    .build())
                            .kpis(PmoPortfolioView.Kpis.builder()
                                    .coverage(coverageKpis)
                                    .operational(Collections.emptyList()) // Event-based KPIs added when data is available
                                    .build())
                            .dataQuality(PmoPortfolioView.DataQuality.builder()
                                    .integrity(PmoPortfolioView.IntegrityMetrics.builder().build())
                                    .readiness(PmoPortfolioView.ReadinessMetrics.builder()
                                            .nullEpicIdStories(nullEpicStories)
                                            .nullPartIdStories(nullPartStories)
                                            .unlinkedStories(unlinkedStories)
                                            .unlinkedBacklogItems(unlinkedItems)
                                            .build())
                                    .score(PmoPortfolioView.ScoreMetrics.builder()
                                            .total(totalScore)
                                            .integrityScore(integrityScore)
                                            .readinessScore(readinessScore)
                                            .build())
                                    .issues(issues)
                                    .build())
                            .partComparison(partComparisons)
                            .warnings(warnings)
                            .build();
                });
    }

    // ==================== Helper methods ====================

    private PmoPortfolioView.KpiEntry buildKpi(String name, double value, String unit,
                                                double threshold, String formula, String description) {
        String status;
        if (value >= threshold) {
            status = "OK";
        } else if (value >= threshold * 0.8) {
            status = "WARNING";
        } else {
            status = "DANGER";
        }
        return PmoPortfolioView.KpiEntry.builder()
                .name(name).value(Math.round(value * 10) / 10.0).unit(unit)
                .threshold(threshold).status(status).formula(formula).description(description)
                .build();
    }

    private Mono<Map<String, String>> queryPartNames(String projectId) {
        return databaseClient
                .sql("SELECT id, name FROM project.parts WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .map((row, meta) -> Map.entry(
                        row.get("id", String.class),
                        row.get("name", String.class)))
                .all()
                .collectMap(Map.Entry::getKey, Map.Entry::getValue);
    }

    private Mono<Map<String, Integer>> queryPartMemberCounts(String projectId) {
        return databaseClient
                .sql("SELECT p.id, COUNT(pm.user_id) AS cnt FROM project.parts p " +
                     "LEFT JOIN project.part_members pm ON pm.part_id = p.id " +
                     "WHERE p.project_id = :projectId GROUP BY p.id")
                .bind("projectId", projectId)
                .map((row, meta) -> Map.entry(
                        row.get("id", String.class),
                        row.get("cnt", Long.class).intValue()))
                .all()
                .collectMap(Map.Entry::getKey, Map.Entry::getValue);
    }
}
