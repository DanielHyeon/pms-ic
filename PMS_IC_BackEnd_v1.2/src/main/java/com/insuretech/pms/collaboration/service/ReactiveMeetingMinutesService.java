package com.insuretech.pms.collaboration.service;

import com.insuretech.pms.collaboration.dto.MeetingMinutesDto;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingMinutes;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveMeetingMinutesRepository;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.repository.ReactiveMeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveMeetingMinutesService {

    private final ReactiveMeetingRepository meetingRepository;
    private final ReactiveMeetingMinutesRepository minutesRepository;

    public Mono<MeetingMinutesDto> getMinutes(String meetingId) {
        return minutesRepository.findByMeetingId(meetingId)
                .map(MeetingMinutesDto::from)
                .switchIfEmpty(Mono.error(CustomException.notFound("Minutes not found for meeting: " + meetingId)));
    }

    @Transactional
    public Mono<MeetingMinutesDto> createOrUpdateMinutes(String meetingId, MeetingMinutesDto request,
                                                          String userId) {
        return meetingRepository.findById(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Meeting not found: " + meetingId)))
                .then(minutesRepository.findByMeetingId(meetingId))
                .flatMap(existing -> {
                    // Update existing minutes
                    if (request.getContent() != null) existing.setContent(request.getContent());
                    if (request.getGenerationMethod() != null) existing.setGenerationMethod(request.getGenerationMethod());
                    if (request.getStatus() != null) existing.setStatus(request.getStatus());
                    existing.setUpdatedBy(userId);
                    return minutesRepository.save(existing);
                })
                .switchIfEmpty(Mono.defer(() -> {
                    // Create new minutes
                    R2dbcMeetingMinutes entity = R2dbcMeetingMinutes.builder()
                            .id(UUID.randomUUID().toString())
                            .meetingId(meetingId)
                            .content(request.getContent())
                            .generationMethod(request.getGenerationMethod() != null
                                    ? request.getGenerationMethod() : "MANUAL")
                            .status("DRAFT")
                            .build();
                    entity.setCreatedBy(userId);
                    return minutesRepository.save(entity);
                }))
                .map(MeetingMinutesDto::from)
                .doOnSuccess(dto -> log.info("Saved minutes for meeting {}", meetingId));
    }

    @Transactional
    public Mono<MeetingMinutesDto> confirmMinutes(String meetingId, String userId) {
        return minutesRepository.findByMeetingId(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Minutes not found for meeting: " + meetingId)))
                .flatMap(minutes -> {
                    if ("CONFIRMED".equals(minutes.getStatus())) {
                        return Mono.error(CustomException.conflict("Minutes are already confirmed"));
                    }
                    minutes.setStatus("CONFIRMED");
                    minutes.setConfirmedBy(userId);
                    minutes.setConfirmedAt(LocalDateTime.now());
                    minutes.setUpdatedBy(userId);
                    return minutesRepository.save(minutes);
                })
                .map(MeetingMinutesDto::from)
                .doOnSuccess(dto -> log.info("Confirmed minutes for meeting {} by user {}", meetingId, userId));
    }

    @Transactional
    public Mono<Void> deleteMinutes(String meetingId) {
        return minutesRepository.findByMeetingId(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Minutes not found for meeting: " + meetingId)))
                .flatMap(minutes -> minutesRepository.deleteById(minutes.getId()))
                .doOnSuccess(v -> log.info("Deleted minutes for meeting {}", meetingId));
    }
}
