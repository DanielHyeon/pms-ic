package com.insuretech.pms.education.reactive.repository;

import com.insuretech.pms.education.reactive.entity.R2dbcEducationHistory;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveEducationHistoryRepository extends ReactiveCrudRepository<R2dbcEducationHistory, String> {

    Flux<R2dbcEducationHistory> findBySessionId(String sessionId);

    Flux<R2dbcEducationHistory> findByParticipantId(String participantId);

    Flux<R2dbcEducationHistory> findByParticipantIdAndCompletionStatus(String participantId, String completionStatus);

    Mono<R2dbcEducationHistory> findBySessionIdAndParticipantId(String sessionId, String participantId);

    @Query("SELECT * FROM project.education_histories WHERE participant_id = :participantId AND completion_status = 'COMPLETED'")
    Flux<R2dbcEducationHistory> findCompletedByParticipant(String participantId);

    @Query("UPDATE project.education_histories SET completion_status = :status, completed_at = NOW() WHERE id = :id")
    Mono<Void> updateCompletionStatus(String id, String status);

    @Query("UPDATE project.education_histories SET score = :score WHERE id = :id")
    Mono<Void> updateScore(String id, Integer score);

    @Query("UPDATE project.education_histories SET certificate_issued = true WHERE id = :id")
    Mono<Void> issueCertificate(String id);

    Mono<Long> countBySessionId(String sessionId);

    Mono<Long> countBySessionIdAndCompletionStatus(String sessionId, String completionStatus);
}
