# P3: Explainability & Self-Healing Quality Loop (v2.1)

**Priority**: Medium~High (운영 신뢰성의 결정타)
**Timeline**: 3-5 days
**Goal**: "정답"을 늘리기보다, 틀릴 때 시스템이 스스로 회복하고, 왜 그렇게 답했는지 항상 설명하게 만들기

---

## 0. P3의 정체성 (한 문장)

> **P3는 LLM을 믿지 않고, 대신 시스템을 믿게 만드는 계층이다.**

- 모델은 틀린다 → 인정
- 데이터는 비어 있다 → 인정
- **하지만 서비스는 항상 설명하고, 다음 행동을 제시한다**

이건 AI 제품이 아니라 **"운영 시스템"**의 사고방식입니다.

---

## 1. P3 Phase 역할

> **P3는 답변을 '더 똑똑하게' 만드는 단계가 아니라, '실패해도 망가지지 않게' 만드는 단계다.**

| Phase | 역할 |
|-------|------|
| P0 | Intent 라우팅 정상화 (📊 블랙홀 제거) |
| P1 | 데이터 쿼리 안전장치 (graceful degradation) |
| P2 | 품질 개선 (threshold tuning, retry logic) |
| **P3** | **설명 책임 + 자가 복구 루프** |

P2가 "행동 강제 안전장치"를 만들었다면, P3는 그 안전장치 위에 **설명책임(Explainability)** + **복구 루프(Self-Healing)**를 올려서 운영 안정성을 완성합니다.

---

## 2. P3 구성: 두 개의 독립 트랙

| Track | 이름 | 목적 | 성공 기준 |
|-------|------|------|-----------|
| **P3-A** | Explainability Layer | "왜 이 답이 나왔는지" 근거를 구조화 | 모든 응답에 근거·신호·데이터 출처가 포함 |
| **P3-B** | Self-Healing Loop | 데이터 부족/쿼리 실패 시 되묻고 복구 | "Empty/Failure"가 사용자 경험을 막지 않음 |

**CRITICAL**: 이 둘을 섞으면 위험합니다. 설명은 설명대로, 복구는 복구대로 독립 모듈로 가야 회귀가 덜합니다.

---

## 3. P3 Risk Mitigations (v2.0 - 운영 리스크 6개 추가)

### 기존 리스크

| Risk | Issue | Mitigation |
|------|-------|------------|
| **(A)** | 설명 없이 답변 → 신뢰 하락 | **Explainability 필수화** (non-CASUAL) |
| **(B)** | Empty data = 대화 종료 | **RecoveryPlan으로 대화 지속** |
| **(C)** | 쿼리 실패 = 에러 메시지만 | **Fallback query + clarification** |
| **(D)** | 설명/복구 로직 혼재 → 디버깅 어려움 | **독립 모듈 분리** |
| **(E)** | 과도한 되묻기 → UX 저하 | **clarification_rate 메트릭 + 임계값** |
| **(F)** | 복구 효과 측정 불가 | **recovery_success_rate 메트릭** |

### 추가 운영 리스크 (v2.0)

| Risk | Issue | Mitigation |
|------|-------|------------|
| **(R1)** | Explainability "있는데 의미 없는" 상태 (evidence 1개지만 실제 근거 없음) | **ExplainabilityPolicy로 "의미 있는 조합" 강제** |
| **(R2)** | RecoveryPlan은 있지만 실행이 안 되는 상태 | **RecoveryExecutor 분리: Plan/Execute 2단 구조** |
| **(R3)** | 자동 복구 루프로 장애 증폭 | **auto_execute 1회 제한 + AttemptTracker** |
| **(R4)** | ErrorCode에 FALLBACK_USED → fallback이 에러로 취급됨 | **status/error_code/flags 분리** |
| **(R5)** | clarification 과다 → "AI가 일을 떠넘긴다" 체감 | **복구 우선순위: AUTO_SCOPE > FALLBACK > SUGGEST > ASK(최후)** |
| **(R6)** | Explainability가 민감정보 노출 (SQL, 테이블명) | **public/debug 2레벨 분리** |

### v2.1 추가 운영 리스크 (미세 리스크 - 배포 가능하지만 3개월 뒤 문제될 것들)

| Risk | Issue | Mitigation |
|------|-------|------------|
| **(R7)** | ExplainabilityPolicy가 "ERROR 상태"를 명시적으로 다루지 않음 - ERROR인데 classifier + data_provenance만 있으면 통과 | **validate_error() 메서드 추가: ERROR 시 RULE/SCOPE/FALLBACK 중 하나 필수** |
| **(R8)** | recovery_success_rate 정의가 코드에 고정되어 있지 않음 - "성공"의 정의가 암묵적 | **RECOVERY_SUCCESS_CRITERIA 상수화: min_rows, status 명시** |
| **(R9)** | Explainability evidence 순서가 비결정적 - evidence 추가 순서에 따라 설명이 달라짐 | **카테고리 우선순위 고정: classifier → data_provenance → judgment → scope** |
| **(R10)** | RecoveryPlan.reason_detail과 Explainability.SCOPE가 중복 가능 - 어긋나면 사용자 혼란 | **서술 관점 분리 명시: SCOPE="왜 이런 결과", reason_detail="그래서 뭘 할 수 있는지"** |
| **(R11)** | ASK_CLARIFICATION 남용을 "정책적으로" 막을 장치 없음 - 특정 intent에서 항상 질문으로 끝날 수 있음 | **MAX_CLARIFICATIONS_PER_INTENT 설정: intent별 clarification budget** |

---

## 4. Implementation Checklist (v2.1 강화)

| # | Checklist Item | Verification |
|---|----------------|--------------|
| 1 | **All non-CASUAL responses** have `explainability` | Test: `assert contract.explainability is not None` |
| 2 | **Explainability has meaningful evidence** | Test: `ExplainabilityPolicy.validate(exp)` returns no errors |
| 3 | **Evidence includes CLASSIFIER + DATA_PROVENANCE** | Test: both kinds present |
| 4 | **Empty data explains WHY empty** | Test: if data empty → evidence has scope/filter reason |
| 5 | **Empty/Error triggers RecoveryPlan** | Test: status in (empty, error) → recovery_plan exists |
| 6 | **RecoveryPlan has priority-ordered actions** | Test: AUTO_SCOPE before ASK_CLARIFICATION |
| 7 | **auto_execute runs max 1 time** | Test: AttemptTracker enforces |
| 8 | **RecoveryExecutor handles auto_execute** | Test: executor runs, not handler |
| 9 | **Renderer uses explainability_public only** | Test: no SQL in rendered output |
| 10 | **Flags separate from error_code** | Test: used_fallback in flags, not error_code |
| 11 | **Metrics collected** | Prometheus: all P3 metrics exported |
| 12 | **Runaway test passes** | Test: no infinite recovery loops |

### v2.1 추가 체크리스트

| # | Checklist Item | Verification |
|---|----------------|--------------|
| 13 | **ERROR status has explanation** | Test: `ExplainabilityPolicy.validate_error(exp)` returns no errors |
| 14 | **Recovery success uses CRITERIA constant** | Test: `is_recovery_successful()` used, not ad-hoc checks |
| 15 | **Evidence order is deterministic** | Test: same evidence, different add order → same output |
| 16 | **SCOPE != reason_detail** | Test: scope explains cause, reason_detail explains action |
| 17 | **Clarification respects budget** | Test: `can_ask_clarification()` checked before adding |

---

## 5. Files to Modify/Create (v2.0)

| File | Change Type | Description |
|------|-------------|-------------|
| `explainability.py` | **NEW** | 설명 책임 모델 + public/debug 분리 |
| `explainability_policy.py` | **NEW** | 의미 있는 evidence 조합 규칙 |
| `recovery_plan.py` | **NEW** | 복구 플랜 (Plan만) |
| `recovery_executor.py` | **NEW** | 복구 실행기 (auto_execute 제한) |
| `attempt_tracker.py` | **NEW** | 폭주 방지 추적 |
| `response_contract.py` | **MODIFY** | status/flags/provenance 분리 |
| `intent_handlers.py` | **MODIFY** | 핸들러는 정상 시나리오만 |
| `chat_workflow_v2.py` | **MODIFY** | RecoveryExecutor 통합 |
| `response_renderer.py` | **MODIFY** | public explainability만 사용 |
| `metrics.py` | **NEW** | P3 메트릭 수집 |
| `tests/test_explainability_*.py` | **NEW** | 설명 품질 테스트 |
| `tests/test_recovery_*.py` | **NEW** | 복구 + 폭주 방지 테스트 |
| `tests/test_security.py` | **NEW** | 민감정보 노출 방지 테스트 |

---

## 6. Implementation Details

### 6.1 response_contract.py (MODIFIED - R4 해결)

**Location**: `/llm-service/response_contract.py`

```python
"""
ResponseContract v2.0 - Status/Flags/Provenance 분리.

KEY CHANGES (v2.0):
- status: "ok" | "empty" | "error" (렌더링/분기 단순화)
- error_code: 실패일 때만 (fallback은 에러가 아님!)
- flags: {"used_fallback", "truncated", "auto_recovered"}
- provenance: 데이터 소스 타입

PHILOSOPHY:
- fallback을 error로 착각하는 문제 제거
- 알람이 "진짜 에러"만 잡도록 정확성 향상
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from explainability import Explainability
    from recovery_plan import RecoveryPlan


# =============================================================================
# Response Status
# =============================================================================

class ResponseStatus(str, Enum):
    """Response status for clear branching."""
    OK = "ok"           # Normal response with data
    EMPTY = "empty"     # Query succeeded but no data
    ERROR = "error"     # Query/processing failed


# =============================================================================
# Data Provenance
# =============================================================================

class DataProvenance(str, Enum):
    """Where the data came from."""
    DATABASE = "db"           # Direct database query
    CACHE = "cache"           # Cached data
    RAG = "rag"               # RAG retrieval
    LLM_INFERENCE = "llm"     # LLM-generated
    TEMPLATE = "template"     # Static template
    FALLBACK = "fallback"     # Fallback mechanism


# =============================================================================
# Response Flags
# =============================================================================

@dataclass
class ResponseFlags:
    """
    Flags for response metadata (NOT errors).

    These are informational, not failure indicators.
    """
    used_fallback: bool = False      # Fallback mechanism was used (NOT an error!)
    truncated: bool = False          # Data was truncated due to limit
    auto_recovered: bool = False     # Auto-recovery was executed
    from_cache: bool = False         # Data came from cache
    clarification_pending: bool = False  # Clarification question was asked

    def to_dict(self) -> Dict[str, bool]:
        return {
            "used_fallback": self.used_fallback,
            "truncated": self.truncated,
            "auto_recovered": self.auto_recovered,
            "from_cache": self.from_cache,
            "clarification_pending": self.clarification_pending,
        }


# =============================================================================
# Response Contract
# =============================================================================

@dataclass
class ResponseContract:
    """
    Standard response contract for all intent handlers.

    v2.0 CHANGES:
    - status: Replaces success boolean with tristate
    - flags: Metadata like used_fallback (NOT errors)
    - error_code: Only set when status=ERROR
    - provenance: Data source type

    INVARIANTS:
    - status=OK → data is present and meaningful
    - status=EMPTY → query succeeded, 0 rows, recovery_plan should exist
    - status=ERROR → error_code must be set, recovery_plan should exist
    - used_fallback in flags, never in error_code
    """
    intent: str
    status: str  # ResponseStatus value
    data: Dict[str, Any]
    message: str = ""
    error_code: Optional[str] = None  # Only when status=ERROR
    error_detail: Optional[str] = None  # For logging, not user display
    flags: ResponseFlags = field(default_factory=ResponseFlags)
    provenance: str = DataProvenance.DATABASE.value
    tips: List[str] = field(default_factory=list)
    was_limited: bool = False  # Deprecated, use flags.truncated

    # P3 additions
    explainability: Optional["Explainability"] = None
    recovery_plan: Optional["RecoveryPlan"] = None

    # P3.5 addition
    clarification: Optional[Any] = None

    def __post_init__(self):
        """Validate contract invariants."""
        self._validate_invariants()

    def _validate_invariants(self) -> None:
        """Enforce contract invariants."""
        # error_code only with ERROR status
        if self.status != ResponseStatus.ERROR.value and self.error_code:
            raise ValueError(
                f"error_code should only be set when status=ERROR, "
                f"got status={self.status}, error_code={self.error_code}"
            )

        # ERROR status requires error_code
        if self.status == ResponseStatus.ERROR.value and not self.error_code:
            raise ValueError("status=ERROR requires error_code to be set")

    @property
    def success(self) -> bool:
        """Backward compatibility: success means OK or EMPTY."""
        return self.status in (ResponseStatus.OK.value, ResponseStatus.EMPTY.value)

    @property
    def is_ok(self) -> bool:
        """Check if response has actual data."""
        return self.status == ResponseStatus.OK.value

    @property
    def is_empty(self) -> bool:
        """Check if response is empty (but not error)."""
        return self.status == ResponseStatus.EMPTY.value

    @property
    def is_error(self) -> bool:
        """Check if response is an error."""
        return self.status == ResponseStatus.ERROR.value

    def has_clarification(self) -> bool:
        """Check if this response has a clarification question."""
        return self.clarification is not None

    def has_recovery_plan(self) -> bool:
        """Check if this response has a recovery plan."""
        return self.recovery_plan is not None

    def validate_p3_requirements(self, is_casual: bool = False) -> List[str]:
        """
        P3 validation: Check all P3 requirements.

        Returns:
            List of validation errors (empty if valid)
        """
        from explainability_policy import ExplainabilityPolicy

        errors = []

        # P3-A: Explainability mandatory for non-CASUAL
        if not is_casual:
            if self.explainability is None:
                errors.append(
                    f"P3-A VIOLATION: {self.intent} must have explainability"
                )
            else:
                # Validate meaningful evidence
                policy_errors = ExplainabilityPolicy.validate(
                    self.explainability,
                    is_empty=(self.status == ResponseStatus.EMPTY.value),
                )
                errors.extend(policy_errors)

        # P3-B: Recovery plan for empty/error
        if self.status in (ResponseStatus.EMPTY.value, ResponseStatus.ERROR.value):
            if not self.has_recovery_plan() and not self.has_clarification():
                errors.append(
                    f"P3-B VIOLATION: {self.intent} with status={self.status} "
                    f"must have recovery_plan or clarification"
                )

        return errors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "status": self.status,
            "data": self.data,
            "message": self.message,
            "error_code": self.error_code,
            "flags": self.flags.to_dict(),
            "provenance": self.provenance,
            "tips": self.tips,
            "explainability": self.explainability.to_public_dict() if self.explainability else None,
            "recovery_plan": self.recovery_plan.to_dict() if self.recovery_plan else None,
        }


# =============================================================================
# Factory Functions
# =============================================================================

def create_ok_response(
    intent: str,
    data: Dict[str, Any],
    explainability: "Explainability",
    provenance: str = DataProvenance.DATABASE.value,
    tips: Optional[List[str]] = None,
    flags: Optional[ResponseFlags] = None,
) -> ResponseContract:
    """Create a successful response with data."""
    return ResponseContract(
        intent=intent,
        status=ResponseStatus.OK.value,
        data=data,
        explainability=explainability,
        provenance=provenance,
        tips=tips or [],
        flags=flags or ResponseFlags(),
    )


def create_empty_response(
    intent: str,
    explainability: "Explainability",
    recovery_plan: "RecoveryPlan",
    provenance: str = DataProvenance.DATABASE.value,
    tips: Optional[List[str]] = None,
) -> ResponseContract:
    """Create an empty-data response with recovery plan."""
    return ResponseContract(
        intent=intent,
        status=ResponseStatus.EMPTY.value,
        data={},
        explainability=explainability,
        recovery_plan=recovery_plan,
        provenance=provenance,
        tips=tips or [],
    )


def create_error_response(
    intent: str,
    error_code: str,
    error_detail: str,
    recovery_plan: "RecoveryPlan",
    explainability: Optional["Explainability"] = None,
) -> ResponseContract:
    """Create an error response with recovery plan."""
    return ResponseContract(
        intent=intent,
        status=ResponseStatus.ERROR.value,
        data={},
        error_code=error_code,
        error_detail=error_detail,
        recovery_plan=recovery_plan,
        explainability=explainability,
    )
```

---

### 6.2 explainability.py (NEW - R1, R6 해결)

**Location**: `/llm-service/explainability.py`

```python
"""
Explainability Layer for AI Assistant Responses (v2.0).

v2.0 CHANGES:
- public/debug separation (R6: security)
- Meaningful evidence validation via ExplainabilityPolicy (R1)
- data_freshness as measurable value (seconds)

PURPOSE:
- Every non-CASUAL response MUST explain WHY it gave that answer
- Tracks intent classification, query execution, signal detection, rule application

PHILOSOPHY (P2 Inheritance):
- Explainability is MANDATORY, not optional
- If a response lacks explanation, it's a BUG
- Evidence must be machine-readable AND human-readable

============================================================
EVIDENCE CATEGORIES (for meaningful validation)
============================================================
1. CLASSIFIER: How intent was determined
2. DATA_PROVENANCE: Where data came from (query/cache/inference)
3. JUDGMENT: Rules/signals applied
4. SCOPE: Why scope was limited/empty
============================================================

============================================================
SECURITY: PUBLIC vs DEBUG
============================================================
- public: Safe for user display (no SQL, no table names)
- debug: For logs/admin only (full details)
============================================================
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Evidence Types
# =============================================================================

class EvidenceKind(str, Enum):
    """Types of evidence that support a response."""
    # Category 1: Classification
    CLASSIFIER = "classifier"     # Intent classification result

    # Category 2: Data Provenance (at least one required)
    QUERY = "query"               # SQL/DB query execution
    CACHE = "cache"               # Cached data used
    INFERENCE = "inference"       # LLM-based inference
    RAG = "rag"                   # RAG retrieval

    # Category 3: Judgment
    SIGNAL = "signal"             # Business signal detection
    RULE = "rule"                 # Business rule application

    # Category 4: Scope explanation
    SCOPE = "scope"               # Why data is limited/empty
    FALLBACK = "fallback"         # Fallback mechanism triggered


# Evidence category mapping for validation
EVIDENCE_CATEGORIES = {
    "classifier": {EvidenceKind.CLASSIFIER},
    "data_provenance": {
        EvidenceKind.QUERY,
        EvidenceKind.CACHE,
        EvidenceKind.INFERENCE,
        EvidenceKind.RAG,
    },
    "judgment": {EvidenceKind.SIGNAL, EvidenceKind.RULE},
    "scope": {EvidenceKind.SCOPE, EvidenceKind.FALLBACK},
}


# =============================================================================
# Evidence Item
# =============================================================================

@dataclass
class EvidenceItem:
    """
    A single piece of evidence supporting the response.

    Attributes:
        kind: Type of evidence (query, signal, rule, etc.)
        summary: Human-readable description (PUBLIC - no sensitive data!)
        meta: Machine-readable details for debugging (DEBUG - may contain sensitive data)
    """
    kind: str
    summary: str  # PUBLIC: Safe for user display
    meta: Dict[str, Any] = field(default_factory=dict)  # DEBUG: For logs only

    def to_dict(self) -> Dict[str, Any]:
        """Full dict including debug info."""
        return {
            "kind": self.kind,
            "summary": self.summary,
            "meta": self.meta,
        }

    def to_public_dict(self) -> Dict[str, Any]:
        """Public dict without sensitive debug info."""
        return {
            "kind": self.kind,
            "summary": self.summary,
            # meta is intentionally omitted for security
        }


# =============================================================================
# Data Freshness (measurable)
# =============================================================================

@dataclass
class DataFreshness:
    """
    Measurable data freshness (v2.0 improvement).

    Instead of just "realtime"/"cached"/"stale" strings,
    we track actual timestamps and age.
    """
    source_updated_at: Optional[datetime] = None  # When source data was last updated
    fetched_at: datetime = field(default_factory=datetime.utcnow)  # When we fetched it
    stale_threshold_seconds: int = 3600  # 1 hour default

    @property
    def age_seconds(self) -> Optional[int]:
        """How old the data is in seconds."""
        if self.source_updated_at is None:
            return None
        return int((self.fetched_at - self.source_updated_at).total_seconds())

    @property
    def freshness_level(self) -> str:
        """Human-readable freshness level."""
        if self.age_seconds is None:
            return "unknown"
        if self.age_seconds < 60:
            return "realtime"
        if self.age_seconds < self.stale_threshold_seconds:
            return "recent"
        return "stale"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_updated_at": self.source_updated_at.isoformat() if self.source_updated_at else None,
            "fetched_at": self.fetched_at.isoformat(),
            "age_seconds": self.age_seconds,
            "freshness_level": self.freshness_level,
        }


# =============================================================================
# Explainability Contract
# =============================================================================

@dataclass
class Explainability:
    """
    Full explanation of how a response was generated.

    MANDATORY for all non-CASUAL intents.

    v2.0 CHANGES:
    - public/debug separation for security
    - data_freshness as measurable DataFreshness object
    - Validation via ExplainabilityPolicy

    Attributes:
        intent: The classified intent (lowercase snake_case)
        intent_confidence: Confidence score from classifier (0.0-1.0)
        routing_reason: Why this routing path was chosen (PUBLIC)
        evidence: List of supporting evidence items
        caveats: Known limitations or uncertainties
        data_freshness: Measurable freshness info
    """
    intent: str
    intent_confidence: float
    routing_reason: str  # PUBLIC: Safe for display
    evidence: List[EvidenceItem] = field(default_factory=list)
    caveats: List[str] = field(default_factory=list)
    data_freshness: DataFreshness = field(default_factory=DataFreshness)

    def add_evidence(
        self,
        kind: str,
        summary: str,
        **meta: Any,
    ) -> "Explainability":
        """
        Fluent API to add evidence.

        IMPORTANT: summary should be PUBLIC-safe (no SQL, no table names).
        Put sensitive details in meta (for debug logs only).

        Usage:
            exp.add_evidence(
                "query",
                "Fetched active sprint data",  # PUBLIC
                table="sprint",  # DEBUG (in meta)
                sql="SELECT * FROM...",  # DEBUG (in meta)
            )
        """
        self.evidence.append(EvidenceItem(
            kind=kind,
            summary=summary,
            meta=meta,
        ))
        return self

    def add_classifier_evidence(
        self,
        matched_patterns: List[str],
        confidence: float,
    ) -> "Explainability":
        """Add classifier evidence (REQUIRED for all non-CASUAL)."""
        patterns_str = ", ".join(matched_patterns[:3]) if matched_patterns else "direct match"
        return self.add_evidence(
            EvidenceKind.CLASSIFIER.value,
            f"Intent classified: {patterns_str}",
            matched_patterns=matched_patterns,
            confidence=confidence,
        )

    def add_query_evidence(
        self,
        description: str,
        row_count: int,
        table: str,  # Goes to meta only
        sql: Optional[str] = None,  # Goes to meta only
    ) -> "Explainability":
        """Add database query evidence."""
        # PUBLIC summary - no table name
        summary = f"{description}: {row_count} rows"
        return self.add_evidence(
            EvidenceKind.QUERY.value,
            summary,
            table=table,
            row_count=row_count,
            sql=sql,
        )

    def add_scope_evidence(
        self,
        reason: str,
        scope_details: Optional[Dict[str, Any]] = None,
    ) -> "Explainability":
        """Add scope explanation evidence (for EMPTY results)."""
        return self.add_evidence(
            EvidenceKind.SCOPE.value,
            f"Scope: {reason}",
            scope_details=scope_details or {},
        )

    def add_caveat(self, caveat: str) -> "Explainability":
        """Add a known limitation or uncertainty."""
        self.caveats.append(caveat)
        return self

    def get_evidence_by_kind(self, kind: str) -> List[EvidenceItem]:
        """Get all evidence of a specific kind."""
        return [e for e in self.evidence if e.kind == kind]

    def has_evidence_category(self, category: str) -> bool:
        """Check if evidence exists for a category."""
        category_kinds = EVIDENCE_CATEGORIES.get(category, set())
        return any(e.kind in category_kinds for e in self.evidence)

    def to_dict(self) -> Dict[str, Any]:
        """Full dict including debug info (for logging)."""
        return {
            "intent": self.intent,
            "intent_confidence": self.intent_confidence,
            "routing_reason": self.routing_reason,
            "evidence": [e.to_dict() for e in self.evidence],
            "caveats": self.caveats,
            "data_freshness": self.data_freshness.to_dict(),
        }

    def to_public_dict(self) -> Dict[str, Any]:
        """Public dict without sensitive debug info (for user display)."""
        return {
            "intent": self.intent,
            "intent_confidence": self.intent_confidence,
            "routing_reason": self.routing_reason,
            "evidence": [e.to_public_dict() for e in self.evidence],
            "caveats": self.caveats,
            "data_freshness": {
                "freshness_level": self.data_freshness.freshness_level,
            },
        }

    def to_human_readable(self) -> str:
        """
        Generate human-readable explanation for display.

        Uses PUBLIC data only (no sensitive info).

        v2.1 CHANGE (R9): Evidence order is now DETERMINISTIC.
        Category priority: classifier → data_provenance → judgment → scope
        This ensures UX consistency regardless of evidence addition order.
        """
        lines = []

        # Routing reason
        lines.append(f"**분류**: {self.intent} (신뢰도: {self.intent_confidence:.0%})")
        lines.append(f"**이유**: {self.routing_reason}")

        # Evidence - one per category for clarity
        # v2.1: FIXED category order for UX consistency (R9)
        if self.evidence:
            lines.append("")
            lines.append("**근거**:")
            rendered_categories = set()

            # FIXED priority order (v2.1 - R9)
            CATEGORY_PRIORITY = ["classifier", "data_provenance", "judgment", "scope"]

            for priority_cat in CATEGORY_PRIORITY:
                if priority_cat in rendered_categories:
                    continue
                category_kinds = EVIDENCE_CATEGORIES.get(priority_cat, set())
                for ev in self.evidence:
                    if ev.kind in category_kinds and priority_cat not in rendered_categories:
                        icon = _get_evidence_icon(ev.kind)
                        lines.append(f"  • {icon} {ev.summary}")
                        rendered_categories.add(priority_cat)
                        break  # One evidence per category

        # Caveats
        if self.caveats:
            lines.append("")
            lines.append("**참고**:")
            for caveat in self.caveats[:2]:  # Max 2
                lines.append(f"  • ⚠️ {caveat}")

        # Freshness warning if stale
        if self.data_freshness.freshness_level == "stale":
            lines.append("")
            lines.append(f"⏰ 데이터가 오래되었을 수 있습니다 ({self.data_freshness.age_seconds}초 전)")

        return "\n".join(lines)


# =============================================================================
# Factory Functions
# =============================================================================

def create_explainability(
    intent: str,
    confidence: float,
    routing_reason: str,
) -> Explainability:
    """
    Factory function to create Explainability with required fields.

    Usage:
        exp = create_explainability("backlog_list", 0.95, "Matched 백로그 keyword")
        exp.add_classifier_evidence(["백로그", "backlog"], 0.95)
        exp.add_query_evidence("Fetched backlog items", 15, table="user_story")
    """
    return Explainability(
        intent=intent,
        intent_confidence=confidence,
        routing_reason=routing_reason,
    )


# =============================================================================
# Helpers
# =============================================================================

def _get_evidence_icon(kind: str) -> str:
    """Get icon for evidence type."""
    icons = {
        EvidenceKind.QUERY.value: "🔍",
        EvidenceKind.SIGNAL.value: "📡",
        EvidenceKind.RULE.value: "📋",
        EvidenceKind.FALLBACK.value: "🔄",
        EvidenceKind.INFERENCE.value: "🤖",
        EvidenceKind.CACHE.value: "💾",
        EvidenceKind.CLASSIFIER.value: "🏷️",
        EvidenceKind.SCOPE.value: "🎯",
        EvidenceKind.RAG.value: "📚",
    }
    return icons.get(kind, "📌")
```

---

### 6.3 explainability_policy.py (NEW - R1 해결)

**Location**: `/llm-service/explainability_policy.py`

```python
"""
ExplainabilityPolicy: Enforces "meaningful" evidence combinations.

PURPOSE:
- Prevent "explainability exists but is meaningless" (R1)
- Evidence >= 1 is not enough; we need SPECIFIC combinations

============================================================
MINIMUM REQUIREMENTS
============================================================
1. CLASSIFIER evidence: Always required (how was intent determined?)
2. DATA_PROVENANCE evidence: Always required (where did data come from?)
3. If EMPTY: SCOPE evidence required (why is it empty?)
============================================================

PHILOSOPHY:
- "형식만 갖춘 설명"을 막고 "진짜 설명"만 허용
- 테스트로 강제하여 운영에서 의미없는 설명이 나가지 않게 함
"""

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from explainability import Explainability

from explainability import EVIDENCE_CATEGORIES, EvidenceKind


class ExplainabilityPolicy:
    """
    Policy enforcement for meaningful explainability.

    Usage:
        errors = ExplainabilityPolicy.validate(explainability, is_empty=True)
        if errors:
            raise ValueError(f"Explainability policy violation: {errors}")
    """

    @staticmethod
    def validate(
        exp: "Explainability",
        is_empty: bool = False,
    ) -> List[str]:
        """
        Validate explainability meets minimum requirements.

        Args:
            exp: Explainability object to validate
            is_empty: Whether the response data is empty

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        # Requirement 1: CLASSIFIER evidence required
        if not exp.has_evidence_category("classifier"):
            errors.append(
                "POLICY: Missing CLASSIFIER evidence - "
                "must explain how intent was determined"
            )

        # Requirement 2: DATA_PROVENANCE evidence required
        if not exp.has_evidence_category("data_provenance"):
            errors.append(
                "POLICY: Missing DATA_PROVENANCE evidence - "
                "must explain where data came from (query/cache/inference)"
            )

        # Requirement 3: If EMPTY, SCOPE evidence required
        if is_empty and not exp.has_evidence_category("scope"):
            errors.append(
                "POLICY: Missing SCOPE evidence for empty result - "
                "must explain WHY data is empty (scope/filter/condition)"
            )

        # Requirement 4: Confidence must be reasonable
        if exp.intent_confidence < 0.0 or exp.intent_confidence > 1.0:
            errors.append(
                f"POLICY: Invalid confidence {exp.intent_confidence} - "
                "must be between 0.0 and 1.0"
            )

        return errors

    @staticmethod
    def validate_error(
        exp: "Explainability",
    ) -> List[str]:
        """
        Validate explainability for ERROR status responses (v2.1 - R7).

        ERROR status MUST have one of:
        - RULE evidence (blocking rule applied)
        - SCOPE evidence (permission/scope issue)
        - FALLBACK evidence (why fallback was used)

        Without this, we get "unexplained errors" which destroy user trust.
        """
        errors = []

        # Base validation still required
        errors.extend(ExplainabilityPolicy.validate(exp, is_empty=False))

        # ERROR-specific: Must explain WHY it failed
        has_error_explanation = (
            exp.has_evidence_category("scope") or
            exp.has_evidence_category("judgment")  # includes RULE
        )

        if not has_error_explanation:
            errors.append(
                "POLICY: ERROR status requires SCOPE or RULE/FALLBACK evidence - "
                "must explain WHY the error occurred"
            )

        return errors

    @staticmethod
    def validate_strict(
        exp: "Explainability",
        is_empty: bool = False,
    ) -> List[str]:
        """
        Strict validation with additional checks.

        Use for high-importance intents.
        """
        errors = ExplainabilityPolicy.validate(exp, is_empty)

        # Strict: At least 2 evidence items
        if len(exp.evidence) < 2:
            errors.append(
                "STRICT POLICY: Must have at least 2 evidence items"
            )

        # Strict: routing_reason must be meaningful (not empty, not generic)
        if not exp.routing_reason or len(exp.routing_reason) < 10:
            errors.append(
                "STRICT POLICY: routing_reason must be meaningful (>10 chars)"
            )

        return errors

    @staticmethod
    def get_missing_categories(exp: "Explainability", is_empty: bool = False) -> List[str]:
        """Get list of missing required categories."""
        missing = []

        if not exp.has_evidence_category("classifier"):
            missing.append("classifier")

        if not exp.has_evidence_category("data_provenance"):
            missing.append("data_provenance")

        if is_empty and not exp.has_evidence_category("scope"):
            missing.append("scope")

        return missing
```

---

### 6.4 recovery_plan.py (MODIFIED - R2, R5 해결)

**Location**: `/llm-service/recovery_plan.py`

```python
"""
Self-Healing Recovery Plan (v2.1).

v2.0 CHANGES:
- Plan only, no execution (RecoveryExecutor handles that)
- Priority ordering enforced (R5)
- AttemptTracker integration for runaway prevention (R3)

v2.1 CHANGES:
- SCOPE vs reason_detail 서술 관점 분리 명시 (R10)
- MAX_CLARIFICATIONS_PER_INTENT 정책 추가 (R11)

PURPOSE:
- When data is empty or query fails, don't just show error
- Provide actionable recovery options to continue the conversation

PHILOSOPHY (P2 Inheritance):
- Empty/Failure MUST trigger recovery, not dead-end
- Recovery actions are MANDATORY for known failure modes
- User should never see "데이터가 없습니다" without next steps

============================================================
RECOVERY ACTION PRIORITY (v2.0 - R5 해결)
============================================================
1. AUTO_SCOPE (자동 범위 조정) - 사용자 개입 없이 해결
2. OFFER_ALTERNATIVES (대안 제시) - 관련 데이터 보여주기
3. FALLBACK_QUERY (대체 쿼리) - auto_execute 가능
4. SUGGEST_CREATE (생성 제안) - 사용자 행동 유도
5. ASK_CLARIFICATION (되묻기) - 최후의 수단!

IMPORTANT: ASK_CLARIFICATION은 마지막에만! 과다 사용 시 UX 저하.
============================================================

============================================================
SCOPE vs REASON_DETAIL 서술 관점 분리 (v2.1 - R10 해결)
============================================================
Explainability.SCOPE와 RecoveryPlan.reason_detail이 중복되면 혼란.

서술 관점을 명확히 분리:

  • Explainability.SCOPE = "왜 결과가 이렇게 나왔는지" (과거/원인)
    예: "현재 프로젝트에 ACTIVE 스프린트가 없습니다"

  • RecoveryPlan.reason_detail = "그래서 다음에 뭘 할 수 있는지" (미래/행동)
    예: "최근 완료된 스프린트를 조회하거나 새 스프린트를 생성할 수 있습니다"

RULE: 둘이 같은 문장이면 잘못된 것. 항상 시제/관점이 달라야 함.
============================================================
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Recovery Action Types (Priority Ordered)
# =============================================================================

class ActionType(str, Enum):
    """
    Types of recovery actions in priority order.

    PRIORITY (higher = try first):
    1. AUTO_SCOPE - Best UX, no user action needed
    2. OFFER_ALTERNATIVES - Show what exists
    3. FALLBACK_QUERY - Try different query
    4. SUGGEST_CREATE - Guide user to create data
    5. ASK_CLARIFICATION - Last resort!
    """
    AUTO_SCOPE = "auto_scope"                 # Priority 1: Automatically adjust scope
    OFFER_ALTERNATIVES = "offer_alternatives" # Priority 2: Show related alternatives
    FALLBACK_QUERY = "fallback_query"         # Priority 3: Try alternative query
    SUGGEST_CREATE = "suggest_create"         # Priority 4: Suggest creating data
    ASK_CLARIFICATION = "ask_clarification"   # Priority 5: LAST RESORT - ask user


# Priority mapping for sorting
ACTION_PRIORITY = {
    ActionType.AUTO_SCOPE.value: 1,
    ActionType.OFFER_ALTERNATIVES.value: 2,
    ActionType.FALLBACK_QUERY.value: 3,
    ActionType.SUGGEST_CREATE.value: 4,
    ActionType.ASK_CLARIFICATION.value: 5,  # Lowest priority!
}


# =============================================================================
# Per-Intent Clarification Budget (v2.1 - R11 해결)
# =============================================================================

MAX_CLARIFICATIONS_PER_INTENT = {
    # High-value intents: allow 1 clarification
    "sprint_progress": 1,
    "risk_analysis": 1,
    "project_status": 1,

    # Data listing intents: NO clarification (show what exists or empty)
    "backlog_list": 0,
    "task_list": 0,
    "my_tasks": 0,

    # Default for unspecified intents
    "_default": 1,
}


def get_clarification_budget(intent: str) -> int:
    """
    Get the max clarifications allowed for an intent.

    v2.1: Prevents ASK_CLARIFICATION abuse by setting hard limits.
    If intent keeps triggering questions, something is wrong with the handler.
    """
    return MAX_CLARIFICATIONS_PER_INTENT.get(
        intent,
        MAX_CLARIFICATIONS_PER_INTENT["_default"]
    )


def can_ask_clarification(intent: str, session_state: dict) -> bool:
    """
    Check if we can still ask clarifications for this intent.

    Usage:
        if can_ask_clarification("sprint_progress", session):
            plan.add_action(ActionType.ASK_CLARIFICATION, ...)
        # else: skip adding clarification action
    """
    budget = get_clarification_budget(intent)
    if budget == 0:
        return False

    key = f"_clarification_count:{intent}"
    current_count = session_state.get(key, 0)
    return current_count < budget


def record_clarification_asked(intent: str, session_state: dict) -> None:
    """Record that a clarification was asked for this intent."""
    key = f"_clarification_count:{intent}"
    session_state[key] = session_state.get(key, 0) + 1


class RecoveryReason(str, Enum):
    """Reasons why recovery was triggered."""
    NO_ACTIVE_SPRINT = "no_active_sprint"
    EMPTY_DATA = "empty_data"
    QUERY_FAILURE = "query_failure"
    SCOPE_MISMATCH = "scope_mismatch"
    PERMISSION_DENIED = "permission_denied"
    TIMEOUT = "timeout"
    STALE_DATA = "stale_data"


# =============================================================================
# Recovery Action
# =============================================================================

@dataclass
class RecoveryAction:
    """
    A single recovery action the system can take or offer.

    Attributes:
        action_type: Type of action (priority ordered)
        message: Human-readable description of the action
        options: Available choices for user (if applicable)
        meta: Machine-readable details for execution
        auto_execute: If True, system should execute without asking
        max_auto_attempts: Max times this can auto-execute (prevent loops)
    """
    action_type: str
    message: str
    options: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    auto_execute: bool = False
    max_auto_attempts: int = 1  # Prevent runaway loops

    @property
    def priority(self) -> int:
        """Get action priority (lower = higher priority)."""
        return ACTION_PRIORITY.get(self.action_type, 99)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type,
            "message": self.message,
            "options": self.options,
            "meta": self.meta,
            "auto_execute": self.auto_execute,
            "max_auto_attempts": self.max_auto_attempts,
        }


# =============================================================================
# Recovery Plan
# =============================================================================

@dataclass
class RecoveryPlan:
    """
    A plan for recovering from data absence or query failure.

    MANDATORY when:
    - Query returns empty results
    - Query fails with error
    - Scope doesn't match available data

    v2.0 CHANGES:
    - Actions are priority-sorted automatically
    - AttemptRecord replaces string list for tracking
    - Plan does NOT execute - RecoveryExecutor does

    Attributes:
        intent: The intent that triggered recovery
        reason: Why recovery was needed
        reason_detail: Human-readable explanation
        actions: List of recovery actions (auto-sorted by priority)
        attempt_records: Structured tracking of what was tried
    """
    intent: str
    reason: str
    reason_detail: str
    actions: List[RecoveryAction] = field(default_factory=list)
    attempt_records: List["AttemptRecord"] = field(default_factory=list)

    def add_action(
        self,
        action_type: str,
        message: str,
        options: Optional[List[str]] = None,
        auto_execute: bool = False,
        max_auto_attempts: int = 1,
        **meta: Any,
    ) -> "RecoveryPlan":
        """
        Add a recovery action to the plan.

        Actions are automatically sorted by priority after adding.
        """
        # Warn if adding ASK_CLARIFICATION with other options
        if action_type == ActionType.ASK_CLARIFICATION.value:
            existing_types = [a.action_type for a in self.actions]
            if any(t != ActionType.ASK_CLARIFICATION.value for t in existing_types):
                logger.warning(
                    f"ASK_CLARIFICATION added but other actions exist. "
                    f"Consider if clarification is really needed."
                )

        self.actions.append(RecoveryAction(
            action_type=action_type,
            message=message,
            options=options or [],
            meta=meta,
            auto_execute=auto_execute,
            max_auto_attempts=max_auto_attempts,
        ))

        # Sort by priority
        self.actions.sort(key=lambda a: a.priority)
        return self

    def get_auto_executable_actions(self) -> List[RecoveryAction]:
        """Get actions that can be auto-executed."""
        return [a for a in self.actions if a.auto_execute]

    def get_user_actions(self) -> List[RecoveryAction]:
        """Get actions that require user interaction."""
        return [a for a in self.actions if not a.auto_execute]

    def get_first_auto_action(self) -> Optional[RecoveryAction]:
        """Get highest-priority auto-executable action."""
        auto_actions = self.get_auto_executable_actions()
        return auto_actions[0] if auto_actions else None

    def has_been_tried(self, action_type: str, context_key: Optional[str] = None) -> bool:
        """Check if an action type has already been tried."""
        for record in self.attempt_records:
            if record.action_type == action_type:
                if context_key is None or record.context_key == context_key:
                    return True
        return False

    def record_attempt(
        self,
        action_type: str,
        context_key: str,
        success: bool,
    ) -> None:
        """Record that an action was attempted."""
        self.attempt_records.append(AttemptRecord(
            action_type=action_type,
            context_key=context_key,
            success=success,
        ))

    def should_auto_execute(self, action: RecoveryAction) -> bool:
        """
        Check if an action should be auto-executed.

        Considers:
        - auto_execute flag
        - max_auto_attempts limit
        - already_tried status
        """
        if not action.auto_execute:
            return False

        # Count how many times this action type was tried
        attempts = sum(
            1 for r in self.attempt_records
            if r.action_type == action.action_type
        )

        return attempts < action.max_auto_attempts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "reason": self.reason,
            "reason_detail": self.reason_detail,
            "actions": [a.to_dict() for a in self.actions],
            "attempt_records": [r.to_dict() for r in self.attempt_records],
        }


# =============================================================================
# Attempt Tracking (v2.0 - R3 해결)
# =============================================================================

@dataclass
class AttemptRecord:
    """
    Record of a recovery attempt.

    v2.0: Replaces simple string list for better tracking.
    """
    action_type: str
    context_key: str  # Unique key for this context (intent + scope)
    success: bool
    timestamp: str = field(default_factory=lambda: __import__("datetime").datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type,
            "context_key": self.context_key,
            "success": self.success,
            "timestamp": self.timestamp,
        }


# =============================================================================
# Pre-built Recovery Plans
# =============================================================================

def create_no_active_sprint_recovery(intent: str = "sprint_progress") -> RecoveryPlan:
    """Create recovery plan for no active sprint scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.NO_ACTIVE_SPRINT.value,
        reason_detail="현재 ACTIVE 상태의 스프린트가 없습니다.",
    )

    # Priority 1: Auto-adjust to last completed sprint
    plan.add_action(
        ActionType.AUTO_SCOPE.value,
        "최근 완료된 스프린트로 자동 조회",
        auto_execute=True,
        max_auto_attempts=1,
        scope="last_completed_sprint",
    )

    # Priority 2: Show sprint list
    plan.add_action(
        ActionType.OFFER_ALTERNATIVES.value,
        "스프린트 목록 보기",
        options=["목록 보기"],
        show_sprint_list=True,
    )

    # Priority 4: Suggest creating sprint
    plan.add_action(
        ActionType.SUGGEST_CREATE.value,
        "새 스프린트 생성하기",
        options=["생성 방법 안내"],
        guide_type="sprint_creation",
    )

    # NO ASK_CLARIFICATION - other options are better

    return plan


def create_empty_backlog_recovery(intent: str = "backlog_list") -> RecoveryPlan:
    """Create recovery plan for empty backlog scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.EMPTY_DATA.value,
        reason_detail="등록된 백로그 항목이 없습니다.",
    )

    # Priority 2: Offer alternatives
    plan.add_action(
        ActionType.OFFER_ALTERNATIVES.value,
        "관련 Epic/Feature 목록 보기",
        epic_fallback=True,
    )

    # Priority 4: Suggest creating
    plan.add_action(
        ActionType.SUGGEST_CREATE.value,
        "샘플 유저스토리 생성 가이드",
        options=["가이드 보기", "템플릿 사용"],
        guide_type="backlog_creation",
        sample_count=3,
    )

    return plan


def create_empty_risk_recovery(intent: str = "risk_analysis") -> RecoveryPlan:
    """Create recovery plan for no risks scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.EMPTY_DATA.value,
        reason_detail="현재 식별된 리스크가 없습니다.",
    )

    # Priority 3: Try fallback query
    plan.add_action(
        ActionType.FALLBACK_QUERY.value,
        "BLOCKED/HIGH 이슈를 리스크 후보로 탐색",
        auto_execute=True,
        max_auto_attempts=1,
        fallback_query="risk_from_blocked_issues",
    )

    # Priority 4: Suggest labeling
    plan.add_action(
        ActionType.SUGGEST_CREATE.value,
        "리스크 라벨링 정책 안내",
        guide_type="risk_labeling",
    )

    return plan


def create_query_failure_recovery(
    intent: str,
    error_code: str,
    error_detail: str,
) -> RecoveryPlan:
    """Create recovery plan for query failure scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.QUERY_FAILURE.value,
        reason_detail=f"쿼리 실행 중 오류: {error_code}",
    )

    # Priority 3: Try simplified fallback
    plan.add_action(
        ActionType.FALLBACK_QUERY.value,
        "간소화된 쿼리로 재시도",
        auto_execute=True,
        max_auto_attempts=1,
        fallback_type="simplified",
        original_error=error_code,
    )

    # Priority 5: Ask for scope clarification (last resort)
    plan.add_action(
        ActionType.ASK_CLARIFICATION.value,
        "다른 범위로 조회하시겠어요?",
        options=["다른 기간", "다른 프로젝트", "취소"],
    )

    return plan
```

---

### 6.5 recovery_executor.py (NEW - R2, R3 해결)

**Location**: `/llm-service/recovery_executor.py`

```python
"""
RecoveryExecutor: Executes recovery actions with safeguards.

PURPOSE:
- Separate Plan creation from Execution (R2)
- Enforce auto_execute limits to prevent runaway loops (R3)
- Track attempts across conversation turns

PHILOSOPHY:
- Handler creates Plan
- Executor runs auto_execute actions (max 1 per turn)
- Executor returns modified Contract with recovery result

============================================================
EXECUTION FLOW
============================================================
1. Handler returns Contract with RecoveryPlan
2. Executor checks for auto-executable actions
3. If found AND not already tried → execute ONCE
4. Update Contract with result (may change status from EMPTY to OK)
5. Record attempt for loop prevention
============================================================

============================================================
RECOVERY SUCCESS CRITERIA (v2.1 - R8 해결)
============================================================
"성공"의 정의를 코드 상수로 고정하여 지표 해석 일관성 확보.
- partial recovery는 성공이 아님
- fallback 후 다시 empty면 성공이 아님
============================================================
"""

from response_contract import ResponseStatus


# =============================================================================
# Recovery Success Criteria (v2.1 - R8)
# =============================================================================

RECOVERY_SUCCESS_CRITERIA = {
    "min_rows": 1,              # At least 1 row of data
    "status": ResponseStatus.OK,  # Must be OK, not just EMPTY with data
    "partial_is_success": False,  # Partial recovery is NOT counted as success
}


def is_recovery_successful(result: "ExecutionResult") -> bool:
    """
    Determine if recovery was successful based on FIXED criteria.

    v2.1: Eliminates interpretation ambiguity in metrics.

    A recovery is successful ONLY if:
    1. new_data has at least min_rows items
    2. The resulting status would be OK (not EMPTY or ERROR)

    This is THE ONLY source of truth for recovery_success_rate metric.
    """
    if not result.success:
        return False

    if result.new_data is None:
        return False

    # Count rows based on data structure
    row_count = 0
    if isinstance(result.new_data, dict):
        if "items" in result.new_data:
            row_count = len(result.new_data["items"])
        elif "data" in result.new_data:
            row_count = len(result.new_data["data"]) if isinstance(result.new_data["data"], list) else 1
        else:
            row_count = 1 if result.new_data else 0
    elif isinstance(result.new_data, list):
        row_count = len(result.new_data)

    return row_count >= RECOVERY_SUCCESS_CRITERIA["min_rows"]

from typing import Dict, Any, Optional, Callable, Awaitable, TYPE_CHECKING
from dataclasses import dataclass
import logging

if TYPE_CHECKING:
    from response_contract import ResponseContract
    from recovery_plan import RecoveryPlan, RecoveryAction

logger = logging.getLogger(__name__)


# =============================================================================
# Attempt Tracker (Session-scoped)
# =============================================================================

class AttemptTracker:
    """
    Tracks recovery attempts to prevent runaway loops.

    Stored in session state to persist across conversation turns.
    """

    def __init__(self, session_state: Dict[str, Any]):
        self.session_state = session_state
        self._key = "_recovery_attempts"

    def _get_attempts(self) -> Dict[str, int]:
        """Get attempt counts from session."""
        return self.session_state.get(self._key, {})

    def _set_attempts(self, attempts: Dict[str, int]) -> None:
        """Save attempt counts to session."""
        self.session_state[self._key] = attempts

    def get_attempt_count(self, context_key: str) -> int:
        """Get number of attempts for a context key."""
        return self._get_attempts().get(context_key, 0)

    def record_attempt(self, context_key: str) -> int:
        """Record an attempt and return new count."""
        attempts = self._get_attempts()
        attempts[context_key] = attempts.get(context_key, 0) + 1
        self._set_attempts(attempts)
        return attempts[context_key]

    def can_attempt(self, context_key: str, max_attempts: int = 1) -> bool:
        """Check if more attempts are allowed."""
        return self.get_attempt_count(context_key) < max_attempts

    def clear_for_context(self, context_key: str) -> None:
        """Clear attempts for a specific context."""
        attempts = self._get_attempts()
        attempts.pop(context_key, None)
        self._set_attempts(attempts)

    def clear_all(self) -> None:
        """Clear all attempt tracking."""
        self.session_state.pop(self._key, None)


# =============================================================================
# Execution Result
# =============================================================================

@dataclass
class ExecutionResult:
    """Result of executing a recovery action."""
    executed: bool
    action_type: str
    success: bool
    new_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    @property
    def recovered_data(self) -> bool:
        """Check if execution recovered actual data."""
        return self.success and self.new_data is not None and len(self.new_data) > 0


# =============================================================================
# Recovery Executor
# =============================================================================

class RecoveryExecutor:
    """
    Executes recovery actions with safeguards.

    Usage:
        executor = RecoveryExecutor(session_state, action_handlers)
        contract = await executor.execute_recovery(contract, context)
    """

    def __init__(
        self,
        session_state: Dict[str, Any],
        action_handlers: Optional[Dict[str, Callable]] = None,
    ):
        """
        Initialize executor.

        Args:
            session_state: Conversation state for attempt tracking
            action_handlers: Map of action_type -> handler function
        """
        self.tracker = AttemptTracker(session_state)
        self.action_handlers = action_handlers or {}

    def register_handler(
        self,
        action_type: str,
        handler: Callable[["RecoveryAction", Dict[str, Any]], Awaitable[ExecutionResult]],
    ) -> None:
        """Register a handler for an action type."""
        self.action_handlers[action_type] = handler

    async def execute_recovery(
        self,
        contract: "ResponseContract",
        context: Dict[str, Any],
    ) -> "ResponseContract":
        """
        Execute recovery actions if applicable.

        RULES:
        1. Only execute if contract has recovery_plan
        2. Only execute ONE auto_execute action per call
        3. Check attempt limits before executing
        4. Update contract with result

        Args:
            contract: The response contract (may be modified)
            context: Query context

        Returns:
            Modified contract (may have new data if recovery succeeded)
        """
        from response_contract import ResponseStatus, ResponseFlags

        if not contract.has_recovery_plan():
            return contract

        plan = contract.recovery_plan
        auto_action = plan.get_first_auto_action()

        if auto_action is None:
            logger.debug(f"No auto-executable actions for {plan.intent}")
            return contract

        # Build context key for tracking
        context_key = self._build_context_key(plan.intent, context, auto_action)

        # Check if we can attempt
        if not self.tracker.can_attempt(context_key, auto_action.max_auto_attempts):
            logger.info(
                f"Max attempts ({auto_action.max_auto_attempts}) reached for "
                f"{auto_action.action_type} in context {context_key}"
            )
            return contract

        # Check if handler exists
        handler = self.action_handlers.get(auto_action.action_type)
        if handler is None:
            logger.warning(f"No handler for action type: {auto_action.action_type}")
            return contract

        # Execute!
        logger.info(f"Executing recovery action: {auto_action.action_type}")
        try:
            result = await handler(auto_action, context)

            # Record attempt
            self.tracker.record_attempt(context_key)
            plan.record_attempt(
                auto_action.action_type,
                context_key,
                result.success,
            )

            # If recovered data, update contract
            if result.recovered_data:
                logger.info(f"Recovery successful, updating contract with new data")
                contract.status = ResponseStatus.OK.value
                contract.data = result.new_data
                contract.flags.auto_recovered = True

                # Add evidence about recovery
                if contract.explainability:
                    contract.explainability.add_evidence(
                        "fallback",
                        f"Auto-recovered via {auto_action.action_type}",
                        original_status="empty",
                        recovery_action=auto_action.action_type,
                    )

        except Exception as e:
            logger.error(f"Recovery execution failed: {e}")
            self.tracker.record_attempt(context_key)
            plan.record_attempt(auto_action.action_type, context_key, False)

        return contract

    def _build_context_key(
        self,
        intent: str,
        context: Dict[str, Any],
        action: "RecoveryAction",
    ) -> str:
        """Build a unique key for tracking attempts."""
        # Include intent, action type, and relevant scope
        project_id = context.get("project_id", "unknown")
        scope = action.meta.get("scope", "default")
        return f"{intent}:{action.action_type}:{project_id}:{scope}"


# =============================================================================
# Built-in Action Handlers
# =============================================================================

async def handle_auto_scope_last_sprint(
    action: "RecoveryAction",
    context: Dict[str, Any],
) -> ExecutionResult:
    """
    Handle AUTO_SCOPE action for last completed sprint.

    This is a placeholder - actual implementation would query the database.
    """
    # In real implementation:
    # 1. Get project_id from context
    # 2. Query for last completed sprint
    # 3. If found, fetch sprint progress
    # 4. Return ExecutionResult with new_data

    logger.info(f"Executing auto_scope: last_completed_sprint")

    # Placeholder - would be replaced with actual DB query
    return ExecutionResult(
        executed=True,
        action_type=action.action_type,
        success=False,  # Would be True if data found
        new_data=None,
    )


async def handle_fallback_query_risk(
    action: "RecoveryAction",
    context: Dict[str, Any],
) -> ExecutionResult:
    """
    Handle FALLBACK_QUERY for risk detection from blocked issues.
    """
    logger.info(f"Executing fallback_query: risk_from_blocked_issues")

    # Placeholder - would query blocked/high issues
    return ExecutionResult(
        executed=True,
        action_type=action.action_type,
        success=False,
        new_data=None,
    )


# =============================================================================
# Default Handler Registry
# =============================================================================

def get_default_handlers() -> Dict[str, Callable]:
    """Get default action handlers."""
    return {
        "auto_scope": handle_auto_scope_last_sprint,
        "fallback_query": handle_fallback_query_risk,
    }
```

---

### 6.6 response_renderer.py (MODIFIED - R6 보안)

**Location**: `/llm-service/response_renderer.py`

```python
"""
Response Renderer (v2.0).

v2.0 CHANGES:
- Uses explainability.to_public_dict() only (R6: security)
- Evidence rendered "one per category" for clarity
- No SQL or table names in output

SECURITY RULE:
- NEVER render explainability.to_dict() (contains debug info)
- ALWAYS use to_public_dict() or to_human_readable()
"""

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from response_contract import ResponseContract
    from explainability import Explainability
    from recovery_plan import RecoveryPlan


def render_response(contract: "ResponseContract") -> str:
    """
    Render ResponseContract to user-facing text.

    SECURITY: Only uses PUBLIC explainability data.
    """
    parts = []

    # Handle clarification first (P3.5)
    if contract.has_clarification():
        return _render_clarification(contract.clarification)

    # Main message
    if contract.message:
        parts.append(contract.message)

    # Status-specific handling
    if contract.is_ok:
        # Render data based on intent
        data_render = _render_data(contract.intent, contract.data)
        if data_render:
            parts.append(data_render)
    elif contract.is_empty:
        parts.append("조회된 데이터가 없습니다.")
    elif contract.is_error:
        parts.append(f"오류가 발생했습니다: {contract.error_code}")

    # Explainability (PUBLIC only!)
    if contract.explainability:
        # SECURITY: Use to_human_readable() which only uses public data
        exp_render = _render_explainability_safe(contract.explainability)
        if exp_render:
            parts.append(exp_render)

    # Recovery plan
    if contract.has_recovery_plan():
        recovery_render = _render_recovery(contract.recovery_plan)
        if recovery_render:
            parts.append(recovery_render)

    # Tips
    if contract.tips:
        parts.append(_render_tips(contract.tips))

    # Auto-recovery notice
    if contract.flags.auto_recovered:
        parts.append("ℹ️ 자동으로 범위를 조정하여 데이터를 찾았습니다.")

    return "\n\n".join(filter(None, parts))


def _render_explainability_safe(exp: "Explainability") -> str:
    """
    Render explainability using PUBLIC data only.

    SECURITY: This function MUST NOT access exp.to_dict() or evidence.meta
    """
    # Use the built-in safe method
    return exp.to_human_readable()


def _render_recovery(recovery: "RecoveryPlan") -> str:
    """Render recovery plan options for user."""
    if not recovery.actions:
        return ""

    # Only render user-facing actions (not auto_execute ones that already ran)
    user_actions = recovery.get_user_actions()
    if not user_actions:
        return ""

    lines = ["🔄 **다음 단계**"]
    lines.append(f"  {recovery.reason_detail}")
    lines.append("")

    for i, action in enumerate(user_actions[:3], 1):  # Max 3
        lines.append(f"  {i}. {action.message}")
        if action.options:
            for opt in action.options[:2]:  # Max 2 options per action
                lines.append(f"     • {opt}")

    return "\n".join(lines)


def _render_clarification(clarification) -> str:
    """Render clarification question with options."""
    lines = []

    # Question
    lines.append(f"❓ {clarification.message}")
    lines.append("")

    # Options (numbered)
    for i, opt in enumerate(clarification.options, 1):
        label = opt.label
        lines.append(f"{i}) {label}")

    # Free text option
    if clarification.allow_free_text:
        hint = clarification.free_text_hint or "직접 입력"
        lines.append(f"{len(clarification.options) + 1}) 기타: {hint}")

    lines.append("")
    max_num = len(clarification.options) + (1 if clarification.allow_free_text else 0)
    lines.append(f"👉 1~{max_num} 중 번호로 답해 주세요.")

    return "\n".join(lines)


def _render_data(intent: str, data: dict) -> str:
    """Render data based on intent type."""
    # Intent-specific rendering would go here
    # This is a placeholder
    if not data:
        return ""

    # Generic rendering for now
    if "items" in data:
        count = len(data["items"])
        return f"총 {count}건의 결과가 있습니다."

    return ""


def _render_tips(tips: List[str]) -> str:
    """Render tips section."""
    if not tips:
        return ""

    lines = ["💡 **팁**"]
    for tip in tips[:2]:  # Max 2
        lines.append(f"  • {tip}")

    return "\n".join(lines)
```

---

### 6.7 metrics.py (NEW)

**Location**: `/llm-service/metrics.py`

```python
"""
P3 Metrics Collection.

Tracks:
- Explainability quality
- Recovery effectiveness
- Loop prevention
- Security compliance
"""

from prometheus_client import Counter, Histogram, Gauge
from typing import Optional


# =============================================================================
# Explainability Metrics
# =============================================================================

EXPLAINABILITY_POLICY_VIOLATIONS = Counter(
    "llm_explainability_policy_violations_total",
    "Explainability policy violations",
    ["intent", "violation_type"],
)

EXPLAINABILITY_EVIDENCE_COUNT = Histogram(
    "llm_explainability_evidence_count",
    "Number of evidence items per response",
    ["intent"],
    buckets=[0, 1, 2, 3, 5, 10],
)


# =============================================================================
# Recovery Metrics
# =============================================================================

RECOVERY_TRIGGER_COUNTER = Counter(
    "llm_recovery_trigger_total",
    "Total recovery triggers",
    ["intent", "reason"],
)

RECOVERY_SUCCESS_COUNTER = Counter(
    "llm_recovery_success_total",
    "Successful recoveries (data found after recovery)",
    ["intent", "action_type"],
)

RECOVERY_AUTO_EXECUTE_COUNTER = Counter(
    "llm_recovery_auto_execute_total",
    "Auto-executed recovery actions",
    ["intent", "action_type"],
)

RECOVERY_RUNAWAY_PREVENTED = Counter(
    "llm_recovery_runaway_prevented_total",
    "Recovery loops prevented by attempt limits",
    ["intent", "action_type"],
)


# =============================================================================
# Clarification Metrics (from P3.5)
# =============================================================================

CLARIFICATION_TRIGGER_COUNTER = Counter(
    "llm_clarification_trigger_total",
    "Clarification questions triggered",
    ["intent", "question_id", "trigger_type"],
)

CLARIFICATION_RESOLUTION_COUNTER = Counter(
    "llm_clarification_resolution_total",
    "Clarification resolutions",
    ["intent", "question_id", "resolution_type"],
)


# =============================================================================
# Recording Functions
# =============================================================================

def record_explainability_violation(intent: str, violation_type: str) -> None:
    """Record an explainability policy violation."""
    EXPLAINABILITY_POLICY_VIOLATIONS.labels(
        intent=intent,
        violation_type=violation_type,
    ).inc()


def record_evidence_count(intent: str, count: int) -> None:
    """Record number of evidence items."""
    EXPLAINABILITY_EVIDENCE_COUNT.labels(intent=intent).observe(count)


def record_recovery_trigger(intent: str, reason: str) -> None:
    """Record that recovery was triggered."""
    RECOVERY_TRIGGER_COUNTER.labels(intent=intent, reason=reason).inc()


def record_recovery_success(intent: str, action_type: str) -> None:
    """Record successful recovery."""
    RECOVERY_SUCCESS_COUNTER.labels(intent=intent, action_type=action_type).inc()


def record_auto_execute(intent: str, action_type: str) -> None:
    """Record auto-executed recovery action."""
    RECOVERY_AUTO_EXECUTE_COUNTER.labels(intent=intent, action_type=action_type).inc()


def record_runaway_prevented(intent: str, action_type: str) -> None:
    """Record that a runaway loop was prevented."""
    RECOVERY_RUNAWAY_PREVENTED.labels(intent=intent, action_type=action_type).inc()


# =============================================================================
# Alert Thresholds
# =============================================================================

P3_ALERT_THRESHOLDS = {
    "explainability_violation_rate_high": {
        "metric": "explainability_policy_violations_total",
        "threshold": 0.05,  # 5% of responses
        "operator": ">",
        "severity": "warning",
        "message": "Explainability violations exceed 5%",
    },
    "recovery_success_rate_low": {
        "metric": "recovery_success_rate",
        "threshold": 0.5,  # 50% success
        "operator": "<",
        "severity": "warning",
        "message": "Recovery success rate below 50%",
    },
    "runaway_prevention_high": {
        "metric": "recovery_runaway_prevented_total",
        "threshold": 100,  # per hour
        "operator": ">",
        "severity": "critical",
        "message": "Too many runaway preventions - check recovery logic",
    },
    "clarification_rate_high": {
        "metric": "clarification_trigger_rate",
        "threshold": 0.3,  # 30%
        "operator": ">",
        "severity": "warning",
        "message": "Clarification rate too high - UX concern",
    },
}
```

---

## 7. Test Suite (v2.0 강화)

### 7.1 test_explainability_policy.py (NEW)

```python
"""
Tests for ExplainabilityPolicy - ensures "meaningful" evidence.
"""

import pytest
from explainability import Explainability, create_explainability, EvidenceKind
from explainability_policy import ExplainabilityPolicy


class TestExplainabilityPolicy:
    """Test meaningful evidence requirements."""

    def test_missing_classifier_fails(self):
        """Explainability without CLASSIFIER evidence should fail."""
        exp = create_explainability("backlog_list", 0.9, "Test")
        exp.add_evidence(EvidenceKind.QUERY.value, "Queried data")

        errors = ExplainabilityPolicy.validate(exp)
        assert any("CLASSIFIER" in e for e in errors)

    def test_missing_data_provenance_fails(self):
        """Explainability without DATA_PROVENANCE evidence should fail."""
        exp = create_explainability("backlog_list", 0.9, "Test")
        exp.add_classifier_evidence(["backlog"], 0.9)

        errors = ExplainabilityPolicy.validate(exp)
        assert any("DATA_PROVENANCE" in e for e in errors)

    def test_empty_without_scope_fails(self):
        """Empty result without SCOPE evidence should fail."""
        exp = create_explainability("backlog_list", 0.9, "Test")
        exp.add_classifier_evidence(["backlog"], 0.9)
        exp.add_query_evidence("Queried backlog", 0, table="user_story")

        errors = ExplainabilityPolicy.validate(exp, is_empty=True)
        assert any("SCOPE" in e for e in errors)

    def test_complete_evidence_passes(self):
        """Complete evidence should pass validation."""
        exp = create_explainability("backlog_list", 0.9, "Matched backlog keyword")
        exp.add_classifier_evidence(["backlog", "목록"], 0.9)
        exp.add_query_evidence("Fetched backlog items", 15, table="user_story")

        errors = ExplainabilityPolicy.validate(exp, is_empty=False)
        assert len(errors) == 0

    def test_empty_with_scope_passes(self):
        """Empty result with SCOPE evidence should pass."""
        exp = create_explainability("backlog_list", 0.9, "Matched backlog keyword")
        exp.add_classifier_evidence(["backlog"], 0.9)
        exp.add_query_evidence("Fetched backlog items", 0, table="user_story")
        exp.add_scope_evidence("No items in current sprint scope")

        errors = ExplainabilityPolicy.validate(exp, is_empty=True)
        assert len(errors) == 0
```

---

### 7.2 test_recovery_runaway.py (NEW - R3 폭주 방지)

```python
"""
Tests for recovery runaway prevention.
"""

import pytest
from recovery_plan import RecoveryPlan, RecoveryAction, ActionType, create_no_active_sprint_recovery
from recovery_executor import RecoveryExecutor, AttemptTracker, ExecutionResult


class TestAttemptTracker:
    """Test attempt tracking for loop prevention."""

    def test_first_attempt_allowed(self):
        """First attempt should be allowed."""
        session = {}
        tracker = AttemptTracker(session)

        assert tracker.can_attempt("test:key", max_attempts=1)

    def test_second_attempt_blocked(self):
        """Second attempt with max=1 should be blocked."""
        session = {}
        tracker = AttemptTracker(session)

        tracker.record_attempt("test:key")
        assert not tracker.can_attempt("test:key", max_attempts=1)

    def test_different_keys_independent(self):
        """Different context keys should be tracked independently."""
        session = {}
        tracker = AttemptTracker(session)

        tracker.record_attempt("key1")
        assert not tracker.can_attempt("key1", max_attempts=1)
        assert tracker.can_attempt("key2", max_attempts=1)


class TestRecoveryPlanRunaway:
    """Test RecoveryPlan prevents infinite loops."""

    def test_auto_execute_respects_max_attempts(self):
        """auto_execute should respect max_auto_attempts."""
        plan = create_no_active_sprint_recovery()
        auto_action = plan.get_first_auto_action()

        assert auto_action is not None
        assert auto_action.max_auto_attempts == 1

        # First time: should execute
        assert plan.should_auto_execute(auto_action)

        # Record attempt
        plan.record_attempt(auto_action.action_type, "test:context", True)

        # Second time: should NOT execute
        assert not plan.should_auto_execute(auto_action)

    def test_has_been_tried_tracking(self):
        """has_been_tried should track attempts correctly."""
        plan = RecoveryPlan(
            intent="test",
            reason="empty",
            reason_detail="Test",
        )

        assert not plan.has_been_tried("auto_scope")

        plan.record_attempt("auto_scope", "context:key", True)

        assert plan.has_been_tried("auto_scope")
        assert plan.has_been_tried("auto_scope", "context:key")
        assert not plan.has_been_tried("auto_scope", "other:key")


class TestRecoveryExecutor:
    """Test RecoveryExecutor safeguards."""

    @pytest.mark.asyncio
    async def test_executes_only_once_per_context(self):
        """Executor should only execute auto_execute once per context."""
        session = {}
        executor = RecoveryExecutor(session, {})

        call_count = 0

        async def mock_handler(action, context):
            nonlocal call_count
            call_count += 1
            return ExecutionResult(
                executed=True,
                action_type=action.action_type,
                success=False,
            )

        executor.register_handler("auto_scope", mock_handler)

        # Create contract with recovery plan
        from response_contract import ResponseContract, ResponseStatus
        plan = create_no_active_sprint_recovery()
        contract = ResponseContract(
            intent="sprint_progress",
            status=ResponseStatus.EMPTY.value,
            data={},
            recovery_plan=plan,
        )

        context = {"project_id": "proj1"}

        # First execution
        await executor.execute_recovery(contract, context)
        assert call_count == 1

        # Second execution - should be blocked
        await executor.execute_recovery(contract, context)
        assert call_count == 1  # Still 1, not 2!
```

---

### 7.3 test_security_explainability.py (NEW - R6 보안)

```python
"""
Tests for explainability security (no sensitive data exposure).
"""

import pytest
from explainability import Explainability, create_explainability, EvidenceKind


class TestExplainabilitySecurity:
    """Test that sensitive data is not exposed in public output."""

    def test_public_dict_excludes_meta(self):
        """to_public_dict should not include evidence meta."""
        exp = create_explainability("test", 0.9, "Test reason")
        exp.add_evidence(
            EvidenceKind.QUERY.value,
            "Fetched data",
            table="secret_table",  # Sensitive!
            sql="SELECT * FROM secret_table WHERE user_id = 123",  # Sensitive!
        )

        public = exp.to_public_dict()

        # Check evidence doesn't have meta
        for ev in public["evidence"]:
            assert "meta" not in ev
            assert "table" not in str(ev)
            assert "SELECT" not in str(ev)

    def test_human_readable_excludes_sql(self):
        """to_human_readable should not include SQL."""
        exp = create_explainability("test", 0.9, "Test reason")
        exp.add_evidence(
            EvidenceKind.QUERY.value,
            "Fetched user data",  # Safe summary
            sql="SELECT password FROM users",  # Would be dangerous to expose
        )

        readable = exp.to_human_readable()

        assert "SELECT" not in readable
        assert "password" not in readable
        assert "users" not in readable

    def test_full_dict_includes_meta_for_logging(self):
        """to_dict (for logging) should include full meta."""
        exp = create_explainability("test", 0.9, "Test reason")
        exp.add_evidence(
            EvidenceKind.QUERY.value,
            "Fetched data",
            table="user_story",
            sql="SELECT * FROM user_story",
        )

        full = exp.to_dict()

        # Full dict SHOULD have meta (for debug logs)
        assert full["evidence"][0]["meta"]["table"] == "user_story"
        assert "SELECT" in full["evidence"][0]["meta"]["sql"]

    def test_renderer_uses_public_only(self):
        """Renderer should only use public data."""
        from response_renderer import _render_explainability_safe

        exp = create_explainability("test", 0.9, "Test")
        exp.add_classifier_evidence(["test"], 0.9)
        exp.add_evidence(
            EvidenceKind.QUERY.value,
            "Fetched items",
            table="secret_table",
            row_count=10,
        )

        rendered = _render_explainability_safe(exp)

        assert "secret_table" not in rendered
```

---

## 8. Execution Plan (v2.0)

### Day 1: Core Contracts

| Task | Hours | Verification |
|------|-------|--------------|
| `response_contract.py` (status/flags separation) | 2h | Tests pass |
| `explainability.py` (public/debug split) | 2h | Tests pass |
| `explainability_policy.py` | 1h | Policy tests pass |

### Day 2: Recovery Infrastructure

| Task | Hours | Verification |
|------|-------|--------------|
| `recovery_plan.py` (priority ordering) | 2h | Tests pass |
| `recovery_executor.py` (runaway prevention) | 2h | Runaway tests pass |
| `attempt_tracker.py` integration | 1h | Integration tests |

### Day 3: Integration

| Task | Hours | Verification |
|------|-------|--------------|
| Update `intent_handlers.py` | 2h | Handlers create valid contracts |
| Update `chat_workflow_v2.py` | 2h | Executor integrated |
| `response_renderer.py` (security) | 1h | Security tests pass |

### Day 4: Testing & Metrics

| Task | Hours | Verification |
|------|-------|--------------|
| Full test suite | 2h | All tests pass |
| `metrics.py` integration | 2h | Prometheus exports |
| Security audit | 1h | No sensitive data exposed |

### Day 5: Canary & Monitoring

| Task | Hours | Verification |
|------|-------|--------------|
| Canary deploy (5%) | 2h | Monitor for errors |
| Dashboard setup | 2h | Metrics visible |
| Documentation | 1h | README updated |

---

## 9. Success Criteria (v2.0)

### Quantitative

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **explainability_policy_violations** | < 5% | > 10% = rollback |
| **recovery_success_rate** | ≥ 50% | < 30% = investigate |
| **runaway_prevented_rate** | < 1% | > 5% = logic bug |
| **clarification_rate** | ≤ 30% | > 50% = UX degraded |
| **avg_evidence_count** | ≥ 2 | < 1 = policy violation |

### Qualitative

- ✅ 모든 non-CASUAL 응답에 의미 있는 설명이 있다 (classifier + data_provenance)
- ✅ Empty 응답은 "왜 empty인지" 설명한다 (scope evidence)
- ✅ 렌더러 출력에 SQL/테이블명이 없다 (보안)
- ✅ auto_execute는 1회만 실행된다 (폭주 방지)
- ✅ ASK_CLARIFICATION은 다른 복구 옵션이 없을 때만 사용된다

---

## 10. Rollback Plan

### Trigger Conditions

1. `explainability_policy_violations > 10%` for 30 minutes
2. `runaway_prevented_rate > 5%` for 15 minutes
3. Sensitive data exposure detected in logs

### Rollback Steps

```bash
# 1. Disable P3 validation (feature flag)
export P3_VALIDATION_ENABLED=false
export P3_RECOVERY_EXECUTOR_ENABLED=false

# 2. Restart services
docker-compose restart llm-service

# 3. Verify fallback behavior
# (responses still work, just without P3 enforcement)
```

---

## 11. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | AI Assistant | Initial P3 specification |
| 2.0 | 2026-02-04 | AI Assistant | R1-R6 risk mitigations: status/flags separation, ExplainabilityPolicy, RecoveryExecutor, public/debug split, runaway prevention |
| 2.1 | 2026-02-04 | AI Assistant | R7-R11 미세 리스크 해결: validate_error() 추가, RECOVERY_SUCCESS_CRITERIA 상수화, evidence 순서 고정, SCOPE/reason_detail 분리, MAX_CLARIFICATIONS_PER_INTENT 정책 |
