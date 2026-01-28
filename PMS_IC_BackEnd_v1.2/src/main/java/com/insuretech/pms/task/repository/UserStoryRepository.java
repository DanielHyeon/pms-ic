package com.insuretech.pms.task.repository;

import com.insuretech.pms.task.entity.UserStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserStoryRepository extends JpaRepository<UserStory, String> {

    List<UserStory> findByProjectIdOrderByPriorityOrderAsc(String projectId);

    List<UserStory> findByProjectIdAndStatusOrderByPriorityOrderAsc(String projectId, UserStory.StoryStatus status);

    List<UserStory> findByProjectIdAndEpicOrderByPriorityOrderAsc(String projectId, String epic);

    @Query("SELECT MAX(u.priorityOrder) FROM UserStory u WHERE u.projectId = ?1 AND u.status = ?2")
    Integer findMaxPriorityOrderByProjectIdAndStatus(String projectId, UserStory.StoryStatus status);

    List<UserStory> findByProjectId(String projectId);

    List<UserStory> findByWbsItemId(String wbsItemId);

    List<UserStory> findByFeatureId(String featureId);

    @Query("SELECT us FROM UserStory us WHERE us.projectId = :projectId AND us.wbsItemId IS NULL")
    List<UserStory> findByProjectIdAndWbsItemIdIsNull(String projectId);

    @Query("SELECT us FROM UserStory us WHERE us.featureId = :featureId AND us.wbsItemId IS NULL")
    List<UserStory> findByFeatureIdAndWbsItemIdIsNull(String featureId);

    // ===== Part-based queries =====

    List<UserStory> findByPartId(String partId);

    @Query("SELECT COUNT(us) FROM UserStory us WHERE us.partId = :partId")
    int countByPartId(@Param("partId") String partId);

    @Query("SELECT COUNT(us) FROM UserStory us WHERE us.partId = :partId AND us.status = :status")
    int countByPartIdAndStatus(@Param("partId") String partId, @Param("status") String status);

    @Query("SELECT COALESCE(SUM(us.storyPoints), 0) FROM UserStory us WHERE us.partId = :partId")
    Integer sumStoryPointsByPartId(@Param("partId") String partId);

    @Query("SELECT COALESCE(SUM(us.storyPoints), 0) FROM UserStory us WHERE us.partId = :partId AND us.status = :status")
    Integer sumStoryPointsByPartIdAndStatus(@Param("partId") String partId, @Param("status") String status);
}
