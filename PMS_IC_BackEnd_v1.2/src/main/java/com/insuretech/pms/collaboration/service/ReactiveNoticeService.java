package com.insuretech.pms.collaboration.service;

import com.insuretech.pms.collaboration.dto.NoticeDto;
import com.insuretech.pms.collaboration.dto.NoticeSummaryDto;
import com.insuretech.pms.collaboration.reactive.entity.R2dbcNotice;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveNoticeReadStateRepository;
import com.insuretech.pms.collaboration.reactive.repository.ReactiveNoticeRepository;
import com.insuretech.pms.common.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveNoticeService {

    private final ReactiveNoticeRepository noticeRepository;
    private final ReactiveNoticeReadStateRepository readStateRepository;

    public Flux<NoticeSummaryDto> getNotices(String projectId, String status, String userId) {
        Flux<R2dbcNotice> notices;
        if (status != null && !status.isBlank()) {
            notices = noticeRepository.findByProjectIdAndStatusOrderByPinnedDescCreatedAtDesc(projectId, status);
        } else {
            notices = noticeRepository.findByProjectIdOrderByPinnedDescCreatedAtDesc(projectId);
        }

        return notices.flatMap(notice -> {
            NoticeSummaryDto dto = NoticeSummaryDto.from(notice);
            if (userId != null) {
                return readStateRepository.findByNoticeIdAndUserId(notice.getId(), userId)
                        .map(rs -> {
                            dto.setRead(true);
                            return dto;
                        })
                        .defaultIfEmpty(dto)
                        .doOnNext(d -> {
                            if (d.getRead() == null) d.setRead(false);
                        });
            }
            return Mono.just(dto);
        });
    }

    public Mono<NoticeDto> getNoticeById(String noticeId, String userId) {
        return noticeRepository.findById(noticeId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Notice not found: " + noticeId)))
                .flatMap(notice -> {
                    NoticeDto dto = NoticeDto.from(notice);
                    if (userId != null) {
                        return readStateRepository.findByNoticeIdAndUserId(noticeId, userId)
                                .map(rs -> {
                                    dto.setRead(true);
                                    return dto;
                                })
                                .defaultIfEmpty(dto)
                                .doOnNext(d -> {
                                    if (d.getRead() == null) d.setRead(false);
                                });
                    }
                    return Mono.just(dto);
                });
    }

    @Transactional
    public Mono<NoticeDto> createNotice(String projectId, NoticeDto request, String userId) {
        R2dbcNotice entity = R2dbcNotice.builder()
                .id(UUID.randomUUID().toString())
                .projectId(projectId)
                .title(request.getTitle())
                .content(request.getContent())
                .priority(request.getPriority() != null ? request.getPriority() : "NORMAL")
                .category(request.getCategory() != null ? request.getCategory() : "GENERAL")
                .status("DRAFT")
                .pinned(request.getPinned() != null ? request.getPinned() : false)
                .expiresAt(request.getExpiresAt())
                .build();
        entity.setCreatedBy(userId);

        return noticeRepository.save(entity)
                .map(NoticeDto::from)
                .doOnSuccess(dto -> log.info("Created notice {} in project {}", dto.getId(), projectId));
    }

    @Transactional
    public Mono<NoticeDto> updateNotice(String noticeId, NoticeDto request, String userId) {
        return noticeRepository.findById(noticeId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Notice not found: " + noticeId)))
                .flatMap(entity -> {
                    if (request.getTitle() != null) entity.setTitle(request.getTitle());
                    if (request.getContent() != null) entity.setContent(request.getContent());
                    if (request.getPriority() != null) entity.setPriority(request.getPriority());
                    if (request.getCategory() != null) entity.setCategory(request.getCategory());
                    if (request.getPinned() != null) entity.setPinned(request.getPinned());
                    if (request.getExpiresAt() != null) entity.setExpiresAt(request.getExpiresAt());
                    entity.setUpdatedBy(userId);
                    return noticeRepository.save(entity);
                })
                .map(NoticeDto::from)
                .doOnSuccess(dto -> log.info("Updated notice {}", noticeId));
    }

    @Transactional
    public Mono<NoticeDto> publishNotice(String noticeId, String userId) {
        return noticeRepository.findById(noticeId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Notice not found: " + noticeId)))
                .flatMap(entity -> {
                    if ("PUBLISHED".equals(entity.getStatus())) {
                        return Mono.error(CustomException.conflict("Notice is already published"));
                    }
                    entity.setStatus("PUBLISHED");
                    entity.setPublishedAt(LocalDateTime.now());
                    entity.setPublishedBy(userId);
                    entity.setUpdatedBy(userId);
                    return noticeRepository.save(entity);
                })
                .map(NoticeDto::from)
                .doOnSuccess(dto -> log.info("Published notice {} by user {}", noticeId, userId));
    }

    @Transactional
    public Mono<NoticeDto> archiveNotice(String noticeId, String userId) {
        return noticeRepository.findById(noticeId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Notice not found: " + noticeId)))
                .flatMap(entity -> {
                    entity.setStatus("ARCHIVED");
                    entity.setUpdatedBy(userId);
                    return noticeRepository.save(entity);
                })
                .map(NoticeDto::from)
                .doOnSuccess(dto -> log.info("Archived notice {}", noticeId));
    }

    @Transactional
    public Mono<Void> deleteNotice(String noticeId) {
        return noticeRepository.findById(noticeId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Notice not found: " + noticeId)))
                .flatMap(entity -> noticeRepository.deleteById(noticeId))
                .doOnSuccess(v -> log.info("Deleted notice {}", noticeId));
    }

    // ── Read tracking ───────────────────────────────────────────────────

    @Transactional
    public Mono<Void> markAsRead(String noticeId, String userId) {
        return noticeRepository.findById(noticeId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Notice not found: " + noticeId)))
                .then(readStateRepository.markAsRead(noticeId, userId))
                .doOnSuccess(v -> log.debug("Marked notice {} as read by user {}", noticeId, userId));
    }

    public Mono<Long> getUnreadCount(String projectId, String userId) {
        return noticeRepository.findByProjectIdAndStatusOrderByPinnedDescCreatedAtDesc(projectId, "PUBLISHED")
                .flatMap(notice ->
                        readStateRepository.findByNoticeIdAndUserId(notice.getId(), userId)
                                .map(rs -> 0L)
                                .defaultIfEmpty(1L))
                .reduce(0L, Long::sum);
    }
}
