package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for WBS Snapshot metadata
 */
@Repository
public interface WbsSnapshotRepository extends JpaRepository<WbsSnapshot, String> {

    /**
     * Find all active snapshots for a phase, ordered by creation date descending
     */
    List<WbsSnapshot> findByPhaseIdAndStatusOrderByCreatedAtDesc(String phaseId, WbsSnapshot.SnapshotStatus status);

    /**
     * Find all active snapshots for a project, ordered by creation date descending
     */
    List<WbsSnapshot> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, WbsSnapshot.SnapshotStatus status);

    /**
     * Find a snapshot by ID and status
     */
    Optional<WbsSnapshot> findByIdAndStatus(String id, WbsSnapshot.SnapshotStatus status);

    /**
     * Count snapshots for a phase with a specific status
     */
    long countByPhaseIdAndStatus(String phaseId, WbsSnapshot.SnapshotStatus status);

    /**
     * Find all snapshots for a phase regardless of status
     */
    List<WbsSnapshot> findByPhaseIdOrderByCreatedAtDesc(String phaseId);
}
