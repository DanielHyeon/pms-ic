package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsTaskSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for WBS Task Snapshots
 */
@Repository
public interface WbsTaskSnapshotRepository extends JpaRepository<WbsTaskSnapshot, String> {

    /**
     * Find all task snapshots for a given snapshot
     */
    List<WbsTaskSnapshot> findBySnapshotIdOrderByOrderNumAsc(String snapshotId);

    /**
     * Delete all task snapshots for a given snapshot
     */
    void deleteBySnapshotId(String snapshotId);
}
