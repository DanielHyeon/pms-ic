package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.PhaseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhaseTemplateRepository extends JpaRepository<PhaseTemplate, String> {

    List<PhaseTemplate> findByTemplateSetIdOrderByRelativeOrderAsc(String templateSetId);

    long countByTemplateSetId(String templateSetId);
}
