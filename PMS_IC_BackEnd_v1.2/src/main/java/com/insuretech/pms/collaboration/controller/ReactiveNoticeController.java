package com.insuretech.pms.collaboration.controller;

import com.insuretech.pms.collaboration.dto.NoticeDto;
import com.insuretech.pms.collaboration.dto.NoticeSummaryDto;
import com.insuretech.pms.collaboration.service.ReactiveNoticeService;
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

@Tag(name = "Notices", description = "Project notice management and read tracking")
@RestController
@RequestMapping("/api/v2/projects/{projectId}/notices")
@RequiredArgsConstructor
public class ReactiveNoticeController {

    private final ReactiveNoticeService noticeService;

    @Operation(summary = "List notices for a project (optionally filter by status)")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<List<NoticeSummaryDto>>>> getNotices(
            @PathVariable String projectId,
            @RequestParam(required = false) String status) {
        return currentUserId()
                .flatMap(userId -> noticeService.getNotices(projectId, status, userId).collectList())
                .map(list -> ResponseEntity.ok(ApiResponse.success(list)));
    }

    @Operation(summary = "Get a single notice by ID")
    @GetMapping("/{noticeId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<NoticeDto>>> getNotice(
            @PathVariable String projectId,
            @PathVariable String noticeId) {
        return currentUserId()
                .flatMap(userId -> noticeService.getNoticeById(noticeId, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)));
    }

    @Operation(summary = "Create a new notice (DRAFT)")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<NoticeDto>>> createNotice(
            @PathVariable String projectId,
            @RequestBody NoticeDto request) {
        return currentUserId()
                .flatMap(userId -> noticeService.createNotice(projectId, request, userId))
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Notice created", dto)));
    }

    @Operation(summary = "Update a notice")
    @PutMapping("/{noticeId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<NoticeDto>>> updateNotice(
            @PathVariable String projectId,
            @PathVariable String noticeId,
            @RequestBody NoticeDto request) {
        return currentUserId()
                .flatMap(userId -> noticeService.updateNotice(noticeId, request, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Notice updated", dto)));
    }

    @Operation(summary = "Publish a notice")
    @PostMapping("/{noticeId}/publish")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<NoticeDto>>> publishNotice(
            @PathVariable String projectId,
            @PathVariable String noticeId) {
        return currentUserId()
                .flatMap(userId -> noticeService.publishNotice(noticeId, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Notice published", dto)));
    }

    @Operation(summary = "Archive a notice")
    @PostMapping("/{noticeId}/archive")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<NoticeDto>>> archiveNotice(
            @PathVariable String projectId,
            @PathVariable String noticeId) {
        return currentUserId()
                .flatMap(userId -> noticeService.archiveNotice(noticeId, userId))
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Notice archived", dto)));
    }

    @Operation(summary = "Delete a notice")
    @DeleteMapping("/{noticeId}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteNotice(
            @PathVariable String projectId,
            @PathVariable String noticeId) {
        return noticeService.deleteNotice(noticeId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Notice deleted", null))));
    }

    @Operation(summary = "Mark a notice as read")
    @PostMapping("/{noticeId}/read")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Void>>> markAsRead(
            @PathVariable String projectId,
            @PathVariable String noticeId) {
        return currentUserId()
                .flatMap(userId -> noticeService.markAsRead(noticeId, userId))
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Marked as read", null))));
    }

    @Operation(summary = "Get unread notice count for the current user")
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public Mono<ResponseEntity<ApiResponse<Long>>> getUnreadCount(
            @PathVariable String projectId) {
        return currentUserId()
                .flatMap(userId -> noticeService.getUnreadCount(projectId, userId))
                .map(count -> ResponseEntity.ok(ApiResponse.success(count)));
    }

    // ── Helper ──────────────────────────────────────────────────────────

    private Mono<String> currentUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .defaultIfEmpty("anonymous");
    }
}
