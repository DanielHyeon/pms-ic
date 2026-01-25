package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WbsTaskRepository extends JpaRepository<WbsTask, String> {

    List<WbsTask> findByItemIdOrderByOrderNumAsc(String itemId);

    List<WbsTask> findByGroupIdOrderByOrderNumAsc(String groupId);

    List<WbsTask> findByPhaseIdOrderByOrderNumAsc(String phaseId);

    Optional<WbsTask> findByItemIdAndCode(String itemId, String code);

    Optional<WbsTask> findByLinkedTaskId(String linkedTaskId);

    @Query("SELECT COUNT(wt) FROM WbsTask wt WHERE wt.item.id = :itemId")
    long countByItemId(@Param("itemId") String itemId);

    List<WbsTask> findByAssigneeId(String assigneeId);
}
