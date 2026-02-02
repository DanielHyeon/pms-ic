# 리액티브 패턴

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: backend -->

---

## 이 문서가 답하는 질문

- 리액티브 아키텍처는 어떻게 동작하는가?
- WebFlux와 R2DBC에 어떤 패턴이 사용되는가?
- 트랜잭션은 리액티브하게 어떻게 처리되는가?

---

## 1. 리액티브 스택 개요

```
┌─────────────────┐
│  Spring WebFlux │  논블로킹 웹 계층
├─────────────────┤
│  Project Reactor│  Mono<T> / Flux<T>
├─────────────────┤
│     R2DBC       │  리액티브 데이터베이스 접근
├─────────────────┤
│   PostgreSQL    │  주 데이터베이스
└─────────────────┘
```

---

## 2. 핵심 리액티브 타입

### Mono<T> - 0개 또는 1개 요소

```java
// 단일 결과
public Mono<ProjectDto> getProjectById(String id) {
    return projectRepository.findById(id)
            .switchIfEmpty(Mono.error(CustomException.notFound("Project not found")))
            .map(this::toDto);
}
```

### Flux<T> - 0개에서 N개 요소

```java
// 다중 결과
public Flux<ProjectDto> getAllProjects() {
    return projectRepository.findAllByOrderByCreatedAtDesc()
            .map(this::toDto);
}
```

---

## 3. 리포지토리 패턴

### 리포지토리 인터페이스

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

## 4. 서비스 계층 패턴

### 기본 CRUD 작업

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

### 체이닝 작업

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

## 5. 트랜잭션 관리

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

### 서비스에서 사용

```java
// 트랜잭션으로 작업 래핑
return projectRepository.save(project)
        .map(this::toDto)
        .as(transactionalOperator::transactional);
```

---

## 6. 에러 처리

### 커스텀 예외

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

### 체인에서의 에러 처리

```java
public Mono<ProjectDto> getProjectById(String id) {
    return projectRepository.findById(id)
            .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + id)))
            .map(this::toDto)
            .doOnError(e -> log.error("Error fetching project: {}", id, e));
}
```

---

## 7. 보안 통합

### 리액티브 보안 컨텍스트

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

### 리액티브와 PreAuthorize

```java
@GetMapping("/{projectId}/tasks")
@PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
public Flux<TaskDto> getProjectTasks(@PathVariable String projectId) {
    return taskService.getTasksByProject(projectId);
}
```

---

## 8. 컨트롤러 패턴

### WebFlux 컨트롤러

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

## 9. 공통 패턴

### 조건부 작업

```java
// 조건이 충족될 때만 진행
public Mono<Void> deleteIfOwner(String id, String userId) {
    return projectRepository.findById(id)
            .filter(project -> project.getOwnerId().equals(userId))
            .switchIfEmpty(Mono.error(CustomException.forbidden("Not owner")))
            .flatMap(projectRepository::delete);
}
```

### 다중 소스 결합

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

## 10. 금지 패턴

| 패턴 | 금지 이유 | 대안 |
|------|-----------|------|
| `.block()` | 리액티브 스레드 블로킹 | 리액티브 연산자 사용 |
| `Thread.sleep()` | 스레드 블로킹 | `Mono.delay()` 사용 |
| synchronized 블록 | 블로킹 | 리액티브 상태 사용 |
| 직접 JDBC | 리액티브 아님 | R2DBC 사용 |
| `@Transactional` | 블로킹 | `TransactionalOperator` 사용 |

---

## 11. 왜 리액티브인가?

### 결정 사항 (Decisions)

| 측면 | 결정 |
|------|------|
| 높은 동시성 | 논블로킹 I/O가 더 많은 동시 요청 처리 |
| 외부 서비스 호출 | LLM 서비스 호출이 리액티브 백프레셔 활용 |
| 리소스 효율성 | I/O 중 스레드 풀 블로킹 없음 |

### 사실 (Facts)

- Spring Boot 3.2 + WebFlux 사용
- R2DBC로 PostgreSQL에 리액티브 접근
- Project Reactor (Mono/Flux) 기반
- TransactionalOperator로 트랜잭션 관리

---

*최종 수정일: 2026-02-02*
