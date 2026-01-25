package com.insuretech.pms.report.repository;

import com.insuretech.pms.report.entity.RoleReportDefaults;
import com.insuretech.pms.report.entity.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for RoleReportDefaults entity
 */
@Repository
public interface RoleReportDefaultsRepository extends JpaRepository<RoleReportDefaults, UUID> {

    // Find by role
    List<RoleReportDefaults> findByRole(String role);

    // Find by role and report type
    Optional<RoleReportDefaults> findByRoleAndReportType(String role, ReportType reportType);

    // Find by report type
    List<RoleReportDefaults> findByReportType(ReportType reportType);

    // Check existence
    boolean existsByRoleAndReportType(String role, ReportType reportType);
}
