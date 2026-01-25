package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.TemplateSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TemplateSetRepository extends JpaRepository<TemplateSet, String> {

    List<TemplateSet> findByStatus(TemplateSet.TemplateStatus status);

    List<TemplateSet> findByCategory(TemplateSet.TemplateCategory category);

    List<TemplateSet> findByCategoryAndStatus(TemplateSet.TemplateCategory category, TemplateSet.TemplateStatus status);

    Optional<TemplateSet> findByName(String name);

    Optional<TemplateSet> findByCategoryAndIsDefaultTrue(TemplateSet.TemplateCategory category);

    List<TemplateSet> findByIsDefaultTrue();
}
