package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsDependencySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for WBS Dependency Snapshots
 */
@Repository
public interface WbsDependencySnapshotRepository extends JpaRepository<WbsDependencySnapshot, String> {

    /**
     * Find all dependency snapshots for a given snapshot
     */
    List<WbsDependencySnapshot> findBySnapshotId(String snapshotId);

    /**
     * Delete all dependency snapshots for a given snapshot
     */
    void deleteBySnapshotId(String snapshotId);
}
