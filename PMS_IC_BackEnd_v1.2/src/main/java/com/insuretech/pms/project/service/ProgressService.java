package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.ProgressDto;
import com.insuretech.pms.project.entity.Phase;
import com.insuretech.pms.project.entity.Project;
import com.insuretech.pms.project.repository.PhaseRepository;
import com.insuretech.pms.project.repository.ProjectRepository;
import com.insuretech.pms.rfp.entity.Requirement;
import com.insuretech.pms.rfp.repository.RequirementRepository;
import com.insuretech.pms.task.entity.Task;
import com.insuretech.pms.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final ProjectRepository projectRepository;
    private final PhaseRepository phaseRepository;
    private final TaskRepository taskRepository;
    private final RequirementRepository requirementRepository;

    @Transactional(readOnly = true)
    public List<ProgressDto> getProjectProgress(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> CustomException.notFound("Project not found: " + projectId));

        List<ProgressDto> progressList = new ArrayList<>();

        // Add project overall progress
        progressList.add(ProgressDto.builder()
                .id(project.getId())
                .name(project.getName())
                .progressPercentage(project.getProgress())
                .progressStage(project.getStatus().name())
                .type("PROJECT")
                .build());

        // Add phase progress
        List<Phase> phases = phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId);
        for (Phase phase : phases) {
            progressList.add(ProgressDto.builder()
                    .id(phase.getId())
                    .name(phase.getName())
                    .progressPercentage(phase.getProgress())
                    .progressStage(phase.getStatus() != null ? phase.getStatus().name() : "NOT_STARTED")
                    .type("PHASE")
                    .build());
        }

        return progressList;
    }

    @Transactional(readOnly = true)
    public ProgressDto getRequirementProgress(String requirementId) {
        Requirement requirement = requirementRepository.findById(requirementId)
                .orElseThrow(() -> CustomException.notFound("Requirement not found: " + requirementId));

        // Count linked tasks
        List<Task> linkedTasks = taskRepository.findByRequirementId(requirementId);
        int totalTasks = linkedTasks.size();
        int completedTasks = (int) linkedTasks.stream()
                .filter(t -> t.getStatus() == Task.TaskStatus.DONE)
                .count();

        int progressPercentage = totalTasks > 0 ? (completedTasks * 100) / totalTasks : 0;
        String stage = determineProgressStage(progressPercentage, totalTasks);

        return ProgressDto.builder()
                .id(requirement.getId())
                .name(requirement.getTitle())
                .progressPercentage(progressPercentage)
                .progressStage(stage)
                .type("REQUIREMENT")
                .completedTasks(completedTasks)
                .totalTasks(totalTasks)
                .build();
    }

    private String determineProgressStage(int progressPercentage, int totalTasks) {
        if (totalTasks == 0) return "NOT_STARTED";
        if (progressPercentage == 0) return "NOT_STARTED";
        if (progressPercentage == 100) return "COMPLETED";
        if (progressPercentage >= 50) return "IN_PROGRESS";
        return "STARTED";
    }
}
