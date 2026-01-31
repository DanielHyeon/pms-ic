# Reactive Patterns

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: backend -->

---

## Questions This Document Answers

- How does the reactive architecture work?
- What patterns are used for WebFlux and R2DBC?
- How are transactions handled reactively?

---

## 1. Reactive Stack Overview

```
┌─────────────────┐
│  Spring WebFlux │  Non-blocking web layer
├─────────────────┤
│  Project Reactor│  Mono<T> / Flux<T>
├─────────────────┤
│     R2DBC       │  Reactive database access
├─────────────────┤
│   PostgreSQL    │  Primary database
└─────────────────┘
```

---

## 2. Core Reactive Types

### Mono<T> - 0 or 1 element

```java
// Single result
public Mono<ProjectDto> getProjectById(String id) {
    return projectRepository.findById(id)
            .switchIfEmpty(Mono.error(CustomException.notFound("Project not found")))
            .map(this::toDto);
}
```

### Flux<T> - 0 to N elements

```java
// Multiple results
public Flux<ProjectDto> getAllProjects() {
    return projectRepository.findAllByOrderByCreatedAtDesc()
            .map(this::toDto);
}
```

---

## 3. Repository Pattern

### Repository Interface

```java
public interface ReactiveProjectRepository
        extends ReactiveCrudRepository<R2dbcProject, String> {

    Flux<R2dbcProject> findAllByOrderByCreatedAtDesc();

    Flux<R2dbcProject> findByStatusOrderByCreatedAtDesc(String status);

    Mono<R2dbcProject> findByIsDefaultTrue();

    @Query("UPDATE project.projects SET is_default = false WHERE is_default = true")
    Mono<Void> clearDefaultProject();

    @Modifying
    @Query("UPDATE project.projects SET is_default = true WHERE id = :id")
    Mono<Void> setDefaultProject(String id);
}
```

---

## 4. Service Layer Patterns

### Basic CRUD Operations

```java
@Service
@RequiredArgsConstructor
public class ReactiveProjectService {

    private final ReactiveProjectRepository projectRepository;
    private final TransactionalOperator transactionalOperator;

    public Mono<ProjectDto> createProject(ProjectDto dto) {
        R2dbcProject project = R2dbcProject.builder()
                .id(UUID.randomUUID().toString())
                .name(dto.getName())
                .status("PLANNING")
                .build();

        return projectRepository.save(project)
                .map(this::toDto)
                .as(transactionalOperator::transactional);
    }
}
```

### Chained Operations

```java
public Mono<ProjectDto> updateProject(String id, ProjectDto dto) {
    return projectRepository.findById(id)
            .switchIfEmpty(Mono.error(CustomException.notFound("Not found")))
            .flatMap(project -> {
                project.setName(dto.getName());
                project.setDescription(dto.getDescription());
                return projectRepository.save(project);
            })
            .map(this::toDto)
            .as(transactionalOperator::transactional);
}
```

---

## 5. Transaction Management

### TransactionalOperator

```java
@Configuration
@EnableR2dbcAuditing
@EnableR2dbcRepositories(basePackages = "com.insuretech.pms")
public class R2dbcConfig {

    @Bean
    ReactiveTransactionManager reactiveTransactionManager(ConnectionFactory cf) {
        return new R2dbcTransactionManager(cf);
    }

    @Bean
    TransactionalOperator transactionalOperator(ReactiveTransactionManager tm) {
        return TransactionalOperator.create(tm);
    }
}
```

### Usage in Service

```java
// Wrap operation in transaction
return projectRepository.save(project)
        .map(this::toDto)
        .as(transactionalOperator::transactional);
```

---

## 6. Error Handling

### Custom Exception

```java
public class CustomException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public static CustomException notFound(String message) {
        return new CustomException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static CustomException forbidden(String message) {
        return new CustomException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
```

### Error Handling in Chains

```java
public Mono<ProjectDto> getProjectById(String id) {
    return projectRepository.findById(id)
            .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + id)))
            .map(this::toDto)
            .doOnError(e -> log.error("Error fetching project: {}", id, e));
}
```

---

## 7. Security Integration

### Reactive Security Context

```java
@Service("reactiveProjectSecurity")
public class ReactiveProjectSecurityService {

    public Mono<Boolean> isProjectMember(String projectId) {
        return getCurrentUserId()
                .flatMap(userId ->
                    reactiveProjectMemberRepository
                        .existsByProjectIdAndUserIdAndActiveTrue(projectId, userId)
                )
                .defaultIfEmpty(false);
    }

    private Mono<String> getCurrentUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .map(Authentication::getName)
                .flatMap(username ->
                    reactiveUserRepository.findByEmail(username)
                        .map(R2dbcUser::getId)
                );
    }
}
```

### PreAuthorize with Reactive

```java
@GetMapping("/{projectId}/tasks")
@PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
public Flux<TaskDto> getProjectTasks(@PathVariable String projectId) {
    return taskService.getTasksByProject(projectId);
}
```

---

## 8. Controller Patterns

### WebFlux Controller

```java
@RestController
@RequestMapping("/api/v2/projects")
@RequiredArgsConstructor
public class ReactiveProjectController {

    private final ReactiveProjectService projectService;

    @GetMapping
    public Flux<ProjectDto> getAllProjects() {
        return projectService.getAllProjects();
    }

    @GetMapping("/{id}")
    public Mono<ProjectDto> getProject(@PathVariable String id) {
        return projectService.getProjectById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ProjectDto> createProject(@RequestBody ProjectDto dto) {
        return projectService.createProject(dto);
    }

    @PutMapping("/{id}")
    public Mono<ProjectDto> updateProject(
            @PathVariable String id,
            @RequestBody ProjectDto dto) {
        return projectService.updateProject(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteProject(@PathVariable String id) {
        return projectService.deleteProject(id);
    }
}
```

---

## 9. Common Patterns

### Conditional Operations

```java
// Only proceed if condition is met
public Mono<Void> deleteIfOwner(String id, String userId) {
    return projectRepository.findById(id)
            .filter(project -> project.getOwnerId().equals(userId))
            .switchIfEmpty(Mono.error(CustomException.forbidden("Not owner")))
            .flatMap(projectRepository::delete);
}
```

### Combining Multiple Sources

```java
public Mono<ProjectDetailsDto> getProjectWithDetails(String id) {
    return Mono.zip(
            projectRepository.findById(id),
            phaseRepository.findByProjectId(id).collectList(),
            memberRepository.findByProjectId(id).collectList()
    ).map(tuple -> ProjectDetailsDto.builder()
            .project(tuple.getT1())
            .phases(tuple.getT2())
            .members(tuple.getT3())
            .build());
}
```

---

## 10. Prohibited Patterns

| Pattern | Why Prohibited | Alternative |
|---------|----------------|-------------|
| `.block()` | Blocks reactive thread | Use reactive operators |
| `Thread.sleep()` | Blocks thread | Use `Mono.delay()` |
| Synchronized blocks | Blocking | Use reactive state |
| Direct JDBC | Not reactive | Use R2DBC |
| `@Transactional` | Blocking | Use `TransactionalOperator` |

---

*Last Updated: 2026-01-31*
