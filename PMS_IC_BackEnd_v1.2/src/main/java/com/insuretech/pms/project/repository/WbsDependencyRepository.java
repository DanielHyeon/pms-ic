package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WbsDependencyRepository extends JpaRepository<WbsDependency, String> {

    List<WbsDependency> findByProjectId(String projectId);

    List<WbsDependency> findByPredecessorId(String predecessorId);

    List<WbsDependency> findBySuccessorId(String successorId);

    Optional<WbsDependency> findByPredecessorIdAndSuccessorId(
        String predecessorId, String successorId);

    @Query("SELECT d FROM WbsDependency d WHERE d.predecessorId = :itemId OR d.successorId = :itemId")
    List<WbsDependency> findByItemId(@Param("itemId") String itemId);

    void deleteByPredecessorIdAndSuccessorId(String predecessorId, String successorId);

    void deleteByProjectId(String projectId);
}
