package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.MeetingDto;
import com.insuretech.pms.project.reactive.entity.R2dbcMeeting;
import com.insuretech.pms.project.reactive.repository.ReactiveMeetingRepository;
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
public class ReactiveMeetingService {

    private final ReactiveMeetingRepository meetingRepository;
    private final ReactiveProjectRepository projectRepository;

    public Flux<MeetingDto> getMeetingsByProject(String projectId) {
        return meetingRepository.findByProjectIdOrderByScheduledAtDesc(projectId)
                .map(MeetingDto::from);
    }

    public Mono<MeetingDto> getMeetingById(String meetingId) {
        return meetingRepository.findById(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Meeting not found: " + meetingId)))
                .map(MeetingDto::from);
    }

    @Transactional
    public Mono<MeetingDto> createMeeting(String projectId, MeetingDto request) {
        return projectRepository.findById(projectId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Project not found: " + projectId)))
                .flatMap(project -> {
                    R2dbcMeeting meeting = R2dbcMeeting.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .title(request.getTitle())
                            .description(request.getDescription())
                            .meetingType(request.getMeetingType())
                            .status(request.getStatus() != null ? request.getStatus() : "SCHEDULED")
                            .scheduledAt(request.getScheduledAt())
                            .location(request.getLocation())
                            .organizer(request.getOrganizer())
                            .attendees(request.getAttendees())
                            .build();
                    return meetingRepository.save(meeting);
                })
                .map(MeetingDto::from)
                .doOnSuccess(dto -> log.info("Created meeting: {} for project: {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<MeetingDto> updateMeeting(String meetingId, MeetingDto request) {
        return meetingRepository.findById(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Meeting not found: " + meetingId)))
                .flatMap(meeting -> {
                    if (request.getTitle() != null) meeting.setTitle(request.getTitle());
                    if (request.getDescription() != null) meeting.setDescription(request.getDescription());
                    if (request.getMeetingType() != null) meeting.setMeetingType(request.getMeetingType());
                    if (request.getStatus() != null) meeting.setStatus(request.getStatus());
                    if (request.getScheduledAt() != null) meeting.setScheduledAt(request.getScheduledAt());
                    if (request.getLocation() != null) meeting.setLocation(request.getLocation());
                    if (request.getAttendees() != null) meeting.setAttendees(request.getAttendees());
                    if (request.getMinutes() != null) meeting.setMinutes(request.getMinutes());
                    if (request.getActualStartAt() != null) meeting.setActualStartAt(request.getActualStartAt());
                    if (request.getActualEndAt() != null) meeting.setActualEndAt(request.getActualEndAt());
                    return meetingRepository.save(meeting);
                })
                .map(MeetingDto::from)
                .doOnSuccess(dto -> log.info("Updated meeting: {}", meetingId));
    }

    @Transactional
    public Mono<Void> deleteMeeting(String meetingId) {
        return meetingRepository.findById(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Meeting not found: " + meetingId)))
                .flatMap(meeting -> meetingRepository.deleteById(meetingId))
                .doOnSuccess(v -> log.info("Deleted meeting: {}", meetingId));
    }
}
