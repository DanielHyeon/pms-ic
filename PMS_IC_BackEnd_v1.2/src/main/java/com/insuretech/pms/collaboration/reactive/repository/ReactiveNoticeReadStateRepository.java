package com.insuretech.pms.collaboration.reactive.repository;

import com.insuretech.pms.collaboration.reactive.entity.R2dbcNoticeReadState;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveNoticeReadStateRepository extends ReactiveCrudRepository<R2dbcNoticeReadState, String> {

    @Query("SELECT * FROM project.notice_read_state WHERE notice_id = :noticeId AND user_id = :userId")
    Mono<R2dbcNoticeReadState> findByNoticeIdAndUserId(String noticeId, String userId);

    @Query("SELECT * FROM project.notice_read_state WHERE user_id = :userId")
    Flux<R2dbcNoticeReadState> findByUserId(String userId);

    @Query("SELECT * FROM project.notice_read_state WHERE notice_id = :noticeId")
    Flux<R2dbcNoticeReadState> findByNoticeId(String noticeId);

    @Modifying
    @Query("INSERT INTO project.notice_read_state (notice_id, user_id, read_at) VALUES (:noticeId, :userId, NOW()) ON CONFLICT (notice_id, user_id) DO NOTHING")
    Mono<Void> markAsRead(String noticeId, String userId);

    @Modifying
    @Query("DELETE FROM project.notice_read_state WHERE notice_id = :noticeId AND user_id = :userId")
    Mono<Void> deleteByNoticeIdAndUserId(String noticeId, String userId);
}
