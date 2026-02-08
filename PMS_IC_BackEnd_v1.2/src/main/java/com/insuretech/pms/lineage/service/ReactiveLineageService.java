package com.insuretech.pms.lineage.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.lineage.dto.*;
import com.insuretech.pms.lineage.dto.LineageEdgeDto.LineageRelationship;
import com.insuretech.pms.lineage.dto.LineageNodeDto.LineageNodeType;
import com.insuretech.pms.lineage.enums.LineageEventType;
import com.insuretech.pms.lineage.reactive.entity.R2dbcOutboxEvent;
import com.insuretech.pms.lineage.reactive.repository.ReactiveOutboxEventRepository;
import com.insuretech.pms.rfp.reactive.repository.ReactiveRequirementRepository;
import com.insuretech.pms.task.reactive.repository.ReactiveUserStoryRepository;
import com.insuretech.pms.task.reactive.repository.ReactiveTaskRepository;
import com.insuretech.pms.task.reactive.repository.ReactiveSprintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveLineageService {

    private final ReactiveOutboxEventRepository outboxRepository;
    private final ReactiveRequirementRepository requirementRepository;
    private final ReactiveUserStoryRepository userStoryRepository;
    private final ReactiveTaskRepository taskRepository;
    private final ReactiveSprintRepository sprintRepository;
    private final DatabaseClient databaseClient;
    private final ObjectMapper objectMapper;

    private final Map<String, Sinks.Many<LineageEventDto>> projectEventSinks = new ConcurrentHashMap<>();

    /**
     * Publish a lineage event to the outbox
     */
    public Mono<R2dbcOutboxEvent> publishEvent(String projectId, LineageEventType eventType,
                                                String aggregateType, String aggregateId,
                                                Map<String, Object> payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);

            R2dbcOutboxEvent event = R2dbcOutboxEvent.builder()
                    .id(UUID.randomUUID())
                    .eventType(eventType.name())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .projectId(projectId)
                    .payload(payloadJson)
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .idempotencyKey(generateIdempotencyKey(aggregateType, aggregateId, eventType))
                    .build();

            return outboxRepository.save(event)
                    .doOnSuccess(saved -> {
                        log.info("Published lineage event: type={}, aggregate={}:{}",
                                eventType, aggregateType, aggregateId);
                        emitToStream(projectId, toDto(saved));
                    });
        } catch (JsonProcessingException e) {
            return Mono.error(new RuntimeException("Failed to serialize payload", e));
        }
    }

    /**
     * Stream lineage events for a project (SSE)
     */
    public Flux<LineageEventDto> streamProjectEvents(String projectId) {
        Sinks.Many<LineageEventDto> sink = getOrCreateSink(projectId);
        return sink.asFlux()
                .doOnCancel(() -> log.debug("Client disconnected from lineage stream: {}", projectId));
    }

    /**
     * Get pending events for processing
     */
    public Flux<R2dbcOutboxEvent> getPendingEvents(int limit) {
        return outboxRepository.findPendingEvents(limit);
    }

    /**
     * Get failed events for retry
     */
    public Flux<R2dbcOutboxEvent> getFailedEventsForRetry(int maxRetries, int limit) {
        return outboxRepository.findFailedEventsForRetry(maxRetries, limit);
    }

    /**
     * Mark event as published
     */
    public Mono<Void> markPublished(UUID eventId) {
        return outboxRepository.markPublished(eventId)
                .doOnSuccess(v -> log.debug("Marked event published: {}", eventId));
    }

    /**
     * Mark event as failed
     */
    public Mono<Void> markFailed(UUID eventId, String error) {
        return outboxRepository.markFailed(eventId, error)
                .doOnSuccess(v -> log.warn("Marked event failed: {}, error: {}", eventId, error));
    }

    /**
     * Get events by aggregate
     */
    public Flux<LineageEventDto> getEventsByAggregate(String aggregateType, String aggregateId) {
        return outboxRepository.findByAggregateTypeAndAggregateId(aggregateType, aggregateId)
                .map(this::toDto);
    }

    /**
     * Get events by project
     */
    public Flux<LineageEventDto> getEventsByProject(String projectId) {
        return outboxRepository.findByProjectId(projectId)
                .map(this::toDto);
    }

    /**
     * Build lineage graph from requirements, stories, tasks, sprints, and their trace links.
     */
    public Mono<LineageGraphDto> buildLineageGraph(String projectId) {
        // Collect all nodes in parallel
        Mono<List<LineageNodeDto>> requirementNodes = requirementRepository
                .findByProjectIdOrderByCodeAsc(projectId)
                .map(req -> LineageNodeDto.builder()
                        .id(req.getId())
                        .type(LineageNodeType.REQUIREMENT)
                        .code(req.getCode())
                        .title(req.getTitle())
                        .status(req.getStatus())
                        .metadata(Map.of("priority", req.getPriority() != null ? req.getPriority() : "MEDIUM",
                                         "category", req.getCategory() != null ? req.getCategory() : ""))
                        .build())
                .collectList();

        Mono<List<LineageNodeDto>> storyNodes = userStoryRepository
                .findByProjectId(projectId)
                .map(story -> LineageNodeDto.builder()
                        .id(story.getId())
                        .type(LineageNodeType.USER_STORY)
                        .code(story.getId())
                        .title(story.getTitle())
                        .status(story.getStatus())
                        .metadata(Map.of("storyPoints", story.getStoryPoints() != null ? story.getStoryPoints() : 0))
                        .build())
                .collectList();

        Mono<List<LineageNodeDto>> taskNodes = taskRepository
                .findByProjectIdOrderByOrderNumAsc(projectId)
                .map(task -> LineageNodeDto.builder()
                        .id(task.getId())
                        .type(LineageNodeType.TASK)
                        .code(task.getId())
                        .title(task.getTitle())
                        .status(task.getStatus())
                        .build())
                .collectList();

        Mono<List<LineageNodeDto>> sprintNodes = sprintRepository
                .findByProjectIdOrderByStartDateDesc(projectId)
                .map(sprint -> LineageNodeDto.builder()
                        .id(sprint.getId())
                        .type(LineageNodeType.SPRINT)
                        .code(sprint.getName())
                        .title(sprint.getName())
                        .status(sprint.getStatus())
                        .build())
                .collectList();

        // Collect edges from trace links
        Mono<List<LineageEdgeDto>> traceEdges = databaseClient
                .sql("SELECT id, requirement_id, linked_entity_type, linked_entity_id, link_type, created_at " +
                     "FROM project.requirement_trace_links WHERE requirement_id IN " +
                     "(SELECT id FROM project.requirements WHERE project_id = :projectId)")
                .bind("projectId", projectId)
                .map((row, meta) -> LineageEdgeDto.builder()
                        .id(row.get("id", String.class))
                        .source(row.get("requirement_id", String.class))
                        .target(row.get("linked_entity_id", String.class))
                        .relationship(mapLinkType(row.get("link_type", String.class),
                                                  row.get("linked_entity_type", String.class)))
                        .createdAt(row.get("created_at", LocalDateTime.class))
                        .build())
                .all()
                .collectList();

        // Collect edges from requirement-story mappings
        Mono<List<LineageEdgeDto>> storyMappingEdges = databaseClient
                .sql("SELECT id::text as id, requirement_id, story_id, mapped_at " +
                     "FROM project.requirement_story_mapping WHERE requirement_id IN " +
                     "(SELECT id FROM project.requirements WHERE project_id = :projectId)")
                .bind("projectId", projectId)
                .map((row, meta) -> LineageEdgeDto.builder()
                        .id(row.get("id", String.class))
                        .source(row.get("requirement_id", String.class))
                        .target(row.get("story_id", String.class))
                        .relationship(LineageRelationship.DERIVES)
                        .createdAt(row.get("mapped_at", LocalDateTime.class))
                        .build())
                .all()
                .collectList();

        // Collect edges from task->story relationships
        Mono<List<LineageEdgeDto>> taskStoryEdges = databaseClient
                .sql("SELECT id, user_story_id, title FROM task.tasks " +
                     "WHERE project_id = :projectId AND user_story_id IS NOT NULL")
                .bind("projectId", projectId)
                .map((row, meta) -> LineageEdgeDto.builder()
                        .id("ts-" + row.get("id", String.class))
                        .source(row.get("user_story_id", String.class))
                        .target(row.get("id", String.class))
                        .relationship(LineageRelationship.BREAKS_DOWN_TO)
                        .build())
                .all()
                .collectList();

        // Collect edges from task->sprint relationships
        Mono<List<LineageEdgeDto>> taskSprintEdges = databaseClient
                .sql("SELECT id, sprint_id FROM task.tasks " +
                     "WHERE project_id = :projectId AND sprint_id IS NOT NULL")
                .bind("projectId", projectId)
                .map((row, meta) -> LineageEdgeDto.builder()
                        .id("tsp-" + row.get("id", String.class))
                        .source(row.get("id", String.class))
                        .target(row.get("sprint_id", String.class))
                        .relationship(LineageRelationship.BELONGS_TO_SPRINT)
                        .build())
                .all()
                .collectList();

        // Combine all data into the graph
        return Mono.zip(requirementNodes, storyNodes, taskNodes, sprintNodes,
                        traceEdges, storyMappingEdges, taskStoryEdges, taskSprintEdges)
                .map(tuple -> {
                    List<LineageNodeDto> allNodes = new ArrayList<>();
                    allNodes.addAll(tuple.getT1()); // requirements
                    allNodes.addAll(tuple.getT2()); // stories
                    allNodes.addAll(tuple.getT3()); // tasks
                    allNodes.addAll(tuple.getT4()); // sprints

                    List<LineageEdgeDto> allEdges = new ArrayList<>();
                    allEdges.addAll(tuple.getT5()); // trace links
                    allEdges.addAll(tuple.getT6()); // story mappings
                    allEdges.addAll(tuple.getT7()); // task-story
                    allEdges.addAll(tuple.getT8()); // task-sprint

                    // Compute statistics
                    int reqCount = tuple.getT1().size();
                    int storyCount = tuple.getT2().size();
                    int taskCount = tuple.getT3().size();
                    int sprintCount = tuple.getT4().size();

                    // Count linked requirements (those that appear as source in any edge)
                    Set<String> linkedReqIds = new HashSet<>();
                    for (LineageEdgeDto edge : allEdges) {
                        if (tuple.getT1().stream().anyMatch(n -> n.getId().equals(edge.getSource()))) {
                            linkedReqIds.add(edge.getSource());
                        }
                    }
                    int linkedReqs = linkedReqIds.size();
                    int unlinkedReqs = reqCount - linkedReqs;
                    double coverage = reqCount > 0 ? (linkedReqs * 100.0 / reqCount) : 0.0;

                    LineageGraphDto.LineageStatisticsDto stats = LineageGraphDto.LineageStatisticsDto.builder()
                            .requirements(reqCount)
                            .stories(storyCount)
                            .tasks(taskCount)
                            .sprints(sprintCount)
                            .coverage(Math.round(coverage * 100.0) / 100.0)
                            .linkedRequirements(linkedReqs)
                            .unlinkedRequirements(unlinkedReqs)
                            .build();

                    return LineageGraphDto.builder()
                            .nodes(allNodes)
                            .edges(allEdges)
                            .statistics(stats)
                            .build();
                })
                .doOnSuccess(graph -> log.info("Built lineage graph for project {}: {} nodes, {} edges",
                        projectId, graph.getNodes().size(), graph.getEdges().size()));
    }

    private LineageRelationship mapLinkType(String linkType, String entityType) {
        if ("TRACED_TO".equals(linkType) || "DERIVES".equals(linkType)) {
            return LineageRelationship.DERIVES;
        }
        if ("IMPLEMENTS".equals(linkType) || "IMPLEMENTED_BY".equals(linkType)) {
            if ("USER_STORY".equals(entityType)) return LineageRelationship.DERIVES;
            if ("TASK".equals(entityType)) return LineageRelationship.IMPLEMENTED_BY;
            return LineageRelationship.IMPLEMENTED_BY;
        }
        if ("VERIFIED_BY".equals(linkType)) {
            return LineageRelationship.IMPLEMENTED_BY;
        }
        return LineageRelationship.DERIVES;
    }

    private Sinks.Many<LineageEventDto> getOrCreateSink(String projectId) {
        return projectEventSinks.computeIfAbsent(projectId,
                k -> Sinks.many().multicast().onBackpressureBuffer());
    }

    private void emitToStream(String projectId, LineageEventDto event) {
        Sinks.Many<LineageEventDto> sink = projectEventSinks.get(projectId);
        if (sink != null) {
            sink.tryEmitNext(event);
        }
    }

    private String generateIdempotencyKey(String aggregateType, String aggregateId, LineageEventType eventType) {
        return String.format("%s:%s:%s:%d", aggregateType, aggregateId, eventType, System.currentTimeMillis());
    }

    @SuppressWarnings("unchecked")
    private LineageEventDto toDto(R2dbcOutboxEvent entity) {
        Map<String, Object> payload = null;
        try {
            if (entity.getPayload() != null) {
                payload = objectMapper.readValue(entity.getPayload(), Map.class);
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse payload for event: {}", entity.getId());
        }

        return LineageEventDto.builder()
                .id(entity.getId() != null ? entity.getId().toString() : null)
                .eventType(parseEventType(entity.getEventType()))
                .aggregateType(entity.getAggregateType())
                .aggregateId(entity.getAggregateId())
                .timestamp(entity.getCreatedAt())
                .changes(payload)
                .build();
    }

    private LineageEventType parseEventType(String type) {
        try {
            return type != null ? LineageEventType.valueOf(type) : LineageEventType.REQUIREMENT_CREATED;
        } catch (IllegalArgumentException e) {
            return LineageEventType.REQUIREMENT_CREATED;
        }
    }
}
