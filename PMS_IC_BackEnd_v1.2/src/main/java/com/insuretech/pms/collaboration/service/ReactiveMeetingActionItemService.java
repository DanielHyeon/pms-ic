package com.insuretech.pms.collaboration.service;

import com.insuretech.pms.collaboration.dto.MeetingActionItemDto;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingActionItem;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveMeetingActionItemRepository;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.reactive.repository.ReactiveMeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveMeetingActionItemService {

    private final ReactiveMeetingRepository meetingRepository;
    private final ReactiveMeetingActionItemRepository actionItemRepository;

    private static final Set<String> VALID_STATUSES = Set.of("OPEN", "IN_PROGRESS", "DONE", "CANCELLED");

    public Flux<MeetingActionItemDto> getActionItems(String meetingId) {
        return actionItemRepository.findByMeetingId(meetingId)
                .map(MeetingActionItemDto::from);
    }

    public Flux<MeetingActionItemDto> getActionItemsByAssignee(String assigneeId) {
        return actionItemRepository.findByAssigneeId(assigneeId)
                .map(MeetingActionItemDto::from);
    }

    @Transactional
    public Mono<MeetingActionItemDto> createActionItem(String meetingId, MeetingActionItemDto request,
                                                        String userId) {
        return meetingRepository.findById(meetingId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Meeting not found: " + meetingId)))
                .flatMap(meeting -> {
                    R2dbcMeetingActionItem entity = R2dbcMeetingActionItem.builder()
                            .id(UUID.randomUUID().toString())
                            .meetingId(meetingId)
                            .minutesId(request.getMinutesId())
                            .title(request.getTitle())
                            .description(request.getDescription())
                            .assigneeId(request.getAssigneeId())
                            .dueDate(request.getDueDate())
                            .status("OPEN")
                            .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                            .linkedIssueId(request.getLinkedIssueId())
                            .linkedTaskId(request.getLinkedTaskId())
                            .build();
                    entity.setCreatedBy(userId);
                    return actionItemRepository.save(entity);
                })
                .map(MeetingActionItemDto::from)
                .doOnSuccess(dto -> log.info("Created action item for meeting {}", meetingId));
    }

    @Transactional
    public Mono<MeetingActionItemDto> updateActionItem(String meetingId, String actionItemId,
                                                        MeetingActionItemDto request, String userId) {
        return actionItemRepository.findById(actionItemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Action item not found: " + actionItemId)))
                .flatMap(entity -> {
                    if (request.getTitle() != null) entity.setTitle(request.getTitle());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getAssigneeId() != null) entity.setAssigneeId(request.getAssigneeId());
                    if (request.getDueDate() != null) entity.setDueDate(request.getDueDate());
                    if (request.getPriority() != null) entity.setPriority(request.getPriority());
                    if (request.getLinkedIssueId() != null) entity.setLinkedIssueId(request.getLinkedIssueId());
                    if (request.getLinkedTaskId() != null) entity.setLinkedTaskId(request.getLinkedTaskId());
                    if (request.getStatus() != null) {
                        validateStatusTransition(entity.getStatus(), request.getStatus());
                        entity.setStatus(request.getStatus());
                    }
                    entity.setUpdatedBy(userId);
                    return actionItemRepository.save(entity);
                })
                .map(MeetingActionItemDto::from);
    }

    @Transactional
    public Mono<MeetingActionItemDto> updateStatus(String meetingId, String actionItemId,
                                                    String newStatus, String userId) {
        return actionItemRepository.findById(actionItemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Action item not found: " + actionItemId)))
                .flatMap(entity -> {
                    validateStatusTransition(entity.getStatus(), newStatus);
                    entity.setStatus(newStatus);
                    entity.setUpdatedBy(userId);
                    return actionItemRepository.save(entity);
                })
                .map(MeetingActionItemDto::from)
                .doOnSuccess(dto -> log.info("Updated action item {} status to {} in meeting {}",
                        actionItemId, newStatus, meetingId));
    }

    @Transactional
    public Mono<Void> deleteActionItem(String meetingId, String actionItemId) {
        return actionItemRepository.findById(actionItemId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Action item not found: " + actionItemId)))
                .flatMap(entity -> actionItemRepository.deleteById(actionItemId))
                .doOnSuccess(v -> log.info("Deleted action item {} from meeting {}", actionItemId, meetingId));
    }

    private void validateStatusTransition(String currentStatus, String newStatus) {
        if (!VALID_STATUSES.contains(newStatus)) {
            throw CustomException.badRequest("Invalid status: " + newStatus
                    + ". Valid statuses: " + VALID_STATUSES);
        }
        if ("DONE".equals(currentStatus) || "CANCELLED".equals(currentStatus)) {
            if (!"OPEN".equals(newStatus)) {
                throw CustomException.conflict(
                        "Cannot transition from " + currentStatus + " to " + newStatus
                                + ". Reopen (set to OPEN) first.");
            }
        }
    }
}
