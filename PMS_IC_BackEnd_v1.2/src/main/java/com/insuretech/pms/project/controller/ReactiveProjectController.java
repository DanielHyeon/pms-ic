package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.ProjectDto;
import com.insuretech.pms.project.service.ReactiveProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v2/projects")
@RequiredArgsConstructor
public class ReactiveProjectController {

    private final ReactiveProjectService projectService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<ProjectDto>>>> getAllProjects(
            @RequestParam(required = false) String status) {
        if (status != null) {
            return projectService.getProjectsByStatus(status)
                    .collectList()
                    .map(projects -> ResponseEntity.ok(ApiResponse.success(projects)));
        }
        return projectService.getAllProjects()
                .collectList()
                .map(projects -> ResponseEntity.ok(ApiResponse.success(projects)));
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<ProjectDto>>> getProjectById(@PathVariable String id) {
        return projectService.getProjectById(id)
                .map(project -> ResponseEntity.ok(ApiResponse.success(project)));
    }

    @GetMapping("/default")
    public Mono<ResponseEntity<ApiResponse<ProjectDto>>> getDefaultProject() {
        return projectService.getDefaultProject()
                .map(project -> ResponseEntity.ok(ApiResponse.success(project)))
                .defaultIfEmpty(ResponseEntity.ok(ApiResponse.success(null)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<ProjectDto>>> createProject(
            @Valid @RequestBody ProjectDto dto) {
        return projectService.createProject(dto)
                .map(project -> ResponseEntity.ok(ApiResponse.success("Project created", project)));
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<ProjectDto>>> updateProject(
            @PathVariable String id,
            @Valid @RequestBody ProjectDto dto) {
        return projectService.updateProject(id, dto)
                .map(project -> ResponseEntity.ok(ApiResponse.success("Project updated", project)));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteProject(@PathVariable String id) {
        return projectService.deleteProject(id)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Project deleted", null))));
    }

    @PostMapping("/{id}/set-default")
    public Mono<ResponseEntity<ApiResponse<ProjectDto>>> setDefaultProject(@PathVariable String id) {
        return projectService.setDefaultProject(id)
                .map(project -> ResponseEntity.ok(ApiResponse.success("Default project set", project)));
    }
}
