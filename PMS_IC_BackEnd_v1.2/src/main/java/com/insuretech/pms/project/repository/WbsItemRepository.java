package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WbsItemRepository extends JpaRepository<WbsItem, String> {

    List<WbsItem> findByGroupIdOrderByOrderNumAsc(String groupId);

    List<WbsItem> findByPhaseIdOrderByOrderNumAsc(String phaseId);

    @Query("SELECT wi FROM WbsItem wi WHERE wi.group.phase.project.id = :projectId ORDER BY wi.group.orderNum, wi.orderNum")
    List<WbsItem> findByProjectIdOrdered(@Param("projectId") String projectId);

    Optional<WbsItem> findByGroupIdAndCode(String groupId, String code);

    @Query("SELECT COUNT(wi) FROM WbsItem wi WHERE wi.group.id = :groupId")
    long countByGroupId(@Param("groupId") String groupId);

    List<WbsItem> findByAssigneeId(String assigneeId);
}
