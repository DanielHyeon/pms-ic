package com.insuretech.pms.common.security;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.project.entity.ProjectMember;
import com.insuretech.pms.project.entity.ProjectMember.ProjectRole;
import com.insuretech.pms.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Arrays;
import java.util.Optional;

/**
 * Reactive service for project-scoped authorization checks.
 * Uses R2DBC for user lookup, JPA (wrapped) for project member checks.
 */
@Slf4j
@Service("reactiveProjectSecurity")
@RequiredArgsConstructor
public class ReactiveProjectSecurityService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ReactiveUserRepository reactiveUserRepository;

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

                                return Mono.fromCallable(() ->
                                                projectMemberRepository.findByProjectIdAndUserIdAndActiveTrue(projectId, userId))
                                        .subscribeOn(Schedulers.boundedElastic())
                                        .map(memberOpt -> {
                                            if (memberOpt.isEmpty()) {
                                                return false;
                                            }
                                            String userRole = memberOpt.get().getRole().name();
                                            return Arrays.asList(requiredRoles).contains(userRole);
                                        });
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
                                    return Mono.fromCallable(() ->
                                                    projectMemberRepository.existsByProjectIdAndUserIdAndActiveTrue(projectId, userId))
                                            .subscribeOn(Schedulers.boundedElastic());
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
    public Mono<Optional<ProjectRole>> getProjectRole(String projectId) {
        return getCurrentUserId()
                .flatMap(userId -> Mono.fromCallable(() ->
                                projectMemberRepository.findByProjectIdAndUserIdAndActiveTrue(projectId, userId)
                                        .map(ProjectMember::getRole))
                        .subscribeOn(Schedulers.boundedElastic()))
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
}
