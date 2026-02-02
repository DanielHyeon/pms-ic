package com.insuretech.pms.education.reactive.repository;

import com.insuretech.pms.education.reactive.entity.R2dbcEducationSession;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

@Repository
public interface ReactiveEducationSessionRepository extends ReactiveCrudRepository<R2dbcEducationSession, String> {

    Flux<R2dbcEducationSession> findByEducationId(String educationId);

    Flux<R2dbcEducationSession> findByStatus(String status);

    Flux<R2dbcEducationSession> findByEducationIdAndStatus(String educationId, String status);

    @Query("SELECT * FROM project.education_sessions WHERE scheduled_at >= :startDate AND scheduled_at <= :endDate ORDER BY scheduled_at")
    Flux<R2dbcEducationSession> findByScheduledAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    @Query("SELECT * FROM project.education_sessions WHERE status = 'SCHEDULED' AND scheduled_at > NOW() ORDER BY scheduled_at")
    Flux<R2dbcEducationSession> findUpcomingSessions();

    @Query("UPDATE project.education_sessions SET current_participants = current_participants + 1 WHERE id = :id")
    Mono<Void> incrementParticipants(String id);

    @Query("UPDATE project.education_sessions SET current_participants = current_participants - 1 WHERE id = :id AND current_participants > 0")
    Mono<Void> decrementParticipants(String id);

    @Query("UPDATE project.education_sessions SET status = :status WHERE id = :id")
    Mono<Void> updateStatus(String id, String status);
}
