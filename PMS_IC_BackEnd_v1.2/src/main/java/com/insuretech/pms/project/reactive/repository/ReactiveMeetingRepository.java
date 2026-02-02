package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcMeeting;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveMeetingRepository extends ReactiveCrudRepository<R2dbcMeeting, String> {

    Flux<R2dbcMeeting> findByProjectIdOrderByScheduledAtDesc(String projectId);

    Flux<R2dbcMeeting> findByProjectIdAndStatus(String projectId, String status);

    Flux<R2dbcMeeting> findByOrganizer(String organizer);
}
