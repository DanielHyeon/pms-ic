package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.*;
import com.insuretech.pms.project.entity.*;
import com.insuretech.pms.project.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateSetRepository templateSetRepository;
    private final PhaseTemplateRepository phaseTemplateRepository;
    private final WbsGroupTemplateRepository wbsGroupTemplateRepository;
    private final WbsItemTemplateRepository wbsItemTemplateRepository;
    private final PhaseRepository phaseRepository;
    private final WbsGroupRepository wbsGroupRepository;
    private final WbsItemRepository wbsItemRepository;
    private final ProjectRepository projectRepository;

    // ============ Template Set Operations ============

    @Transactional(readOnly = true)
    public List<TemplateSetDto> getAllTemplateSets() {
        return templateSetRepository.findByStatus(TemplateSet.TemplateStatus.ACTIVE).stream()
                .map(this::toTemplateSetDtoWithDetails)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TemplateSetDto> getTemplateSetsByCategory(String category) {
        TemplateSet.TemplateCategory cat = TemplateSet.TemplateCategory.valueOf(category);
        return templateSetRepository.findByCategoryAndStatus(cat, TemplateSet.TemplateStatus.ACTIVE).stream()
                .map(this::toTemplateSetDtoWithDetails)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TemplateSetDto getTemplateSetById(String templateSetId) {
        TemplateSet templateSet = templateSetRepository.findById(templateSetId)
                .orElseThrow(() -> CustomException.notFound("Template Set not found: " + templateSetId));
        return toTemplateSetDtoWithDetails(templateSet);
    }

    @Transactional
    public TemplateSetDto createTemplateSet(TemplateSetDto request) {
        TemplateSet templateSet = TemplateSet.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(TemplateSet.TemplateCategory.valueOf(request.getCategory()))
                .status(TemplateSet.TemplateStatus.ACTIVE)
                .version(request.getVersion() != null ? request.getVersion() : "1.0")
                .isDefault(request.getIsDefault() != null ? request.getIsDefault() : false)
                .tags(request.getTags())
                .build();

        return TemplateSetDto.from(templateSetRepository.save(templateSet));
    }

    @Transactional
    public void deleteTemplateSet(String templateSetId) {
        TemplateSet templateSet = templateSetRepository.findById(templateSetId)
                .orElseThrow(() -> CustomException.notFound("Template Set not found: " + templateSetId));
        templateSetRepository.delete(templateSet);
    }

    // ============ Apply Template to Project ============

    @Transactional
    public void applyTemplateToProject(String templateSetId, String projectId, LocalDate startDate) {
        templateSetRepository.findById(templateSetId)
                .orElseThrow(() -> CustomException.notFound("Template Set not found: " + templateSetId));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> CustomException.notFound("Project not found: " + projectId));

        List<PhaseTemplate> phaseTemplates = phaseTemplateRepository
                .findByTemplateSetIdOrderByRelativeOrderAsc(templateSetId);

        LocalDate currentStartDate = startDate != null ? startDate : LocalDate.now();

        for (PhaseTemplate phaseTemplate : phaseTemplates) {
            LocalDate phaseEndDate = phaseTemplate.getDefaultDurationDays() != null
                    ? currentStartDate.plusDays(phaseTemplate.getDefaultDurationDays())
                    : currentStartDate.plusDays(30);

            Phase phase = Phase.builder()
                    .id(UUID.randomUUID().toString())
                    .project(project)
                    .name(phaseTemplate.getName())
                    .description(phaseTemplate.getDescription())
                    .orderNum(phaseTemplate.getRelativeOrder())
                    .status(Phase.PhaseStatus.NOT_STARTED)
                    .trackType(phaseTemplate.getTrackType())
                    .startDate(currentStartDate)
                    .endDate(phaseEndDate)
                    .build();

            phase = phaseRepository.save(phase);

            List<WbsGroupTemplate> groupTemplates = wbsGroupTemplateRepository
                    .findByPhaseTemplateIdOrderByRelativeOrderAsc(phaseTemplate.getId());

            int groupOrder = 0;
            for (WbsGroupTemplate groupTemplate : groupTemplates) {
                String groupCode = String.format("%d.%d", phaseTemplate.getRelativeOrder() + 1, groupOrder + 1);

                WbsGroup group = WbsGroup.builder()
                        .phase(phase)
                        .code(groupCode)
                        .name(groupTemplate.getName())
                        .description(groupTemplate.getDescription())
                        .status(WbsGroup.WbsStatus.NOT_STARTED)
                        .weight(groupTemplate.getDefaultWeight())
                        .orderNum(groupOrder)
                        .plannedStartDate(currentStartDate)
                        .plannedEndDate(phaseEndDate)
                        .build();

                group = wbsGroupRepository.save(group);

                List<WbsItemTemplate> itemTemplates = wbsItemTemplateRepository
                        .findByGroupTemplateIdOrderByRelativeOrderAsc(groupTemplate.getId());

                int itemOrder = 0;
                for (WbsItemTemplate itemTemplate : itemTemplates) {
                    String itemCode = String.format("%s.%d", groupCode, itemOrder + 1);

                    WbsItem item = WbsItem.builder()
                            .group(group)
                            .phase(phase)
                            .code(itemCode)
                            .name(itemTemplate.getName())
                            .description(itemTemplate.getDescription())
                            .status(WbsGroup.WbsStatus.NOT_STARTED)
                            .weight(itemTemplate.getDefaultWeight())
                            .orderNum(itemOrder)
                            .estimatedHours(itemTemplate.getEstimatedHours())
                            .build();

                    wbsItemRepository.save(item);
                    itemOrder++;
                }

                groupOrder++;
            }

            currentStartDate = phaseEndDate.plusDays(1);
        }
    }

    // ============ Helper Methods ============

    private TemplateSetDto toTemplateSetDtoWithDetails(TemplateSet templateSet) {
        TemplateSetDto dto = TemplateSetDto.from(templateSet);

        List<PhaseTemplate> phaseTemplates = phaseTemplateRepository
                .findByTemplateSetIdOrderByRelativeOrderAsc(templateSet.getId());

        List<PhaseTemplateDto> phaseDtos = phaseTemplates.stream()
                .map(pt -> {
                    PhaseTemplateDto phaseDto = PhaseTemplateDto.from(pt);

                    List<WbsGroupTemplate> groupTemplates = wbsGroupTemplateRepository
                            .findByPhaseTemplateIdOrderByRelativeOrderAsc(pt.getId());

                    List<WbsGroupTemplateDto> groupDtos = groupTemplates.stream()
                            .map(gt -> {
                                WbsGroupTemplateDto groupDto = WbsGroupTemplateDto.from(gt);

                                List<WbsItemTemplate> itemTemplates = wbsItemTemplateRepository
                                        .findByGroupTemplateIdOrderByRelativeOrderAsc(gt.getId());

                                groupDto.setWbsItems(itemTemplates.stream()
                                        .map(WbsItemTemplateDto::from)
                                        .collect(Collectors.toList()));

                                return groupDto;
                            })
                            .collect(Collectors.toList());

                    phaseDto.setWbsGroups(groupDtos);
                    return phaseDto;
                })
                .collect(Collectors.toList());

        dto.setPhases(phaseDtos);
        return dto;
    }
}
