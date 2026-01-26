package com.insuretech.pms.report.service;

import com.insuretech.pms.lineage.entity.LineageEventType;
import com.insuretech.pms.lineage.entity.OutboxEvent;
import com.insuretech.pms.lineage.repository.OutboxEventRepository;
import com.insuretech.pms.project.entity.Project;
import com.insuretech.pms.project.repository.ProjectRepository;
import com.insuretech.pms.report.dto.ActivityDto;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.task.entity.Task;
import com.insuretech.pms.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final OutboxEventRepository outboxEventRepository;

    @Cacheable(value = "dashboard", key = "'stats'")
    @Transactional(readOnly = true)
    public DashboardStats getStats() {
        List<Project> projects = projectRepository.findAll();

        long totalProjects = projects.size();
        long activeProjects = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.IN_PROGRESS)
                .count();

        int avgProgress = (int) projects.stream()
                .mapToInt(Project::getProgress)
                .average()
                .orElse(0.0);

        Map<String, Long> projectsByStatus = new HashMap<>();
        for (Project.ProjectStatus status : Project.ProjectStatus.values()) {
            long count = projects.stream()
                    .filter(p -> p.getStatus() == status)
                    .count();
            projectsByStatus.put(status.name(), count);
        }

        long totalTasks = taskRepository.count();
        long completedTasks = taskRepository.countByStatus(Task.TaskStatus.DONE);

        return DashboardStats.builder()
                .totalProjects(totalProjects)
                .activeProjects(activeProjects)
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .avgProgress(avgProgress)
                .projectsByStatus(projectsByStatus)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> getRecentActivities() {
        // Fetch recent events from outbox (last 20 events)
        Page<OutboxEvent> recentEvents = outboxEventRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, 20));

        if (recentEvents.isEmpty()) {
            // Return default activity if no events
            return List.of(ActivityDto.builder()
                    .user("System")
                    .action("No recent activities")
                    .time("Now")
                    .type("info")
                    .build());
        }

        return recentEvents.getContent().stream()
                .map(this::convertToActivityDto)
                .collect(Collectors.toList());
    }

    /**
     * Convert OutboxEvent to ActivityDto for dashboard display
     */
    private ActivityDto convertToActivityDto(OutboxEvent event) {
        String user = extractUserFromPayload(event.getPayload());
        String action = formatEventAction(event.getEventType(), event.getAggregateType(), event.getPayload());
        String time = formatRelativeTime(event.getCreatedAt());
        String type = determineActivityType(event.getEventType());

        return ActivityDto.builder()
                .user(user)
                .action(action)
                .time(time)
                .type(type)
                .build();
    }

    /**
     * Extract user information from event payload
     */
    private String extractUserFromPayload(Map<String, Object> payload) {
        if (payload == null) {
            return "System";
        }

        // Try common fields for user information
        if (payload.containsKey("modifiedBy")) {
            return String.valueOf(payload.get("modifiedBy"));
        }
        if (payload.containsKey("createdBy")) {
            return String.valueOf(payload.get("createdBy"));
        }
        if (payload.containsKey("assigneeId")) {
            return String.valueOf(payload.get("assigneeId"));
        }
        if (payload.containsKey("userId")) {
            return String.valueOf(payload.get("userId"));
        }

        return "System";
    }

    /**
     * Format event action for human-readable display
     */
    private String formatEventAction(LineageEventType eventType, String aggregateType, Map<String, Object> payload) {
        String name = payload != null && payload.containsKey("title")
                ? String.valueOf(payload.get("title"))
                : payload != null && payload.containsKey("name")
                ? String.valueOf(payload.get("name"))
                : aggregateType;

        // Truncate name if too long
        if (name != null && name.length() > 30) {
            name = name.substring(0, 27) + "...";
        }

        return switch (eventType) {
            case REQUIREMENT_CREATED -> "Created requirement: " + name;
            case REQUIREMENT_UPDATED -> "Updated requirement: " + name;
            case REQUIREMENT_DELETED -> "Deleted requirement: " + name;
            case REQUIREMENT_STATUS_CHANGED -> "Changed requirement status: " + name;
            case STORY_CREATED -> "Created user story: " + name;
            case STORY_UPDATED -> "Updated user story: " + name;
            case STORY_DELETED -> "Deleted user story: " + name;
            case STORY_SPRINT_ASSIGNED -> "Assigned story to sprint: " + name;
            case TASK_CREATED -> "Created task: " + name;
            case TASK_UPDATED -> "Updated task: " + name;
            case TASK_DELETED -> "Deleted task: " + name;
            case TASK_STATUS_CHANGED -> formatTaskStatusChange(payload, name);
            case REQUIREMENT_STORY_LINKED -> "Linked requirement to story";
            case REQUIREMENT_STORY_UNLINKED -> "Unlinked requirement from story";
            case STORY_TASK_LINKED -> "Linked story to task";
            case STORY_TASK_UNLINKED -> "Unlinked story from task";
            case REQUIREMENT_TASK_LINKED -> "Linked requirement to task";
            case REQUIREMENT_TASK_UNLINKED -> "Unlinked requirement from task";
            case SPRINT_CREATED -> "Created sprint: " + name;
            case SPRINT_STARTED -> "Started sprint: " + name;
            case SPRINT_COMPLETED -> "Completed sprint: " + name;
        };
    }

    /**
     * Format task status change with from/to status
     */
    private String formatTaskStatusChange(Map<String, Object> payload, String name) {
        if (payload != null && payload.containsKey("newStatus")) {
            String newStatus = String.valueOf(payload.get("newStatus"));
            if ("DONE".equals(newStatus)) {
                return "Completed task: " + name;
            }
            return "Task status changed to " + newStatus + ": " + name;
        }
        return "Changed task status: " + name;
    }

    /**
     * Format time as relative time string (e.g., "5 minutes ago")
     */
    private String formatRelativeTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "Unknown";
        }

        Duration duration = Duration.between(dateTime, LocalDateTime.now());
        long seconds = duration.getSeconds();

        if (seconds < 60) {
            return "Just now";
        } else if (seconds < 3600) {
            long minutes = seconds / 60;
            return minutes + " minute" + (minutes > 1 ? "s" : "") + " ago";
        } else if (seconds < 86400) {
            long hours = seconds / 3600;
            return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
        } else if (seconds < 604800) {
            long days = seconds / 86400;
            return days + " day" + (days > 1 ? "s" : "") + " ago";
        } else {
            return dateTime.toLocalDate().toString();
        }
    }

    /**
     * Determine activity type (for styling in frontend)
     */
    private String determineActivityType(LineageEventType eventType) {
        return switch (eventType) {
            case REQUIREMENT_CREATED, STORY_CREATED, TASK_CREATED, SPRINT_CREATED -> "success";
            case REQUIREMENT_DELETED, STORY_DELETED, TASK_DELETED -> "warning";
            case SPRINT_COMPLETED -> "success";
            case TASK_STATUS_CHANGED -> "info";
            default -> "info";
        };
    }
}
