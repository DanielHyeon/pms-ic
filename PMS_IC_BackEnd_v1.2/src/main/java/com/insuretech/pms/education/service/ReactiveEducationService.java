package com.insuretech.pms.education.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.education.dto.EducationDto;
import com.insuretech.pms.education.reactive.entity.R2dbcEducation;
import com.insuretech.pms.education.reactive.repository.ReactiveEducationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveEducationService {

    private final ReactiveEducationRepository educationRepository;

    public Flux<EducationDto> getAllActiveEducations() {
        return educationRepository.findAllActive()
                .map(this::toDto);
    }

    public Mono<EducationDto> getEducationById(String id) {
        return educationRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Education not found: " + id)))
                .map(this::toDto);
    }

    public Flux<EducationDto> getEducationsByType(String educationType) {
        return educationRepository.findByEducationTypeAndIsActiveTrue(educationType)
                .map(this::toDto);
    }

    public Flux<EducationDto> getEducationsByCategory(String category) {
        return educationRepository.findByCategory(category)
                .map(this::toDto);
    }

    public Flux<EducationDto> getEducationsByTargetRole(String targetRole) {
        return educationRepository.findByTargetRole(targetRole)
                .map(this::toDto);
    }

    public Mono<EducationDto> createEducation(EducationDto dto) {
        R2dbcEducation education = R2dbcEducation.builder()
                .id(UUID.randomUUID().toString())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .educationType(dto.getEducationType() != null ? dto.getEducationType() : "IT_BASIC")
                .category(dto.getCategory() != null ? dto.getCategory() : "AGENT_AI")
                .targetRole(dto.getTargetRole() != null ? dto.getTargetRole() : "ALL")
                .durationHours(dto.getDurationHours())
                .prerequisites(dto.getPrerequisites())
                .learningObjectives(dto.getLearningObjectives())
                .instructor(dto.getInstructor())
                .materials(dto.getMaterials())
                .isActive(true)
                .build();

        return educationRepository.save(education)
                .map(this::toDto)
                .doOnSuccess(saved -> log.info("Created education: {}", saved.getId()));
    }

    public Mono<EducationDto> updateEducation(String id, EducationDto dto) {
        return educationRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Education not found: " + id)))
                .flatMap(education -> {
                    if (dto.getTitle() != null) education.setTitle(dto.getTitle());
                    if (dto.getDescription() != null) education.setDescription(dto.getDescription());
                    if (dto.getEducationType() != null) education.setEducationType(dto.getEducationType());
                    if (dto.getCategory() != null) education.setCategory(dto.getCategory());
                    if (dto.getTargetRole() != null) education.setTargetRole(dto.getTargetRole());
                    if (dto.getDurationHours() != null) education.setDurationHours(dto.getDurationHours());
                    if (dto.getPrerequisites() != null) education.setPrerequisites(dto.getPrerequisites());
                    if (dto.getLearningObjectives() != null) education.setLearningObjectives(dto.getLearningObjectives());
                    if (dto.getInstructor() != null) education.setInstructor(dto.getInstructor());
                    if (dto.getMaterials() != null) education.setMaterials(dto.getMaterials());
                    return educationRepository.save(education);
                })
                .map(this::toDto);
    }

    public Mono<Void> deleteEducation(String id) {
        return educationRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("Education not found: " + id)))
                .flatMap(education -> {
                    education.setIsActive(false);
                    return educationRepository.save(education);
                })
                .then()
                .doOnSuccess(v -> log.info("Deactivated education: {}", id));
    }

    private EducationDto toDto(R2dbcEducation entity) {
        return EducationDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .educationType(entity.getEducationType())
                .category(entity.getCategory())
                .targetRole(entity.getTargetRole())
                .durationHours(entity.getDurationHours())
                .prerequisites(entity.getPrerequisites())
                .learningObjectives(entity.getLearningObjectives())
                .instructor(entity.getInstructor())
                .materials(entity.getMaterials())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
