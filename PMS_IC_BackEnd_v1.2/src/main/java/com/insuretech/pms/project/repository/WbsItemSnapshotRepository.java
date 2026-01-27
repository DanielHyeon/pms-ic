package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsItemSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for WBS Item Snapshots
 */
@Repository
public interface WbsItemSnapshotRepository extends JpaRepository<WbsItemSnapshot, String> {

    /**
     * Find all item snapshots for a given snapshot
     */
    List<WbsItemSnapshot> findBySnapshotIdOrderByOrderNumAsc(String snapshotId);

    /**
     * Delete all item snapshots for a given snapshot
     */
    void deleteBySnapshotId(String snapshotId);
}
