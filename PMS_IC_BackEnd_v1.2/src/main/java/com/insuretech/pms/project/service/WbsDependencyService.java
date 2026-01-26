package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.CreateWbsDependencyRequest;
import com.insuretech.pms.project.dto.WbsDependencyDto;
import com.insuretech.pms.project.entity.WbsDependency;
import com.insuretech.pms.project.repository.WbsDependencyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WbsDependencyService {

    private final WbsDependencyRepository dependencyRepository;

    @Transactional(readOnly = true)
    public List<WbsDependencyDto> getProjectDependencies(String projectId) {
        return dependencyRepository.findByProjectId(projectId).stream()
            .map(WbsDependencyDto::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public WbsDependencyDto getDependency(String dependencyId) {
        WbsDependency dependency = dependencyRepository.findById(dependencyId)
            .orElseThrow(() -> CustomException.notFound("Dependency not found: " + dependencyId));
        return WbsDependencyDto.from(dependency);
    }

    @Transactional
    public WbsDependencyDto createDependency(String projectId, CreateWbsDependencyRequest request) {
        // Check for existing dependency
        dependencyRepository.findByPredecessorIdAndSuccessorId(
            request.getPredecessorId(), request.getSuccessorId()
        ).ifPresent(d -> {
            throw CustomException.conflict("Dependency already exists");
        });

        // Prevent self-dependency
        if (request.getPredecessorId().equals(request.getSuccessorId())) {
            throw CustomException.badRequest("Cannot create self-dependency");
        }

        WbsDependency dependency = WbsDependency.builder()
            .predecessorType(WbsDependency.WbsItemType.valueOf(request.getPredecessorType()))
            .predecessorId(request.getPredecessorId())
            .successorType(WbsDependency.WbsItemType.valueOf(request.getSuccessorType()))
            .successorId(request.getSuccessorId())
            .dependencyType(request.getDependencyType() != null
                ? WbsDependency.DependencyType.valueOf(request.getDependencyType())
                : WbsDependency.DependencyType.FS)
            .lagDays(request.getLagDays() != null ? request.getLagDays() : 0)
            .projectId(projectId)
            .build();

        WbsDependency saved = dependencyRepository.save(dependency);
        return WbsDependencyDto.from(saved);
    }

    @Transactional
    public void deleteDependency(String dependencyId) {
        if (!dependencyRepository.existsById(dependencyId)) {
            throw CustomException.notFound("Dependency not found: " + dependencyId);
        }
        dependencyRepository.deleteById(dependencyId);
    }

    @Transactional
    public void deleteDependencyByItems(String predecessorId, String successorId) {
        dependencyRepository.deleteByPredecessorIdAndSuccessorId(predecessorId, successorId);
    }

    @Transactional(readOnly = true)
    public List<WbsDependencyDto> getDependenciesForItem(String itemId) {
        return dependencyRepository.findByItemId(itemId).stream()
            .map(WbsDependencyDto::from)
            .toList();
    }
}
