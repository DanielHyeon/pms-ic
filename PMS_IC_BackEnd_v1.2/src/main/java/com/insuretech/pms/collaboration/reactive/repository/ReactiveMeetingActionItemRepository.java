package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingActionItem;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveMeetingActionItemRepository extends ReactiveCrudRepository<R2dbcMeetingActionItem, String> {

    Flux<R2dbcMeetingActionItem> findByMeetingId(String meetingId);

    Flux<R2dbcMeetingActionItem> findByAssigneeId(String assigneeId);

    Flux<R2dbcMeetingActionItem> findByMeetingIdAndStatus(String meetingId, String status);

    Flux<R2dbcMeetingActionItem> findByAssigneeIdAndStatus(String assigneeId, String status);

    Mono<Void> deleteByMeetingId(String meetingId);
}
