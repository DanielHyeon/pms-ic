package com.insuretech.pms.report.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.common.security.ProjectSecurityService;
import com.insuretech.pms.lineage.entity.LineageEventType;
import com.insuretech.pms.lineage.entity.OutboxEvent;
import com.insuretech.pms.lineage.repository.OutboxEventRepository;
import com.insuretech.pms.project.entity.Project;
import com.insuretech.pms.project.entity.ProjectMember;
import com.insuretech.pms.project.repository.ProjectMemberRepository;
import com.insuretech.pms.project.repository.ProjectRepository;
import com.insuretech.pms.report.dto.ActivityDto;
import com.insuretech.pms.report.dto.DashboardStats;
import com.insuretech.pms.task.entity.Task;
import com.insuretech.pms.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

/**
 * Dashboard service with tenant-aware filtering.
 * Provides both portfolio view (aggregated) and project-specific view.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ProjectSecurityService projectSecurityService;
    private final ProjectMemberRepository projectMemberRepository;

    // ========== Portfolio Methods (Aggregated for user's accessible projects) ==========

    /**
     * Get aggregated dashboard stats for user's accessible projects.
     * Cache key includes userId for per-user caching.
     */
    @Cacheable(value = "dashboard", key = "'portfolio-stats-' + @projectSecurityService.getAuthenticatedUserId()")
    @Transactional(readOnly = true)
    public DashboardStats getPortfolioStats() {
        String userId = projectSecurityService.getAuthenticatedUserId();
        List<Project> accessibleProjects = getAccessibleProjects(userId);
        List<String> projectIds = accessibleProjects.stream()
                .map(Project::getId)
                .toList();

        log.debug("Getting portfolio stats for user {} with {} accessible projects", userId, accessibleProjects.size());

        long totalProjects = accessibleProjects.size();
        long activeProjects = accessibleProjects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.IN_PROGRESS)
                .count();

        int avgProgress = (int) accessibleProjects.stream()
                .mapToInt(Project::getProgress)
                .average()
                .orElse(0.0);

        Map<String, Long> projectsByStatus = calculateStatusDistribution(accessibleProjects);

        // Task counts for accessible projects
        long totalTasks = projectIds.isEmpty() ? 0 : taskRepository.countByProjectIdIn(projectIds);
        long completedTasks = projectIds.isEmpty() ? 0 : taskRepository.countByProjectIdInAndStatus(projectIds, Task.TaskStatus.DONE);

        return DashboardStats.builder()
                .isPortfolioView(true)
                .projectId(null)
                .projectName(null)
                .totalProjects(totalProjects)
                .activeProjects(activeProjects)
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .avgProgress(avgProgress)
                .projectsByStatus(projectsByStatus)
                .build();
    }

    /**
     * Get recent activities for user's accessible projects.
     */
    @Transactional(readOnly = true)
    public List<ActivityDto> getPortfolioActivities() {
        String userId = projectSecurityService.getAuthenticatedUserId();
        List<String> projectIds = getAccessibleProjectIds(userId);

        log.debug("Getting portfolio activities for user {} with {} accessible projects", userId, projectIds.size());

        if (projectIds.isEmpty()) {
            return List.of(createDefaultNoActivityDto());
        }

        Page<OutboxEvent> recentEvents = outboxEventRepository
                .findByProjectIdInOrderByCreatedAtDesc(projectIds, PageRequest.of(0, 20));

        if (recentEvents.isEmpty()) {
            return List.of(createDefaultNoActivityDto());
        }

        return recentEvents.getContent().stream()
                .map(this::convertToActivityDto)
                .collect(Collectors.toList());
    }

    // ========== Project-Specific Methods ==========

    /**
     * Get dashboard stats for a specific project.
     * Authorization check should be done at controller level via @PreAuthorize.
     */
    @Cacheable(value = "dashboard", key = "'project-stats-' + #projectId")
    @Transactional(readOnly = true)
    public DashboardStats getProjectStats(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> CustomException.notFound("Project not found: " + projectId));

        log.debug("Getting project stats for project {}", projectId);

        long totalTasks = taskRepository.countByColumn_ProjectId(projectId);
        long completedTasks = taskRepository.countByColumn_ProjectIdAndStatus(projectId, Task.TaskStatus.DONE);

        return DashboardStats.builder()
                .isPortfolioView(false)
                .projectId(projectId)
                .projectName(project.getName())
                .totalProjects(1L)
                .activeProjects(project.getStatus() == Project.ProjectStatus.IN_PROGRESS ? 1L : 0L)
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .avgProgress(project.getProgress())
                .projectsByStatus(Map.of(project.getStatus().name(), 1L))
                .build();
    }

    /**
     * Get recent activities for a specific project.
     * Authorization check should be done at controller level via @PreAuthorize.
     */
    @Transactional(readOnly = true)
    public List<ActivityDto> getProjectActivities(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> CustomException.notFound("Project not found: " + projectId));

        log.debug("Getting project activities for project {}", projectId);

        Page<OutboxEvent> recentEvents = outboxEventRepository
                .findByProjectIdOrderByCreatedAtDesc(projectId, PageRequest.of(0, 20));

        if (recentEvents.isEmpty()) {
            return List.of(createDefaultNoActivityDto());
        }

        return recentEvents.getContent().stream()
                .map(event -> convertToActivityDtoWithProject(event, project))
                .collect(Collectors.toList());
    }

    // ========== Legacy Methods (for backward compatibility) ==========

    /**
     * @deprecated Use getPortfolioStats() instead
     */
    @Deprecated
    @Transactional(readOnly = true)
    public DashboardStats getStats() {
        return getPortfolioStats();
    }

    /**
     * @deprecated Use getPortfolioActivities() instead
     */
    @Deprecated
    @Transactional(readOnly = true)
    public List<ActivityDto> getRecentActivities() {
        return getPortfolioActivities();
    }

    // ========== Helper Methods ==========

    /**
     * Get projects accessible to the user based on their role.
     * - ADMIN: sees all projects
     * - PMO_HEAD, AUDITOR: sees all projects
     * - Others: sees only their project memberships
     */
    private List<Project> getAccessibleProjects(String userId) {
        // System admins see all
        if (projectSecurityService.hasSystemRole("ADMIN")) {
            log.debug("User {} has ADMIN role, returning all projects", userId);
            return projectRepository.findAll();
        }

        // PMO_HEAD, AUDITOR see all
        if (projectSecurityService.hasAnySystemRole("PMO_HEAD", "AUDITOR")) {
            log.debug("User {} has PMO_HEAD/AUDITOR role, returning all projects", userId);
            return projectRepository.findAll();
        }

        // Others see only memberships
        log.debug("User {} has regular role, returning only member projects", userId);
        List<ProjectMember> memberships = projectMemberRepository.findByUserIdAndActiveTrue(userId);
        return memberships.stream()
                .map(ProjectMember::getProject)
                .toList();
    }

    private List<String> getAccessibleProjectIds(String userId) {
        return getAccessibleProjects(userId).stream()
                .map(Project::getId)
                .toList();
    }

    private Map<String, Long> calculateStatusDistribution(List<Project> projects) {
        Map<String, Long> statusMap = new HashMap<>();
        for (Project.ProjectStatus status : Project.ProjectStatus.values()) {
            long count = projects.stream()
                    .filter(p -> p.getStatus() == status)
                    .count();
            statusMap.put(status.name(), count);
        }
        return statusMap;
    }

    private ActivityDto createDefaultNoActivityDto() {
        return ActivityDto.builder()
                .user("System")
                .action("No recent activities")
                .time("Now")
                .type("info")
                .projectId(null)
                .projectName(null)
                .build();
    }

    /**
     * Convert OutboxEvent to ActivityDto for dashboard display
     */
    private ActivityDto convertToActivityDto(OutboxEvent event) {
        String user = extractUserFromPayload(event.getPayload());
        String action = formatEventAction(event.getEventType(), event.getAggregateType(), event.getPayload());
        String time = formatRelativeTime(event.getCreatedAt());
        String type = determineActivityType(event.getEventType());
        String projectName = extractProjectNameFromPayload(event.getPayload());

        return ActivityDto.builder()
                .user(user)
                .action(action)
                .time(time)
                .type(type)
                .projectId(event.getProjectId())
                .projectName(projectName)
                .build();
    }

    private ActivityDto convertToActivityDtoWithProject(OutboxEvent event, Project project) {
        String user = extractUserFromPayload(event.getPayload());
        String action = formatEventAction(event.getEventType(), event.getAggregateType(), event.getPayload());
        String time = formatRelativeTime(event.getCreatedAt());
        String type = determineActivityType(event.getEventType());

        return ActivityDto.builder()
                .user(user)
                .action(action)
                .time(time)
                .type(type)
                .projectId(project.getId())
                .projectName(project.getName())
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
     * Extract project name from event payload
     */
    private String extractProjectNameFromPayload(Map<String, Object> payload) {
        if (payload == null) {
            return null;
        }
        if (payload.containsKey("projectName")) {
            return String.valueOf(payload.get("projectName"));
        }
        return null;
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
