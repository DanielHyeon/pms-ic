# Phase 2: Workflow Templates & Skill Library

## 목표
LangGraph 워크플로우를 템플릿화하고 재사용 가능한 Skill Library 구축

## 예상 기간
4-6주

## 사전 요구사항
- Phase 1 완료 (Gates & Foundation)

---

## 1. 공통 설계 규약 (모든 그래프에 적용)

### 1.1 공통 State 스키마

**파일:** `llm-service/workflows/common_state.py`

```python
from typing import TypedDict, List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime

class DecisionMode(Enum):
    SUGGEST = "suggest"
    DECIDE = "decide"
    EXECUTE = "execute"
    COMMIT = "commit"

class FailureType(Enum):
    INFO_MISSING = "info_missing"           # 필요한 데이터/문서/추정치/용량 부족
    CONFLICT = "conflict"                   # 서로 다른 근거/정의/상태 충돌
    POLICY_VIOLATION = "policy_violation"   # RBAC/데이터 경계/금지 액션
    LOW_CONFIDENCE = "low_confidence"       # 검증 단계에서 임계치 미달
    TOOL_ERROR = "tool_error"               # MCP 호출 오류/timeout/invalid schema
    DATA_BOUNDARY = "data_boundary"         # 다른 프로젝트/테넌트 데이터 혼입 위험

class CommonWorkflowState(TypedDict):
    """공통 워크플로우 State - 모든 그래프에서 상속"""

    # === 식별자 ===
    tenant_id: str
    project_id: str
    user_id: str
    role: str  # PO/PM/SM/Dev/Viewer
    request_id: str
    trace_id: str

    # === Intent ===
    intent: str  # weekly_report / sprint_plan / trace_check / risk_scan / knowledge_qa

    # === Context Snapshot ===
    context_snapshot: Dict[str, Any]
    # 포함 가능: phase_state, wbs_state, backlog_state, sprint_state, kanban_state

    # === Retrieval 결과 ===
    retrieval: Dict[str, Any]
    # - docs[]: vector 검색 결과
    # - graph_facts[]: neo4j 질의 결과
    # - metrics[]: analytics 데이터
    # - events[]: event log

    # === 중간 산출물 ===
    draft: Dict[str, Any]  # 보고서 초안/추천 스코프/리스크 목록 등

    # === 근거 매핑 ===
    evidence_map: List[Dict[str, Any]]  # [{claim: str, evidence_ids: [str]}]

    # === 신뢰도 ===
    confidence: float  # 0~1

    # === Policy 결과 ===
    policy_result: Dict[str, Any]
    # - allowed_actions: List[str]
    # - denied_reason: Optional[str]

    # === Failure 정보 ===
    failure: Optional[Dict[str, Any]]
    # - type: FailureType
    # - detail: str
    # - retry_count: int
    # - recovery_action: str

    # === Decision Gate ===
    decision_gate: Dict[str, Any]
    # - mode: DecisionMode
    # - requires_human_approval: bool

    # === 최종 출력 ===
    result: Dict[str, Any]
    status: str  # running / completed / failed / waiting_approval
```

### 1.2 공통 Node 타입 (표준 라이브러리)

| Node | 역할 | 입력 | 출력 |
|------|------|------|------|
| `Router` | Intent 분기 (또는 그래프 선택 전 상위 라우터) | intent | next_graph |
| `BuildContext` | DB/Graph/Vector에서 컨텍스트 빌드 | project_id, scope | context_snapshot |
| `Retrieve` | RAG / 그래프 질의 / 메트릭 수집 | query, filters | retrieval |
| `Reason` | 계획/요약/추천/분석 생성 | context, retrieval | draft |
| `Verify` | 근거·정합성·정책·신뢰도 검증 | draft, evidence | verified_draft, confidence |
| `Act` | 초안 저장, 태스크 생성(승인 전), 링크 생성 | draft | action_result |
| `Gate` | 권한/승인 레벨에 따라 Commit 차단/요청 | decision_gate | approved / blocked |
| `Recover` | 실패 유형에 따른 재시도/다운그레이드/질문 생성 | failure | recovery_action |
| `Observe` | Trace/Span/비용/품질 메트릭 로깅 | all state | telemetry |

**파일:** `llm-service/workflows/common_nodes.py`

```python
from typing import Callable, Dict, Any
from .common_state import CommonWorkflowState, FailureType, DecisionMode
from observability.tracing import tracer
from observability.metrics import metrics

# === BuildContext Node ===
def build_context(state: CommonWorkflowState) -> CommonWorkflowState:
    """DB/Graph/Vector에서 프로젝트 컨텍스트 빌드."""
    project_id = state["project_id"]
    tenant_id = state["tenant_id"]

    # Phase state
    phase_state = fetch_phase_state(project_id)

    # WBS state
    wbs_state = fetch_wbs_state(project_id)

    # Backlog state
    backlog_state = fetch_backlog_state(project_id)

    # Sprint state
    sprint_state = fetch_sprint_state(project_id)

    return {
        **state,
        "context_snapshot": {
            "phase_state": phase_state,
            "wbs_state": wbs_state,
            "backlog_state": backlog_state,
            "sprint_state": sprint_state,
            "fetched_at": datetime.utcnow().isoformat(),
        }
    }

# === Gate Node ===
def gate_check(state: CommonWorkflowState) -> CommonWorkflowState:
    """권한/승인 레벨 확인 및 Commit 차단."""
    mode = state["decision_gate"]["mode"]
    role = state["role"]

    # Commit은 항상 승인 필요
    if mode == DecisionMode.COMMIT.value:
        return {
            **state,
            "decision_gate": {
                **state["decision_gate"],
                "requires_human_approval": True,
            },
            "status": "waiting_approval",
        }

    # Execute는 role에 따라
    if mode == DecisionMode.EXECUTE.value:
        if role not in ["pm", "pmo_head", "admin"]:
            return {
                **state,
                "decision_gate": {
                    **state["decision_gate"],
                    "mode": DecisionMode.SUGGEST.value,  # 다운그레이드
                },
            }

    return state

# === Recover Node ===
def recover_from_failure(state: CommonWorkflowState) -> CommonWorkflowState:
    """실패 유형에 따른 복구 전략 적용."""
    failure = state.get("failure")
    if not failure:
        return state

    failure_type = failure.get("type")
    retry_count = failure.get("retry_count", 0)

    recovery_strategies = {
        FailureType.INFO_MISSING.value: _recover_info_missing,
        FailureType.CONFLICT.value: _recover_conflict,
        FailureType.POLICY_VIOLATION.value: _recover_policy_violation,
        FailureType.LOW_CONFIDENCE.value: _recover_low_confidence,
        FailureType.TOOL_ERROR.value: _recover_tool_error,
        FailureType.DATA_BOUNDARY.value: _recover_data_boundary,
    }

    strategy = recovery_strategies.get(failure_type, _default_recovery)
    return strategy(state, retry_count)


def _recover_info_missing(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """info_missing → Retrieve(확장) → AskHuman(질문 1~3개) → SafeDraft(불확실성 표기)"""
    if retry_count < 2:
        # Retrieve 확장 시도
        return {
            **state,
            "failure": {
                **state["failure"],
                "retry_count": retry_count + 1,
                "recovery_action": "expand_retrieve",
            }
        }
    else:
        # 질문 생성 + 불확실성 표기
        return {
            **state,
            "failure": {
                **state["failure"],
                "recovery_action": "ask_human",
            },
            "draft": {
                **state.get("draft", {}),
                "uncertainty_sections": ["확인 필요"],
            }
        }


def _recover_conflict(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """conflict → GraphFact(우선) → Recency(최신 이벤트 우선) → EscalateDecision"""
    return {
        **state,
        "failure": {
            **state["failure"],
            "recovery_action": "use_graph_fact_priority",
            "conflict_resolution": "recency_first",
        }
    }


def _recover_policy_violation(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """policy_violation → SuggestOnly로 다운그레이드 + 이유 로깅"""
    return {
        **state,
        "decision_gate": {
            "mode": DecisionMode.SUGGEST.value,
            "requires_human_approval": False,
        },
        "failure": {
            **state["failure"],
            "recovery_action": "downgrade_to_suggest",
        }
    }


def _recover_low_confidence(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """low_confidence → Verify 강화 + 주장 축소 + 근거 없는 문장 제거"""
    return {
        **state,
        "failure": {
            **state["failure"],
            "recovery_action": "strengthen_verify",
        },
        "draft": {
            **state.get("draft", {}),
            "remove_ungrounded_claims": True,
        }
    }


def _recover_tool_error(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """tool_error → Retry(지수백오프 1~2회) → Fallback MCP/Local Skill → 실패 보고"""
    if retry_count < 2:
        return {
            **state,
            "failure": {
                **state["failure"],
                "retry_count": retry_count + 1,
                "recovery_action": "retry_with_backoff",
                "backoff_ms": 1000 * (2 ** retry_count),
            }
        }
    else:
        return {
            **state,
            "failure": {
                **state["failure"],
                "recovery_action": "fallback_or_report",
            }
        }


def _recover_data_boundary(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """data_boundary → 즉시 중단 + 감사 로그 + 마스킹된 안내"""
    # 감사 로그 기록
    log_audit_event(
        event_type="data_boundary_violation",
        tenant_id=state["tenant_id"],
        project_id=state["project_id"],
        user_id=state["user_id"],
        trace_id=state["trace_id"],
    )

    return {
        **state,
        "status": "failed",
        "failure": {
            **state["failure"],
            "recovery_action": "immediate_stop",
        },
        "result": {
            "error": "데이터 경계 위반이 감지되어 처리가 중단되었습니다.",
            "masked": True,
        }
    }


def _default_recovery(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """기본 복구: 안전한 실패"""
    return {
        **state,
        "status": "failed",
        "failure": {
            **state["failure"],
            "recovery_action": "safe_fail",
        }
    }


# === Observe Node ===
def observe(state: CommonWorkflowState) -> CommonWorkflowState:
    """Trace/Span/비용/품질 메트릭 로깅."""
    trace_id = state["trace_id"]
    intent = state["intent"]

    # Record metrics
    metrics.record_count(f"workflow.{intent}")
    metrics.record_success(f"workflow.{intent}", state["status"] == "completed")

    if state.get("confidence"):
        metrics.record(f"confidence.{intent}", state["confidence"])

    # Log to trace
    tracer.current_span().set_attribute("intent", intent)
    tracer.current_span().set_attribute("confidence", state.get("confidence", 0))
    tracer.current_span().set_attribute("status", state["status"])

    return state
```

---

## 2. LangGraph 워크플로우 템플릿 5종

### 2.1 템플릿 G1: Weekly Executive Report (주간보고 자동 생성)

**목적:**
- 프로젝트 상태를 "경영진/이해관계자" 관점으로 요약
- KPI/이슈/리스크/다음주 계획 + 근거 링크 포함
- **Commit(배포)**는 승인 필요 옵션

**입력:**
```python
{
    "project_id": str,
    "week_range": {"start": date, "end": date},
    "audience": "exec" | "team",  # 선택
    "format": "md" | "pdf",       # 선택
    "channels": ["slack", "email"],  # 선택
}
```

**출력:**
```python
{
    "report_draft": str,  # markdown
    "evidence_links": [{"claim": str, "source_id": str, "url": str}],
    "risk_summary": [{"title": str, "severity": str, "mitigation": str}],
    "actions_next_week": [{"title": str, "owner": str, "due": date}],
    "confidence": float,
    "missing_info_questions": [str],
}
```

**파일:** `llm-service/workflows/g1_weekly_report.py`

```python
from langgraph.graph import StateGraph, END
from .common_state import CommonWorkflowState, DecisionMode
from .common_nodes import build_context, gate_check, recover_from_failure, observe

class WeeklyReportState(CommonWorkflowState):
    """G1 Weekly Report 전용 State"""
    week_range: Dict[str, str]
    audience: str
    format: str
    channels: List[str]

    # Retrieve 결과
    metrics_data: Dict[str, Any]
    events_data: List[Dict[str, Any]]
    docs_data: List[Dict[str, Any]]

    # 생성된 섹션
    report_sections: Dict[str, str]


def create_g1_weekly_report_workflow():
    """G1: 주간보고 자동 생성 워크플로우"""

    workflow = StateGraph(WeeklyReportState)

    # === 1. BuildContext ===
    workflow.add_node("build_context", build_context)

    # === 2. RetrieveMetrics ===
    def retrieve_metrics(state: WeeklyReportState) -> WeeklyReportState:
        """cycle time, throughput, burndown, WIP, milestone progress 수집"""
        metrics = fetch_project_metrics(
            project_id=state["project_id"],
            week_range=state["week_range"]
        )
        return {**state, "metrics_data": metrics}

    workflow.add_node("retrieve_metrics", retrieve_metrics)

    # === 3. RetrieveEvents ===
    def retrieve_events(state: WeeklyReportState) -> WeeklyReportState:
        """주간 변경 이벤트: scope change, delays, blockers"""
        events = fetch_project_events(
            project_id=state["project_id"],
            event_types=["scope_change", "delay", "blocker_added", "blocker_resolved"],
            date_range=state["week_range"]
        )
        return {**state, "events_data": events}

    workflow.add_node("retrieve_events", retrieve_events)

    # === 4. RetrieveDocs ===
    def retrieve_docs(state: WeeklyReportState) -> WeeklyReportState:
        """회의록/결정/주요 문서 RAG"""
        docs = rag_search(
            project_id=state["project_id"],
            query="주간 주요 결정 회의록 이슈",
            date_range=state["week_range"],
            top_k=10
        )
        return {**state, "docs_data": docs}

    workflow.add_node("retrieve_docs", retrieve_docs)

    # === 5. ReasonComposeDraft ===
    def reason_compose_draft(state: WeeklyReportState) -> WeeklyReportState:
        """보고서 초안 생성: 템플릿 기반"""
        sections = generate_report_sections(
            metrics=state["metrics_data"],
            events=state["events_data"],
            docs=state["docs_data"],
            audience=state["audience"]
        )

        # 근거 매핑 생성
        evidence_map = extract_evidence_map(sections, state["docs_data"])

        return {
            **state,
            "report_sections": sections,
            "evidence_map": evidence_map,
            "draft": {"sections": sections},
        }

    workflow.add_node("reason_compose_draft", reason_compose_draft)

    # === 6. VerifyEvidence ===
    def verify_evidence(state: WeeklyReportState) -> WeeklyReportState:
        """근거 없는 주장 제거, 수치 cross-check"""
        verified_sections = {}
        removed_claims = []

        for section_name, content in state["report_sections"].items():
            verified, removed = verify_and_filter_claims(
                content=content,
                evidence_map=state["evidence_map"],
                metrics=state["metrics_data"]
            )
            verified_sections[section_name] = verified
            removed_claims.extend(removed)

        # 신뢰도 계산
        confidence = calculate_confidence(
            total_claims=count_claims(state["report_sections"]),
            verified_claims=count_claims(verified_sections),
            evidence_count=len(state["evidence_map"])
        )

        return {
            **state,
            "report_sections": verified_sections,
            "confidence": confidence,
            "draft": {
                **state["draft"],
                "removed_claims": removed_claims,
            }
        }

    workflow.add_node("verify_evidence", verify_evidence)

    # === 7. VerifyPolicy ===
    def verify_policy(state: WeeklyReportState) -> WeeklyReportState:
        """외부 공유 금지/PII/기밀 문구 필터"""
        filtered_sections = {}

        for section_name, content in state["report_sections"].items():
            filtered = filter_sensitive_content(
                content=content,
                audience=state["audience"],
                channels=state["channels"]
            )
            filtered_sections[section_name] = filtered

        # 외부 채널 권한 체크
        if "email" in state["channels"] and state["audience"] == "exec":
            if not check_external_share_permission(state["role"]):
                return {
                    **state,
                    "failure": {
                        "type": "policy_violation",
                        "detail": "외부 이메일 채널 권한 없음",
                        "retry_count": 0,
                    }
                }

        return {**state, "report_sections": filtered_sections}

    workflow.add_node("verify_policy", verify_policy)

    # === 8. ActSaveDraft ===
    def act_save_draft(state: WeeklyReportState) -> WeeklyReportState:
        """오브젝트 스토리지/문서 DB 저장"""
        report_content = compile_report(
            sections=state["report_sections"],
            format=state["format"]
        )

        draft_id = save_report_draft(
            project_id=state["project_id"],
            content=report_content,
            metadata={
                "week_range": state["week_range"],
                "audience": state["audience"],
                "confidence": state["confidence"],
            }
        )

        return {
            **state,
            "result": {
                "draft_id": draft_id,
                "report_content": report_content,
            }
        }

    workflow.add_node("act_save_draft", act_save_draft)

    # === 9. GatePublish ===
    def gate_publish(state: WeeklyReportState) -> WeeklyReportState:
        """채널 배포는 Commit이므로 승인 조건 적용"""
        if state["channels"]:
            return {
                **state,
                "decision_gate": {
                    "mode": DecisionMode.COMMIT.value,
                    "requires_human_approval": True,
                },
                "status": "waiting_approval",
            }

        return {
            **state,
            "status": "completed",
        }

    workflow.add_node("gate_publish", gate_publish)

    # === 10. Observe ===
    workflow.add_node("observe", observe)

    # === 11. Recover ===
    workflow.add_node("recover", recover_from_failure)

    # === Edge 정의 ===
    workflow.set_entry_point("build_context")

    workflow.add_edge("build_context", "retrieve_metrics")
    workflow.add_edge("retrieve_metrics", "retrieve_events")
    workflow.add_edge("retrieve_events", "retrieve_docs")
    workflow.add_edge("retrieve_docs", "reason_compose_draft")
    workflow.add_edge("reason_compose_draft", "verify_evidence")
    workflow.add_edge("verify_evidence", "verify_policy")

    # Policy 검증 후 분기
    def route_after_policy(state: WeeklyReportState) -> str:
        if state.get("failure"):
            return "recover"
        return "act_save_draft"

    workflow.add_conditional_edges(
        "verify_policy",
        route_after_policy,
        {"recover": "recover", "act_save_draft": "act_save_draft"}
    )

    workflow.add_edge("act_save_draft", "gate_publish")
    workflow.add_edge("gate_publish", "observe")
    workflow.add_edge("observe", END)

    # Recovery 후 재시도 또는 종료
    def route_after_recover(state: WeeklyReportState) -> str:
        recovery_action = state.get("failure", {}).get("recovery_action")
        if recovery_action == "downgrade_to_suggest":
            return "act_save_draft"
        return "observe"

    workflow.add_conditional_edges(
        "recover",
        route_after_recover,
        {"act_save_draft": "act_save_draft", "observe": "observe"}
    )

    return workflow.compile()


# === 권장 KPI (평가) ===
G1_KPIS = {
    "report_generation_time_saved": "보고서 생성 소요시간 절감 (분)",
    "human_edit_ratio": "사람 수정량 (편집 diff %)",
    "evidence_link_ratio": "근거 링크 비율 (%)",
    "publish_approval_rate": "배포 승인율 (%)",
}
```

### 2.2 템플릿 G2: Sprint Scope Recommendation (Backlog→Sprint 추천)

**목적:**
- 백로그를 용량(capacity), 우선순위, 의존성 기준으로 스프린트 후보 스코프 구성
- **추천(Suggest)**까지만 기본, 확정(Commit)은 승인

**입력:**
```python
{
    "project_id": str,
    "sprint_id": str | None,  # None이면 새 스프린트
    "team_capacity": int,  # 포인트
    "constraints": {
        "vacation_days": [{"user_id": str, "days": int}],
        "bottleneck_skills": [str],
        "must_include": [str],  # backlog_item_ids
    },
    "priority_policy": "WSJF" | "High-first" | "Deadline-first",
}
```

**출력:**
```python
{
    "sprint_candidate_items": [
        {"id": str, "title": str, "points": int, "rationale": str, "risk": str, "dependencies": [str]}
    ],
    "capacity_usage": float,  # 0~1
    "risk_notes": [str],
    "excluded_items_with_reason": [{"id": str, "reason": str}],
}
```

**파일:** `llm-service/workflows/g2_sprint_planning.py`

```python
from langgraph.graph import StateGraph, END
from .common_state import CommonWorkflowState, DecisionMode

class SprintPlanningState(CommonWorkflowState):
    """G2 Sprint Planning 전용 State"""
    sprint_id: Optional[str]
    team_capacity: int
    constraints: Dict[str, Any]
    priority_policy: str

    # Retrieve 결과
    backlog_items: List[Dict[str, Any]]
    dependencies: List[Dict[str, Any]]

    # 최적화 결과
    candidate_items: List[Dict[str, Any]]
    excluded_items: List[Dict[str, Any]]
    capacity_usage: float


def create_g2_sprint_planning_workflow():
    """G2: 스프린트 범위 추천 워크플로우"""

    workflow = StateGraph(SprintPlanningState)

    # === 1. BuildContext ===
    workflow.add_node("build_context", build_context)

    # === 2. RetrieveBacklog ===
    def retrieve_backlog(state: SprintPlanningState) -> SprintPlanningState:
        """우선순위/추정치/상태 포함 백로그 조회"""
        items = fetch_backlog_items(
            project_id=state["project_id"],
            status=["ready", "refined"],
            include_estimates=True
        )
        return {**state, "backlog_items": items}

    workflow.add_node("retrieve_backlog", retrieve_backlog)

    # === 3. RetrieveDependencies ===
    def retrieve_dependencies(state: SprintPlanningState) -> SprintPlanningState:
        """Graph: backlog↔wbs↔phase 의존성"""
        deps = fetch_dependencies_from_graph(
            project_id=state["project_id"],
            item_ids=[item["id"] for item in state["backlog_items"]]
        )
        return {**state, "dependencies": deps}

    workflow.add_node("retrieve_dependencies", retrieve_dependencies)

    # === 4. ReasonOptimizeScope ===
    def reason_optimize_scope(state: SprintPlanningState) -> SprintPlanningState:
        """휴리스틱/간단한 최적화 (가치 최대, 리스크 최소, 의존성 만족)"""
        result = optimize_sprint_scope(
            backlog=state["backlog_items"],
            dependencies=state["dependencies"],
            capacity=state["team_capacity"],
            constraints=state["constraints"],
            policy=state["priority_policy"]
        )

        return {
            **state,
            "candidate_items": result["included"],
            "excluded_items": result["excluded"],
            "capacity_usage": result["utilization"],
            "draft": result,
        }

    workflow.add_node("reason_optimize_scope", reason_optimize_scope)

    # === 5. VerifyConstraints ===
    def verify_constraints(state: SprintPlanningState) -> SprintPlanningState:
        """capacity 초과/의존성 충돌/blocked 포함 여부"""
        issues = []

        # Capacity 체크
        if state["capacity_usage"] > 1.0:
            issues.append({
                "type": "capacity_exceeded",
                "detail": f"용량 초과: {state['capacity_usage']:.0%}",
            })

        # 의존성 충돌 체크
        conflicts = check_dependency_conflicts(
            selected=state["candidate_items"],
            dependencies=state["dependencies"]
        )
        if conflicts:
            issues.append({
                "type": "dependency_conflict",
                "detail": f"{len(conflicts)}개 의존성 충돌",
                "conflicts": conflicts,
            })

        # Blocked 항목 체크
        blocked = [item for item in state["candidate_items"] if item.get("status") == "blocked"]
        if blocked:
            issues.append({
                "type": "blocked_included",
                "detail": f"{len(blocked)}개 블로커 포함됨",
                "items": blocked,
            })

        if issues:
            return {
                **state,
                "failure": {
                    "type": "conflict",
                    "detail": issues,
                    "retry_count": 0,
                }
            }

        return state

    workflow.add_node("verify_constraints", verify_constraints)

    # === 6. VerifyPolicy ===
    def verify_policy(state: SprintPlanningState) -> SprintPlanningState:
        """스프린트 생성/수정 권한"""
        if not check_sprint_permission(state["role"], state["sprint_id"]):
            return {
                **state,
                "failure": {
                    "type": "policy_violation",
                    "detail": "스프린트 생성/수정 권한 없음",
                }
            }
        return state

    workflow.add_node("verify_policy", verify_policy)

    # === 7. ActCreateDraftSprintBacklog ===
    def act_create_draft(state: SprintPlanningState) -> SprintPlanningState:
        """상태: DRAFT, 승인 전"""
        draft_sprint = create_draft_sprint(
            project_id=state["project_id"],
            sprint_id=state["sprint_id"],
            items=state["candidate_items"],
            capacity_usage=state["capacity_usage"],
        )

        return {
            **state,
            "result": {
                "draft_sprint_id": draft_sprint["id"],
                "candidate_items": state["candidate_items"],
                "excluded_items": state["excluded_items"],
                "capacity_usage": state["capacity_usage"],
            },
            "decision_gate": {
                "mode": DecisionMode.SUGGEST.value,
                "requires_human_approval": False,
            },
        }

    workflow.add_node("act_create_draft", act_create_draft)

    # === 8. GateCommitSprint ===
    def gate_commit_sprint(state: SprintPlanningState) -> SprintPlanningState:
        """승인 시만 실제 Sprint 확정/카드 생성"""
        # 기본은 Suggest로 종료
        # Commit 요청 시에만 승인 대기
        if state.get("request_commit"):
            return {
                **state,
                "decision_gate": {
                    "mode": DecisionMode.COMMIT.value,
                    "requires_human_approval": True,
                },
                "status": "waiting_approval",
            }

        return {**state, "status": "completed"}

    workflow.add_node("gate_commit_sprint", gate_commit_sprint)

    # === 9. Observe ===
    workflow.add_node("observe", observe)

    # === 10. Recover ===
    workflow.add_node("recover", recover_from_failure)

    # === Edge 정의 ===
    workflow.set_entry_point("build_context")
    workflow.add_edge("build_context", "retrieve_backlog")
    workflow.add_edge("retrieve_backlog", "retrieve_dependencies")
    workflow.add_edge("retrieve_dependencies", "reason_optimize_scope")
    workflow.add_edge("reason_optimize_scope", "verify_constraints")

    def route_after_constraints(state) -> str:
        if state.get("failure"):
            return "recover"
        return "verify_policy"

    workflow.add_conditional_edges(
        "verify_constraints",
        route_after_constraints,
        {"recover": "recover", "verify_policy": "verify_policy"}
    )

    def route_after_policy(state) -> str:
        if state.get("failure"):
            return "recover"
        return "act_create_draft"

    workflow.add_conditional_edges(
        "verify_policy",
        route_after_policy,
        {"recover": "recover", "act_create_draft": "act_create_draft"}
    )

    workflow.add_edge("act_create_draft", "gate_commit_sprint")
    workflow.add_edge("gate_commit_sprint", "observe")
    workflow.add_edge("observe", END)
    workflow.add_edge("recover", "observe")

    return workflow.compile()


# === 실패 처리 포인트 ===
G2_FAILURE_HANDLING = {
    "info_missing": "추정치 없는 아이템 많음 → '추정치 입력 요청 리스트' 자동 생성",
    "conflict": "우선순위 정책 충돌(PO vs 팀 규칙) → Decision 객체로 에스컬레이션",
    "low_confidence": "의존성 그래프가 빈약 → 보수적으로 범위 축소 추천",
}
```

### 2.3 템플릿 G3: Traceability & Consistency Check (요구사항-산출물 정합)

**목적:**
- Requirements ↔ WBS ↔ Backlog ↔ Deliverable 연결 누락/중복/범위변경 감지
- "왜 문제인지"를 링크로 설명하고 수정 제안(승인 전)

**입력:**
```python
{
    "project_id": str,
    "scope": "all" | {"phase_id": str} | {"epic_id": str},
}
```

**출력:**
```python
{
    "gaps": [{"requirement_id": str, "title": str, "issue": "uncovered"}],
    "orphans": [{"backlog_id": str, "title": str, "issue": "no_requirement"}],
    "duplicates": [{"items": [str], "similarity": float}],
    "scope_creep_suspects": [{"backlog_id": str, "reason": str}],
    "recommended_actions": [{"type": str, "target_id": str, "action": str}],
}
```

**파일:** `llm-service/workflows/g3_traceability.py`

```python
from langgraph.graph import StateGraph, END

class TraceabilityState(CommonWorkflowState):
    """G3 Traceability 전용 State"""
    scope: Dict[str, Any]

    # Retrieve 결과
    requirements: List[Dict[str, Any]]
    mappings: Dict[str, List[str]]  # req_id -> [backlog_ids]
    backlog_items: List[Dict[str, Any]]

    # 분석 결과
    gaps: List[Dict[str, Any]]
    orphans: List[Dict[str, Any]]
    duplicates: List[Dict[str, Any]]
    scope_creep_suspects: List[Dict[str, Any]]


def create_g3_traceability_workflow():
    """G3: 요구사항-산출물 정합성 점검 워크플로우"""

    workflow = StateGraph(TraceabilityState)

    # === 1. BuildContext ===
    workflow.add_node("build_context", build_context)

    # === 2. RetrieveRequirements ===
    def retrieve_requirements(state: TraceabilityState) -> TraceabilityState:
        reqs = fetch_requirements(
            project_id=state["project_id"],
            scope=state["scope"]
        )
        return {**state, "requirements": reqs}

    workflow.add_node("retrieve_requirements", retrieve_requirements)

    # === 3. RetrieveMappings ===
    def retrieve_mappings(state: TraceabilityState) -> TraceabilityState:
        """Graph: REQUIREMENT→BACKLOG, BACKLOG→WBS, WBS→PHASE"""
        mappings = fetch_traceability_mappings(
            project_id=state["project_id"],
            requirement_ids=[r["id"] for r in state["requirements"]]
        )
        backlog_items = fetch_backlog_items(
            project_id=state["project_id"],
            status=["all"]
        )
        return {
            **state,
            "mappings": mappings,
            "backlog_items": backlog_items,
        }

    workflow.add_node("retrieve_mappings", retrieve_mappings)

    # === 4. ReasonDetectIssues ===
    def reason_detect_issues(state: TraceabilityState) -> TraceabilityState:
        """룰 기반 + LLM 보조: 텍스트 유사도/태그"""

        # Gap 탐지 (요구사항 → 백로그 연결 없음)
        gaps = []
        for req in state["requirements"]:
            if req["id"] not in state["mappings"] or not state["mappings"][req["id"]]:
                gaps.append({
                    "requirement_id": req["id"],
                    "title": req["title"],
                    "issue": "uncovered",
                })

        # Orphan 탐지 (백로그 → 요구사항 연결 없음)
        mapped_backlog_ids = set()
        for backlog_ids in state["mappings"].values():
            mapped_backlog_ids.update(backlog_ids)

        orphans = []
        for item in state["backlog_items"]:
            if item["type"] == "feature" and item["id"] not in mapped_backlog_ids:
                orphans.append({
                    "backlog_id": item["id"],
                    "title": item["title"],
                    "issue": "no_requirement",
                })

        # Duplicate 탐지 (유사도 기반)
        duplicates = detect_duplicates_by_similarity(
            items=state["backlog_items"],
            threshold=0.85
        )

        # Scope creep 의심
        scope_creep = detect_scope_creep(
            backlog_items=state["backlog_items"],
            requirements=state["requirements"],
            mappings=state["mappings"]
        )

        return {
            **state,
            "gaps": gaps,
            "orphans": orphans,
            "duplicates": duplicates,
            "scope_creep_suspects": scope_creep,
        }

    workflow.add_node("reason_detect_issues", reason_detect_issues)

    # === 5. VerifyEvidence ===
    def verify_evidence(state: TraceabilityState) -> TraceabilityState:
        """각 이슈에 근거 링크 붙이기"""
        evidence_map = []

        for gap in state["gaps"]:
            evidence_map.append({
                "claim": f"요구사항 '{gap['title']}'이 백로그에 연결되지 않음",
                "evidence_ids": [gap["requirement_id"]],
            })

        for orphan in state["orphans"]:
            evidence_map.append({
                "claim": f"백로그 '{orphan['title']}'이 요구사항에 연결되지 않음",
                "evidence_ids": [orphan["backlog_id"]],
            })

        return {**state, "evidence_map": evidence_map}

    workflow.add_node("verify_evidence", verify_evidence)

    # === 6. ActCreateDraftFixes ===
    def act_create_draft_fixes(state: TraceabilityState) -> TraceabilityState:
        """제안 카드/링크/체크리스트 생성: 승인 전"""
        recommended_actions = []

        for gap in state["gaps"]:
            recommended_actions.append({
                "type": "create_backlog",
                "target_id": gap["requirement_id"],
                "action": f"요구사항 '{gap['title']}'에 대한 백로그 항목 생성",
            })

        for orphan in state["orphans"]:
            recommended_actions.append({
                "type": "link_requirement",
                "target_id": orphan["backlog_id"],
                "action": f"백로그 '{orphan['title']}'을 적절한 요구사항에 연결",
            })

        return {
            **state,
            "result": {
                "gaps": state["gaps"],
                "orphans": state["orphans"],
                "duplicates": state["duplicates"],
                "scope_creep_suspects": state["scope_creep_suspects"],
                "recommended_actions": recommended_actions,
            },
            "draft": {"actions": recommended_actions},
        }

    workflow.add_node("act_create_draft_fixes", act_create_draft_fixes)

    # === 7. GateCommitChanges ===
    def gate_commit_changes(state: TraceabilityState) -> TraceabilityState:
        """변경 적용은 승인 필요"""
        return {
            **state,
            "decision_gate": {
                "mode": DecisionMode.SUGGEST.value,
                "requires_human_approval": False,
            },
            "status": "completed",
        }

    workflow.add_node("gate_commit_changes", gate_commit_changes)

    # === 8. Observe ===
    workflow.add_node("observe", observe)

    # === 9. Recover ===
    workflow.add_node("recover", recover_from_failure)

    # === Edge 정의 ===
    workflow.set_entry_point("build_context")
    workflow.add_edge("build_context", "retrieve_requirements")
    workflow.add_edge("retrieve_requirements", "retrieve_mappings")
    workflow.add_edge("retrieve_mappings", "reason_detect_issues")
    workflow.add_edge("reason_detect_issues", "verify_evidence")
    workflow.add_edge("verify_evidence", "act_create_draft_fixes")
    workflow.add_edge("act_create_draft_fixes", "gate_commit_changes")
    workflow.add_edge("gate_commit_changes", "observe")
    workflow.add_edge("observe", END)

    return workflow.compile()


# === 실패 처리 포인트 ===
G3_FAILURE_HANDLING = {
    "tool_error": "그래프 질의 실패 시 DB 기반 최소 점검 (요구사항↔백로그 direct link만)",
    "conflict": "requirement 버전이 갈라짐 → 최신 버전 우선, 이전은 deprecated 처리 권고",
}
```

### 2.4 템플릿 G4: Risk & Impact Radar (리스크/영향도 상시 스캔)

**목적:**
- 이벤트(지연/범위변경/블로커/리소스 변경) 기반으로 리스크를 자동 탐지/갱신
- "리스크 레지스터"를 유지하며, 주간보고/대시보드에 공급

**입력:**
```python
{
    "project_id": str,
    "event_window": int,  # 일수 (예: 7)
    "risk_policy": {
        "probability_threshold": float,  # 0~1
        "impact_threshold": str,  # low/medium/high
    }
}
```

**출력:**
```python
{
    "risk_items": [
        {
            "id": str,
            "title": str,
            "probability": float,
            "impact": str,
            "priority": int,
            "mitigation": str,
            "evidence": [str],
        }
    ],
    "impact_map": {
        "phases_affected": [str],
        "sprints_affected": [str],
        "kpis_affected": [str],
    }
}
```

**파일:** `llm-service/workflows/g4_risk_radar.py`

```python
from langgraph.graph import StateGraph, END

class RiskRadarState(CommonWorkflowState):
    """G4 Risk Radar 전용 State"""
    event_window: int
    risk_policy: Dict[str, Any]

    # Retrieve 결과
    events: List[Dict[str, Any]]
    topology: Dict[str, Any]

    # 분석 결과
    risk_items: List[Dict[str, Any]]
    impact_map: Dict[str, Any]


def create_g4_risk_radar_workflow():
    """G4: 리스크/영향도 상시 스캔 워크플로우"""

    workflow = StateGraph(RiskRadarState)

    # === 1. RetrieveEvents ===
    def retrieve_events(state: RiskRadarState) -> RiskRadarState:
        events = fetch_project_events(
            project_id=state["project_id"],
            days=state["event_window"],
            event_types=[
                "delay", "scope_change", "blocker_added",
                "resource_change", "estimate_change", "priority_change"
            ]
        )
        return {**state, "events": events}

    workflow.add_node("retrieve_events", retrieve_events)

    # === 2. RetrieveTopology ===
    def retrieve_topology(state: RiskRadarState) -> RiskRadarState:
        """의존성/담당/마일스톤"""
        topology = fetch_project_topology(
            project_id=state["project_id"]
        )
        return {**state, "topology": topology}

    workflow.add_node("retrieve_topology", retrieve_topology)

    # === 3. ReasonInferRisks ===
    def reason_infer_risks(state: RiskRadarState) -> RiskRadarState:
        """패턴: 일정 미끄러짐, WIP 과다, blocked 증가"""
        risks = []

        # 패턴 1: 일정 미끄러짐
        delay_events = [e for e in state["events"] if e["type"] == "delay"]
        if len(delay_events) >= 3:
            risks.append({
                "id": f"risk-delay-{state['project_id']}",
                "title": "일정 지연 추세",
                "probability": min(0.3 + len(delay_events) * 0.1, 0.9),
                "impact": "high",
                "pattern": "schedule_slip",
                "evidence": [e["id"] for e in delay_events],
                "mitigation": "범위 조정 또는 리소스 추가 검토",
            })

        # 패턴 2: WIP 과다
        wip_count = state["topology"].get("wip_count", 0)
        wip_limit = state["topology"].get("wip_limit", 10)
        if wip_count > wip_limit * 1.2:
            risks.append({
                "id": f"risk-wip-{state['project_id']}",
                "title": "WIP 한도 초과",
                "probability": 0.8,
                "impact": "medium",
                "pattern": "wip_overflow",
                "evidence": [f"current_wip:{wip_count}", f"limit:{wip_limit}"],
                "mitigation": "진행 중인 작업 완료에 집중",
            })

        # 패턴 3: Blocker 증가
        blocker_events = [e for e in state["events"] if e["type"] == "blocker_added"]
        if len(blocker_events) >= 2:
            risks.append({
                "id": f"risk-blocker-{state['project_id']}",
                "title": "블로커 증가",
                "probability": 0.7,
                "impact": "high",
                "pattern": "blocker_increase",
                "evidence": [e["id"] for e in blocker_events],
                "mitigation": "블로커 해결 전담 배정",
            })

        # 우선순위 계산
        for risk in risks:
            risk["priority"] = calculate_risk_priority(risk["probability"], risk["impact"])

        return {**state, "risk_items": risks}

    workflow.add_node("reason_infer_risks", reason_infer_risks)

    # === 4. Verify ===
    def verify_risks(state: RiskRadarState) -> RiskRadarState:
        """중복 리스크 병합, 근거 확인"""
        # 중복 병합
        merged_risks = merge_duplicate_risks(state["risk_items"])

        # 근거 부족 리스크는 watchlist로 격하
        verified_risks = []
        for risk in merged_risks:
            if len(risk.get("evidence", [])) < 1:
                risk["priority"] = max(risk["priority"] - 1, 0)
                risk["status"] = "watchlist"
            else:
                risk["status"] = "active"
            verified_risks.append(risk)

        return {**state, "risk_items": verified_risks}

    workflow.add_node("verify_risks", verify_risks)

    # === 5. ActUpsertRiskRegister ===
    def act_upsert_risk_register(state: RiskRadarState) -> RiskRadarState:
        """DB 저장"""
        for risk in state["risk_items"]:
            upsert_risk_item(
                project_id=state["project_id"],
                risk=risk
            )

        # Impact map 계산
        impact_map = calculate_impact_map(
            risks=state["risk_items"],
            topology=state["topology"]
        )

        return {
            **state,
            "impact_map": impact_map,
            "result": {
                "risk_items": state["risk_items"],
                "impact_map": impact_map,
            },
            "status": "completed",
        }

    workflow.add_node("act_upsert_risk_register", act_upsert_risk_register)

    # === 6. Observe ===
    workflow.add_node("observe", observe)

    # === 7. Recover ===
    workflow.add_node("recover", recover_from_failure)

    # === Edge 정의 ===
    workflow.set_entry_point("retrieve_events")
    workflow.add_edge("retrieve_events", "retrieve_topology")
    workflow.add_edge("retrieve_topology", "reason_infer_risks")
    workflow.add_edge("reason_infer_risks", "verify_risks")
    workflow.add_edge("verify_risks", "act_upsert_risk_register")
    workflow.add_edge("act_upsert_risk_register", "observe")
    workflow.add_edge("observe", END)

    return workflow.compile()


# === 실패 처리 포인트 ===
G4_FAILURE_HANDLING = {
    "low_confidence": "근거 부족 리스크는 'watchlist'로 격하",
    "policy_violation": "특정 팀 데이터 접근 불가 → 익명화/집계 수준으로만 추론",
}
```

### 2.5 템플릿 G5: Project Knowledge Q&A (프로젝트 지식 응답 + 근거)

**목적:**
- 프로젝트 문서/결정/이슈 기반 질의응답(RAG)
- 근거 링크와 "모르는 건 모른다" 원칙 강제

**입력:**
```python
{
    "question": str,
    "project_id": str,
}
```

**출력:**
```python
{
    "answer": str,
    "citations": [
        {"doc_id": str, "url": str, "snippet": str, "relevance": float}
    ],
    "confidence": float,
    "follow_up_questions": [str],
}
```

**파일:** `llm-service/workflows/g5_knowledge_qa.py`

```python
from langgraph.graph import StateGraph, END

class KnowledgeQAState(CommonWorkflowState):
    """G5 Knowledge Q&A 전용 State"""
    question: str

    # Retrieve 결과
    docs: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]

    # 생성 결과
    answer: str
    citations: List[Dict[str, Any]]
    follow_up_questions: List[str]


def create_g5_knowledge_qa_workflow():
    """G5: 프로젝트 지식 응답 + 근거 워크플로우"""

    workflow = StateGraph(KnowledgeQAState)

    # === 1. BuildContext ===
    def build_context_with_permissions(state: KnowledgeQAState) -> KnowledgeQAState:
        """사용자 권한 반영"""
        permissions = get_user_permissions(state["user_id"], state["project_id"])
        return {
            **state,
            "context_snapshot": {
                "permissions": permissions,
                "accessible_doc_types": permissions.get("doc_types", ["all"]),
            }
        }

    workflow.add_node("build_context", build_context_with_permissions)

    # === 2. RetrieveDocs ===
    def retrieve_docs(state: KnowledgeQAState) -> KnowledgeQAState:
        """vector top-k"""
        docs = rag_search(
            project_id=state["project_id"],
            query=state["question"],
            top_k=10,
            filter_types=state["context_snapshot"].get("accessible_doc_types")
        )

        # 프로젝트 필터 강제 (data_boundary 방지)
        filtered_docs = [d for d in docs if d.get("project_id") == state["project_id"]]

        if len(filtered_docs) < len(docs):
            # 다른 프로젝트 문서가 섞임 - 경고
            log_warning(
                "data_boundary_risk",
                f"Filtered {len(docs) - len(filtered_docs)} docs from other projects"
            )

        return {**state, "docs": filtered_docs}

    workflow.add_node("retrieve_docs", retrieve_docs)

    # === 3. RetrieveDecisions ===
    def retrieve_decisions(state: KnowledgeQAState) -> KnowledgeQAState:
        """graph로 관련 결정/리스크 연결"""
        decisions = fetch_related_decisions(
            project_id=state["project_id"],
            doc_ids=[d["id"] for d in state["docs"]]
        )
        return {**state, "decisions": decisions}

    workflow.add_node("retrieve_decisions", retrieve_decisions)

    # === 4. ReasonAnswer ===
    def reason_answer(state: KnowledgeQAState) -> KnowledgeQAState:
        """답변 생성"""
        # LLM으로 답변 생성
        answer_result = generate_answer_with_citations(
            question=state["question"],
            docs=state["docs"],
            decisions=state["decisions"],
            require_grounding=True  # 근거 없는 문장 금지
        )

        return {
            **state,
            "answer": answer_result["answer"],
            "citations": answer_result["citations"],
            "confidence": answer_result["confidence"],
        }

    workflow.add_node("reason_answer", reason_answer)

    # === 5. VerifyGrounding ===
    def verify_grounding(state: KnowledgeQAState) -> KnowledgeQAState:
        """근거 없는 문장 제거/추측 금지"""
        verified_answer = state["answer"]
        removed_sentences = []

        # 각 문장에 대해 근거 확인
        sentences = split_into_sentences(state["answer"])
        verified_sentences = []

        for sentence in sentences:
            has_citation = any(
                citation["snippet"] in sentence or
                sentence_matches_citation(sentence, citation)
                for citation in state["citations"]
            )

            if has_citation:
                verified_sentences.append(sentence)
            else:
                # 추측 표현 확인
                if contains_speculation(sentence):
                    removed_sentences.append(sentence)
                else:
                    # 일반적 진술은 유지하되 confidence 하향
                    verified_sentences.append(sentence)

        verified_answer = " ".join(verified_sentences)

        # 신뢰도 재계산
        if removed_sentences:
            state["confidence"] *= 0.8

        # Follow-up 질문 생성
        follow_up = []
        if state["confidence"] < 0.7:
            follow_up.append("더 구체적인 질문을 해주시겠어요?")
        if not state["docs"]:
            follow_up.append("관련 문서가 없습니다. 어떤 문서를 찾으시나요?")

        return {
            **state,
            "answer": verified_answer,
            "follow_up_questions": follow_up,
        }

    workflow.add_node("verify_grounding", verify_grounding)

    # === 6. Observe ===
    workflow.add_node("observe", observe)

    # === 7. Recover ===
    def recover_qa(state: KnowledgeQAState) -> KnowledgeQAState:
        """Q&A 전용 복구"""
        failure = state.get("failure", {})

        if failure.get("type") == "info_missing":
            return {
                **state,
                "answer": "관련 문서를 찾지 못했습니다.",
                "follow_up_questions": [
                    "다른 키워드로 검색해보시겠어요?",
                    "어떤 종류의 문서를 찾으시나요?"
                ],
                "confidence": 0.0,
                "status": "completed",
            }

        if failure.get("type") == "data_boundary":
            return {
                **state,
                "answer": "요청하신 정보에 접근할 수 없습니다.",
                "follow_up_questions": [],
                "confidence": 0.0,
                "status": "failed",
            }

        return recover_from_failure(state)

    workflow.add_node("recover", recover_qa)

    # === Edge 정의 ===
    workflow.set_entry_point("build_context")
    workflow.add_edge("build_context", "retrieve_docs")
    workflow.add_edge("retrieve_docs", "retrieve_decisions")
    workflow.add_edge("retrieve_decisions", "reason_answer")
    workflow.add_edge("reason_answer", "verify_grounding")

    def check_for_failure(state) -> str:
        if state.get("failure"):
            return "recover"
        if not state.get("docs"):
            return "recover"
        return "observe"

    workflow.add_conditional_edges(
        "verify_grounding",
        check_for_failure,
        {"recover": "recover", "observe": "observe"}
    )

    workflow.add_edge("observe", END)
    workflow.add_edge("recover", "observe")

    return workflow.compile()


# === 실패 처리 포인트 ===
G5_FAILURE_HANDLING = {
    "info_missing": "관련 문서 없음 → '필요 문서/키워드' 안내 + 질문 정교화 제안",
    "data_boundary": "다른 프로젝트 문서가 섞일 위험 → 프로젝트 필터 강제, 위반 시 즉시 중단",
}
```

---

## 3. Skill Library 구현

### 3.1 Skill 인터페이스 정의

**파일:** `llm-service/skills/__init__.py`

```python
from typing import Dict, Any, List, Optional, Protocol
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod

class SkillCategory(Enum):
    RETRIEVE = "retrieve"      # 데이터 조회
    ANALYZE = "analyze"        # 분석/추론
    GENERATE = "generate"      # 콘텐츠 생성
    VALIDATE = "validate"      # 검증
    TRANSFORM = "transform"    # 데이터 변환

@dataclass
class SkillInput:
    """Standard skill input."""
    data: Dict[str, Any]
    context: Dict[str, Any]
    options: Dict[str, Any] = None

@dataclass
class SkillOutput:
    """Standard skill output."""
    result: Any
    confidence: float
    evidence: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    error: Optional[str] = None

class BaseSkill(ABC):
    """Base class for all skills."""

    name: str
    category: SkillCategory
    description: str
    version: str = "1.0.0"

    @abstractmethod
    def execute(self, input: SkillInput) -> SkillOutput:
        """Execute the skill."""
        pass

    @abstractmethod
    def validate_input(self, input: SkillInput) -> bool:
        """Validate input before execution."""
        pass

    def get_schema(self) -> Dict[str, Any]:
        """Return the skill's input/output schema."""
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "version": self.version,
            "input_schema": self._get_input_schema(),
            "output_schema": self._get_output_schema(),
        }

    def _get_input_schema(self) -> Dict[str, Any]:
        """Override to define input schema."""
        return {}

    def _get_output_schema(self) -> Dict[str, Any]:
        """Override to define output schema."""
        return {}
```

### 3.2 Retrieve Skills

(이전과 동일 - 생략)

### 3.3 Analyze Skills

(이전과 동일 - 생략)

### 3.4 Generate Skills

(이전과 동일 - 생략)

### 3.5 Validate Skills

(이전과 동일 - 생략)

### 3.6 Skill Registry

(이전과 동일 - 생략)

---

## 4. Basic Observability

(이전과 동일 - 생략)

---

## 5. 완료 기준

| 항목 | 체크리스트 |
|------|-----------|
| 공통 설계 규약 | ☐ CommonWorkflowState 정의 |
| | ☐ 9개 공통 Node 타입 구현 |
| | ☐ 6개 Failure 유형 정의 |
| | ☐ Recovery 전략 구현 |
| 워크플로우 | ☐ G1 Weekly Report 동작 |
| | ☐ G2 Sprint Planning 동작 |
| | ☐ G3 Traceability 동작 |
| | ☐ G4 Risk Radar 동작 |
| | ☐ G5 Knowledge Q&A 동작 |
| Skill Library | ☐ Retrieve Skills (3개) 동작 |
| | ☐ Analyze Skills (3개) 동작 |
| | ☐ Generate Skills (2개) 동작 |
| | ☐ Validate Skills (2개) 동작 |
| | ☐ Skill Registry 동작 |
| Observability | ☐ Trace/Span 기록 동작 |
| | ☐ Metrics 수집 동작 |
| | ☐ Dashboard API 동작 |

---

## 6. 다음 단계

Phase 2 완료 후:
- Phase 3: Subagent Pool, MCP Gateway, Value Metrics
- 수집된 Observability 데이터 기반으로 성능 최적화
- 워크플로우 A/B 테스트 프레임워크 구축
