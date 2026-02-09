package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingParticipant;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveMeetingParticipantRepository extends ReactiveCrudRepository<R2dbcMeetingParticipant, String> {

    Flux<R2dbcMeetingParticipant> findByMeetingId(String meetingId);

    Flux<R2dbcMeetingParticipant> findByUserId(String userId);

    Mono<R2dbcMeetingParticipant> findByMeetingIdAndUserId(String meetingId, String userId);

    Mono<Void> deleteByMeetingId(String meetingId);
}
