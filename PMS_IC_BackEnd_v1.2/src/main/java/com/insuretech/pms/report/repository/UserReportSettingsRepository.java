package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.UserReportSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for UserReportSettings entity
 */
@Repository
public interface UserReportSettingsRepository extends JpaRepository<UserReportSettings, UUID> {

    // Find by user
    List<UserReportSettings> findByUserId(String userId);

    // Find by user and project
    Optional<UserReportSettings> findByUserIdAndProjectId(String userId, String projectId);

    // Find global settings (no project)
    @Query("SELECT s FROM UserReportSettings s WHERE s.userId = :userId AND s.projectId IS NULL")
    Optional<UserReportSettings> findGlobalSettings(@Param("userId") String userId);

    // Find users with weekly reports scheduled
    @Query("SELECT s FROM UserReportSettings s " +
           "WHERE s.weeklyEnabled = true " +
           "AND s.weeklyDayOfWeek = :dayOfWeek " +
           "AND s.weeklyTime = :time")
    List<UserReportSettings> findByWeeklyEnabledAndWeeklyDayOfWeekAndWeeklyTime(
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("time") LocalTime time);

    // Alternative method for scheduler
    @Query("SELECT s FROM UserReportSettings s " +
           "WHERE s.weeklyEnabled = true " +
           "AND s.weeklyDayOfWeek = :dayOfWeek " +
           "AND HOUR(s.weeklyTime) = :hour")
    List<UserReportSettings> findWeeklyScheduledForHour(
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("hour") Integer hour);

    // Find users with monthly reports scheduled
    @Query("SELECT s FROM UserReportSettings s " +
           "WHERE s.monthlyEnabled = true " +
           "AND s.monthlyDayOfMonth = :dayOfMonth " +
           "AND s.monthlyTime = :time")
    List<UserReportSettings> findByMonthlyEnabledAndMonthlyDayOfMonthAndMonthlyTime(
            @Param("dayOfMonth") Integer dayOfMonth,
            @Param("time") LocalTime time);

    // Find all enabled weekly settings
    List<UserReportSettings> findByWeeklyEnabledTrue();

    // Find all enabled monthly settings
    List<UserReportSettings> findByMonthlyEnabledTrue();

    // Check if user has settings for project
    boolean existsByUserIdAndProjectId(String userId, String projectId);
}
