package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.MeetingDto;
import com.insuretech.pms.project.service.ReactiveMeetingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Tag(name = "Meetings", description = "Meeting management API")
@RestController
@RequestMapping("/api/projects/{projectId}/meetings")
@RequiredArgsConstructor
public class ReactiveMeetingController {

    private final ReactiveMeetingService meetingService;

    @Operation(summary = "Get all meetings for a project")
    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<MeetingDto>>>> getMeetings(@PathVariable String projectId) {
        return meetingService.getMeetingsByProject(projectId)
                .collectList()
                .map(meetings -> ResponseEntity.ok(ApiResponse.success(meetings)));
    }

    @Operation(summary = "Create a meeting")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingDto>>> createMeeting(
            @PathVariable String projectId,
            @Valid @RequestBody MeetingDto request) {
        return meetingService.createMeeting(projectId, request)
                .map(created -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Meeting created", created)));
    }

    @Operation(summary = "Update a meeting")
    @PutMapping("/{meetingId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<MeetingDto>>> updateMeeting(
            @PathVariable String projectId,
            @PathVariable String meetingId,
            @Valid @RequestBody MeetingDto request) {
        return meetingService.updateMeeting(meetingId, request)
                .map(updated -> ResponseEntity.ok(ApiResponse.success("Meeting updated", updated)));
    }

    @Operation(summary = "Delete a meeting")
    @DeleteMapping("/{meetingId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteMeeting(
            @PathVariable String projectId,
            @PathVariable String meetingId) {
        return meetingService.deleteMeeting(meetingId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Meeting deleted", null))));
    }
}
