package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.Issue;
import com.insuretech.pms.project.entity.Issue.IssuePriority;
import com.insuretech.pms.project.entity.Issue.IssueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IssueRepository extends JpaRepository<Issue, String> {
    List<Issue> findByProjectIdOrderByCreatedAtDesc(String projectId);

    @Query("SELECT COUNT(i) FROM Issue i WHERE i.project.id = :projectId AND i.status IN :statuses")
    int countByProjectIdAndStatusIn(@Param("projectId") String projectId, @Param("statuses") List<IssueStatus> statuses);

    @Query("SELECT COUNT(i) FROM Issue i WHERE i.project.id = :projectId AND i.status IN :statuses AND i.priority IN :priorities")
    int countByProjectIdAndStatusInAndPriorityIn(
            @Param("projectId") String projectId,
            @Param("statuses") List<IssueStatus> statuses,
            @Param("priorities") List<IssuePriority> priorities);
}
