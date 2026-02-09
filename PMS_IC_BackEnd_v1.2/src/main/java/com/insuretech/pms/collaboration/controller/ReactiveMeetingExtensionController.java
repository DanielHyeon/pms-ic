package com.insuretech.pms.collaboration.controller;

import com.insuretech.pms.collaboration.dto.*;
import com.insuretech.pms.collaboration.service.ReactiveMeetingActionItemService;
import com.insuretech.pms.collaboration.service.ReactiveMeetingExtensionService;
import com.insuretech.pms.collaboration.service.ReactiveMeetingMinutesService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Tag(name = "Meeting Extensions", description = "Participants, agenda, minutes, decisions, and action items")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/meetings/{meetingId}")
@RequiredArgsConstructor
public class ReactiveMeetingExtensionController {

    private final ReactiveMeetingExtensionService extensionService;
    private final ReactiveMeetingMinutesService minutesService;
    private final ReactiveMeetingActionItemService actionItemService;

    // ── Participants ────────────────────────────────────────────────────

    @Operation(summary = "List all participants of a meeting")
    @GetMapping("/participants")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<MeetingParticipantDto>>>> getParticipants(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return extensionService.getParticipants(meetingId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Add a participant to a meeting")
    @PostMapping("/participants")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingParticipantDto>>> addParticipant(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @RequestBody MeetingParticipantDto request) {
        return extensionService.addParticipant(meetingId, request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Participant added", dto)));
    }

    @Operation(summary = "Update a participant (role, RSVP, attendance)")
    @PutMapping("/participants/{participantId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingParticipantDto>>> updateParticipant(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String participantId,
            @RequestBody MeetingParticipantDto request) {
        return extensionService.updateParticipant(meetingId, participantId, request)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Participant updated", dto)));
    }

    @Operation(summary = "Remove a participant from a meeting")
    @DeleteMapping("/participants/{participantId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> removeParticipant(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String participantId) {
        return extensionService.removeParticipant(meetingId, participantId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Participant removed", null))));
    }

    // ── Agenda Items ────────────────────────────────────────────────────

    @Operation(summary = "List agenda items for a meeting (ordered)")
    @GetMapping("/agenda")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<MeetingAgendaItemDto>>>> getAgendaItems(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return extensionService.getAgendaItems(meetingId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Create an agenda item")
    @PostMapping("/agenda")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingAgendaItemDto>>> createAgendaItem(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @RequestBody MeetingAgendaItemDto request) {
        return extensionService.createAgendaItem(meetingId, request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Agenda item created", dto)));
    }

    @Operation(summary = "Update an agenda item")
    @PutMapping("/agenda/{agendaItemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingAgendaItemDto>>> updateAgendaItem(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String agendaItemId,
            @RequestBody MeetingAgendaItemDto request) {
        return extensionService.updateAgendaItem(meetingId, agendaItemId, request)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Agenda item updated", dto)));
    }

    @Operation(summary = "Delete an agenda item")
    @DeleteMapping("/agenda/{agendaItemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteAgendaItem(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String agendaItemId) {
        return extensionService.deleteAgendaItem(meetingId, agendaItemId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Agenda item deleted", null))));
    }

    // ── Minutes ─────────────────────────────────────────────────────────

    @Operation(summary = "Get minutes for a meeting")
    @GetMapping("/minutes")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingMinutesDto>>> getMinutes(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return minutesService.getMinutes(meetingId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Create or update meeting minutes")
    @PutMapping("/minutes")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingMinutesDto>>> saveMinutes(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @RequestBody MeetingMinutesDto request) {
        return currentUserId()
                .flatMap(userId -> minutesService.createOrUpdateMinutes(meetingId, request, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Minutes saved", dto)));
    }

    @Operation(summary = "Confirm meeting minutes")
    @PostMapping("/minutes/confirm")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingMinutesDto>>> confirmMinutes(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return currentUserId()
                .flatMap(userId -> minutesService.confirmMinutes(meetingId, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Minutes confirmed", dto)));
    }

    @Operation(summary = "Delete meeting minutes")
    @DeleteMapping("/minutes")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteMinutes(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return minutesService.deleteMinutes(meetingId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Minutes deleted", null))));
    }

    // ── Decisions ───────────────────────────────────────────────────────

    @Operation(summary = "List decisions for a meeting")
    @GetMapping("/decisions")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<MeetingDecisionDto>>>> getDecisions(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return extensionService.getDecisions(meetingId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Create a decision")
    @PostMapping("/decisions")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingDecisionDto>>> createDecision(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @RequestBody MeetingDecisionDto request) {
        return currentUserId()
                .flatMap(userId -> extensionService.createDecision(meetingId, request, userId))
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Decision created", dto)));
    }

    @Operation(summary = "Update a decision")
    @PutMapping("/decisions/{decisionId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingDecisionDto>>> updateDecision(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String decisionId,
            @RequestBody MeetingDecisionDto request) {
        return extensionService.updateDecision(meetingId, decisionId, request)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Decision updated", dto)));
    }

    @Operation(summary = "Delete a decision")
    @DeleteMapping("/decisions/{decisionId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteDecision(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String decisionId) {
        return extensionService.deleteDecision(meetingId, decisionId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Decision deleted", null))));
    }

    // ── Action Items ────────────────────────────────────────────────────

    @Operation(summary = "List action items for a meeting")
    @GetMapping("/action-items")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<MeetingActionItemDto>>>> getActionItems(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return actionItemService.getActionItems(meetingId)
                .collectList()
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Create an action item")
    @PostMapping("/action-items")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingActionItemDto>>> createActionItem(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @RequestBody MeetingActionItemDto request) {
        return currentUserId()
                .flatMap(userId -> actionItemService.createActionItem(meetingId, request, userId))
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Action item created", dto)));
    }

    @Operation(summary = "Update an action item")
    @PutMapping("/action-items/{actionItemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingActionItemDto>>> updateActionItem(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String actionItemId,
            @RequestBody MeetingActionItemDto request) {
        return currentUserId()
                .flatMap(userId -> actionItemService.updateActionItem(meetingId, actionItemId, request, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Action item updated", dto)));
    }

    @Operation(summary = "Update action item status")
    @PatchMapping("/action-items/{actionItemId}/status")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingActionItemDto>>> updateActionItemStatus(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String actionItemId,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        return currentUserId()
                .flatMap(userId -> actionItemService.updateStatus(meetingId, actionItemId, newStatus, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Status updated", dto)));
    }

    @Operation(summary = "Delete an action item")
    @DeleteMapping("/action-items/{actionItemId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteActionItem(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @PathVariable String actionItemId) {
        return actionItemService.deleteActionItem(meetingId, actionItemId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Action item deleted", null))));
    }

    // ── Helper ──────────────────────────────────────────────────────────

    private Mono<String> currentUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .defaultIfEmpty("anonymous");
    }
}
