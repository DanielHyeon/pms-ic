package com.insuretech.pms.project.service;

import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.ProjectMemberDto;
import com.insuretech.pms.project.reactive.entity.R2dbcProjectMember;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectMemberRepository;
import com.insuretech.pms.project.reactive.repository.ReactiveProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveProjectMemberService {

    private final ReactiveProjectMemberRepository memberRepository;
    private final ReactiveProjectRepository projectRepository;
    private final ReactiveUserRepository userRepository;

    public Flux<ProjectMemberDto> getMembersByProject(String projectId) {
        return memberRepository.findByProjectIdAndActiveTrue(projectId)
                .flatMap(member -> userRepository.findById(member.getUserId())
                        .map(user -> ProjectMemberDto.from(member, user.getName(), user.getEmail(), user.getDepartment()))
                        .defaultIfEmpty(ProjectMemberDto.from(member)));
    }

    @Transactional
    public Mono<ProjectMemberDto> addMember(String projectId, String userId, String role) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> memberRepository.findByProjectIdAndUserId(projectId, userId)
                        .flatMap(existing -> Mono.<R2dbcProjectMember>error(CustomException.badRequest("User is already a member")))
                        .switchIfEmpty(Mono.defer(() -> {
                            R2dbcProjectMember member = R2dbcProjectMember.builder()
                                    .id(UUID.randomUUID().toString())
                                    .projectId(projectId)
                                    .userId(userId)
                                    .role(role)
                                    .build();
                            return memberRepository.save(member);
                        })))
                .flatMap(member -> userRepository.findById(member.getUserId())
                        .map(user -> ProjectMemberDto.from(member, user.getName(), user.getEmail(), user.getDepartment()))
                        .defaultIfEmpty(ProjectMemberDto.from(member)))
                .doOnSuccess(dto -> log.info("Added member {} to project {}", userId, projectId));
    }

    @Transactional
    public Mono<ProjectMemberDto> updateMemberRole(String projectId, String memberId, String role) {
        return memberRepository.findById(memberId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Member not found: " + memberId)))
                .flatMap(member -> {
                    member.setRole(role);
                    return memberRepository.save(member);
                })
                .flatMap(member -> userRepository.findById(member.getUserId())
                        .map(user -> ProjectMemberDto.from(member, user.getName(), user.getEmail(), user.getDepartment()))
                        .defaultIfEmpty(ProjectMemberDto.from(member)))
                .doOnSuccess(dto -> log.info("Updated member {} role to {}", memberId, role));
    }

    @Transactional
    public Mono<Void> removeMember(String projectId, String memberId) {
        return memberRepository.findById(memberId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Member not found: " + memberId)))
                .flatMap(member -> memberRepository.deleteById(memberId))
                .doOnSuccess(v -> log.info("Removed member {} from project {}", memberId, projectId));
    }
}
