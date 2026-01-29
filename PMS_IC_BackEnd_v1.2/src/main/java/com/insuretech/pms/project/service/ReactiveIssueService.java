package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.IssueDto;
import com.insuretech.pms.project.reactive.entity.R2dbcIssue;
import com.insuretech.pms.project.reactive.repository.ReactiveIssueRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveIssueService {

    private final ReactiveIssueRepository issueRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<IssueDto> getIssuesByProject(String projectId) {
        return issueRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .map(IssueDto::from);
    }

    public Mono<IssueDto> getIssueById(String issueId) {
        return issueRepository.findById(issueId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Issue not found: " + issueId)))
                .map(IssueDto::from);
    }

    @Transactional
    public Mono<IssueDto> createIssue(String projectId, IssueDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcIssue issue = R2dbcIssue.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .title(request.getTitle())
                            .description(request.getDescription())
                            .issueType(request.getIssueType())
                            .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                            .status(request.getStatus() != null ? request.getStatus() : "OPEN")
                            .assignee(request.getAssignee())
                            .reporter(request.getReporter())
                            .reviewer(request.getReviewer())
                            .dueDate(request.getDueDate())
                            .build();
                    return issueRepository.save(issue);
                })
                .map(IssueDto::from)
                .doOnSuccess(dto -> log.info("Created issue: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<IssueDto> updateIssue(String issueId, IssueDto request) {
        return issueRepository.findById(issueId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Issue not found: " + issueId)))
                .flatMap(issue -> {
                    if (request.getTitle() != null) issue.setTitle(request.getTitle());
                    if (request.getDescription() != null) issue.setDescription(request.getDescription());
                    if (request.getIssueType() != null) issue.setIssueType(request.getIssueType());
                    if (request.getPriority() != null) issue.setPriority(request.getPriority());
                    if (request.getStatus() != null) issue.setStatus(request.getStatus());
                    if (request.getAssignee() != null) issue.setAssignee(request.getAssignee());
                    if (request.getReviewer() != null) issue.setReviewer(request.getReviewer());
                    if (request.getDueDate() != null) issue.setDueDate(request.getDueDate());
                    if (request.getResolution() != null) issue.setResolution(request.getResolution());
                    if (request.getComments() != null) issue.setComments(request.getComments());
                    return issueRepository.save(issue);
                })
                .map(IssueDto::from)
                .doOnSuccess(dto -> log.info("Updated issue: {}", issueId));
    }

    @Transactional
    public Mono<IssueDto> updateIssueStatus(String issueId, String status) {
        return issueRepository.findById(issueId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Issue not found: " + issueId)))
                .flatMap(issue -> {
                    issue.setStatus(status);
                    if ("RESOLVED".equals(status) || "CLOSED".equals(status)) {
                        issue.setResolvedAt(LocalDateTime.now());
                    }
                    return issueRepository.save(issue);
                })
                .map(IssueDto::from)
                .doOnSuccess(dto -> log.info("Updated issue {} status to {}", issueId, status));
    }

    @Transactional
    public Mono<Void> deleteIssue(String issueId) {
        return issueRepository.findById(issueId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Issue not found: " + issueId)))
                .flatMap(issue -> issueRepository.deleteById(issueId))
                .doOnSuccess(v -> log.info("Deleted issue: {}", issueId));
    }
}
