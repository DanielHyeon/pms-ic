package com.insuretech.pms.rfp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insuretech.pms.rfp.dto.*;
import com.insuretech.pms.rfp.reactive.entity.*;
import com.insuretech.pms.rfp.reactive.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveRfpEvidenceService {

    private final ReactiveRfpRepository rfpRepository;
    private final ReactiveRequirementRepository requirementRepository;
    private final ReactiveRequirementCandidateRepository candidateRepository;
    private final ReactiveExtractionRunRepository runRepository;
    private final ReactiveDocumentChunkRepository chunkRepository;
    private final ReactiveRfpChangeEventRepository changeEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * 요구사항 근거(Evidence) 추적 데이터 조회.
     * 각 요구사항에 대해 소스 문서, AI 추출, 변경 이력, 영향 범위를 조합한다.
     */
    public Mono<List<EvidenceDto>> getEvidence(String rfpId, String requirementId) {
        // RFP 정보 조회
        Mono<R2dbcRfp> rfpMono = rfpRepository.findById(rfpId)
                .defaultIfEmpty(R2dbcRfp.builder().id(rfpId).title("").build());

        // 요구사항 목록 (필터 적용)
        Mono<List<R2dbcRequirement>> reqsMono;
        if (requirementId != null && !requirementId.isBlank()) {
            reqsMono = requirementRepository.findById(requirementId)
                    .map(List::of)
                    .defaultIfEmpty(List.of());
        } else {
            reqsMono = requirementRepository.findByRfpId(rfpId).collectList();
        }

        // 승인된 후보 목록 (requirement와 매칭용)
        Mono<List<R2dbcRequirementCandidate>> candidatesMono =
                candidateRepository.findByRfpIdAndStatus(rfpId, "ACCEPTED").collectList();

        // 변경 이력
        Mono<List<R2dbcRfpChangeEvent>> changesMono =
                changeEventRepository.findByRfpIdOrderByChangedAtDesc(rfpId).collectList();

        // active extraction run 정보
        Mono<R2dbcExtractionRun> runMono = runRepository.findByRfpIdAndIsActive(rfpId, true)
                .switchIfEmpty(runRepository.findByRfpIdOrderByCreatedAtDesc(rfpId).next()
                        .defaultIfEmpty(R2dbcExtractionRun.builder().id("").build()));

        return Mono.zip(rfpMono, reqsMono, candidatesMono, changesMono, runMono)
                .map(tuple -> {
                    R2dbcRfp rfp = tuple.getT1();
                    List<R2dbcRequirement> requirements = tuple.getT2();
                    List<R2dbcRequirementCandidate> candidates = tuple.getT3();
                    List<R2dbcRfpChangeEvent> changes = tuple.getT4();
                    R2dbcExtractionRun run = tuple.getT5();

                    // 후보를 confirmedRequirementId 기준으로 맵핑
                    Map<String, R2dbcRequirementCandidate> candidateMap = candidates.stream()
                            .filter(c -> c.getConfirmedRequirementId() != null)
                            .collect(Collectors.toMap(
                                    R2dbcRequirementCandidate::getConfirmedRequirementId,
                                    c -> c,
                                    (a, b) -> a // 중복 시 첫 번째 사용
                            ));

                    // 변경 이벤트 → DTO 변환 (전체 공유)
                    List<EvidenceDto.ChangeEventDto> changeEvents = changes.stream()
                            .map(ch -> EvidenceDto.ChangeEventDto.builder()
                                    .id(ch.getId())
                                    .changeType(ch.getChangeType())
                                    .reason(ch.getReason())
                                    .changedBy(EvidenceDto.ActorDto.builder()
                                            .id(ch.getChangedBy() != null ? ch.getChangedBy() : "system")
                                            .name(ch.getChangedBy() != null ? ch.getChangedBy() : "System")
                                            .build())
                                    .changedAt(ch.getChangedAt())
                                    .build())
                            .collect(Collectors.toList());

                    // 각 요구사항별 Evidence 조합
                    return requirements.stream().map(req -> {
                        R2dbcRequirementCandidate candidate = candidateMap.get(req.getId());

                        // 소스 근거 구축
                        EvidenceDto.SourceEvidenceDto sourceEvidence = EvidenceDto.SourceEvidenceDto.builder()
                                .rfpTitle(rfp.getTitle())
                                .rfpVersionLabel(rfp.getVersionLabel() != null ? rfp.getVersionLabel() : "v1.0")
                                .section(candidate != null ? candidate.getSourceSection() : null)
                                .paragraphId(candidate != null ? candidate.getSourceParagraphId() : null)
                                .snippet(candidate != null ? candidate.getSourceQuote() : null)
                                .fileUri(rfp.getFilePath())
                                .fileChecksum(rfp.getChecksum())
                                .integrityStatus("VERIFIED")
                                .build();

                        // AI 추출 근거 구축
                        EvidenceDto.AiEvidenceDto aiEvidence = EvidenceDto.AiEvidenceDto.builder()
                                .extractionRunId(run.getId())
                                .modelName(run.getModelName())
                                .modelVersion(run.getModelVersion())
                                .promptVersion(run.getPromptVersion())
                                .schemaVersion(run.getSchemaVersion())
                                .confidence(candidate != null ? candidate.getConfidence() : null)
                                .originalCandidateText(candidate != null ? candidate.getText() : null)
                                .wasEdited(candidate != null && "EDITED".equals(candidate.getStatus()))
                                .editedText(candidate != null ? candidate.getEditedText() : null)
                                .build();

                        // 영향 범위 (현 단계에서는 빈 리스트)
                        EvidenceDto.ImpactEvidenceDto impactEvidence = EvidenceDto.ImpactEvidenceDto.builder()
                                .impactedEpics(List.of())
                                .impactedWbs(List.of())
                                .impactedTests(List.of())
                                .impactedSprints(List.of())
                                .build();

                        return EvidenceDto.builder()
                                .requirementId(req.getId())
                                .requirementTitle(req.getTitle())
                                .requirementStatus(req.getStatus())
                                .sourceEvidence(sourceEvidence)
                                .aiEvidence(aiEvidence)
                                .changeEvidence(changeEvents)
                                .impactEvidence(impactEvidence)
                                .build();
                    }).collect(Collectors.toList());
                });
    }

    /**
     * RFP 변경 영향 분석 조회.
     * 변경 이벤트 + 영향 범위 스냅샷을 조합한다.
     */
    public Mono<ImpactDto> getImpact(String rfpId) {
        Mono<List<R2dbcRfpChangeEvent>> changesMono =
                changeEventRepository.findByRfpIdOrderByChangedAtDesc(rfpId).collectList();

        Mono<Long> reqCountMono = requirementRepository.findByRfpId(rfpId).count();

        return Mono.zip(changesMono, reqCountMono)
                .map(tuple -> {
                    List<R2dbcRfpChangeEvent> changes = tuple.getT1();
                    long reqCount = tuple.getT2();

                    // 변경 이벤트 → DTO 변환
                    List<ImpactDto.ChangeEventItem> events = changes.stream()
                            .map(ch -> ImpactDto.ChangeEventItem.builder()
                                    .id(ch.getId())
                                    .changeType(ch.getChangeType())
                                    .reason(ch.getReason())
                                    .changedBy(EvidenceDto.ActorDto.builder()
                                            .id(ch.getChangedBy() != null ? ch.getChangedBy() : "system")
                                            .name(ch.getChangedBy() != null ? ch.getChangedBy() : "System")
                                            .build())
                                    .changedAt(ch.getChangedAt())
                                    .build())
                            .collect(Collectors.toList());

                    // 영향 스냅샷: 최신 이벤트의 impact_snapshot JSON 파싱 시도
                    ImpactDto.ImpactSnapshot snapshot = parseImpactSnapshot(changes, reqCount);

                    return ImpactDto.builder()
                            .changeEvents(events)
                            .impactSnapshot(snapshot)
                            .build();
                });
    }

    /**
     * RFP 버전 간 요구사항 차이 비교.
     * 두 extraction run의 candidates를 reqKey 기준으로 비교한다.
     */
    public Mono<DiffDto> getDiff(String rfpId, String fromVersion, String toVersion) {
        return runRepository.findByRfpIdOrderByCreatedAtDesc(rfpId)
                .collectList()
                .flatMap(runs -> {
                    if (runs.size() < 2) {
                        // run이 1개 이하면 비교 불가 → 빈 diff 반환
                        return Mono.just(DiffDto.builder()
                                .fromVersion(fromVersion)
                                .toVersion(toVersion)
                                .items(List.of())
                                .impactSummary(DiffDto.ImpactSummary.builder().build())
                                .build());
                    }

                    // 최신 2개 run을 "to"와 "from"으로 사용
                    R2dbcExtractionRun toRun = runs.get(0);
                    R2dbcExtractionRun fromRun = runs.get(1);

                    Mono<List<R2dbcRequirementCandidate>> fromCandidatesMono =
                            candidateRepository.findByExtractionRunIdOrderByReqKeyAsc(fromRun.getId()).collectList();
                    Mono<List<R2dbcRequirementCandidate>> toCandidatesMono =
                            candidateRepository.findByExtractionRunIdOrderByReqKeyAsc(toRun.getId()).collectList();

                    return Mono.zip(fromCandidatesMono, toCandidatesMono)
                            .map(t -> buildDiff(fromVersion, toVersion, t.getT1(), t.getT2()));
                });
    }

    // ─── Private Helpers ─────────────────────────────────────────

    /**
     * 최신 변경 이벤트의 impact_snapshot JSON을 파싱하여 ImpactSnapshot DTO를 생성한다.
     * 파싱 실패 시 기본값(요구사항 수만 포함)을 반환한다.
     */
    private ImpactDto.ImpactSnapshot parseImpactSnapshot(
            List<R2dbcRfpChangeEvent> changes, long reqCount) {
        // 최신 이벤트의 impact_snapshot JSON 파싱 시도
        if (!changes.isEmpty()) {
            String json = changes.get(0).getImpactSnapshot();
            if (json != null && !json.isBlank()) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> snap = objectMapper.readValue(json, Map.class);
                    return ImpactDto.ImpactSnapshot.builder()
                            .affectedRequirements(reqCount)
                            .affectedEpics(toLong(snap.get("affectedEpics")))
                            .affectedWbs(toLong(snap.get("affectedWbs")))
                            .affectedSprints(toLong(snap.get("affectedSprints")))
                            .affectedTests(toLong(snap.get("affectedTests")))
                            .build();
                } catch (Exception e) {
                    log.warn("impact_snapshot JSON 파싱 실패: {}", e.getMessage());
                }
            }
        }
        // 파싱 실패 시 기본값
        return ImpactDto.ImpactSnapshot.builder()
                .affectedRequirements(reqCount)
                .affectedEpics(0)
                .affectedWbs(0)
                .affectedSprints(0)
                .affectedTests(0)
                .build();
    }

    /**
     * from/to 두 extraction run의 후보 목록을 reqKey 기준으로 비교하여 DiffDto를 생성한다.
     * NEW(신규), MODIFIED(변경), REMOVED(삭제) 세 가지 유형으로 분류한다.
     */
    private DiffDto buildDiff(
            String fromVersion, String toVersion,
            List<R2dbcRequirementCandidate> fromCandidates,
            List<R2dbcRequirementCandidate> toCandidates) {

        Map<String, R2dbcRequirementCandidate> fromMap = fromCandidates.stream()
                .collect(Collectors.toMap(R2dbcRequirementCandidate::getReqKey, c -> c, (a, b) -> a));
        Map<String, R2dbcRequirementCandidate> toMap = toCandidates.stream()
                .collect(Collectors.toMap(R2dbcRequirementCandidate::getReqKey, c -> c, (a, b) -> a));

        List<DiffDto.DiffItem> items = new ArrayList<>();

        // NEW: "to"에만 있는 항목
        for (var entry : toMap.entrySet()) {
            if (!fromMap.containsKey(entry.getKey())) {
                items.add(DiffDto.DiffItem.builder()
                        .type("NEW")
                        .requirementKey(entry.getKey())
                        .text(entry.getValue().getText())
                        .build());
            }
        }

        // MODIFIED: 양쪽 다 있지만 텍스트가 다른 항목
        for (var entry : toMap.entrySet()) {
            R2dbcRequirementCandidate fromCandidate = fromMap.get(entry.getKey());
            if (fromCandidate != null && !Objects.equals(fromCandidate.getText(), entry.getValue().getText())) {
                items.add(DiffDto.DiffItem.builder()
                        .type("MODIFIED")
                        .requirementKey(entry.getKey())
                        .text(entry.getValue().getText())
                        .previousText(fromCandidate.getText())
                        .build());
            }
        }

        // REMOVED: "from"에만 있는 항목
        for (var entry : fromMap.entrySet()) {
            if (!toMap.containsKey(entry.getKey())) {
                items.add(DiffDto.DiffItem.builder()
                        .type("REMOVED")
                        .requirementKey(entry.getKey())
                        .text(entry.getValue().getText())
                        .build());
            }
        }

        return DiffDto.builder()
                .fromVersion(fromVersion)
                .toVersion(toVersion)
                .items(items)
                .impactSummary(DiffDto.ImpactSummary.builder()
                        .affectedEpics(0)
                        .affectedWbs(0)
                        .affectedSprints(items.size())
                        .affectedTests(0)
                        .build())
                .build();
    }

    /**
     * Object를 long으로 안전하게 변환한다.
     * Number 타입이 아닌 경우 0을 반환한다.
     */
    private long toLong(Object obj) {
        if (obj instanceof Number) return ((Number) obj).longValue();
        return 0;
    }
}
