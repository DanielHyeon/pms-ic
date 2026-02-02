package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.DeliverableDto;
import com.insuretech.pms.project.service.ReactiveDeliverableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Tag(name = "Deliverables", description = "Deliverable management API")
@RestController
@RequiredArgsConstructor
public class ReactiveDeliverableController {

    private final ReactiveDeliverableService deliverableService;

    @Operation(summary = "Get all deliverables for a phase")
    @GetMapping("/api/phases/{phaseId}/deliverables")
    public Mono<ResponseEntity<ApiResponse<List<DeliverableDto>>>> getDeliverables(@PathVariable String phaseId) {
        return deliverableService.getDeliverablesByPhase(phaseId)
                .collectList()
                .map(deliverables -> ResponseEntity.ok(ApiResponse.success(deliverables)));
    }

    @Operation(summary = "Create a deliverable")
    @PostMapping("/api/phases/{phaseId}/deliverables")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DeliverableDto>>> createDeliverable(
            @PathVariable String phaseId,
            @Valid @RequestBody DeliverableDto request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String uploadedBy = userDetails != null ? userDetails.getUsername() : "anonymous";
        return deliverableService.createDeliverable(phaseId, request, uploadedBy)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Deliverable created", created)));
    }

    @Operation(summary = "Update a deliverable")
    @PutMapping("/api/phases/{phaseId}/deliverables/{deliverableId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<DeliverableDto>>> updateDeliverable(
            @PathVariable String phaseId,
            @PathVariable String deliverableId,
            @Valid @RequestBody DeliverableDto request) {
        return deliverableService.updateDeliverable(deliverableId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Deliverable updated", updated)));
    }

    @Operation(summary = "Approve or reject a deliverable")
    @PostMapping("/api/deliverables/{deliverableId}/approval")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<DeliverableDto>>> approveDeliverable(
            @PathVariable String deliverableId,
            @RequestBody Map<String, Boolean> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean approved = request.getOrDefault("approved", false);
        String approver = userDetails != null ? userDetails.getUsername() : "anonymous";
        return deliverableService.approveDeliverable(deliverableId, approved, approver)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(
                        approved ? "Deliverable approved" : "Deliverable rejected", dto)));
    }
}
