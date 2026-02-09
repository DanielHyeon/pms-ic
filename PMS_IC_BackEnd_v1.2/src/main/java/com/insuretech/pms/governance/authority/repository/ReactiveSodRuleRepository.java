package com.insuretech.pms.governance.authority.repository;

import com.insuretech.pms.governance.authority.entity.R2dbcSodRule;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ReactiveSodRuleRepository extends ReactiveCrudRepository<R2dbcSodRule, String> {

    Flux<R2dbcSodRule> findAll();
}
