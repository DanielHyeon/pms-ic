package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcMeetingMinutes;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveMeetingMinutesRepository extends ReactiveCrudRepository<R2dbcMeetingMinutes, String> {

    Mono<R2dbcMeetingMinutes> findByMeetingId(String meetingId);

    Mono<Void> deleteByMeetingId(String meetingId);
}
