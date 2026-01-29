package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.ProjectDto;
import com.insuretech.pms.project.reactive.entity.R2dbcProject;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveProjectService {

    private final ReactiveProjectRepository projectRepository;
    private final TransactionalOperator transactionalOperator;

    public Flux<ProjectDto> getAllProjects() {
        return projectRepository.findAllByOrderByCreatedAtDesc()
                .map(this::toDto);
    }

    public Flux<ProjectDto> getProjectsByStatus(String status) {
        return projectRepository.findByStatusOrderByCreatedAtDesc(status)
                .map(this::toDto);
    }

    public Mono<ProjectDto> getProjectById(String id) {
        return projectRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + id)))
                .map(this::toDto);
    }

    public Mono<ProjectDto> createProject(ProjectDto dto) {
        R2dbcProject project = R2dbcProject.builder()
                .id(UUID.randomUUID().toString())
                .name(dto.getName())
                .description(dto.getDescription())
                .status(dto.getStatus() != null ? dto.getStatus() : "PLANNING")
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .budget(dto.getBudget())
                .progress(0)
                .isDefault(false)
                .build();

        return projectRepository.save(project)
                .map(this::toDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(p -> log.info("Created project: {}", p.getName()));
    }

    public Mono<ProjectDto> updateProject(String id, ProjectDto dto) {
        return projectRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + id)))
                .flatMap(project -> {
                    project.setName(dto.getName());
                    project.setDescription(dto.getDescription());
                    if (dto.getStatus() != null) {
                        project.setStatus(dto.getStatus());
                    }
                    project.setStartDate(dto.getStartDate());
                    project.setEndDate(dto.getEndDate());
                    project.setBudget(dto.getBudget());
                    return projectRepository.save(project);
                })
                .map(this::toDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(p -> log.info("Updated project: {}", p.getName()));
    }

    public Mono<Void> deleteProject(String id) {
        return projectRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + id)))
                .flatMap(project -> projectRepository.delete(project))
                .doOnSuccess(v -> log.info("Deleted project: {}", id));
    }

    public Mono<ProjectDto> setDefaultProject(String id) {
        return projectRepository.clearDefaultProject()
                .then(projectRepository.setDefaultProject(id))
                .then(projectRepository.findById(id))
                .map(this::toDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(p -> log.info("Set default project: {}", id));
    }

    public Mono<ProjectDto> getDefaultProject() {
        return projectRepository.findByIsDefaultTrue()
                .map(this::toDto);
    }

    public Mono<Void> updateProgress(String id, Integer progress) {
        return projectRepository.updateProgress(id, progress);
    }

    private ProjectDto toDto(R2dbcProject project) {
        return ProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .budget(project.getBudget())
                .aiWeight(project.getAiWeight())
                .siWeight(project.getSiWeight())
                .progress(project.getProgress())
                .isDefault(project.getIsDefault())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
