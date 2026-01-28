package com.insuretech.pms.common.security;

import com.insuretech.pms.auth.entity.User;
import com.insuretech.pms.auth.repository.UserRepository;
import com.insuretech.pms.project.entity.Part;
import com.insuretech.pms.project.repository.PartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for Part (Work Area) scoped authorization checks.
 * Used via SpEL in @PreAuthorize annotations.
 *
 * Part roles:
 * - PL (Part Leader): Full access to the part, responsible for features/stories/tasks
 * - TL (Tech Lead): Technical decisions within the part
 * - MEMBER: Regular member of the part
 *
 * Usage examples:
 * - @PreAuthorize("@partSecurity.isPartLeader(#projectId, #partId)")
 * - @PreAuthorize("@partSecurity.isPartMember(#projectId, #partId)")
 * - @PreAuthorize("@partSecurity.canManagePart(#projectId, #partId)")
 */
@Slf4j
@Service("partSecurity")
@RequiredArgsConstructor
public class PartSecurityService {

    private final PartRepository partRepository;
    private final UserRepository userRepository;
    private final ProjectSecurityService projectSecurityService;

    /**
     * Check if current user is the Part Leader (PL) of the specified part.
     *
     * @param projectId the project ID
     * @param partId the part ID
     * @return true if user is the Part Leader
     */
    public boolean isPartLeader(String projectId, String partId) {
        if (projectId == null || partId == null) {
            return false;
        }

        String userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }

        // System admins have access to all parts
        if (projectSecurityService.hasSystemRole("ADMIN")) {
            log.debug("isPartLeader: User {} is ADMIN, granting access", userId);
            return true;
        }

        Optional<Part> partOpt = partRepository.findByIdAndProjectId(partId, projectId);
        if (partOpt.isEmpty()) {
            log.debug("isPartLeader: Part {} not found in project {}", partId, projectId);
            return false;
        }

        Part part = partOpt.get();
        boolean isLeader = userId.equals(part.getLeaderId());
        log.debug("isPartLeader: User {} is leader of part {}: {}", userId, partId, isLeader);

        return isLeader;
    }

    /**
     * Check if current user is a member of the specified part.
     *
     * @param projectId the project ID
     * @param partId the part ID
     * @return true if user is a member of the part
     */
    public boolean isPartMember(String projectId, String partId) {
        if (projectId == null || partId == null) {
            return false;
        }

        String userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }

        // System admins and auditors can view all parts
        if (projectSecurityService.hasAnySystemRole("ADMIN", "AUDITOR")) {
            log.debug("isPartMember: User {} has system role, granting access", userId);
            return true;
        }

        // Project PM/PMO_HEAD can access all parts
        if (projectSecurityService.hasAnyRole(projectId, "PM", "PMO_HEAD")) {
            log.debug("isPartMember: User {} is PM/PMO_HEAD, granting access to part {}", userId, partId);
            return true;
        }

        Optional<Part> partOpt = partRepository.findByIdAndProjectId(partId, projectId);
        if (partOpt.isEmpty()) {
            log.debug("isPartMember: Part {} not found in project {}", partId, projectId);
            return false;
        }

        Part part = partOpt.get();
        boolean isMember = userId.equals(part.getLeaderId()) || part.getMemberIds().contains(userId);
        log.debug("isPartMember: User {} is member of part {}: {}", userId, partId, isMember);

        return isMember;
    }

    /**
     * Check if current user can manage the part (create/update features, assign work).
     * Part Leaders and project PM/PMO_HEAD can manage parts.
     *
     * @param projectId the project ID
     * @param partId the part ID
     * @return true if user can manage the part
     */
    public boolean canManagePart(String projectId, String partId) {
        if (projectId == null || partId == null) {
            return false;
        }

        String userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }

        // System admins can manage all parts
        if (projectSecurityService.hasSystemRole("ADMIN")) {
            return true;
        }

        // Project PM/PMO_HEAD can manage all parts
        if (projectSecurityService.hasAnyRole(projectId, "PM", "PMO_HEAD")) {
            return true;
        }

        // Part Leader can manage their part
        return isPartLeader(projectId, partId);
    }

    /**
     * Check if current user can read part data (dashboard, metrics, reports).
     *
     * @param projectId the project ID
     * @param partId the part ID
     * @return true if user can read part data
     */
    public boolean canReadPart(String projectId, String partId) {
        return isPartMember(projectId, partId);
    }

    /**
     * Check if current user can write to the part (create stories, tasks).
     *
     * @param projectId the project ID
     * @param partId the part ID
     * @return true if user can write to the part
     */
    public boolean canWritePart(String projectId, String partId) {
        if (projectId == null || partId == null) {
            return false;
        }

        String userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }

        // Must be a part member and have work permissions on project
        return isPartMember(projectId, partId) &&
               projectSecurityService.canWorkOnTasks(projectId);
    }

    /**
     * Get all part IDs that the current user has access to in a project.
     *
     * @param projectId the project ID
     * @return set of part IDs the user can access
     */
    public Set<String> getAccessiblePartIds(String projectId) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return Set.of();
        }

        // System admins and project PM/PMO_HEAD can access all parts
        if (projectSecurityService.hasSystemRole("ADMIN") ||
            projectSecurityService.hasAnyRole(projectId, "PM", "PMO_HEAD", "AUDITOR")) {
            return partRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                    .stream()
                    .map(Part::getId)
                    .collect(Collectors.toSet());
        }

        // Regular users: parts they lead or are members of
        List<Part> parts = partRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        return parts.stream()
                .filter(p -> userId.equals(p.getLeaderId()) || p.getMemberIds().contains(userId))
                .map(Part::getId)
                .collect(Collectors.toSet());
    }

    /**
     * Check if the specified feature belongs to a part the user can access.
     *
     * @param projectId the project ID
     * @param featurePartId the part ID of the feature
     * @return true if user can access the feature's part
     */
    public boolean canAccessFeaturePart(String projectId, String featurePartId) {
        if (featurePartId == null) {
            // Features without part assignment are accessible to all project members
            return projectSecurityService.isProjectMember(projectId);
        }
        return isPartMember(projectId, featurePartId);
    }

    /**
     * Get the current authenticated user's ID.
     */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        String username = auth.getName();
        return userRepository.findByEmail(username)
                .map(User::getId)
                .orElse(null);
    }
}
