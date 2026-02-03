package com.insuretech.pms.chat.service;

import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.project.reactive.entity.R2dbcWbsTask;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsGroupRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsItemRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveWbsTaskRepository;
import com.insuretech.pms.task.reactive.entity.R2dbcTask;
import com.insuretech.pms.task.reactive.repository.ReactiveTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Service for enriching chat context with task/project data.
 * Automatically detects task-related questions and fetches relevant data
 * from both WBS tasks and Sprint/Kanban tasks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatContextEnrichmentService {

    private final ReactiveWbsTaskRepository wbsTaskRepository;
    private final ReactiveTaskRepository sprintTaskRepository;
    private final ReactivePhaseRepository phaseRepository;
    private final ReactiveWbsGroupRepository groupRepository;
    private final ReactiveWbsItemRepository itemRepository;
    private final ReactiveUserRepository userRepository;

    // Keywords that indicate a task-related question
    private static final Set<String> TASK_KEYWORDS = Set.of(
            // Korean task keywords
            "누가", "담당자", "담당", "작업", "태스크", "task", "진행", "진행률",
            "전처리", "개발", "설계", "분석", "테스트", "배포", "구현", "하고 있",
            "맡고 있", "맡았", "진행 중", "진행중", "완료", "상태",
            // English task keywords
            "who", "assignee", "assigned", "working", "progress", "status",
            // AI/ML specific keywords
            "이미지", "모델", "학습", "알고리즘", "데이터", "처리"
    );

    // Pattern to extract search keywords from the message
    private static final Pattern KEYWORD_PATTERN = Pattern.compile(
            "(\\p{L}+)\\s*(전처리|개발|설계|분석|테스트|배포|구현|작업|개선|처리|학습|이미지)");

    /**
     * Checks if the message is asking about task assignments or status.
     */
    public boolean isTaskRelatedQuestion(String message) {
        if (!StringUtils.hasText(message)) {
            return false;
        }
        String lowerMessage = message.toLowerCase();
        return TASK_KEYWORDS.stream().anyMatch(keyword ->
                lowerMessage.contains(keyword.toLowerCase()));
    }

    /**
     * Extracts search keywords from the message for task search.
     */
    public List<String> extractSearchKeywords(String message) {
        if (!StringUtils.hasText(message)) {
            return List.of();
        }

        List<String> keywords = new ArrayList<>();
        var matcher = KEYWORD_PATTERN.matcher(message);
        while (matcher.find()) {
            keywords.add(matcher.group(0));
        }

        // Also extract individual words that might be task names
        String[] words = message.split("\\s+");
        for (String word : words) {
            if (word.length() > 2 && !isStopWord(word)) {
                keywords.add(word);
            }
        }

        return keywords.stream().distinct().toList();
    }

    private boolean isStopWord(String word) {
        Set<String> stopWords = Set.of(
                "누가", "하고", "있어", "있나", "하는", "어디", "뭐야", "무엇",
                "은", "는", "을", "를", "의", "에", "와", "과", "do", "does", "is", "are"
        );
        return stopWords.contains(word.toLowerCase());
    }

    /**
     * Enriches the context with task data based on the question.
     * Searches both WBS tasks and Sprint/Kanban tasks.
     * Returns formatted task information that can be added to the chat context.
     * @deprecated Use {@link #getTaskDocsForContext(String, String)} for RAG-style retrieval
     */
    @Deprecated
    public Mono<String> enrichWithTaskData(String message, String projectId) {
        return getTaskDocsForContext(message, projectId)
                .map(docs -> docs.isEmpty() ? "" : String.join("\n\n", docs));
    }

    /**
     * Retrieves task data as a list of document strings for RAG context.
     * Searches both WBS tasks and Sprint/Kanban tasks.
     * Returns list of formatted task documents suitable for retrieved_docs field.
     */
    public Mono<List<String>> getTaskDocsForContext(String message, String projectId) {
        if (!isTaskRelatedQuestion(message) || !StringUtils.hasText(projectId)) {
            return Mono.just(List.of());
        }

        List<String> keywords = extractSearchKeywords(message);
        if (keywords.isEmpty()) {
            return Mono.just(List.of());
        }

        log.info("Enriching context with task data for keywords: {}", keywords);

        // Search both WBS tasks and Sprint tasks in parallel
        Mono<List<Map<String, Object>>> wbsTasksMono = searchWbsTasks(projectId, keywords);
        Mono<List<Map<String, Object>>> sprintTasksMono = searchSprintTasks(projectId, keywords);

        return Mono.zip(wbsTasksMono, sprintTasksMono)
                .map(tuple -> {
                    List<Map<String, Object>> allTasks = new ArrayList<>();
                    allTasks.addAll(tuple.getT1());
                    allTasks.addAll(tuple.getT2());

                    if (allTasks.isEmpty()) {
                        return List.<String>of();
                    }
                    return formatTasksAsDocuments(allTasks);
                })
                .onErrorResume(e -> {
                    log.error("Error enriching with task data: {}", e.getMessage());
                    return Mono.just(List.of());
                });
    }

    /**
     * Search WBS tasks by keywords.
     */
    private Mono<List<Map<String, Object>>> searchWbsTasks(String projectId, List<String> keywords) {
        return Flux.fromIterable(keywords)
                .take(3)
                .flatMap(keyword -> wbsTaskRepository.searchByKeyword(projectId, keyword))
                .distinct(R2dbcWbsTask::getId)
                .take(5)
                .flatMap(this::enrichWbsTaskWithDetails)
                .collectList()
                .onErrorResume(e -> {
                    log.warn("Error searching WBS tasks: {}", e.getMessage());
                    return Mono.just(List.of());
                });
    }

    /**
     * Search Sprint/Kanban tasks by keywords.
     */
    private Mono<List<Map<String, Object>>> searchSprintTasks(String projectId, List<String> keywords) {
        return Flux.fromIterable(keywords)
                .take(3)
                .flatMap(keyword -> sprintTaskRepository.searchByKeyword(projectId, keyword))
                .distinct(R2dbcTask::getId)
                .take(5)
                .flatMap(this::enrichSprintTaskWithDetails)
                .collectList()
                .onErrorResume(e -> {
                    log.warn("Error searching Sprint tasks: {}", e.getMessage());
                    return Mono.just(List.of());
                });
    }

    /**
     * Enrich WBS task with phase, group, item, and assignee details.
     */
    private Mono<Map<String, Object>> enrichWbsTaskWithDetails(R2dbcWbsTask task) {
        return Mono.zip(
                phaseRepository.findById(task.getPhaseId())
                        .map(phase -> (Object) phase.getName())
                        .defaultIfEmpty("Unknown Phase"),
                groupRepository.findById(task.getGroupId())
                        .map(group -> (Object) group.getName())
                        .defaultIfEmpty("Unknown Group"),
                itemRepository.findById(task.getItemId())
                        .map(item -> (Object) item.getName())
                        .defaultIfEmpty("Unknown Item"),
                task.getAssigneeId() != null
                        ? userRepository.findById(task.getAssigneeId())
                                .map(user -> (Object) Map.of(
                                        "name", user.getName(),
                                        "email", user.getEmail(),
                                        "role", user.getRole() != null ? user.getRole() : ""))
                                .defaultIfEmpty(Map.of("name", "Unknown", "email", "", "role", ""))
                        : Mono.just((Object) Map.of("name", "Not assigned", "email", "", "role", ""))
        ).map(tuple -> {
            Map<String, Object> taskInfo = new LinkedHashMap<>();
            taskInfo.put("source", "WBS");
            taskInfo.put("taskName", task.getName());
            taskInfo.put("taskCode", task.getCode());
            taskInfo.put("description", task.getDescription() != null ? task.getDescription() : "");
            taskInfo.put("status", task.getStatus());
            taskInfo.put("progress", task.getProgress() + "%");
            taskInfo.put("phaseName", tuple.getT1());
            taskInfo.put("groupName", tuple.getT2());
            taskInfo.put("itemName", tuple.getT3());

            @SuppressWarnings("unchecked")
            Map<String, String> assignee = (Map<String, String>) tuple.getT4();
            taskInfo.put("assigneeName", assignee.get("name"));
            taskInfo.put("assigneeEmail", assignee.get("email"));
            taskInfo.put("assigneeRole", assignee.get("role"));

            if (task.getPlannedStartDate() != null) {
                taskInfo.put("plannedStartDate", task.getPlannedStartDate().toString());
            }
            if (task.getPlannedEndDate() != null) {
                taskInfo.put("plannedEndDate", task.getPlannedEndDate().toString());
            }

            return taskInfo;
        });
    }

    /**
     * Enrich Sprint/Kanban task with assignee details.
     */
    private Mono<Map<String, Object>> enrichSprintTaskWithDetails(R2dbcTask task) {
        Mono<Map<String, String>> assigneeMono = task.getAssigneeId() != null
                ? userRepository.findById(task.getAssigneeId())
                        .map(user -> Map.of(
                                "name", user.getName() != null ? user.getName() : "Unknown",
                                "email", user.getEmail() != null ? user.getEmail() : "",
                                "role", user.getRole() != null ? user.getRole() : ""))
                        .defaultIfEmpty(Map.of("name", "Unknown", "email", "", "role", ""))
                : Mono.just(Map.of("name", "Not assigned", "email", "", "role", ""));

        return assigneeMono.map(assignee -> {
            Map<String, Object> taskInfo = new LinkedHashMap<>();
            taskInfo.put("source", "Kanban/Sprint");
            taskInfo.put("taskName", task.getTitle());
            taskInfo.put("taskCode", task.getId());
            taskInfo.put("description", task.getDescription() != null ? task.getDescription() : "");
            taskInfo.put("status", task.getStatus());
            taskInfo.put("priority", task.getPriority());
            taskInfo.put("assigneeName", assignee.get("name"));
            taskInfo.put("assigneeEmail", assignee.get("email"));
            taskInfo.put("assigneeRole", assignee.get("role"));

            if (task.getDueDate() != null) {
                taskInfo.put("dueDate", task.getDueDate().toString());
            }

            return taskInfo;
        });
    }

    /**
     * Format tasks as a list of document strings for RAG retrieved_docs.
     */
    private List<String> formatTasksAsDocuments(List<Map<String, Object>> tasks) {
        List<String> docs = new ArrayList<>();
        for (Map<String, Object> task : tasks) {
            String source = (String) task.get("source");
            StringBuilder sb = new StringBuilder();

            sb.append(String.format("[%s Task] %s\n", source, task.get("taskName")));

            if ("WBS".equals(source)) {
                sb.append(String.format("Code: %s\n", task.get("taskCode")));
                sb.append(String.format("Phase: %s > Group: %s > Item: %s\n",
                        task.get("phaseName"), task.get("groupName"), task.get("itemName")));
                sb.append(String.format("Status: %s, Progress: %s\n",
                        task.get("status"), task.get("progress")));
            } else {
                sb.append(String.format("Status: %s, Priority: %s\n",
                        task.get("status"), task.get("priority")));
            }

            sb.append(String.format("Assignee: %s", task.get("assigneeName")));
            if (task.get("assigneeEmail") != null && !task.get("assigneeEmail").toString().isEmpty()) {
                sb.append(String.format(" (Email: %s)", task.get("assigneeEmail")));
            }
            sb.append("\n");

            if (task.get("description") != null && !task.get("description").toString().isEmpty()) {
                sb.append(String.format("Description: %s\n", task.get("description")));
            }

            docs.add(sb.toString());
        }
        return docs;
    }

    private String formatTasksForContext(List<Map<String, Object>> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n\n[Task Information from Project Database]\n");
        sb.append("The following task information was found:\n\n");

        for (int i = 0; i < tasks.size(); i++) {
            Map<String, Object> task = tasks.get(i);
            String source = (String) task.get("source");

            sb.append(String.format("%d. [%s] Task: %s\n",
                    i + 1, source, task.get("taskName")));

            // WBS tasks have phase/group/item hierarchy
            if ("WBS".equals(source)) {
                sb.append(String.format("   - Code: %s\n", task.get("taskCode")));
                sb.append(String.format("   - Phase: %s > Group: %s > Item: %s\n",
                        task.get("phaseName"), task.get("groupName"), task.get("itemName")));
                sb.append(String.format("   - Status: %s, Progress: %s\n",
                        task.get("status"), task.get("progress")));
            } else {
                // Sprint/Kanban tasks
                sb.append(String.format("   - Status: %s, Priority: %s\n",
                        task.get("status"), task.get("priority")));
            }

            sb.append(String.format("   - Assignee: %s", task.get("assigneeName")));
            if (task.get("assigneeEmail") != null && !task.get("assigneeEmail").toString().isEmpty()) {
                sb.append(String.format(" (%s)", task.get("assigneeEmail")));
            }
            sb.append("\n");

            if (task.get("description") != null && !task.get("description").toString().isEmpty()) {
                sb.append(String.format("   - Description: %s\n", task.get("description")));
            }
            sb.append("\n");
        }

        sb.append("Use this information to answer the user's question about task assignments and status.\n");

        return sb.toString();
    }
}
