package com.insuretech.pms.report.service;

import com.insuretech.pms.report.dto.ReportTemplateDto;
import com.insuretech.pms.report.entity.ReportTemplate;
import com.insuretech.pms.report.entity.ReportType;
import com.insuretech.pms.report.entity.TemplateScope;
import com.insuretech.pms.report.repository.ReportTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing report templates
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportTemplateService {

    private final ReportTemplateRepository templateRepository;

    /**
     * Get template by ID
     */
    public ReportTemplateDto getTemplateById(UUID templateId) {
        ReportTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + templateId));
        return ReportTemplateDto.from(template);
    }

    /**
     * Get all active templates
     */
    public List<ReportTemplateDto> getAllActiveTemplates() {
        return templateRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(ReportTemplateDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get templates by type
     */
    public List<ReportTemplateDto> getTemplatesByType(ReportType reportType) {
        return templateRepository.findByReportTypeAndIsActiveTrueOrderByNameAsc(reportType)
                .stream()
                .map(ReportTemplateDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get templates for a specific role
     */
    public List<ReportTemplateDto> getTemplatesForRole(String role, ReportType reportType) {
        return templateRepository.findTemplatesForRole(reportType.name(), role)
                .stream()
                .map(ReportTemplateDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get user's personal templates
     */
    public List<ReportTemplateDto> getPersonalTemplates(String userId) {
        return templateRepository.findPersonalTemplates(userId)
                .stream()
                .map(ReportTemplateDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get system templates
     */
    public List<ReportTemplateDto> getSystemTemplates() {
        return templateRepository.findSystemTemplates()
                .stream()
                .map(ReportTemplateDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Create a new template
     */
    @Transactional
    public ReportTemplateDto createTemplate(ReportTemplateDto dto, String userId) {
        // Check name uniqueness for personal templates
        if (dto.getScope() == TemplateScope.PERSONAL) {
            if (templateRepository.existsByNameAndCreatedByAndIdNot(dto.getName(), userId, null)) {
                throw new IllegalArgumentException("Template with this name already exists");
            }
        }

        ReportTemplate template = ReportTemplate.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .reportType(dto.getReportType())
                .scope(dto.getScope() != null ? dto.getScope() : TemplateScope.PERSONAL)
                .organizationId(dto.getOrganizationId())
                .targetRoles(dto.getTargetRoles())
                .targetReportScopes(dto.getTargetReportScopes())
                .structure(dto.getStructure())
                .styling(dto.getStyling())
                .isActive(true)
                .isDefault(false)
                .version(1)
                .build();

        ReportTemplate saved = templateRepository.save(template);
        log.info("Created template: {} by user: {}", saved.getId(), userId);
        return ReportTemplateDto.from(saved);
    }

    /**
     * Update template
     */
    @Transactional
    public ReportTemplateDto updateTemplate(UUID templateId, ReportTemplateDto dto, String userId) {
        ReportTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + templateId));

        // Only owner or admin can update personal templates
        if (template.getScope() == TemplateScope.PERSONAL &&
            !template.getCreatedBy().equals(userId)) {
            throw new SecurityException("Not authorized to update this template");
        }

        template.setName(dto.getName());
        template.setDescription(dto.getDescription());
        template.setTargetRoles(dto.getTargetRoles());
        template.setTargetReportScopes(dto.getTargetReportScopes());
        template.setStructure(dto.getStructure());
        template.setStyling(dto.getStyling());
        template.setVersion(template.getVersion() + 1);

        ReportTemplate saved = templateRepository.save(template);
        log.info("Updated template: {} by user: {}", templateId, userId);
        return ReportTemplateDto.from(saved);
    }

    /**
     * Copy template (create personal copy)
     */
    @Transactional
    public ReportTemplateDto copyTemplate(UUID sourceId, String newName, String userId) {
        ReportTemplate source = templateRepository.findById(sourceId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + sourceId));

        ReportTemplate copy = ReportTemplate.builder()
                .name(newName != null ? newName : source.getName() + " (Copy)")
                .description(source.getDescription())
                .reportType(source.getReportType())
                .scope(TemplateScope.PERSONAL)
                .targetRoles(source.getTargetRoles())
                .targetReportScopes(source.getTargetReportScopes())
                .structure(source.getStructure())
                .styling(source.getStyling())
                .isActive(true)
                .isDefault(false)
                .version(1)
                .build();

        ReportTemplate saved = templateRepository.save(copy);
        log.info("Copied template {} to {} by user: {}", sourceId, saved.getId(), userId);
        return ReportTemplateDto.from(saved);
    }

    /**
     * Delete template
     */
    @Transactional
    public void deleteTemplate(UUID templateId, String userId) {
        ReportTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + templateId));

        // Cannot delete system templates
        if (template.getScope() == TemplateScope.SYSTEM) {
            throw new IllegalStateException("Cannot delete system templates");
        }

        // Only owner can delete personal templates
        if (template.getScope() == TemplateScope.PERSONAL &&
            !template.getCreatedBy().equals(userId)) {
            throw new SecurityException("Not authorized to delete this template");
        }

        templateRepository.delete(template);
        log.info("Deleted template: {} by user: {}", templateId, userId);
    }

    /**
     * Deactivate template (soft delete)
     */
    @Transactional
    public void deactivateTemplate(UUID templateId, String userId) {
        ReportTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + templateId));

        template.setIsActive(false);
        templateRepository.save(template);
        log.info("Deactivated template: {} by user: {}", templateId, userId);
    }
}
