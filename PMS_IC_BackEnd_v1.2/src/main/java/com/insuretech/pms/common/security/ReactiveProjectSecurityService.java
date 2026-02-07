package com.insuretech.pms.common.security;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import com.insuretech.pms.task.reactive.repository.ReactiveUserStoryRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.access.AccessDeniedException;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reactive service for project-scoped authorization checks.
 * Uses R2DBC for both user lookup and project member checks.
 */
@Slf4j
@Service("reactiveProjectSecurity")
@RequiredArgsConstructor
public class ReactiveProjectSecurityService {

    private final ReactiveProjectMemberRepository reactiveProjectMemberRepository;
    private final ReactiveUserRepository reactiveUserRepository;
    private final DatabaseClient databaseClient;
    private final ReactiveUserStoryRepository reactiveUserStoryRepository;

    /**
     * Check if current user has the specified role on the project.
     */
    public Mono<Boolean> hasRole(String projectId, String requiredRole) {
        return hasAnyRole(projectId, requiredRole);
    }

    /**
     * Check if current user has any of the specified roles on the project.
     */
    public Mono<Boolean> hasAnyRole(String projectId, String... requiredRoles) {
        if (projectId == null || requiredRoles == null || requiredRoles.length == 0) {
            return Mono.just(false);
        }

        return getCurrentUserId()
                .flatMap(userId -> {
                    // System admins have access to all projects
                    return hasSystemRole("ADMIN")
                            .flatMap(isAdmin -> {
                                if (isAdmin) {
                                    log.debug("hasAnyRole: User {} is ADMIN, granting access", userId);
                                    return Mono.just(true);
                                }

                                return reactiveProjectMemberRepository
                                        .findByProjectIdAndUserIdAndActiveTrue(projectId, userId)
                                        .map(member -> {
                                            String userRole = member.getRole();
                                            return Arrays.asList(requiredRoles).contains(userRole);
                                        })
                                        .defaultIfEmpty(false);
                            });
                })
                .defaultIfEmpty(false);
    }

    /**
     * Check if current user is a member of the project (any role).
     */
    public Mono<Boolean> isProjectMember(String projectId) {
        if (projectId == null) {
            return Mono.just(false);
        }

        return getCurrentUserId()
                .flatMap(userId ->
                        hasAnySystemRole("ADMIN", "AUDITOR")
                                .flatMap(hasSystemAccess -> {
                                    if (hasSystemAccess) {
                                        return Mono.just(true);
                                    }
                                    return reactiveProjectMemberRepository
                                            .existsByProjectIdAndUserIdAndActiveTrue(projectId, userId);
                                })
                )
                .defaultIfEmpty(false);
    }

    /**
     * Check if current user has a system-wide role (ADMIN, AUDITOR).
     */
    public Mono<Boolean> hasSystemRole(String role) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_" + role)))
                .defaultIfEmpty(false);
    }

    /**
     * Check if current user has any of the specified system-wide roles.
     */
    public Mono<Boolean> hasAnySystemRole(String... roles) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> {
                            for (String role : roles) {
                                if (a.getAuthority().equals("ROLE_" + role)) {
                                    return true;
                                }
                            }
                            return false;
                        }))
                .defaultIfEmpty(false);
    }

    /**
     * Get the project role of current user for the specified project.
     */
    public Mono<Optional<String>> getProjectRole(String projectId) {
        return getCurrentUserId()
                .flatMap(userId -> reactiveProjectMemberRepository
                        .findByProjectIdAndUserIdAndActiveTrue(projectId, userId)
                        .map(member -> Optional.of(member.getRole()))
                        .defaultIfEmpty(Optional.empty()))
                .defaultIfEmpty(Optional.empty());
    }

    /**
     * Check if current user can manage project members.
     */
    public Mono<Boolean> canManageMembers(String projectId) {
        return hasAnyRole(projectId, "PM", "PMO_HEAD");
    }

    /**
     * Check if current user can modify project settings.
     */
    public Mono<Boolean> canModifyProject(String projectId) {
        return hasAnyRole(projectId, "PM", "PMO_HEAD", "SPONSOR");
    }

    /**
     * Check if current user can work on tasks.
     */
    public Mono<Boolean> canWorkOnTasks(String projectId) {
        return hasAnyRole(projectId, "PM", "PMO_HEAD", "DEVELOPER", "QA", "BUSINESS_ANALYST");
    }

    /**
     * Check if current user can approve deliverables.
     */
    public Mono<Boolean> canApproveDeliverables(String projectId) {
        return hasAnyRole(projectId, "PM", "PMO_HEAD", "SPONSOR");
    }

    /**
     * Get the current authenticated user's ID.
     */
    private Mono<String> getCurrentUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .map(Authentication::getName)
                .flatMap(username -> reactiveUserRepository.findByEmail(username)
                        .map(R2dbcUser::getId));
    }

    /**
     * Get the current authenticated user's ID (throws if not authenticated).
     */
    public Mono<String> getAuthenticatedUserId() {
        return getCurrentUserId()
                .switchIfEmpty(Mono.error(new IllegalStateException("No authenticated user found")));
    }

    // ==================== Phase 3: Capability + Scope ====================

    /**
     * Check if current user has a specific capability on the project.
     * Resolves: project_members.role → Capability.getDefaultCapabilities(role)
     */
    public Mono<Boolean> hasCapability(String projectId, String capability) {
        return hasAnyCapability(projectId, capability);
    }

    /**
     * Check if current user has any of the specified capabilities on the project.
     */
    public Mono<Boolean> hasAnyCapability(String projectId, String... capabilities) {
        if (projectId == null || capabilities == null || capabilities.length == 0) {
            return Mono.just(false);
        }
        Set<String> requiredCaps = Set.of(capabilities);
        return getCurrentUserId()
                .flatMap(userId -> hasSystemRole("ADMIN")
                        .flatMap(isAdmin -> {
                            if (isAdmin) return Mono.just(true);
                            return getProjectRole(projectId)
                                    .map(roleOpt -> {
                                        if (roleOpt.isEmpty()) return false;
                                        Set<String> userCaps = Capability.getDefaultCapabilities(roleOpt.get());
                                        return userCaps.stream().anyMatch(requiredCaps::contains);
                                    });
                        }))
                .defaultIfEmpty(false);
    }

    /**
     * Get the set of part IDs the current user is allowed to access.
     * PO/PMO/SPONSOR/ADMIN: all parts. PM/DEV/QA/BA/MEMBER: assigned parts only.
     */
    public Mono<Set<String>> getAllowedPartIds(String projectId) {
        return getCurrentUserId()
                .flatMap(userId -> hasSystemRole("ADMIN")
                        .flatMap(isAdmin -> {
                            if (isAdmin) {
                                return queryAllPartIds(projectId);
                            }
                            return getProjectRole(projectId)
                                    .flatMap(roleOpt -> {
                                        if (roleOpt.isPresent()) {
                                            String role = roleOpt.get();
                                            if ("SPONSOR".equals(role) || "PO".equals(role) || "PMO_HEAD".equals(role)) {
                                                return queryAllPartIds(projectId);
                                            }
                                        }
                                        return queryUserPartIds(userId, projectId);
                                    });
                        }))
                .defaultIfEmpty(new HashSet<>());
    }

    /**
     * Assert that the given part is within the current user's scope.
     */
    public Mono<Void> assertPartScope(String projectId, String partId) {
        if (partId == null) return Mono.empty();
        return getAllowedPartIds(projectId)
                .flatMap(allowedParts -> {
                    if (!allowedParts.contains(partId)) {
                        return Mono.<Void>error(new AccessDeniedException(
                                "Part " + partId + " is outside your scope"));
                    }
                    return Mono.<Void>empty();
                });
    }

    /**
     * Assert that the given story is within the current user's part scope.
     * Resolves: storyId → story.part_id → allowedPartIds check.
     */
    public Mono<Void> assertStoryScope(String projectId, String storyId) {
        return reactiveUserStoryRepository.findById(storyId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Story not found: " + storyId)))
                .flatMap(story -> {
                    if (story.getPartId() == null) return Mono.empty();
                    return assertPartScope(projectId, story.getPartId());
                });
    }

    /**
     * Assert that the given task is within the current user's part scope.
     * Resolves: taskId → parent story's part_id → allowedPartIds check.
     */
    public Mono<Void> assertTaskScope(String projectId, String taskId) {
        return databaseClient
                .sql("SELECT us.part_id FROM task.wbs_tasks wt " +
                     "JOIN task.user_stories us ON us.id = wt.user_story_id " +
                     "WHERE wt.id = :taskId")
                .bind("taskId", taskId)
                .map((row, meta) -> row.get("part_id", String.class))
                .one()
                .flatMap(partId -> {
                    if (partId == null) return Mono.<Void>empty();
                    return assertPartScope(projectId, partId);
                })
                .onErrorResume(e -> {
                    log.warn("Could not resolve task scope for taskId={}: {}", taskId, e.getMessage());
                    return Mono.empty();
                });
    }

    private Mono<Set<String>> queryAllPartIds(String projectId) {
        return databaseClient
                .sql("SELECT id FROM project.parts WHERE project_id = :projectId")
                .bind("projectId", projectId)
                .map((row, meta) -> row.get("id", String.class))
                .all()
                .collect(Collectors.toSet());
    }

    private Mono<Set<String>> queryUserPartIds(String userId, String projectId) {
        return databaseClient
                .sql("SELECT pm.part_id FROM project.part_members pm " +
                     "JOIN project.parts p ON p.id = pm.part_id " +
                     "WHERE pm.user_id = :userId AND p.project_id = :projectId")
                .bind("userId", userId)
                .bind("projectId", projectId)
                .map((row, meta) -> row.get("part_id", String.class))
                .all()
                .collect(Collectors.toSet());
    }
}
