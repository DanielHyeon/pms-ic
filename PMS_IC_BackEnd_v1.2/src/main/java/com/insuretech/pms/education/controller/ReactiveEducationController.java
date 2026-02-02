package com.insuretech.pms.education.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.education.dto.EducationDto;
import com.insuretech.pms.education.service.ReactiveEducationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v2/educations")
@RequiredArgsConstructor
public class ReactiveEducationController {

    private final ReactiveEducationService educationService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<EducationDto>>>> getAllActiveEducations() {
        return educationService.getAllActiveEducations()
                .collectList()
                .map(educations -> ResponseEntity.ok(ApiResponse.success(educations)));
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<EducationDto>>> getEducationById(@PathVariable String id) {
        return educationService.getEducationById(id)
                .map(education -> ResponseEntity.ok(ApiResponse.success(education)));
    }

    @GetMapping("/by-type/{educationType}")
    public Mono<ResponseEntity<ApiResponse<List<EducationDto>>>> getEducationsByType(
            @PathVariable String educationType) {
        return educationService.getEducationsByType(educationType)
                .collectList()
                .map(educations -> ResponseEntity.ok(ApiResponse.success(educations)));
    }

    @GetMapping("/by-category/{category}")
    public Mono<ResponseEntity<ApiResponse<List<EducationDto>>>> getEducationsByCategory(
            @PathVariable String category) {
        return educationService.getEducationsByCategory(category)
                .collectList()
                .map(educations -> ResponseEntity.ok(ApiResponse.success(educations)));
    }

    @GetMapping("/by-role/{targetRole}")
    public Mono<ResponseEntity<ApiResponse<List<EducationDto>>>> getEducationsByTargetRole(
            @PathVariable String targetRole) {
        return educationService.getEducationsByTargetRole(targetRole)
                .collectList()
                .map(educations -> ResponseEntity.ok(ApiResponse.success(educations)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<EducationDto>>> createEducation(
            @Valid @RequestBody EducationDto dto) {
        return educationService.createEducation(dto)
                .map(education -> ResponseEntity.ok(ApiResponse.success("Education created", education)));
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<EducationDto>>> updateEducation(
            @PathVariable String id,
            @Valid @RequestBody EducationDto dto) {
        return educationService.updateEducation(id, dto)
                .map(education -> ResponseEntity.ok(ApiResponse.success("Education updated", education)));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteEducation(@PathVariable String id) {
        return educationService.deleteEducation(id)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Education deleted", null))));
    }
}
