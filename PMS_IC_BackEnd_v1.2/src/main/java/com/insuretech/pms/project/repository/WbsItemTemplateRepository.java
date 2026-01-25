package com.insuretech.pms.project.repository;

import com.insuretech.pms.project.entity.WbsItemTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WbsItemTemplateRepository extends JpaRepository<WbsItemTemplate, String> {

    List<WbsItemTemplate> findByGroupTemplateIdOrderByRelativeOrderAsc(String groupTemplateId);

    long countByGroupTemplateId(String groupTemplateId);
}
