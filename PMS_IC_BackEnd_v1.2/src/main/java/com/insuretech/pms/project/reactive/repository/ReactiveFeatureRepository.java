package com.insuretech.pms.project.reactive.repository;

import com.insuretech.pms.project.reactive.entity.R2dbcFeature;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ReactiveFeatureRepository extends ReactiveCrudRepository<R2dbcFeature, String> {

    Flux<R2dbcFeature> findByEpicIdOrderByOrderNumAsc(String epicId);

    Flux<R2dbcFeature> findByWbsGroupId(String wbsGroupId);

    @Query("""
        SELECT f.* FROM project.features f
        JOIN project.epics e ON f.epic_id = e.id
        WHERE e.project_id = :projectId
        ORDER BY f.order_num ASC
        """)
    Flux<R2dbcFeature> findByProjectIdOrdered(String projectId);

    Mono<R2dbcFeature> findByEpicIdAndName(String epicId, String name);

    @Query("SELECT * FROM project.features WHERE epic_id = :epicId AND wbs_group_id IS NULL ORDER BY order_num ASC")
    Flux<R2dbcFeature> findUnlinkedByEpicId(String epicId);

    @Query("SELECT COUNT(*) FROM project.features WHERE epic_id = :epicId")
    Mono<Long> countByEpicId(String epicId);

    @Query("""
        SELECT COUNT(f.*) FROM project.features f
        JOIN project.epics e ON f.epic_id = e.id
        WHERE e.project_id = :projectId AND f.wbs_group_id IS NOT NULL
        """)
    Mono<Long> countLinkedByProjectId(String projectId);

    Flux<R2dbcFeature> findByPartIdOrderByOrderNumAsc(String partId);

    Mono<Long> countByPartId(String partId);

    @Query("SELECT COUNT(*) FROM project.features WHERE part_id = :partId AND status = :status")
    Mono<Long> countByPartIdAndStatus(String partId, String status);
}
