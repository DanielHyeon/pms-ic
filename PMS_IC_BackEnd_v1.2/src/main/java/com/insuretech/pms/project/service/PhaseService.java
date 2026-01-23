package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.CreatePhaseRequest;
import com.insuretech.pms.project.dto.PhaseDto;
import com.insuretech.pms.project.dto.UpdatePhaseRequest;
import com.insuretech.pms.project.entity.Phase;
import com.insuretech.pms.project.entity.Phase.GateStatus;
import com.insuretech.pms.project.entity.Phase.PhaseStatus;
import com.insuretech.pms.project.entity.Phase.TrackType;
import com.insuretech.pms.project.entity.Project;
import com.insuretech.pms.project.repository.PhaseRepository;
import com.insuretech.pms.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhaseService {

    private final PhaseRepository phaseRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public List<PhaseDto> getPhases(String projectId) {
        List<Phase> phases = projectId == null || projectId.isBlank()
                ? phaseRepository.findAll()
                : phaseRepository.findByProjectIdOrderByOrderNumAsc(projectId);

        return phases.stream()
                .map(PhaseDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PhaseDto getPhaseById(String phaseId) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + phaseId));
        return PhaseDto.from(phase);
    }

    @Transactional
    public PhaseDto createPhase(String projectId, CreatePhaseRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> CustomException.notFound("Project not found: " + projectId));

        Phase phase = Phase.builder()
                .id(UUID.randomUUID().toString())
                .project(project)
                .name(request.getName())
                .description(request.getDescription())
                .orderNum(request.getOrderNum())
                .status(parsePhaseStatus(request.getStatus()))
                .gateStatus(parseGateStatus(request.getGateStatus()))
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .progress(request.getProgress() != null ? request.getProgress() : 0)
                .trackType(parseTrackType(request.getTrackType()))
                .build();

        return PhaseDto.from(phaseRepository.save(phase));
    }

    @Transactional
    public PhaseDto updatePhase(String phaseId, UpdatePhaseRequest request) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + phaseId));

        if (request.getName() != null) {
            phase.setName(request.getName());
        }
        if (request.getDescription() != null) {
            phase.setDescription(request.getDescription());
        }
        if (request.getOrderNum() != null) {
            phase.setOrderNum(request.getOrderNum());
        }
        if (request.getStatus() != null) {
            phase.setStatus(parsePhaseStatus(request.getStatus()));
        }
        if (request.getGateStatus() != null) {
            phase.setGateStatus(parseGateStatus(request.getGateStatus()));
        }
        if (request.getStartDate() != null) {
            phase.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            phase.setEndDate(request.getEndDate());
        }
        if (request.getProgress() != null) {
            phase.setProgress(request.getProgress());
        }
        if (request.getTrackType() != null) {
            phase.setTrackType(parseTrackType(request.getTrackType()));
        }

        return PhaseDto.from(phaseRepository.save(phase));
    }

    @Transactional
    public void deletePhase(String phaseId) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> CustomException.notFound("Phase not found: " + phaseId));
        phaseRepository.delete(phase);
    }

    private PhaseStatus parsePhaseStatus(String status) {
        if (status == null || status.isBlank()) {
            return PhaseStatus.NOT_STARTED;
        }
        return PhaseStatus.valueOf(status);
    }

    private GateStatus parseGateStatus(String gateStatus) {
        if (gateStatus == null || gateStatus.isBlank()) {
            return null;
        }
        return GateStatus.valueOf(gateStatus);
    }

    private TrackType parseTrackType(String trackType) {
        if (trackType == null || trackType.isBlank()) {
            return TrackType.COMMON;
        }
        return TrackType.valueOf(trackType);
    }
}
