package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsGroupTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WbsGroupTemplateRepository extends JpaRepository<WbsGroupTemplate, String> {

    List<WbsGroupTemplate> findByPhaseTemplateIdOrderByRelativeOrderAsc(String phaseTemplateId);

    long countByPhaseTemplateId(String phaseTemplateId);
}
