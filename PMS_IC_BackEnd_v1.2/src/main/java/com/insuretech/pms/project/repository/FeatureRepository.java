package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.Feature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeatureRepository extends JpaRepository<Feature, String> {

    List<Feature> findByEpicIdOrderByOrderNumAsc(String epicId);

    List<Feature> findByWbsGroupId(String wbsGroupId);

    @Query("SELECT f FROM Feature f WHERE f.epic.projectId = :projectId ORDER BY f.epic.name, f.orderNum")
    List<Feature> findByProjectIdOrdered(@Param("projectId") String projectId);

    Optional<Feature> findByEpicIdAndName(String epicId, String name);

    @Query("SELECT f FROM Feature f WHERE f.epic.id = :epicId AND f.wbsGroupId IS NULL")
    List<Feature> findUnlinkedByEpicId(@Param("epicId") String epicId);

    @Query("SELECT COUNT(f) FROM Feature f WHERE f.epic.id = :epicId")
    long countByEpicId(@Param("epicId") String epicId);

    @Query("SELECT COUNT(f) FROM Feature f WHERE f.wbsGroupId IS NOT NULL AND f.epic.projectId = :projectId")
    long countLinkedByProjectId(@Param("projectId") String projectId);
}
