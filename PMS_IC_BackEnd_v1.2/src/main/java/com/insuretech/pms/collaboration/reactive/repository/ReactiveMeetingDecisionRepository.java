package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingDecision;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveMeetingDecisionRepository extends ReactiveCrudRepository<R2dbcMeetingDecision, String> {

    Flux<R2dbcMeetingDecision> findByMeetingId(String meetingId);

    Flux<R2dbcMeetingDecision> findByMinutesId(String minutesId);

    Mono<Void> deleteByMeetingId(String meetingId);
}
