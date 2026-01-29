package com.insuretech.pms.project.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.project.dto.ProjectMemberDto;
import com.insuretech.pms.project.service.ReactiveProjectMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Tag(name = "Project Members", description = "Project member management API")
@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ReactiveProjectMemberController {

    private final ReactiveProjectMemberService memberService;

    @Operation(summary = "Get all members of a project")
    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<ProjectMemberDto>>>> getMembers(@PathVariable String projectId) {
        return memberService.getMembersByProject(projectId)
                .collectList()
                .map(members -> ResponseEntity.ok(ApiResponse.success(members)));
    }

    @Operation(summary = "Add a member to a project")
    @PostMapping
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<ProjectMemberDto>>> addMember(
            @PathVariable String projectId,
            @RequestBody Map<String, String> request) {
        String userId = request.get("userId");
        String role = request.get("role");
        return memberService.addMember(projectId, userId, role)
                .map(member -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Member added successfully", member)));
    }

    @Operation(summary = "Update a member's role")
    @PutMapping("/{memberId}")
    @PreAuthorize("hasAnyRole('SPONSOR', 'PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<ProjectMemberDto>>> updateMemberRole(
            @PathVariable String projectId,
            @PathVariable String memberId,
            @RequestBody Map<String, String> request) {
        String role = request.get("role");
        return memberService.updateMemberRole(projectId, memberId, role)
                .map(member -> ResponseEntity.ok(ApiResponse.success("Member role updated", member)));
    }

    @Operation(summary = "Remove a member from a project")
    @DeleteMapping("/{memberId}")
    @PreAuthorize("hasAnyRole('PMO_HEAD', 'PM')")
    public Mono<ResponseEntity<ApiResponse<Void>>> removeMember(
            @PathVariable String projectId,
            @PathVariable String memberId) {
        return memberService.removeMember(projectId, memberId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Member removed successfully", null))));
    }
}
