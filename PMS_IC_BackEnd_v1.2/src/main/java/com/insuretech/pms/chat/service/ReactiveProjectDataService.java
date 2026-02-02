package com.insuretech.pms.chat.service;

import com.insuretech.pms.project.dto.ProjectDto;
import com.insuretech.pms.project.service.ReactiveProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reactive service for project data queries.
 * Provides project data for LLM to answer project-related questions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveProjectDataService {

    private final ReactiveProjectService reactiveProjectService;

    /**
     * Check if the message is project-related.
     */
    public boolean isProjectRelatedQuery(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String lowerMessage = message.toLowerCase();

        String[] projectKeywords = {
            "프로젝트", "project", "프로젝트 현황", "프로젝트 상태", "프로젝트 진행",
            "프로젝트 목록", "프로젝트 정보", "프로젝트 일정",
            "진행률", "progress", "상태", "status", "예산", "budget",
            "시작일", "종료일", "start", "end", "단계", "phase"
        };

        for (String keyword : projectKeywords) {
            if (lowerMessage.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all projects summary as text.
     */
    public Mono<String> getAllProjectsSummary() {
        return reactiveProjectService.getAllProjects()
                .map(this::formatProjectInfo)
                .collectList()
                .map(projectInfos -> {
                    if (projectInfos.isEmpty()) {
                        return "현재 등록된 프로젝트가 없습니다.";
                    }
                    StringBuilder summary = new StringBuilder();
                    summary.append("=== 프로젝트 목록 ===\n\n");
                    projectInfos.forEach(info -> {
                        summary.append(info);
                        summary.append("\n");
                    });
                    return summary.toString();
                })
                .onErrorResume(e -> {
                    log.error("Failed to retrieve projects: {}", e.getMessage(), e);
                    return Mono.just("프로젝트 정보를 가져오는 중 오류가 발생했습니다.");
                });
    }

    /**
     * Get specific project summary as text.
     */
    public Mono<String> getProjectSummary(String projectId) {
        return reactiveProjectService.getProjectById(projectId)
                .map(this::formatProjectInfo)
                .onErrorResume(e -> {
                    log.error("Failed to retrieve project {}: {}", projectId, e.getMessage(), e);
                    return Mono.just(String.format("프로젝트 '%s' 정보를 가져오는 중 오류가 발생했습니다.", projectId));
                });
    }

    /**
     * Format project information as text.
     */
    private String formatProjectInfo(ProjectDto project) {
        StringBuilder info = new StringBuilder();

        info.append(String.format("프로젝트 ID: %s\n", project.getId()));
        info.append(String.format("프로젝트명: %s\n", project.getName()));

        if (project.getDescription() != null && !project.getDescription().isBlank()) {
            info.append(String.format("설명: %s\n", project.getDescription()));
        }

        info.append(String.format("상태: %s\n", project.getStatus()));
        info.append(String.format("진행률: %d%%\n", project.getProgress() != null ? project.getProgress() : 0));

        if (project.getStartDate() != null) {
            info.append(String.format("시작일: %s\n", project.getStartDate()));
        }

        if (project.getEndDate() != null) {
            info.append(String.format("종료일: %s\n", project.getEndDate()));
        }

        if (project.getBudget() != null) {
            info.append(String.format("예산: %s\n", project.getBudget()));
        }

        return info.toString();
    }

    /**
     * Extract project ID from message.
     */
    public String extractProjectId(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String[] patterns = {
            "프로젝트\\s+([A-Za-z0-9-_]+)",
            "([A-Za-z0-9-_]+)\\s+프로젝트",
            "프로젝트\\s+ID[\\s:]+([A-Za-z0-9-_]+)",
            "ID[\\s:]+([A-Za-z0-9-_]+)"
        };

        for (String pattern : patterns) {
            Pattern p = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);
            Matcher m = p.matcher(message);
            if (m.find()) {
                return m.group(1);
            }
        }

        return null;
    }
}
