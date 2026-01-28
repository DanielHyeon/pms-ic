package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.*;
import com.insuretech.pms.project.entity.Feature;
import com.insuretech.pms.project.entity.Issue.IssuePriority;
import com.insuretech.pms.project.entity.Issue.IssueStatus;
import com.insuretech.pms.project.entity.Part;
import com.insuretech.pms.project.entity.Project;
import com.insuretech.pms.project.repository.FeatureRepository;
import com.insuretech.pms.project.repository.IssueRepository;
import com.insuretech.pms.project.repository.PartRepository;
import com.insuretech.pms.project.repository.ProjectRepository;
import com.insuretech.pms.task.repository.UserStoryRepository;
import com.insuretech.pms.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PartService {

    private final PartRepository partRepository;
    private final ProjectRepository projectRepository;
    private final FeatureRepository featureRepository;
    private final IssueRepository issueRepository;
    private final UserStoryRepository userStoryRepository;
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<PartDto> getPartsByProject(String projectId) {
        validateProjectExists(projectId);
        return partRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(PartDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PartDto getPartById(String partId) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));
        return PartDto.from(part);
    }

    @Transactional
    public PartDto createPart(String projectId, CreatePartRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> CustomException.notFound("Project not found: " + projectId));

        Part part = Part.builder()
                .id("part-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName())
                .description(request.getDescription())
                .project(project)
                .leaderId(request.getLeaderId())
                .leaderName(request.getLeaderName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(Part.PartStatus.ACTIVE)
                .progress(0)
                .build();

        Part saved = partRepository.save(part);
        log.info("Part created: {} for project: {}", saved.getId(), projectId);
        return PartDto.from(saved);
    }

    @Transactional
    public PartDto updatePart(String partId, UpdatePartRequest request) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));

        if (request.getName() != null) {
            part.setName(request.getName());
        }
        if (request.getDescription() != null) {
            part.setDescription(request.getDescription());
        }
        if (request.getLeaderId() != null) {
            part.setLeaderId(request.getLeaderId());
        }
        if (request.getLeaderName() != null) {
            part.setLeaderName(request.getLeaderName());
        }
        if (request.getStatus() != null) {
            part.setStatus(Part.PartStatus.valueOf(request.getStatus()));
        }
        if (request.getStartDate() != null) {
            part.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            part.setEndDate(request.getEndDate());
        }
        if (request.getProgress() != null) {
            part.setProgress(request.getProgress());
        }

        Part updated = partRepository.save(part);
        log.info("Part updated: {}", updated.getId());
        return PartDto.from(updated);
    }

    @Transactional
    public void deletePart(String partId) {
        if (!partRepository.existsById(partId)) {
            throw CustomException.notFound("Part not found: " + partId);
        }
        partRepository.deleteById(partId);
        log.info("Part deleted: {}", partId);
    }

    @Transactional
    public PartDto assignLeader(String partId, AssignLeaderRequest request) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));

        part.setLeaderId(request.getUserId());
        part.setLeaderName(request.getUserName());

        Part updated = partRepository.save(part);
        log.info("Leader assigned to part {}: {}", partId, request.getUserId());
        return PartDto.from(updated);
    }

    @Transactional(readOnly = true)
    public Set<String> getPartMembers(String partId) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));
        return part.getMemberIds();
    }

    @Transactional
    public PartDto addMember(String partId, PartMemberRequest request) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));

        part.getMemberIds().add(request.getUserId());

        Part updated = partRepository.save(part);
        log.info("Member added to part {}: {}", partId, request.getUserId());
        return PartDto.from(updated);
    }

    @Transactional
    public PartDto removeMember(String partId, String memberId) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));

        part.getMemberIds().remove(memberId);

        Part updated = partRepository.save(part);
        log.info("Member removed from part {}: {}", partId, memberId);
        return PartDto.from(updated);
    }

    private void validateProjectExists(String projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw CustomException.notFound("Project not found: " + projectId);
        }
    }

    // ============================================
    // Part Dashboard & Metrics Methods (PL Cockpit)
    // ============================================

    @Transactional(readOnly = true)
    public PartDashboardDto getPartDashboard(String projectId, String partId) {
        Part part = partRepository.findByIdAndProjectId(partId, projectId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));

        // Feature counts
        long totalFeatures = featureRepository.countByPartId(partId);
        long completedFeatures = featureRepository.countByPartIdAndStatus(partId, Feature.FeatureStatus.DONE);
        long inProgressFeatures = featureRepository.countByPartIdAndStatus(partId, Feature.FeatureStatus.IN_PROGRESS);

        // Story counts and points (using part_id column)
        int totalStories = userStoryRepository.countByPartId(partId);
        int completedStories = userStoryRepository.countByPartIdAndStatus(partId, "DONE");
        int inProgressStories = userStoryRepository.countByPartIdAndStatus(partId, "IN_PROGRESS");
        int readyStories = userStoryRepository.countByPartIdAndStatus(partId, "READY");

        Integer totalStoryPoints = userStoryRepository.sumStoryPointsByPartId(partId);
        Integer completedStoryPoints = userStoryRepository.sumStoryPointsByPartIdAndStatus(partId, "DONE");
        Integer inProgressStoryPoints = userStoryRepository.sumStoryPointsByPartIdAndStatus(partId, "IN_PROGRESS");

        // Task counts
        int totalTasks = taskRepository.countByPartId(partId);
        int completedTasks = taskRepository.countByPartIdAndStatus(partId, "DONE");
        int inProgressTasks = taskRepository.countByPartIdAndStatus(partId, "IN_PROGRESS");
        int blockedTasks = taskRepository.countByPartIdAndStatus(partId, "BLOCKED");
        int overdueTasks = taskRepository.countOverdueByPartId(partId, LocalDate.now());

        // Issue counts (project-level as issues don't have part association)
        List<IssueStatus> openStatuses = List.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS, IssueStatus.REOPENED);
        List<IssuePriority> highPriorities = List.of(IssuePriority.CRITICAL, IssuePriority.HIGH);
        int openIssues = issueRepository.countByProjectIdAndStatusIn(projectId, openStatuses);
        int highPriorityIssues = issueRepository.countByProjectIdAndStatusInAndPriorityIn(projectId, openStatuses, highPriorities);

        // Calculate completion rate
        double completionRate = 0.0;
        if (totalStoryPoints != null && totalStoryPoints > 0 && completedStoryPoints != null) {
            completionRate = (completedStoryPoints * 100.0) / totalStoryPoints;
        }

        return PartDashboardDto.builder()
                .partId(part.getId())
                .partName(part.getName())
                .projectId(projectId)
                .plUserId(part.getLeaderId())
                .plName(part.getLeaderName())
                .totalStoryPoints(totalStoryPoints != null ? totalStoryPoints : 0)
                .completedStoryPoints(completedStoryPoints != null ? completedStoryPoints : 0)
                .inProgressStoryPoints(inProgressStoryPoints != null ? inProgressStoryPoints : 0)
                .completionRate(completionRate)
                .totalStories(totalStories)
                .completedStories(completedStories)
                .inProgressStories(inProgressStories)
                .readyStories(readyStories)
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .inProgressTasks(inProgressTasks)
                .blockedTasks(blockedTasks)
                .overdueTasks(overdueTasks)
                .totalFeatures((int) totalFeatures)
                .completedFeatures((int) completedFeatures)
                .inProgressFeatures((int) inProgressFeatures)
                .openIssues(openIssues)
                .highPriorityIssues(highPriorityIssues)
                .recentCompletedItems(new ArrayList<>())
                .currentBlockers(new ArrayList<>())
                .upcomingDeadlines(new ArrayList<>())
                .build();
    }

    @Transactional(readOnly = true)
    public PartMetricsDto getPartMetrics(String projectId, String partId) {
        Part part = partRepository.findByIdAndProjectId(partId, projectId)
                .orElseThrow(() -> CustomException.notFound("Part not found: " + partId));

        Integer totalStoryPoints = userStoryRepository.sumStoryPointsByPartId(partId);
        Integer completedStoryPoints = userStoryRepository.sumStoryPointsByPartIdAndStatus(partId, "DONE");
        Integer inProgressStoryPoints = userStoryRepository.sumStoryPointsByPartIdAndStatus(partId, "IN_PROGRESS");

        int totalStories = userStoryRepository.countByPartId(partId);
        int completedStories = userStoryRepository.countByPartIdAndStatus(partId, "DONE");

        int totalTasks = taskRepository.countByPartId(partId);
        int completedTasks = taskRepository.countByPartIdAndStatus(partId, "DONE");
        int blockedTasks = taskRepository.countByPartIdAndStatus(partId, "BLOCKED");

        double storyPointCompletionRate = 0.0;
        if (totalStoryPoints != null && totalStoryPoints > 0 && completedStoryPoints != null) {
            storyPointCompletionRate = (completedStoryPoints * 100.0) / totalStoryPoints;
        }

        double storyCountCompletionRate = 0.0;
        if (totalStories > 0) {
            storyCountCompletionRate = (completedStories * 100.0) / totalStories;
        }

        double taskCompletionRate = 0.0;
        if (totalTasks > 0) {
            taskCompletionRate = (completedTasks * 100.0) / totalTasks;
        }

        return PartMetricsDto.builder()
                .partId(part.getId())
                .partName(part.getName())
                .totalStoryPoints(totalStoryPoints != null ? totalStoryPoints : 0)
                .completedStoryPoints(completedStoryPoints != null ? completedStoryPoints : 0)
                .inProgressStoryPoints(inProgressStoryPoints != null ? inProgressStoryPoints : 0)
                .plannedStoryPoints(0)
                .storyPointCompletionRate(storyPointCompletionRate)
                .storyCountCompletionRate(storyCountCompletionRate)
                .taskCompletionRate(taskCompletionRate)
                .averageVelocity(0.0)
                .lastSprintVelocity(0)
                .wipCount(inProgressStoryPoints != null ? inProgressStoryPoints : 0)
                .wipLimit(0)
                .blockedItems(blockedTasks)
                .overdueItems(0)
                .atRiskItems(0)
                .averageCycleTime(0.0)
                .averageLeadTime(0.0)
                .periodStart(LocalDate.now().minusDays(30))
                .periodEnd(LocalDate.now())
                .build();
    }

    @Transactional(readOnly = true)
    public List<FeatureDto> getFeaturesByPart(String projectId, String partId) {
        validateProjectExists(projectId);
        if (!partRepository.existsByIdAndProjectId(partId, projectId)) {
            throw CustomException.notFound("Part not found: " + partId);
        }

        return featureRepository.findByPartIdAndProjectId(partId, projectId).stream()
                .map(FeatureDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Object> getStoriesByPart(String projectId, String partId) {
        validateProjectExists(projectId);
        if (!partRepository.existsByIdAndProjectId(partId, projectId)) {
            throw CustomException.notFound("Part not found: " + partId);
        }

        return userStoryRepository.findByPartId(partId).stream()
                .map(story -> (Object) story)
                .collect(Collectors.toList());
    }
}
