# P4: Observability Dashboard - AI 사후 책임성 계층

**Priority**: High (운영 신뢰성의 증명)
**Timeline**: 5-7 days
**Goal**: P0~P3가 "제대로 작동하고 있다"는 사실을 인간이 추적하고 증명할 수 있게 만들기
**Approach**: Decision Trace + Data Provenance + Recovery Timeline + Health Narrative

---

## 0. P4의 정체성 (한 문장 정의)

> **P4는 'AI가 왜 그렇게 답했고, 문제가 생겼을 때 어떻게 복구되었는지'를 시간축과 의사결정 흐름으로 인간이 추적할 수 있게 만드는 관측 계층이다.**

| 구분 | 설명 |
|------|------|
| ❌ 단순 모니터링 대시보드 아님 | 메트릭 나열이 목적이 아님 |
| ❌ 실시간 알림 시스템 아님 | 즉각 대응보다 "사후 분석" 중심 |
| ✅ 판단의 역사 + 실패의 복구 과정 시각화 | **"왜 이 답이 나왔는가"에 대한 증거 계층** |

### P4가 없으면 발생하는 문제

| 질문 | P4 없이 | P4 있으면 |
|------|---------|----------|
| 왜 이 intent로 분류됐지? | "LLM이 그렇게 판단함" | confidence 0.82, pattern "백로그" 매칭 |
| 데이터 없었는데 왜 이 답? | "fallback 로직 있음" | T2에 degradation policy 발동, template 주입 |
| 이 답변은 "정상"인가 "회복"인가? | 구분 불가 | final_status: recovered_success |
| 최근 릴리즈가 품질 망쳤나? | "체감상 이상한 것 같아요" | recovery_rate 12% 하락, intent X에서 집중 |

---

## 1. P4 Phase 역할

> **P4는 AI 시스템을 '운영 가능한 소프트웨어'로 격상시키는 마지막 레이어다.**

| Phase | 역할 | 질문 |
|-------|------|------|
| P0 | Intent 라우팅 정상화 | "올바른 핸들러로 갔는가?" |
| P1 | 데이터 쿼리 안전장치 | "데이터가 없으면 어떻게 하는가?" |
| P2 | 품질 개선 | "답변 품질이 충분한가?" |
| P3 | 설명 책임 + 자가 복구 | "왜 이 답이고, 실패 시 어떻게 복구하는가?" |
| **P4** | **관측 + 증명** | **"이 모든 게 제대로 작동했다는 걸 어떻게 아는가?"** |

### P0~P3 흐름 시각화

```
User Query
 → Intent Router (P0)        ← "왜 이 intent?"
 → Data Query / Degradation (P1) ← "데이터 있었나?"
 → Quality Enforcement (P2)  ← "품질 통과?"
 → Self-healing Fallback (P3) ← "복구됐나?"
 → Response

     ↓↓↓ P4가 모든 단계를 기록 ↓↓↓

[Decision Trace] → [Data Provenance] → [Recovery Timeline] → [Health Summary]
```

---

## 2. P4 핵심 시각화 4축

### 2.1 Decision Trace (의사결정 흐름)

**목적**: AI 내부의 판단 트리를 사람 눈으로 재생

```
[Query: "백로그 보여줘"]
  ↓
[Intent: BACKLOG_LIST | confidence 0.92 | basis: keyword_match]
  ↓
[Handler: handle_backlog_list]
  ↓
[DB Query: SELECT * FROM user_story WHERE project_id=... | executed]
  ↓
[Result: empty (0 rows)]
  ↓
[P3.5 Clarification: backlog.empty triggered]
  ↓
[User Selection: "1" → show_templates]
  ↓
[Recovery: templates injected | has_data=True]
  ↓
[Final Response: success=True, recovered=True]
```

**시각화 포인트**:

| 항목 | 설명 |
|------|------|
| confidence score | 0.0~1.0 + threshold 표시 |
| rule vs model | 규칙 기반인지 LLM 추론인지 |
| 대안 루트 | 2등 intent가 뭐였는지 |
| 선택 이유 | "왜 이 경로가 선택됐는지" |

---

### 2.2 Data Provenance (근거 추적)

**목적**: 이 답변의 각 문장이 어디서 나왔는가

| 응답 문장 | 출처 | 신뢰 레벨 | 근거 ID |
|-----------|------|----------|---------|
| "현재 등록된 백로그가 없어요." | PostgreSQL Query | High | query:backlog:001 |
| "아래 템플릿을 참고해 보세요" | Policy Template | Medium | template:backlog_guide |
| "프로젝트 초기에는 흔히..." | LLM Generation | Low | llm:context_fill |

**핵심 구분**:

```python
class DataSource(str, Enum):
    DATABASE = "db"           # Direct DB query - High trust
    CACHE = "cache"           # Cached data - High trust
    POLICY_TEMPLATE = "policy" # Pre-defined templates - Medium trust
    RAG_RETRIEVAL = "rag"     # RAG results - Medium trust
    LLM_INFERENCE = "llm"     # LLM-generated - Low trust (needs validation)
    HEURISTIC = "heuristic"   # Rule-based derivation - Medium trust
```

**Hallucination 방어**:
- LLM 출처 문장이 전체의 30% 초과 시 경고
- High trust 출처 없이 응답 시 알림

---

### 2.3 Recovery Timeline (회복 과정 시각화)

**목적**: 실패 → 복구 → 성공을 하나의 타임라인으로

```
T0 [00:00.000] Query received: "스프린트 진행률 알려줘"
T1 [00:00.012] Intent classified: SPRINT_PROGRESS (confidence: 0.89)
T2 [00:00.045] Handler executed: handle_sprint_progress
T3 [00:00.089] DB Query: active_sprint → NULL (no active sprint)
T4 [00:00.091] P3.5 Clarification triggered: sprint.no_active_sprint
T5 [00:00.092] Response: clarification question rendered
   ------- User Turn -------
T6 [00:05.234] User input: "1"
T7 [00:05.235] Clarification matched: option 1 (last_completed_sprint)
T8 [00:05.236] Context patch applied: fallback_mode=last_completed_sprint
T9 [00:05.289] Handler re-executed with patched context
T10[00:05.412] DB Query: last_completed_sprint → Sprint "2024-W05"
T11[00:05.456] Data retrieved: 12 stories, metrics calculated
T12[00:05.478] Response: success=True, recovered=True
```

**핵심 구분**:

| 상태 | 정의 | 색상 |
|------|------|------|
| `success` | 정상 경로로 데이터 반환 | 🟢 Green |
| `recovered_success` | fallback/clarification 후 데이터 반환 | 🟡 Yellow |
| `recovered_guidance` | 데이터 없지만 가이드/템플릿 제공 | 🟠 Orange |
| `failed` | 사용자 재질문 필요 | 🔴 Red |

---

### 2.4 System Health Narrative (상태를 문장으로)

**목적**: 숫자보다 중요한 질문에 답하기

> "오늘 이 시스템은 어떤 종류의 질문을, 어디서 자주 막혔고, 얼마나 잘 회복했는가?"

**요약 카드 예시**:

```
┌────────────────────────────────────────────────────────────┐
│ 📊 오늘의 AI 어시스턴트 상태 (2026-02-04)                    │
├────────────────────────────────────────────────────────────┤
│ 전체 질의: 1,284                                            │
│                                                            │
│ ✅ 정상 성공:        912 (71.0%)  ████████████████░░░░░    │
│ 🔄 Self-healing 성공: 308 (24.0%)  ██████░░░░░░░░░░░░░░    │
│ ❌ 실패(재질문 필요):   64 (5.0%)   █░░░░░░░░░░░░░░░░░░░    │
│                                                            │
│ ⚠️  주의 구간:                                              │
│    • STATUS_METRIC → empty data (recovery rate 45%)        │
│    • RISK_ANALYSIS → derive_from_blockers 실패율 높음       │
│                                                            │
│ 📈 vs 어제: recovery rate +3.2%, failure rate -1.1%        │
└────────────────────────────────────────────────────────────┘
```

---

## 3. P4 대시보드 패널 구성

### 3.1 Global Overview Panel

**답하는 질문**: "지금 이 시스템은 건강한가?"

```
┌─────────────────────────────────────────────────────────────────────┐
│ GLOBAL OVERVIEW                                            [24h ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Success Rate          Recovery Rate        Avg Response Time       │
│  ┌─────────┐           ┌─────────┐          ┌─────────┐            │
│  │  95.0%  │           │  82.3%  │          │  234ms  │            │
│  │  ↑ 2.1% │           │  ↑ 5.2% │          │  ↓ 12ms │            │
│  └─────────┘           └─────────┘          └─────────┘            │
│                                                                     │
│  ─────────────── Query Volume (24h) ───────────────                │
│  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▁▂▃▄▅▆▇▆▅                                          │
│  00:00        06:00        12:00        18:00        24:00         │
│                                                                     │
│  Top Intents                    Fallback Frequency                  │
│  1. BACKLOG_LIST (23%)          1. no_active_sprint (45)           │
│  2. SPRINT_PROGRESS (18%)       2. empty_backlog (32)              │
│  3. TASK_DUE (15%)              3. empty_risk (28)                 │
│  4. MY_TASKS (12%)              4. derive_from_blockers (21)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**핵심 메트릭**:

| 메트릭 | 공식 | 임계값 |
|--------|------|--------|
| Success Rate | (success + recovered) / total | < 90% = 경고 |
| Recovery Rate | recovered / (recovered + failed) | < 70% = 경고 |
| Clarification Rate | clarification_triggered / total | > 30% = 경고 |
| Avg Response Time | 보조 지표 (latency) | > 2s = 경고 |

---

### 3.2 Query Drill-down Panel

**답하는 질문**: "이 질문 하나가 어떻게 처리됐는가?"

```
┌─────────────────────────────────────────────────────────────────────┐
│ QUERY DRILL-DOWN                              trace_id: abc123...   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📝 Raw Query: "현재 스프린트 진행률 알려줘"                           │
│ 👤 User: user_123 | Project: PMS-IC | Session: sess_456             │
│ 🕐 Timestamp: 2026-02-04 14:32:15 KST                               │
│                                                                     │
│ ─────────────── Decision Trace ───────────────                     │
│                                                                     │
│ [1] Intent Classification                                           │
│     ├─ Result: SPRINT_PROGRESS                                      │
│     ├─ Confidence: 0.89 (threshold: 0.7) ✓                         │
│     ├─ Basis: keyword_match ["스프린트", "진행률"]                   │
│     └─ Runner-up: STATUS_METRIC (0.72)                             │
│                                                                     │
│ [2] Handler Execution                                               │
│     ├─ Handler: handle_sprint_progress                              │
│     ├─ Context: {project_id: "proj_1", user_id: "user_123"}        │
│     └─ Duration: 45ms                                               │
│                                                                     │
│ [3] Data Query                                                      │
│     ├─ Query: get_active_sprint(project_id)                        │
│     ├─ Result: NULL (no active sprint)                             │
│     └─ Duration: 32ms                                               │
│                                                                     │
│ [4] P3.5 Clarification                                              │
│     ├─ Trigger: missing_scope (no active sprint)                   │
│     ├─ Question ID: sprint.no_active_sprint                        │
│     └─ Options: [last_completed, pick_sprint, project_progress]    │
│                                                                     │
│ [5] User Response                                                   │
│     ├─ Input: "1"                                                  │
│     ├─ Matched: option 1 (last_completed_sprint)                   │
│     └─ Context Patch: {fallback_mode: "last_completed_sprint"}     │
│                                                                     │
│ [6] Recovery Execution                                              │
│     ├─ Handler: handle_sprint_progress (re-run)                    │
│     ├─ Sprint Found: "Sprint 2024-W05" (COMPLETED)                 │
│     ├─ Stories: 12, Done: 10, In Progress: 2                       │
│     └─ Duration: 89ms                                               │
│                                                                     │
│ [7] Final Response                                                  │
│     ├─ Status: recovered_success                                    │
│     ├─ has_data: true                                              │
│     ├─ Provenance: PostgreSQL (100%)                               │
│     └─ Total Duration: 5.2s (including user wait)                  │
│                                                                     │
│ ─────────────── Data Provenance ───────────────                    │
│                                                                     │
│ │ 문장                              │ 출처       │ 신뢰도 │         │
│ ├───────────────────────────────────┼────────────┼────────┤         │
│ │ "Sprint 2024-W05 진행 현황"       │ DB         │ High   │         │
│ │ "완료율: 83.3% (10/12)"           │ Calculated │ High   │         │
│ │ "선택하신 기준에 따라..."          │ Template   │ Medium │         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Recovery Timeline Panel

**답하는 질문**: "복구가 어떻게 일어났는가?"

```
┌─────────────────────────────────────────────────────────────────────┐
│ RECOVERY TIMELINE                                          [Live]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Timeline View (Last 1 Hour)                                         │
│                                                                     │
│ 14:32:15 ──●── Query: "스프린트 진행률"                              │
│            │   Intent: SPRINT_PROGRESS                              │
│            │                                                        │
│ 14:32:15 ──●── DB Query: active_sprint → NULL                       │
│            │   ⚠️ Data Empty                                         │
│            │                                                        │
│ 14:32:15 ──●── P3.5 Clarification Triggered                         │
│            │   Question: sprint.no_active_sprint                    │
│            │                                                        │
│ 14:37:28 ──●── User Selection: "1"                                  │
│            │   Option: last_completed_sprint                        │
│            │                                                        │
│ 14:37:28 ──●── Recovery Executed                                    │
│            │   Sprint: "2024-W05" found                             │
│            │                                                        │
│ 14:37:28 ──●── ✅ RECOVERED SUCCESS                                 │
│                Total: 5.2s (user wait: 5.1s)                        │
│                                                                     │
│ ─────────────── Recovery Statistics ───────────────                │
│                                                                     │
│ Recovery Type        Count    Success Rate    Avg Time             │
│ ├─ Clarification     156      78.2%           4.3s                 │
│ ├─ Auto Scope        89       92.1%           0.2s                 │
│ ├─ Fallback Query    45       67.8%           0.5s                 │
│ └─ Secondary Fallback 23      100%            0.1s                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Failure Heatmap Panel

**답하는 질문**: "어디서 문제가 반복되는가?"

```
┌─────────────────────────────────────────────────────────────────────┐
│ FAILURE / RECOVERY HEATMAP                                 [7 days]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    Failure Type                                     │
│ Intent            │empty │no_scope│query_fail│timeout│ Total      │
│ ──────────────────┼──────┼────────┼──────────┼───────┼─────────   │
│ SPRINT_PROGRESS   │ 🟡 45│ 🔴 23  │ ⚪ 2     │ ⚪ 0  │ 70         │
│ BACKLOG_LIST      │ 🟠 32│ ⚪ 5   │ ⚪ 1     │ ⚪ 0  │ 38         │
│ RISK_ANALYSIS     │ 🟠 28│ ⚪ 3   │ 🟡 12    │ ⚪ 1  │ 44         │
│ TASK_DUE          │ 🟡 21│ ⚪ 8   │ ⚪ 0     │ ⚪ 0  │ 29         │
│ MY_TASKS          │ ⚪ 12│ ⚪ 2   │ ⚪ 0     │ ⚪ 0  │ 14         │
│ STATUS_METRIC     │ 🔴 67│ 🔴 34  │ 🟡 8     │ ⚪ 2  │ 111 ⚠️     │
│ ──────────────────┼──────┼────────┼──────────┼───────┼─────────   │
│ Total             │ 205  │ 75     │ 23       │ 3     │ 306        │
│                                                                     │
│ Legend: ⚪ < 10  🟡 10-30  🟠 30-50  🔴 > 50                        │
│                                                                     │
│ ⚠️ STATUS_METRIC has highest failure concentration                 │
│    Recommendation: Review intent classification rules              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3.5 Regression & Quality Panel

**답하는 질문**: "이 릴리즈가 품질을 망쳤는가?"

```
┌─────────────────────────────────────────────────────────────────────┐
│ REGRESSION & QUALITY                                       [30 days]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Release Timeline                                                    │
│                                                                     │
│ v2.3.0          v2.3.1          v2.4.0 (current)                   │
│   │               │               │                                 │
│ ──●───────────────●───────────────●─────────────────────────────   │
│   │               │               │                                 │
│  92.1%          93.4%          89.2% ⚠️                             │
│                                 ↓ -4.2%                             │
│                                                                     │
│ ─────────────── Quality Metrics Comparison ───────────────         │
│                                                                     │
│ Metric              v2.3.1    v2.4.0    Delta    Status            │
│ ├─ Success Rate     93.4%     89.2%     -4.2%    🔴 Degraded       │
│ ├─ Recovery Rate    78.1%     72.3%     -5.8%    🔴 Degraded       │
│ ├─ Clarification    24.2%     31.5%     +7.3%    🟡 Warning        │
│ ├─ Avg Latency      198ms     245ms     +47ms    🟡 Warning        │
│ └─ P2 Test Pass     100%      97.2%     -2.8%    🟡 Warning        │
│                                                                     │
│ ─────────────── Regression Analysis ───────────────                │
│                                                                     │
│ ⚠️ v2.4.0 Issues Detected:                                         │
│                                                                     │
│ 1. SPRINT_PROGRESS recovery rate dropped 12%                        │
│    Root cause: last_completed_sprint query timeout                  │
│    Affected: 45 queries                                             │
│                                                                     │
│ 2. STATUS_METRIC misclassification increased                        │
│    Root cause: New keyword pattern conflicting                      │
│    Affected: 67 queries                                             │
│                                                                     │
│ [Rollback to v2.3.1]  [Investigate]  [Acknowledge]                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. P4 이벤트 스키마

### 4.1 Core Event Schema

```python
"""
P4 Event Schema - 모든 관측 이벤트의 기반 구조.

PHILOSOPHY:
- trace_id로 하나의 질문에 대한 모든 이벤트를 연결
- 각 이벤트는 독립적으로 저장/쿼리 가능
- Grafana/ClickHouse/PostgreSQL 어디든 호환
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime
import uuid


class EventType(str, Enum):
    """P4 이벤트 타입."""
    # P0: Intent Routing
    QUERY_RECEIVED = "query_received"
    INTENT_CLASSIFIED = "intent_classified"

    # P1: Data Query
    HANDLER_SELECTED = "handler_selected"
    DATA_QUERY_EXECUTED = "data_query_executed"
    DATA_EMPTY_DETECTED = "data_empty_detected"

    # P2: Quality
    QUALITY_CHECK_PASSED = "quality_check_passed"
    QUALITY_CHECK_FAILED = "quality_check_failed"

    # P3: Self-Healing
    RECOVERY_PLAN_CREATED = "recovery_plan_created"
    FALLBACK_ACTIVATED = "fallback_activated"
    AUTO_RECOVERY_EXECUTED = "auto_recovery_executed"

    # P3.5: Clarification
    CLARIFICATION_TRIGGERED = "clarification_triggered"
    CLARIFICATION_RESOLVED = "clarification_resolved"
    CLARIFICATION_ABANDONED = "clarification_abandoned"

    # Final
    RESPONSE_GENERATED = "response_generated"
    RESPONSE_RENDERED = "response_rendered"


class FinalStatus(str, Enum):
    """최종 응답 상태."""
    SUCCESS = "success"                    # 정상 경로 성공
    RECOVERED_SUCCESS = "recovered_success" # 복구 후 데이터 반환
    RECOVERED_GUIDANCE = "recovered_guidance" # 복구 후 가이드 제공
    FAILED = "failed"                      # 실패 (재질문 필요)


@dataclass
class P4Event:
    """
    P4 관측 이벤트 기본 구조.

    모든 이벤트는 이 구조를 따름.
    """
    # Identity
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = ""                     # 하나의 질문에 대한 모든 이벤트 연결
    session_id: str = ""                   # 세션 ID
    user_id: str = ""                      # 사용자 ID
    project_id: str = ""                   # 프로젝트 ID

    # Event
    event_type: str = ""                   # EventType value
    timestamp: datetime = field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None      # 이벤트 소요 시간

    # Payload
    payload: Dict[str, Any] = field(default_factory=dict)

    # Context
    phase: str = ""                        # P0, P1, P2, P3, P3.5

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "trace_id": self.trace_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "project_id": self.project_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "duration_ms": self.duration_ms,
            "payload": self.payload,
            "phase": self.phase,
        }
```

---

### 4.2 Event Payloads

```python
"""
P4 Event Payloads - 각 이벤트 타입별 페이로드 구조.
"""

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional


# =============================================================================
# P0: Intent Routing Events
# =============================================================================

@dataclass
class IntentClassifiedPayload:
    """INTENT_CLASSIFIED 이벤트 페이로드."""
    query: str                             # 원본 쿼리
    intent: str                            # 분류된 intent
    confidence: float                      # 신뢰도 (0.0~1.0)
    threshold: float                       # 적용된 threshold
    basis: str                             # "keyword_match" | "model_inference" | "rule"
    matched_patterns: List[str]            # 매칭된 패턴들
    runner_up_intent: Optional[str] = None # 2등 intent
    runner_up_confidence: Optional[float] = None


# =============================================================================
# P1: Data Query Events
# =============================================================================

@dataclass
class DataQueryExecutedPayload:
    """DATA_QUERY_EXECUTED 이벤트 페이로드."""
    query_type: str                        # "sql" | "nosql" | "api"
    query_name: str                        # 쿼리 식별자 (SQL 노출 X)
    row_count: int                         # 결과 행 수
    is_empty: bool                         # 결과가 비어있는지
    cache_hit: bool = False                # 캐시 히트 여부
    duration_ms: int = 0


@dataclass
class DataEmptyDetectedPayload:
    """DATA_EMPTY_DETECTED 이벤트 페이로드."""
    intent: str
    reason: str                            # "no_data" | "no_scope" | "permission_denied"
    scope: Dict[str, Any] = None           # 조회 범위
    suggestion: str = ""                   # 제안 (다음 단계)


# =============================================================================
# P3: Self-Healing Events
# =============================================================================

@dataclass
class RecoveryPlanCreatedPayload:
    """RECOVERY_PLAN_CREATED 이벤트 페이로드."""
    intent: str
    reason: str                            # RecoveryReason value
    actions: List[str]                     # 복구 액션 목록
    auto_executable: bool                  # 자동 실행 가능 여부


@dataclass
class FallbackActivatedPayload:
    """FALLBACK_ACTIVATED 이벤트 페이로드."""
    intent: str
    action_type: str                       # "auto_scope" | "fallback_query" | "suggest_create"
    original_scope: Dict[str, Any]
    fallback_scope: Dict[str, Any]
    success: bool


# =============================================================================
# P3.5: Clarification Events
# =============================================================================

@dataclass
class ClarificationTriggeredPayload:
    """CLARIFICATION_TRIGGERED 이벤트 페이로드."""
    intent: str
    question_id: str
    trigger_type: str                      # "empty" | "missing_scope" | "ambiguous"
    options_count: int
    default_option: str


@dataclass
class ClarificationResolvedPayload:
    """CLARIFICATION_RESOLVED 이벤트 페이로드."""
    question_id: str
    resolution_type: str                   # "matched_numeric" | "matched_alias" | "matched_key"
    selected_option: str
    turns_to_resolve: int                  # 해결까지 걸린 턴 수
    recovery_success: bool                 # 복구 성공 여부


@dataclass
class ClarificationAbandonedPayload:
    """CLARIFICATION_ABANDONED 이벤트 페이로드."""
    question_id: str
    reason: str                            # "ttl_expired" | "topic_change" | "explicit_cancel"
    pending_duration_ms: int               # pending 상태 지속 시간


# =============================================================================
# Final Response Events
# =============================================================================

@dataclass
class ResponseGeneratedPayload:
    """RESPONSE_GENERATED 이벤트 페이로드."""
    intent: str
    final_status: str                      # FinalStatus value
    has_data: bool
    has_clarification: bool
    provenance_breakdown: Dict[str, float] # {"db": 0.8, "template": 0.2}
    total_duration_ms: int


# =============================================================================
# Payload Factory
# =============================================================================

def create_payload(event_type: str, **kwargs) -> Dict[str, Any]:
    """이벤트 타입에 맞는 페이로드 생성."""
    PAYLOAD_CLASSES = {
        EventType.INTENT_CLASSIFIED.value: IntentClassifiedPayload,
        EventType.DATA_QUERY_EXECUTED.value: DataQueryExecutedPayload,
        EventType.DATA_EMPTY_DETECTED.value: DataEmptyDetectedPayload,
        EventType.RECOVERY_PLAN_CREATED.value: RecoveryPlanCreatedPayload,
        EventType.FALLBACK_ACTIVATED.value: FallbackActivatedPayload,
        EventType.CLARIFICATION_TRIGGERED.value: ClarificationTriggeredPayload,
        EventType.CLARIFICATION_RESOLVED.value: ClarificationResolvedPayload,
        EventType.CLARIFICATION_ABANDONED.value: ClarificationAbandonedPayload,
        EventType.RESPONSE_GENERATED.value: ResponseGeneratedPayload,
    }

    payload_class = PAYLOAD_CLASSES.get(event_type)
    if payload_class:
        return asdict(payload_class(**kwargs))
    return kwargs
```

---

### 4.3 Event Emitter

```python
"""
P4 Event Emitter - 코드에서 이벤트를 발행하는 인터페이스.

USAGE:
    from p4_events import emit_event, EventType

    emit_event(
        EventType.INTENT_CLASSIFIED,
        trace_id=trace_id,
        query="백로그 보여줘",
        intent="BACKLOG_LIST",
        confidence=0.92,
        basis="keyword_match",
        matched_patterns=["백로그"],
    )
"""

import logging
import json
from typing import Any, Dict, Optional
from datetime import datetime
from contextvars import ContextVar

logger = logging.getLogger("p4_observability")

# Context variable for trace_id (thread-safe)
_current_trace_id: ContextVar[str] = ContextVar("trace_id", default="")


class P4EventEmitter:
    """
    P4 이벤트 발행기.

    Multiple backends 지원:
    - Console (개발)
    - File (로컬)
    - PostgreSQL (운영)
    - OpenTelemetry (분산 추적)
    """

    def __init__(self):
        self.backends = []

    def add_backend(self, backend):
        """백엔드 추가."""
        self.backends.append(backend)

    def emit(
        self,
        event_type: str,
        payload: Dict[str, Any],
        trace_id: Optional[str] = None,
        session_id: str = "",
        user_id: str = "",
        project_id: str = "",
        phase: str = "",
        duration_ms: Optional[int] = None,
    ) -> None:
        """이벤트 발행."""
        event = P4Event(
            trace_id=trace_id or _current_trace_id.get(),
            session_id=session_id,
            user_id=user_id,
            project_id=project_id,
            event_type=event_type,
            payload=payload,
            phase=phase,
            duration_ms=duration_ms,
        )

        for backend in self.backends:
            try:
                backend.write(event)
            except Exception as e:
                logger.error(f"Failed to write event to backend: {e}")


# Global emitter instance
_emitter = P4EventEmitter()


def init_emitter(backends: list) -> None:
    """이미터 초기화."""
    for backend in backends:
        _emitter.add_backend(backend)


def set_trace_id(trace_id: str) -> None:
    """현재 컨텍스트의 trace_id 설정."""
    _current_trace_id.set(trace_id)


def get_trace_id() -> str:
    """현재 컨텍스트의 trace_id 반환."""
    return _current_trace_id.get()


def emit_event(
    event_type: str,
    trace_id: Optional[str] = None,
    phase: str = "",
    duration_ms: Optional[int] = None,
    **payload_kwargs,
) -> None:
    """
    이벤트 발행 (간편 함수).

    Usage:
        emit_event(
            EventType.INTENT_CLASSIFIED,
            query="백로그 보여줘",
            intent="BACKLOG_LIST",
            confidence=0.92,
        )
    """
    payload = create_payload(event_type, **payload_kwargs)
    _emitter.emit(
        event_type=event_type,
        payload=payload,
        trace_id=trace_id,
        phase=phase,
        duration_ms=duration_ms,
    )


# =============================================================================
# Backend Implementations
# =============================================================================

class ConsoleBackend:
    """개발용 콘솔 백엔드."""

    def write(self, event: P4Event) -> None:
        print(f"[P4] {event.event_type}: {json.dumps(event.payload, ensure_ascii=False)}")


class FileBackend:
    """파일 백엔드."""

    def __init__(self, filepath: str):
        self.filepath = filepath

    def write(self, event: P4Event) -> None:
        with open(self.filepath, "a") as f:
            f.write(json.dumps(event.to_dict(), ensure_ascii=False) + "\n")


class PostgreSQLBackend:
    """PostgreSQL 백엔드."""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    def write(self, event: P4Event) -> None:
        # INSERT INTO p4_events (event_id, trace_id, ..., payload)
        # VALUES ($1, $2, ..., $n)
        pass  # Implementation with asyncpg or psycopg2


class OpenTelemetryBackend:
    """OpenTelemetry 백엔드."""

    def write(self, event: P4Event) -> None:
        # Convert to OTel span/event
        pass
```

---

### 4.4 Integration Examples

```python
"""
P4 이벤트 통합 예제 - 기존 P0~P3 코드에 추가.
"""

# =============================================================================
# P0: Intent Router Integration
# =============================================================================

def classify_intent(query: str, trace_id: str) -> str:
    """Intent 분류 (P4 이벤트 포함)."""
    from p4_events import emit_event, EventType, set_trace_id
    import time

    set_trace_id(trace_id)
    start = time.time()

    # 기존 분류 로직
    intent, confidence, patterns = _do_classification(query)

    duration_ms = int((time.time() - start) * 1000)

    # P4 이벤트 발행
    emit_event(
        EventType.INTENT_CLASSIFIED,
        phase="P0",
        duration_ms=duration_ms,
        query=query,
        intent=intent,
        confidence=confidence,
        threshold=0.7,
        basis="keyword_match" if patterns else "model_inference",
        matched_patterns=patterns,
    )

    return intent


# =============================================================================
# P1: Data Query Integration
# =============================================================================

def execute_query(query_name: str, params: dict, trace_id: str) -> QueryResult:
    """데이터 쿼리 실행 (P4 이벤트 포함)."""
    from p4_events import emit_event, EventType
    import time

    start = time.time()
    result = _execute_db_query(query_name, params)
    duration_ms = int((time.time() - start) * 1000)

    # P4 이벤트 발행
    emit_event(
        EventType.DATA_QUERY_EXECUTED,
        trace_id=trace_id,
        phase="P1",
        duration_ms=duration_ms,
        query_type="sql",
        query_name=query_name,
        row_count=len(result.data) if result.data else 0,
        is_empty=result.is_empty,
        cache_hit=result.from_cache,
    )

    if result.is_empty:
        emit_event(
            EventType.DATA_EMPTY_DETECTED,
            trace_id=trace_id,
            phase="P1",
            intent=params.get("intent", "unknown"),
            reason="no_data",
            scope=params,
        )

    return result


# =============================================================================
# P3.5: Clarification Integration
# =============================================================================

def trigger_clarification(question: ClarificationQuestion, trace_id: str) -> None:
    """Clarification 트리거 (P4 이벤트 포함)."""
    from p4_events import emit_event, EventType

    emit_event(
        EventType.CLARIFICATION_TRIGGERED,
        trace_id=trace_id,
        phase="P3.5",
        intent=question.intent,
        question_id=question.question_id,
        trigger_type="empty",  # or "missing_scope", "ambiguous"
        options_count=len(question.options),
        default_option=next(
            (opt.key for opt in question.options if opt.is_default),
            question.options[0].key
        ),
    )


def resolve_clarification(
    question_id: str,
    selected_option: str,
    resolution_type: str,
    turns: int,
    recovery_success: bool,
    trace_id: str,
) -> None:
    """Clarification 해결 (P4 이벤트 포함)."""
    from p4_events import emit_event, EventType

    emit_event(
        EventType.CLARIFICATION_RESOLVED,
        trace_id=trace_id,
        phase="P3.5",
        question_id=question_id,
        resolution_type=resolution_type,
        selected_option=selected_option,
        turns_to_resolve=turns,
        recovery_success=recovery_success,
    )


# =============================================================================
# Final Response Integration
# =============================================================================

def finalize_response(
    contract: ResponseContract,
    trace_id: str,
    total_duration_ms: int,
) -> None:
    """최종 응답 생성 (P4 이벤트 포함)."""
    from p4_events import emit_event, EventType, FinalStatus

    # Determine final status
    if contract.success and contract.has_data:
        if contract.flags.auto_recovered:
            final_status = FinalStatus.RECOVERED_SUCCESS.value
        else:
            final_status = FinalStatus.SUCCESS.value
    elif contract.success and not contract.has_data:
        final_status = FinalStatus.RECOVERED_GUIDANCE.value
    else:
        final_status = FinalStatus.FAILED.value

    emit_event(
        EventType.RESPONSE_GENERATED,
        trace_id=trace_id,
        phase="FINAL",
        duration_ms=total_duration_ms,
        intent=contract.intent,
        final_status=final_status,
        has_data=contract.has_data,
        has_clarification=contract.has_clarification(),
        provenance_breakdown=_calculate_provenance(contract),
        total_duration_ms=total_duration_ms,
    )
```

---

## 5. P4 데이터베이스 스키마

### 5.1 PostgreSQL Schema

```sql
-- P4 이벤트 테이블
CREATE TABLE p4_events (
    id SERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    trace_id UUID NOT NULL,
    session_id VARCHAR(255),
    user_id VARCHAR(255),
    project_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    phase VARCHAR(10),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_p4_events_trace_id ON p4_events(trace_id);
CREATE INDEX idx_p4_events_timestamp ON p4_events(timestamp);
CREATE INDEX idx_p4_events_event_type ON p4_events(event_type);
CREATE INDEX idx_p4_events_user_id ON p4_events(user_id);
CREATE INDEX idx_p4_events_project_id ON p4_events(project_id);

-- JSONB 인덱스 (자주 쿼리하는 필드)
CREATE INDEX idx_p4_events_intent ON p4_events((payload->>'intent'));
CREATE INDEX idx_p4_events_final_status ON p4_events((payload->>'final_status'));

-- 집계용 Materialized View
CREATE MATERIALIZED VIEW p4_daily_stats AS
SELECT
    DATE_TRUNC('day', timestamp) AS day,
    project_id,
    COUNT(*) FILTER (WHERE event_type = 'response_generated') AS total_queries,
    COUNT(*) FILTER (WHERE payload->>'final_status' = 'success') AS success_count,
    COUNT(*) FILTER (WHERE payload->>'final_status' = 'recovered_success') AS recovered_count,
    COUNT(*) FILTER (WHERE payload->>'final_status' = 'failed') AS failed_count,
    AVG((payload->>'total_duration_ms')::int) FILTER (WHERE event_type = 'response_generated') AS avg_duration_ms
FROM p4_events
GROUP BY DATE_TRUNC('day', timestamp), project_id;

-- Refresh every hour
-- CREATE EXTENSION pg_cron;
-- SELECT cron.schedule('refresh_p4_stats', '0 * * * *', 'REFRESH MATERIALIZED VIEW p4_daily_stats');
```

---

## 6. Implementation Checklist

| # | Checklist Item | Verification |
|---|----------------|--------------|
| 1 | **P4Event schema defined** | All event types have payloads |
| 2 | **Emitter initialized** | Backends configured |
| 3 | **P0 events integrated** | INTENT_CLASSIFIED emitted |
| 4 | **P1 events integrated** | DATA_QUERY_EXECUTED emitted |
| 5 | **P3 events integrated** | RECOVERY_PLAN_CREATED emitted |
| 6 | **P3.5 events integrated** | CLARIFICATION_* events emitted |
| 7 | **trace_id propagated** | All events in a query share trace_id |
| 8 | **Dashboard Overview** | Success/Recovery/Failure visible |
| 9 | **Query Drill-down** | Single query trace viewable |
| 10 | **Recovery Timeline** | Recovery flow visualized |
| 11 | **Failure Heatmap** | Problem areas identified |
| 12 | **Regression Panel** | Release comparison available |

---

## 7. Tech Stack (권장)

| Component | Recommended | Alternative |
|-----------|-------------|-------------|
| Event Collection | OpenTelemetry | Custom emitter |
| Event Storage | PostgreSQL (JSONB) | ClickHouse (고볼륨) |
| Metrics | Prometheus | InfluxDB |
| Visualization | Grafana | Custom React |
| Trace UI | Jaeger | Custom timeline |

### 7.1 Grafana Dashboard JSON (예시)

```json
{
  "dashboard": {
    "title": "P4 Observability Dashboard",
    "panels": [
      {
        "title": "Success Rate (24h)",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(p4_response_generated_total{final_status='success'}) / sum(p4_response_generated_total) * 100"
          }
        ]
      },
      {
        "title": "Recovery Rate (24h)",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(p4_response_generated_total{final_status='recovered_success'}) / (sum(p4_response_generated_total{final_status='recovered_success'}) + sum(p4_response_generated_total{final_status='failed'})) * 100"
          }
        ]
      },
      {
        "title": "Clarification Trigger Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(p4_clarification_triggered_total) / sum(p4_response_generated_total) * 100"
          }
        ]
      }
    ]
  }
}
```

---

## 8. Execution Plan

| Day | Task | Verification |
|-----|------|--------------|
| 1 | Event schema + Emitter | Unit tests pass |
| 2 | P0~P1 integration | Events emitted in logs |
| 3 | P3~P3.5 integration | Recovery events visible |
| 4 | PostgreSQL backend | Events stored in DB |
| 5 | Overview + Drill-down panels | Grafana displays data |
| 6 | Heatmap + Regression panels | Problem areas visible |
| 7 | Alerting + Documentation | Thresholds configured |

---

## 9. Success Criteria

### Quantitative

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Event capture rate** | 100% | < 95% = 데이터 유실 |
| **Trace completeness** | 100% | < 90% = trace_id 누락 |
| **Dashboard latency** | < 2s | > 5s = UX 저하 |
| **Alert accuracy** | > 90% | < 70% = 노이즈 과다 |

### Qualitative

- ✅ 모든 질문에 대해 "왜 이 답이 나왔는지" 추적 가능
- ✅ 복구 성공/실패 과정을 타임라인으로 시각화
- ✅ 릴리즈 간 품질 변화를 즉시 확인 가능
- ✅ 문제 구간(Intent × Failure Type)을 히트맵으로 식별

---

## 10. P4가 완성되면 얻는 결정적 변화

| 이전 | 이후 |
|------|------|
| "잘 되는 것 같아요" | "success rate 92.3%, recovery rate 78.1%" |
| "가끔 이상한 답이 나와요" | "이 케이스는 P1 데이터 공백 때문" |
| "LLM은 원래 그래요" | "이 intent는 fallback 설계가 약함" |
| "언제부터 이랬지?" | "v2.4.0에서 recovery rate 12% 하락" |

> **P4는 AI 시스템의 '사후 책임성(accountability)'을 구현하는 마지막 레이어다.**

---

## 11. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | AI Assistant | Initial P4 specification: 4-axis visualization, event schema, dashboard panels, integration guide |
