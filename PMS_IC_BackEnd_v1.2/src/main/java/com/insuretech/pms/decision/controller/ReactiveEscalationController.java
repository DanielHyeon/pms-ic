package com.insuretech.pms.decision.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.decision.dto.EscalationChainDto;
import com.insuretech.pms.decision.dto.EscalationRequest;
import com.insuretech.pms.decision.service.ReactiveEscalationService;
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

@Tag(name = "Escalations", description = "Escalation chain management API")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/escalations")
@RequiredArgsConstructor
public class ReactiveEscalationController {

    private final ReactiveEscalationService escalationService;

    @Operation(summary = "Create an escalation link")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EscalationChainDto.Link>>> createEscalation(
            @PathVariable String projectId,
            @Valid @RequestBody EscalationRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return escalationService.createEscalation(projectId, request, user.getUsername())
                .map(link -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Escalation created", link)));
    }

    @Operation(summary = "Get escalation chain for an entity")
    @GetMapping("/chain/{entityType}/{entityId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<EscalationChainDto>>> getEscalationChain(
            @PathVariable String projectId,
            @PathVariable String entityType,
            @PathVariable String entityId) {
        return escalationService.getEscalationChain(entityType, entityId)
                .map(chain -> ResponseEntity.ok(ApiResponse.success(chain)));
    }
}
