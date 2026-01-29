package com.insuretech.pms.project.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.project.dto.KpiDto;
import com.insuretech.pms.project.reactive.entity.R2dbcKpi;
import com.insuretech.pms.project.reactive.repository.ReactiveKpiRepository;
import com.insuretech.pms.project.reactive.repository.ReactivePhaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveKpiService {

    private final ReactiveKpiRepository kpiRepository;
    private final ReactivePhaseRepository phaseRepository;

    public Flux<KpiDto> getKpisByPhase(String phaseId) {
        return kpiRepository.findByPhaseId(phaseId)
                .map(KpiDto::from);
    }

    public Flux<KpiDto> getKpisByPhaseAndStatus(String phaseId, String status) {
        return kpiRepository.findByPhaseIdAndStatus(phaseId, status)
                .map(KpiDto::from);
    }

    public Mono<KpiDto> getKpiById(String kpiId) {
        return kpiRepository.findById(kpiId)
                .switchIfEmpty(Mono.error(CustomException.notFound("KPI not found: " + kpiId)))
                .map(KpiDto::from);
    }

    @Transactional
    public Mono<KpiDto> createKpi(String phaseId, KpiDto request) {
        return phaseRepository.findById(phaseId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Phase not found: " + phaseId)))
                .flatMap(phase -> {
                    R2dbcKpi kpi = R2dbcKpi.builder()
                            .id(UUID.randomUUID().toString())
                            .phaseId(phaseId)
                            .name(request.getName())
                            .target(request.getTarget())
                            .current(request.getCurrent())
                            .status(request.getStatus() != null ? request.getStatus() : "ON_TRACK")
                            .build();
                    return kpiRepository.save(kpi);
                })
                .map(KpiDto::from)
                .doOnSuccess(dto -> log.info("Created KPI: {} for phase: {}", dto.getId(), phaseId));
    }

    @Transactional
    public Mono<KpiDto> updateKpi(String kpiId, KpiDto request) {
        return kpiRepository.findById(kpiId)
                .switchIfEmpty(Mono.error(CustomException.notFound("KPI not found: " + kpiId)))
                .flatMap(kpi -> {
                    if (request.getName() != null) kpi.setName(request.getName());
                    if (request.getTarget() != null) kpi.setTarget(request.getTarget());
                    if (request.getCurrent() != null) kpi.setCurrent(request.getCurrent());
                    if (request.getStatus() != null) kpi.setStatus(request.getStatus());
                    return kpiRepository.save(kpi);
                })
                .map(KpiDto::from)
                .doOnSuccess(dto -> log.info("Updated KPI: {}", kpiId));
    }

    @Transactional
    public Mono<KpiDto> updateKpiStatus(String kpiId, String status) {
        return kpiRepository.findById(kpiId)
                .switchIfEmpty(Mono.error(CustomException.notFound("KPI not found: " + kpiId)))
                .flatMap(kpi -> {
                    kpi.setStatus(status);
                    return kpiRepository.save(kpi);
                })
                .map(KpiDto::from)
                .doOnSuccess(dto -> log.info("Updated KPI {} status to {}", kpiId, status));
    }

    @Transactional
    public Mono<KpiDto> updateKpiValue(String kpiId, String currentValue) {
        return kpiRepository.findById(kpiId)
                .switchIfEmpty(Mono.error(CustomException.notFound("KPI not found: " + kpiId)))
                .flatMap(kpi -> {
                    kpi.setCurrent(currentValue);
                    return kpiRepository.save(kpi);
                })
                .map(KpiDto::from)
                .doOnSuccess(dto -> log.info("Updated KPI {} current value to {}", kpiId, currentValue));
    }

    @Transactional
    public Mono<Void> deleteKpi(String kpiId) {
        return kpiRepository.findById(kpiId)
                .switchIfEmpty(Mono.error(CustomException.notFound("KPI not found: " + kpiId)))
                .flatMap(kpi -> kpiRepository.deleteById(kpiId))
                .doOnSuccess(v -> log.info("Deleted KPI: {}", kpiId));
    }
}
