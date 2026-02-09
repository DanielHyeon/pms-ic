package com.insuretech.pms.collaboration.service;

import com.insuretech.pms.collaboration.dto.MeetingAgendaItemDto;
import com.insuretech.pms.collaboration.dto.MeetingDecisionDto;
import com.insuretech.pms.collaboration.dto.MeetingParticipantDto;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingAgendaItem;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingDecision;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingParticipant;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveMeetingAgendaItemRepository;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveMeetingDecisionRepository;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveMeetingParticipantRepository;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.repository.ReactiveMeetingRepository;
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
public class ReactiveMeetingExtensionService {

    private final ReactiveMeetingRepository meetingRepository;
    private final ReactiveMeetingParticipantRepository participantRepository;
    private final ReactiveMeetingAgendaItemRepository agendaItemRepository;
    private final ReactiveMeetingDecisionRepository decisionRepository;

    // ── Participant operations ──────────────────────────────────────────

    public Flux<MeetingParticipantDto> getParticipants(String meetingId) {
        return participantRepository.findByMeetingId(meetingId)
                .map(MeetingParticipantDto::from);
    }

    @Transactional
    public Mono<MeetingParticipantDto> addParticipant(String meetingId, MeetingParticipantDto request) {
        return verifyMeetingExists(meetingId)
                .then(participantRepository.findByMeetingIdAndUserId(meetingId, request.getUserId()))
                .flatMap(existing -> Mono.<MeetingParticipantDto>error(
                        CustomException.conflict("User already a participant of this meeting")))
                .switchIfEmpty(Mono.defer(() -> {
                    R2dbcMeetingParticipant entity = R2dbcMeetingParticipant.builder()
                            .id(UUID.randomUUID().toString())
                            .meetingId(meetingId)
                            .userId(request.getUserId())
                            .role(request.getRole() != null ? request.getRole() : "ATTENDEE")
                            .rsvpStatus(request.getRsvpStatus() != null ? request.getRsvpStatus() : "PENDING")
                            .attended(false)
                            .build();
                    return participantRepository.save(entity)
                            .map(MeetingParticipantDto::from);
                }))
                .doOnSuccess(dto -> log.info("Added participant {} to meeting {}", request.getUserId(), meetingId));
    }

    @Transactional
    public Mono<MeetingParticipantDto> updateParticipant(String meetingId, String participantId,
                                                         MeetingParticipantDto request) {
        return participantRepository.findById(participantId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Participant not found: " + participantId)))
                .flatMap(entity -> {
                    if (request.getRole() != null) entity.setRole(request.getRole());
                    if (request.getRsvpStatus() != null) entity.setRsvpStatus(request.getRsvpStatus());
                    if (request.getAttended() != null) entity.setAttended(request.getAttended());
                    return participantRepository.save(entity);
                })
                .map(MeetingParticipantDto::from);
    }

    @Transactional
    public Mono<Void> removeParticipant(String meetingId, String participantId) {
        return participantRepository.findById(participantId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Participant not found: " + participantId)))
                .flatMap(entity -> participantRepository.deleteById(participantId))
                .doOnSuccess(v -> log.info("Removed participant {} from meeting {}", participantId, meetingId));
    }

    // ── Agenda operations ───────────────────────────────────────────────

    public Flux<MeetingAgendaItemDto> getAgendaItems(String meetingId) {
        return agendaItemRepository.findByMeetingIdOrderByOrderNumAsc(meetingId)
                .map(MeetingAgendaItemDto::from);
    }

    @Transactional
    public Mono<MeetingAgendaItemDto> createAgendaItem(String meetingId, MeetingAgendaItemDto request) {
        return verifyMeetingExists(meetingId)
                .flatMap(meeting -> {
                    R2dbcMeetingAgendaItem entity = R2dbcMeetingAgendaItem.builder()
                            .id(UUID.randomUUID().toString())
                            .meetingId(meetingId)
                            .orderNum(request.getOrderNum() != null ? request.getOrderNum() : 0)
                            .title(request.getTitle())
                            .description(request.getDescription())
                            .durationMinutes(request.getDurationMinutes())
                            .presenterId(request.getPresenterId())
                            .status(request.getStatus() != null ? request.getStatus() : "PENDING")
                            .build();
                    return agendaItemRepository.save(entity);
                })
                .map(MeetingAgendaItemDto::from)
                .doOnSuccess(dto -> log.info("Created agenda item for meeting {}", meetingId));
    }

    @Transactional
    public Mono<MeetingAgendaItemDto> updateAgendaItem(String meetingId, String agendaItemId,
                                                        MeetingAgendaItemDto request) {
        return agendaItemRepository.findById(agendaItemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Agenda item not found: " + agendaItemId)))
                .flatMap(entity -> {
                    if (request.getOrderNum() != null) entity.setOrderNum(request.getOrderNum());
                    if (request.getTitle() != null) entity.setTitle(request.getTitle());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getDurationMinutes() != null) entity.setDurationMinutes(request.getDurationMinutes());
                    if (request.getPresenterId() != null) entity.setPresenterId(request.getPresenterId());
                    if (request.getStatus() != null) entity.setStatus(request.getStatus());
                    return agendaItemRepository.save(entity);
                })
                .map(MeetingAgendaItemDto::from);
    }

    @Transactional
    public Mono<Void> deleteAgendaItem(String meetingId, String agendaItemId) {
        return agendaItemRepository.findById(agendaItemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Agenda item not found: " + agendaItemId)))
                .flatMap(entity -> agendaItemRepository.deleteById(agendaItemId))
                .doOnSuccess(v -> log.info("Deleted agenda item {} from meeting {}", agendaItemId, meetingId));
    }

    // ── Decision operations ─────────────────────────────────────────────

    public Flux<MeetingDecisionDto> getDecisions(String meetingId) {
        return decisionRepository.findByMeetingId(meetingId)
                .map(MeetingDecisionDto::from);
    }

    @Transactional
    public Mono<MeetingDecisionDto> createDecision(String meetingId, MeetingDecisionDto request,
                                                    String userId) {
        return verifyMeetingExists(meetingId)
                .flatMap(meeting -> {
                    R2dbcMeetingDecision entity = R2dbcMeetingDecision.builder()
                            .id(UUID.randomUUID().toString())
                            .meetingId(meetingId)
                            .minutesId(request.getMinutesId())
                            .title(request.getTitle())
                            .description(request.getDescription())
                            .status(request.getStatus() != null ? request.getStatus() : "PROPOSED")
                            .linkedDecisionId(request.getLinkedDecisionId())
                            .build();
                    entity.setCreatedBy(userId);
                    return decisionRepository.save(entity);
                })
                .map(MeetingDecisionDto::from)
                .doOnSuccess(dto -> log.info("Created decision for meeting {}", meetingId));
    }

    @Transactional
    public Mono<MeetingDecisionDto> updateDecision(String meetingId, String decisionId,
                                                    MeetingDecisionDto request) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> {
                    if (request.getTitle() != null) entity.setTitle(request.getTitle());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getStatus() != null) entity.setStatus(request.getStatus());
                    if (request.getLinkedDecisionId() != null) entity.setLinkedDecisionId(request.getLinkedDecisionId());
                    return decisionRepository.save(entity);
                })
                .map(MeetingDecisionDto::from);
    }

    @Transactional
    public Mono<Void> deleteDecision(String meetingId, String decisionId) {
        return decisionRepository.findById(decisionId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Decision not found: " + decisionId)))
                .flatMap(entity -> decisionRepository.deleteById(decisionId))
                .doOnSuccess(v -> log.info("Deleted decision {} from meeting {}", decisionId, meetingId));
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private Mono<com.insuretech.pms.project.reactive.entity.R2dbcMeeting> verifyMeetingExists(String meetingId) {
        return meetingRepository.findById(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Meeting not found: " + meetingId)));
    }
}
