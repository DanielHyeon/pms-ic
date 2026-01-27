package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsGroupSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for WBS Group Snapshots
 */
@Repository
public interface WbsGroupSnapshotRepository extends JpaRepository<WbsGroupSnapshot, String> {

    /**
     * Find all group snapshots for a given snapshot
     */
    List<WbsGroupSnapshot> findBySnapshotIdOrderByOrderNumAsc(String snapshotId);

    /**
     * Delete all group snapshots for a given snapshot
     */
    void deleteBySnapshotId(String snapshotId);
}
