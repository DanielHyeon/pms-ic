package com.insuretech.pms.lineage.service;

import com.insuretech.pms.auth.entity.User;
import com.insuretech.pms.auth.repository.UserRepository;
import com.insuretech.pms.lineage.dto.*;
import com.insuretech.pms.lineage.entity.LineageEventType;
import com.insuretech.pms.lineage.entity.OutboxEvent;
import com.insuretech.pms.lineage.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.*;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.Node;
import org.neo4j.driver.types.Relationship;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for querying lineage data from Neo4j graph database.
 * Uses Neo4j for efficient graph traversal and relationship queries.
 * Falls back to OutboxEvent for timeline data (event history).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LineageQueryService {

    private final Driver neo4jDriver;
    private final OutboxEventRepository outboxEventRepository;
    private final UserRepository userRepository;

    /**
     * Get the complete lineage graph for a project from Neo4j.
     * Single query retrieves all nodes and relationships.
     */
    public LineageGraphDto getProjectGraph(String projectId) {
        log.debug("Fetching lineage graph from Neo4j for project: {}", projectId);

        List<LineageNodeDto> nodes = new ArrayList<>();
        List<LineageEdgeDto> edges = new ArrayList<>();
        Set<String> processedNodeIds = new HashSet<>();
        Set<String> processedEdgeIds = new HashSet<>();

        String query = """
            MATCH (n)
            WHERE n.projectId = $projectId
              AND (n:Requirement OR n:UserStory OR n:Task OR n:Sprint)
            OPTIONAL MATCH (n)-[r]->(m)
            WHERE m.projectId = $projectId
            RETURN n, r, m
            """;

        try (Session session = neo4jDriver.session()) {
            Result result = session.run(query, Values.parameters("projectId", projectId));

            while (result.hasNext()) {
                Record record = result.next();

                // Process source node
                Node sourceNode = record.get("n").asNode();
                if (!processedNodeIds.contains(sourceNode.elementId())) {
                    nodes.add(toNodeDto(sourceNode));
                    processedNodeIds.add(sourceNode.elementId());
                }

                // Process relationship and target node if exists
                if (!record.get("r").isNull() && !record.get("m").isNull()) {
                    Relationship rel = record.get("r").asRelationship();
                    Node targetNode = record.get("m").asNode();

                    // Add target node
                    if (!processedNodeIds.contains(targetNode.elementId())) {
                        nodes.add(toNodeDto(targetNode));
                        processedNodeIds.add(targetNode.elementId());
                    }

                    // Add edge
                    String edgeId = rel.elementId();
                    if (!processedEdgeIds.contains(edgeId)) {
                        edges.add(toEdgeDto(rel, sourceNode, targetNode));
                        processedEdgeIds.add(edgeId);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Neo4j query failed for project graph: {}", e.getMessage());
            return LineageGraphDto.builder()
                    .nodes(Collections.emptyList())
                    .edges(Collections.emptyList())
                    .statistics(emptyStatistics())
                    .build();
        }

        // Calculate statistics from the graph
        LineageGraphDto.LineageStatisticsDto stats = calculateStatisticsFromNodes(nodes, edges);

        log.info("Loaded {} nodes and {} edges from Neo4j for project {}", nodes.size(), edges.size(), projectId);

        return LineageGraphDto.builder()
                .nodes(nodes)
                .edges(edges)
                .statistics(stats)
                .build();
    }

    /**
     * Get upstream dependencies using Neo4j path traversal.
     * Much more efficient than recursive PostgreSQL queries.
     */
    public LineageTreeDto getUpstream(String aggregateType, String aggregateId, int depth) {
        log.debug("Fetching upstream from Neo4j for {}: {} with depth {}", aggregateType, aggregateId, depth);

        List<LineageNodeDto> nodes = new ArrayList<>();
        List<LineageEdgeDto> edges = new ArrayList<>();
        Set<String> processedNodeIds = new HashSet<>();
        LineageNodeDto root = null;

        String label = mapAggregateTypeToLabel(aggregateType);

        String query = String.format("""
            MATCH (target:%s {id: $id})
            OPTIONAL MATCH path = (source)-[r*1..%d]->(target)
            WHERE source:Requirement OR source:UserStory OR source:Task OR source:Sprint
            RETURN target, path
            """, label, depth);

        try (Session session = neo4jDriver.session()) {
            Result result = session.run(query, Values.parameters("id", aggregateId));

            while (result.hasNext()) {
                Record record = result.next();

                // Get root node
                if (root == null && !record.get("target").isNull()) {
                    Node targetNode = record.get("target").asNode();
                    root = toNodeDto(targetNode);
                    if (!processedNodeIds.contains(targetNode.elementId())) {
                        nodes.add(root);
                        processedNodeIds.add(targetNode.elementId());
                    }
                }

                // Process path if exists
                if (!record.get("path").isNull()) {
                    var path = record.get("path").asPath();

                    for (Node node : path.nodes()) {
                        if (!processedNodeIds.contains(node.elementId())) {
                            nodes.add(toNodeDto(node));
                            processedNodeIds.add(node.elementId());
                        }
                    }

                    for (Relationship rel : path.relationships()) {
                        edges.add(LineageEdgeDto.builder()
                                .id(rel.elementId())
                                .source(getNodeIdFromRel(rel, path, true))
                                .target(getNodeIdFromRel(rel, path, false))
                                .relationship(mapRelationshipType(rel.type()))
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Neo4j upstream query failed: {}", e.getMessage());
        }

        return LineageTreeDto.builder()
                .root(root)
                .nodes(nodes)
                .edges(edges)
                .maxDepth(depth)
                .totalNodes(nodes.size())
                .build();
    }

    /**
     * Get downstream dependencies using Neo4j path traversal.
     */
    public LineageTreeDto getDownstream(String aggregateType, String aggregateId, int depth) {
        log.debug("Fetching downstream from Neo4j for {}: {} with depth {}", aggregateType, aggregateId, depth);

        List<LineageNodeDto> nodes = new ArrayList<>();
        List<LineageEdgeDto> edges = new ArrayList<>();
        Set<String> processedNodeIds = new HashSet<>();
        LineageNodeDto root = null;

        String label = mapAggregateTypeToLabel(aggregateType);

        String query = String.format("""
            MATCH (source:%s {id: $id})
            OPTIONAL MATCH path = (source)-[r*1..%d]->(target)
            WHERE target:Requirement OR target:UserStory OR target:Task OR target:Sprint
            RETURN source, path
            """, label, depth);

        try (Session session = neo4jDriver.session()) {
            Result result = session.run(query, Values.parameters("id", aggregateId));

            while (result.hasNext()) {
                Record record = result.next();

                // Get root node
                if (root == null && !record.get("source").isNull()) {
                    Node sourceNode = record.get("source").asNode();
                    root = toNodeDto(sourceNode);
                    if (!processedNodeIds.contains(sourceNode.elementId())) {
                        nodes.add(root);
                        processedNodeIds.add(sourceNode.elementId());
                    }
                }

                // Process path if exists
                if (!record.get("path").isNull()) {
                    var path = record.get("path").asPath();

                    for (Node node : path.nodes()) {
                        if (!processedNodeIds.contains(node.elementId())) {
                            nodes.add(toNodeDto(node));
                            processedNodeIds.add(node.elementId());
                        }
                    }

                    for (Relationship rel : path.relationships()) {
                        edges.add(LineageEdgeDto.builder()
                                .id(rel.elementId())
                                .source(getNodeIdFromRel(rel, path, true))
                                .target(getNodeIdFromRel(rel, path, false))
                                .relationship(mapRelationshipType(rel.type()))
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Neo4j downstream query failed: {}", e.getMessage());
        }

        return LineageTreeDto.builder()
                .root(root)
                .nodes(nodes)
                .edges(edges)
                .maxDepth(depth)
                .totalNodes(nodes.size())
                .build();
    }

    /**
     * Analyze impact of changing an entity using Neo4j traversal.
     */
    public ImpactAnalysisDto analyzeImpact(String aggregateType, String aggregateId) {
        log.debug("Analyzing impact from Neo4j for {}: {}", aggregateType, aggregateId);

        String label = mapAggregateTypeToLabel(aggregateType);
        List<ImpactAnalysisDto.ImpactedEntityDto> directImpacts = new ArrayList<>();
        List<ImpactAnalysisDto.ImpactedEntityDto> indirectImpacts = new ArrayList<>();
        Set<String> affectedSprintIds = new HashSet<>();
        String sourceTitle = "";

        // Query for direct and indirect impacts
        String query = String.format("""
            MATCH (source:%s {id: $id})
            OPTIONAL MATCH (source)-[r1]->(direct)
            OPTIONAL MATCH (source)-[*2..3]->(indirect)
            WHERE (direct:UserStory OR direct:Task OR direct:Sprint)
              AND (indirect:UserStory OR indirect:Task OR indirect:Sprint)
              AND direct <> indirect
            RETURN source,
                   collect(DISTINCT direct) as directNodes,
                   collect(DISTINCT indirect) as indirectNodes
            """, label);

        try (Session session = neo4jDriver.session()) {
            Result result = session.run(query, Values.parameters("id", aggregateId));

            if (result.hasNext()) {
                Record record = result.next();

                // Source info
                if (!record.get("source").isNull()) {
                    Node source = record.get("source").asNode();
                    sourceTitle = getStringProperty(source, "title");
                }

                // Direct impacts
                List<Object> directNodes = record.get("directNodes").asList();
                for (Object obj : directNodes) {
                    if (obj instanceof Node node) {
                        String type = getNodeType(node);
                        directImpacts.add(ImpactAnalysisDto.ImpactedEntityDto.builder()
                                .id(getStringProperty(node, "id"))
                                .type(type)
                                .title(getStringProperty(node, "title"))
                                .status(getStringProperty(node, "status"))
                                .impactLevel(ImpactAnalysisDto.ImpactLevel.DIRECT)
                                .depth(1)
                                .build());

                        if ("SPRINT".equals(type)) {
                            affectedSprintIds.add(getStringProperty(node, "id"));
                        }
                    }
                }

                // Indirect impacts
                List<Object> indirectNodes = record.get("indirectNodes").asList();
                for (Object obj : indirectNodes) {
                    if (obj instanceof Node node) {
                        String nodeId = getStringProperty(node, "id");
                        // Skip if already in direct impacts
                        if (directImpacts.stream().anyMatch(d -> d.getId().equals(nodeId))) {
                            continue;
                        }

                        String type = getNodeType(node);
                        indirectImpacts.add(ImpactAnalysisDto.ImpactedEntityDto.builder()
                                .id(nodeId)
                                .type(type)
                                .title(getStringProperty(node, "title"))
                                .status(getStringProperty(node, "status"))
                                .impactLevel(ImpactAnalysisDto.ImpactLevel.INDIRECT)
                                .depth(2)
                                .build());

                        if ("SPRINT".equals(type)) {
                            affectedSprintIds.add(nodeId);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Neo4j impact analysis failed: {}", e.getMessage());
        }

        // Get sprint names
        List<String> sprintNames = getSprintNames(affectedSprintIds);

        int impactedStories = (int) (directImpacts.stream().filter(d -> "USER_STORY".equals(d.getType())).count()
                + indirectImpacts.stream().filter(d -> "USER_STORY".equals(d.getType())).count());
        int impactedTasks = (int) (directImpacts.stream().filter(d -> "TASK".equals(d.getType())).count()
                + indirectImpacts.stream().filter(d -> "TASK".equals(d.getType())).count());

        return ImpactAnalysisDto.builder()
                .sourceId(aggregateId)
                .sourceType(aggregateType)
                .sourceTitle(sourceTitle)
                .impactedStories(impactedStories)
                .impactedTasks(impactedTasks)
                .impactedSprints(affectedSprintIds.size())
                .directImpacts(directImpacts)
                .indirectImpacts(indirectImpacts)
                .affectedSprintNames(sprintNames)
                .build();
    }

    /**
     * Get activity timeline from OutboxEvent (PostgreSQL).
     * Timeline data is event-based, best stored in relational DB.
     */
    public Page<LineageEventDto> getTimeline(
            String projectId,
            String aggregateType,
            LocalDateTime since,
            LocalDateTime until,
            String userId,
            Pageable pageable) {

        log.debug("Fetching timeline for project: {}, type: {}", projectId, aggregateType);

        Page<OutboxEvent> eventsPage = outboxEventRepository.findTimelineEvents(
                aggregateType, since, until, pageable);

        List<OutboxEvent> filtered = eventsPage.getContent().stream()
                .filter(e -> matchesProject(e, projectId))
                .filter(e -> userId == null || matchesUser(e, userId))
                .collect(Collectors.toList());

        Map<String, String> userNames = loadUserNames();

        List<LineageEventDto> pageContent = filtered.stream()
                .map(e -> toEventDto(e, userNames))
                .collect(Collectors.toList());

        return new PageImpl<>(pageContent, pageable, eventsPage.getTotalElements());
    }

    /**
     * Get history for a specific entity from OutboxEvent.
     */
    public List<LineageEventDto> getEntityHistory(String aggregateType, String aggregateId) {
        log.debug("Fetching history for {}: {}", aggregateType, aggregateId);

        List<OutboxEvent> events = outboxEventRepository
                .findByAggregateTypeAndAggregateIdOrderByCreatedAtDesc(aggregateType, aggregateId);

        Map<String, String> userNames = loadUserNames();

        return events.stream()
                .map(e -> toEventDto(e, userNames))
                .collect(Collectors.toList());
    }

    /**
     * Get lineage statistics from Neo4j.
     */
    public LineageGraphDto.LineageStatisticsDto getStatistics(String projectId) {
        log.debug("Fetching statistics from Neo4j for project: {}", projectId);

        String query = """
            MATCH (n)
            WHERE n.projectId = $projectId
            WITH n,
                 CASE WHEN n:Requirement THEN 1 ELSE 0 END as isReq,
                 CASE WHEN n:UserStory THEN 1 ELSE 0 END as isStory,
                 CASE WHEN n:Task THEN 1 ELSE 0 END as isTask,
                 CASE WHEN n:Sprint THEN 1 ELSE 0 END as isSprint
            RETURN sum(isReq) as requirements,
                   sum(isStory) as stories,
                   sum(isTask) as tasks,
                   sum(isSprint) as sprints
            """;

        String linkedQuery = """
            MATCH (r:Requirement {projectId: $projectId})-[:IMPLEMENTED_BY|DERIVES]->()
            RETURN count(DISTINCT r) as linkedRequirements
            """;

        int requirements = 0, stories = 0, tasks = 0, sprints = 0, linkedReqs = 0;

        try (Session session = neo4jDriver.session()) {
            Result result = session.run(query, Values.parameters("projectId", projectId));
            if (result.hasNext()) {
                Record record = result.next();
                requirements = record.get("requirements").asInt();
                stories = record.get("stories").asInt();
                tasks = record.get("tasks").asInt();
                sprints = record.get("sprints").asInt();
            }

            Result linkedResult = session.run(linkedQuery, Values.parameters("projectId", projectId));
            if (linkedResult.hasNext()) {
                linkedReqs = linkedResult.next().get("linkedRequirements").asInt();
            }
        } catch (Exception e) {
            log.error("Neo4j statistics query failed: {}", e.getMessage());
            return emptyStatistics();
        }

        double coverage = requirements == 0 ? 0.0 : (double) linkedReqs / requirements * 100;

        return LineageGraphDto.LineageStatisticsDto.builder()
                .requirements(requirements)
                .stories(stories)
                .tasks(tasks)
                .sprints(sprints)
                .linkedRequirements(linkedReqs)
                .unlinkedRequirements(requirements - linkedReqs)
                .coverage(Math.round(coverage * 100.0) / 100.0)
                .build();
    }

    // ===== Helper Methods =====

    private LineageNodeDto toNodeDto(Node node) {
        String type = getNodeType(node);
        Map<String, Object> metadata = new HashMap<>();

        // Extract common metadata
        if (node.containsKey("priority")) {
            metadata.put("priority", getStringProperty(node, "priority"));
        }
        if (node.containsKey("storyPoints")) {
            metadata.put("storyPoints", node.get("storyPoints").asInt(0));
        }
        if (node.containsKey("epic")) {
            metadata.put("epic", getStringProperty(node, "epic"));
        }
        if (node.containsKey("category")) {
            metadata.put("category", getStringProperty(node, "category"));
        }

        return LineageNodeDto.builder()
                .id(getStringProperty(node, "id"))
                .type(LineageNodeDto.LineageNodeType.valueOf(type))
                .code(getStringProperty(node, "code"))
                .title(getStringProperty(node, "title"))
                .status(getStringProperty(node, "status"))
                .metadata(metadata)
                .build();
    }

    private LineageEdgeDto toEdgeDto(Relationship rel, Node source, Node target) {
        return LineageEdgeDto.builder()
                .id(rel.elementId())
                .source(getStringProperty(source, "id"))
                .target(getStringProperty(target, "id"))
                .relationship(mapRelationshipType(rel.type()))
                .createdAt(getDateTimeProperty(rel, "createdAt"))
                .build();
    }

    private String getNodeType(Node node) {
        for (String label : node.labels()) {
            return switch (label) {
                case "Requirement" -> "REQUIREMENT";
                case "UserStory" -> "USER_STORY";
                case "Task" -> "TASK";
                case "Sprint" -> "SPRINT";
                default -> label.toUpperCase();
            };
        }
        return "UNKNOWN";
    }

    private String mapAggregateTypeToLabel(String aggregateType) {
        return switch (aggregateType) {
            case "REQUIREMENT" -> "Requirement";
            case "USER_STORY" -> "UserStory";
            case "TASK" -> "Task";
            case "SPRINT" -> "Sprint";
            default -> aggregateType;
        };
    }

    private LineageEdgeDto.LineageRelationship mapRelationshipType(String type) {
        return switch (type) {
            case "DERIVES" -> LineageEdgeDto.LineageRelationship.DERIVES;
            case "BREAKS_DOWN_TO" -> LineageEdgeDto.LineageRelationship.BREAKS_DOWN_TO;
            case "IMPLEMENTED_BY" -> LineageEdgeDto.LineageRelationship.IMPLEMENTED_BY;
            case "BELONGS_TO_SPRINT" -> LineageEdgeDto.LineageRelationship.BELONGS_TO_SPRINT;
            default -> LineageEdgeDto.LineageRelationship.DERIVES;
        };
    }

    private String getStringProperty(Node node, String key) {
        if (node.containsKey(key) && !node.get(key).isNull()) {
            return node.get(key).asString();
        }
        return "";
    }

    private LocalDateTime getDateTimeProperty(Relationship rel, String key) {
        if (rel.containsKey(key) && !rel.get(key).isNull()) {
            try {
                ZonedDateTime zdt = rel.get(key).asZonedDateTime();
                return zdt.toLocalDateTime();
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private String getNodeIdFromRel(Relationship rel, org.neo4j.driver.types.Path path, boolean isSource) {
        for (Node node : path.nodes()) {
            String nodeElementId = node.elementId();
            if (isSource && rel.startNodeElementId().equals(nodeElementId)) {
                return getStringProperty(node, "id");
            }
            if (!isSource && rel.endNodeElementId().equals(nodeElementId)) {
                return getStringProperty(node, "id");
            }
        }
        return "";
    }

    private List<String> getSprintNames(Set<String> sprintIds) {
        if (sprintIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> names = new ArrayList<>();
        String query = """
            MATCH (s:Sprint)
            WHERE s.id IN $ids
            RETURN s.name as name
            """;

        try (Session session = neo4jDriver.session()) {
            Result result = session.run(query, Values.parameters("ids", new ArrayList<>(sprintIds)));
            while (result.hasNext()) {
                names.add(result.next().get("name").asString());
            }
        } catch (Exception e) {
            log.error("Failed to fetch sprint names: {}", e.getMessage());
        }

        return names;
    }

    private LineageGraphDto.LineageStatisticsDto calculateStatisticsFromNodes(
            List<LineageNodeDto> nodes, List<LineageEdgeDto> edges) {

        int requirements = (int) nodes.stream()
                .filter(n -> n.getType() == LineageNodeDto.LineageNodeType.REQUIREMENT).count();
        int stories = (int) nodes.stream()
                .filter(n -> n.getType() == LineageNodeDto.LineageNodeType.USER_STORY).count();
        int tasks = (int) nodes.stream()
                .filter(n -> n.getType() == LineageNodeDto.LineageNodeType.TASK).count();
        int sprints = (int) nodes.stream()
                .filter(n -> n.getType() == LineageNodeDto.LineageNodeType.SPRINT).count();

        // Count requirements that have outgoing edges
        Set<String> linkedReqIds = edges.stream()
                .filter(e -> e.getRelationship() == LineageEdgeDto.LineageRelationship.IMPLEMENTED_BY
                        || e.getRelationship() == LineageEdgeDto.LineageRelationship.DERIVES)
                .map(LineageEdgeDto::getSource)
                .collect(Collectors.toSet());

        int linkedReqs = (int) nodes.stream()
                .filter(n -> n.getType() == LineageNodeDto.LineageNodeType.REQUIREMENT)
                .filter(n -> linkedReqIds.contains(n.getId()))
                .count();

        double coverage = requirements == 0 ? 0.0 : (double) linkedReqs / requirements * 100;

        return LineageGraphDto.LineageStatisticsDto.builder()
                .requirements(requirements)
                .stories(stories)
                .tasks(tasks)
                .sprints(sprints)
                .linkedRequirements(linkedReqs)
                .unlinkedRequirements(requirements - linkedReqs)
                .coverage(Math.round(coverage * 100.0) / 100.0)
                .build();
    }

    private LineageGraphDto.LineageStatisticsDto emptyStatistics() {
        return LineageGraphDto.LineageStatisticsDto.builder()
                .requirements(0)
                .stories(0)
                .tasks(0)
                .sprints(0)
                .linkedRequirements(0)
                .unlinkedRequirements(0)
                .coverage(0.0)
                .build();
    }

    private boolean matchesProject(OutboxEvent event, String projectId) {
        if (projectId == null) {
            return true;
        }
        Map<String, Object> payload = event.getPayload();
        return payload != null && projectId.equals(payload.get("projectId"));
    }

    private boolean matchesUser(OutboxEvent event, String userId) {
        Map<String, Object> payload = event.getPayload();
        if (payload == null) {
            return false;
        }
        return userId.equals(payload.get("userId")) || userId.equals(payload.get("actorId"));
    }

    private Map<String, String> loadUserNames() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));
    }

    private LineageEventDto toEventDto(OutboxEvent event, Map<String, String> userNames) {
        Map<String, Object> payload = event.getPayload();
        if (payload == null) {
            payload = Collections.emptyMap();
        }

        String actorId = (String) payload.getOrDefault("userId",
                payload.getOrDefault("actorId", ""));
        String actorName = userNames.getOrDefault(actorId, "System");

        return LineageEventDto.builder()
                .id(event.getId().toString())
                .eventType(event.getEventType())
                .aggregateType(event.getAggregateType())
                .aggregateId(event.getAggregateId())
                .entityCode((String) payload.get("code"))
                .entityTitle((String) payload.get("title"))
                .actorId(actorId)
                .actorName(actorName)
                .timestamp(event.getCreatedAt())
                .changes(payload)
                .description(buildDescription(event))
                .build();
    }

    private String buildDescription(OutboxEvent event) {
        LineageEventType type = event.getEventType();

        return switch (type) {
            case REQUIREMENT_CREATED -> "요구사항 생성";
            case REQUIREMENT_UPDATED -> "요구사항 수정";
            case REQUIREMENT_DELETED -> "요구사항 삭제";
            case REQUIREMENT_STATUS_CHANGED -> "요구사항 상태 변경";
            case STORY_CREATED -> "유저스토리 생성";
            case STORY_UPDATED -> "유저스토리 수정";
            case STORY_DELETED -> "유저스토리 삭제";
            case STORY_SPRINT_ASSIGNED -> "스프린트에 스토리 배정";
            case TASK_CREATED -> "태스크 생성";
            case TASK_UPDATED -> "태스크 수정";
            case TASK_DELETED -> "태스크 삭제";
            case TASK_STATUS_CHANGED -> "태스크 상태 변경";
            case REQUIREMENT_STORY_LINKED -> "요구사항-스토리 연결";
            case REQUIREMENT_STORY_UNLINKED -> "요구사항-스토리 연결 해제";
            case STORY_TASK_LINKED -> "스토리-태스크 연결";
            case STORY_TASK_UNLINKED -> "스토리-태스크 연결 해제";
            case REQUIREMENT_TASK_LINKED -> "요구사항-태스크 연결";
            case REQUIREMENT_TASK_UNLINKED -> "요구사항-태스크 연결 해제";
            case SPRINT_CREATED -> "스프린트 생성";
            case SPRINT_STARTED -> "스프린트 시작";
            case SPRINT_COMPLETED -> "스프린트 완료";
        };
    }
}
