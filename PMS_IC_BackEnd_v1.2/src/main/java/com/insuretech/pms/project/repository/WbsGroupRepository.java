package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WbsGroupRepository extends JpaRepository<WbsGroup, String> {

    List<WbsGroup> findByPhaseIdOrderByOrderNumAsc(String phaseId);

    @Query("SELECT wg FROM WbsGroup wg WHERE wg.phase.project.id = :projectId ORDER BY wg.phase.orderNum, wg.orderNum")
    List<WbsGroup> findByProjectIdOrdered(@Param("projectId") String projectId);

    List<WbsGroup> findByLinkedEpicId(String epicId);

    Optional<WbsGroup> findByPhaseIdAndCode(String phaseId, String code);

    @Query("SELECT COUNT(wg) FROM WbsGroup wg WHERE wg.phase.id = :phaseId")
    long countByPhaseId(@Param("phaseId") String phaseId);
}
