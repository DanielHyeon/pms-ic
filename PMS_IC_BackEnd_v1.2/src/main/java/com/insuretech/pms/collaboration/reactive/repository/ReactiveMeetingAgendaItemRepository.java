package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingAgendaItem;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveMeetingAgendaItemRepository extends ReactiveCrudRepository<R2dbcMeetingAgendaItem, String> {

    Flux<R2dbcMeetingAgendaItem> findByMeetingIdOrderByOrderNumAsc(String meetingId);

    Mono<Void> deleteByMeetingId(String meetingId);
}
