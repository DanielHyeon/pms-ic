# Status Query Engine Implementation Plan

## Overview

This document outlines the implementation plan for a **Status Query Engine** that separates "status/metric" questions from "document search" questions, eliminating hallucination issues where the LLM uses PDF methodology documents to answer real-time data queries.

**Problem**: When users ask "현재 프로젝트 진행 현황 알려줘", the RAG system returns methodology PDFs (ranked higher due to keyword matching), causing the LLM to generate hallucinated responses based on document content rather than actual project data.

**Solution**: Implement Answer Type classification + Status Query Engine (Plan→Execute→Summarize) with Source Policy Gate.

---

## 1. Architecture Overview

```
User Query: "현재 프로젝트 진행 현황 알려줘"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│              Answer Type Classifier                          │
│  - Status/Metric: 숫자/퍼센트/카운트/리스트                   │
│  - How-to/Policy: 방법론/가이드/정책 (→ Document RAG)         │
│  - Mixed: 상태 + 설명 (Status first, Doc as supplement)      │
└─────────────────────────────────────────────────────────────┘
        │
   ┌────┴────┐
   │ Status  │ How-to/Policy
   ▼         ▼
┌──────────────────────┐    ┌──────────────────────┐
│ Status Query Engine  │    │ Document RAG Workflow │
│ ┌──────────────────┐ │    │ (Existing Track A/B)  │
│ │ 1. Plan (LLM)    │ │    └──────────────────────┘
│ │    ↓             │ │
│ │ 2. Validate Plan │ │
│ │    ↓             │ │
│ │ 3. Execute (DB)  │ │
│ │    ↓             │ │
│ │ 4. Summarize(LLM)│ │
│ └──────────────────┘ │
└──────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│              Response Contract (Structured Output)           │
│  - 기준 시각: 2026-01-27 15:30 KST                            │
│  - 범위: 프로젝트 A, 스프린트 5                                │
│  - 핵심 지표: 완료 12/20 (60%), 진행 5, 차단 2, 지연 1         │
│  - 상위 이슈: [목록]                                          │
│  - 근거 데이터: DB 집계 결과 요약                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 Answer Type Classifier (`answer_type_classifier.py`)

**Purpose**: Classify user query into answer types based on expected output format.

```python
class AnswerType(Enum):
    STATUS_METRIC = "status_metric"      # Numbers, percentages, counts
    STATUS_LIST = "status_list"          # Task lists, issue lists, blockers
    STATUS_DRILLDOWN = "status_drilldown" # Specific entity status (Epic/Feature/Story)
    HOWTO_POLICY = "howto_policy"        # Methodology, guides, policies (Document RAG)
    MIXED = "mixed"                       # Status + explanation
    CASUAL = "casual"                     # Greetings, small talk


@dataclass
class AnswerTypeResult:
    answer_type: AnswerType
    confidence: float
    scope: QueryScope           # project/sprint/epic/feature/story
    metrics_requested: List[str]  # completion_rate, blocked_count, etc.
    time_context: str           # "current", "this_week", "last_sprint"
```

**Classification Rules**:

| Signal Type | Patterns | Answer Type |
|-------------|----------|-------------|
| Time + Progress | "지금/현재/이번주" + "진행/현황/상태/진척" | STATUS_METRIC |
| Metric Request | "완료율/진행률/몇 개/남은/차단/지연/리스크" | STATUS_METRIC |
| List Request | "목록/리스트/뭐 남았지/이슈 뭐야" | STATUS_LIST |
| Entity Detail | "스프린트 3 상태/에픽 A 진행" | STATUS_DRILLDOWN |
| How-to | "어떻게/방법/절차/가이드/정의/란" | HOWTO_POLICY |
| Mixed | "현황 + 기준도 알려줘" | MIXED |

### 2.2 Status Query Plan Schema (`status_query_plan.py`)

**Purpose**: Structured JSON schema for query plan generation.

```python
@dataclass
class StatusQueryPlan:
    """JSON schema for Status Query Plan"""
    answer_type: str           # "status_metric" | "status_list" | "status_drilldown"

    scope: QueryScope = field(default_factory=QueryScope)
    # scope.project_id: str (required)
    # scope.sprint_id: Optional[str]
    # scope.epic_id: Optional[str]
    # scope.feature_id: Optional[str]

    time_range: TimeRange = field(default_factory=TimeRange)
    # time_range.mode: "current" | "last_sprint" | "custom"
    # time_range.start: Optional[str]  # ISO date
    # time_range.end: Optional[str]

    metrics: List[str] = field(default_factory=list)
    # Allowed: "story_counts_by_status", "completion_rate", "blocked_items",
    #          "overdue_items", "recent_activity", "sprint_burndown",
    #          "velocity", "wip_status"

    group_by: List[str] = field(default_factory=list)
    # Allowed: "sprint", "assignee", "priority", "epic", "feature"

    filters: QueryFilters = field(default_factory=QueryFilters)
    # filters.access_level_max: int (injected by system)
    # filters.assignee_id: Optional[str]
    # filters.status_in: Optional[List[str]]

    output: OutputConfig = field(default_factory=OutputConfig)
    # output.blocked_top_n: int = 5
    # output.overdue_top_n: int = 5
    # output.activity_days: int = 7
```

**Whitelist Validation**:
```python
ALLOWED_METRICS = {
    "story_counts_by_status",
    "completion_rate",
    "blocked_items",
    "overdue_items",
    "recent_activity",
    "sprint_burndown",
    "velocity",
    "wip_status",
    "risk_summary",
    "issue_summary",
}

ALLOWED_GROUP_BY = {"sprint", "assignee", "priority", "epic", "feature"}
```

### 2.3 Status Query Executor (`status_query_executor.py`)

**Purpose**: Execute validated query plan against PostgreSQL/Neo4j.

```python
class StatusQueryExecutor:
    """Execute status queries against database"""

    def __init__(self, pg_conn, neo4j_driver=None):
        self.pg_conn = pg_conn
        self.neo4j_driver = neo4j_driver

    def execute(self, plan: StatusQueryPlan, user_context: UserContext) -> StatusQueryResult:
        """Execute plan and return structured results"""

        # 1. Validate and inject security filters
        plan = self._inject_security_filters(plan, user_context)

        # 2. Execute each requested metric
        results = {}
        for metric in plan.metrics:
            executor = self._get_metric_executor(metric)
            results[metric] = executor.execute(plan)

        return StatusQueryResult(
            plan=plan,
            data=results,
            generated_at=datetime.now().isoformat(),
            data_freshness="real-time",
        )
```

**Metric Executors**:

```python
# story_counts_by_status
SELECT
    status,
    COUNT(*) as count
FROM task.user_stories
WHERE project_id = $1
  AND ($2::text IS NULL OR sprint_id = $2)
GROUP BY status;

# completion_rate
SELECT
    COUNT(*) FILTER (WHERE status = 'DONE') as done_count,
    COUNT(*) as total_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'DONE') / NULLIF(COUNT(*), 0), 1) as completion_rate
FROM task.user_stories
WHERE project_id = $1
  AND ($2::text IS NULL OR sprint_id = $2);

# blocked_items
SELECT id, title, status, assignee_id, updated_at
FROM task.user_stories
WHERE project_id = $1
  AND status IN ('IN_PROGRESS', 'REVIEW')
  AND (blocked = true OR status = 'BLOCKED')
ORDER BY updated_at DESC
LIMIT $3;

# overdue_items (stories in active sprint past sprint end date)
SELECT us.id, us.title, us.status, s.end_date as sprint_end
FROM task.user_stories us
JOIN task.sprints s ON us.sprint_id = s.id
WHERE us.project_id = $1
  AND s.status = 'ACTIVE'
  AND s.end_date < CURRENT_DATE
  AND us.status NOT IN ('DONE', 'CANCELLED')
ORDER BY s.end_date ASC
LIMIT $2;
```

### 2.4 Status Workflow Integration (`chat_workflow_v2.py` modifications)

**New Nodes**:
```python
# Add to TwoTrackWorkflow._build_graph()

workflow.add_node("classify_answer_type", self._classify_answer_type_node)
workflow.add_node("generate_query_plan", self._generate_query_plan_node)
workflow.add_node("validate_query_plan", self._validate_query_plan_node)
workflow.add_node("execute_status_query", self._execute_status_query_node)
workflow.add_node("summarize_status", self._summarize_status_node)
```

**Modified Flow**:
```
Entry
  │
  ▼
classify_answer_type ──────────────────────────────────────────┐
  │                                                            │
  ├── status_* ─────────────────────┐                          │
  │                                 ▼                          │
  │                    generate_query_plan                     │
  │                            │                               │
  │                            ▼                               │
  │                    validate_query_plan                     │
  │                            │                               │
  │                            ├── invalid ──► fallback_rag ──►│
  │                            │                               │
  │                            ▼                               │
  │                    execute_status_query                    │
  │                            │                               │
  │                            ├── no_data ──► no_data_msg ──►─┤
  │                            │                               │
  │                            ▼                               │
  │                    summarize_status ─────────────────────►─┤
  │                                                            │
  ├── howto_policy ─────► [Existing Track A/B RAG] ──────────►─┤
  │                                                            │
  └── mixed ────────────► status + doc_supplement ──────────►──┤
                                                               │
                                                               ▼
                                                           monitor
```

### 2.5 Source Policy Gate

**Purpose**: Ensure Status answers ONLY use DB results, not RAG documents.

```python
class SourcePolicyGate:
    """Enforce source restrictions by answer type"""

    POLICIES = {
        AnswerType.STATUS_METRIC: {
            "allowed_sources": ["database", "snapshot"],
            "forbidden_sources": ["document_rag"],
            "document_usage": "none",  # or "supplement_only"
        },
        AnswerType.STATUS_LIST: {
            "allowed_sources": ["database", "snapshot"],
            "forbidden_sources": ["document_rag"],
            "document_usage": "none",
        },
        AnswerType.HOWTO_POLICY: {
            "allowed_sources": ["document_rag"],
            "forbidden_sources": [],
            "document_usage": "primary",
        },
        AnswerType.MIXED: {
            "allowed_sources": ["database", "snapshot", "document_rag"],
            "forbidden_sources": [],
            "document_usage": "supplement_only",  # marked as "참고"
        },
    }

    def filter_context(self, answer_type: AnswerType,
                       db_results: dict,
                       rag_results: List[dict]) -> dict:
        """Filter context based on policy"""
        policy = self.POLICIES[answer_type]

        context = {}

        if "database" in policy["allowed_sources"]:
            context["data"] = db_results

        if policy["document_usage"] == "supplement_only":
            context["supplement"] = {
                "label": "참고 문서 (근거 아님)",
                "documents": rag_results[:2] if rag_results else [],
            }
        elif policy["document_usage"] == "primary":
            context["documents"] = rag_results

        return context
```

### 2.6 Response Contract (`status_response_contract.py`)

**Purpose**: Structured output format for status responses.

```python
@dataclass
class StatusResponseContract:
    """Mandatory structure for status responses"""

    # Metadata (always present)
    reference_time: str           # "2026-01-27 15:30 KST"
    scope: str                    # "프로젝트: AI 보험심사 처리 시스템, 스프린트: Sprint 5"
    data_source: str              # "PostgreSQL 실시간 조회"

    # Core metrics (based on query plan)
    metrics: Dict[str, Any]       # {"completion_rate": 60.0, "total": 20, "done": 12}

    # Lists (optional, based on query plan)
    blocked_items: Optional[List[Dict]]   # Top N blocked items
    overdue_items: Optional[List[Dict]]   # Top N overdue items
    recent_activity: Optional[List[Dict]] # Recent changes

    # Summary text (LLM generated from data)
    summary: str

    # Fallback message (if data insufficient)
    data_gaps: Optional[List[str]]  # ["스프린트 미설정", "스토리 0건"]

    def to_text(self) -> str:
        """Convert to natural language response"""
        lines = []

        lines.append(f"📊 **프로젝트 현황** (기준: {self.reference_time})")
        lines.append(f"범위: {self.scope}")
        lines.append("")

        # Metrics
        if "completion_rate" in self.metrics:
            rate = self.metrics["completion_rate"]
            done = self.metrics.get("done", 0)
            total = self.metrics.get("total", 0)
            lines.append(f"**진행률**: {rate:.1f}% ({done}/{total} 완료)")

        if "story_counts_by_status" in self.metrics:
            counts = self.metrics["story_counts_by_status"]
            status_line = ", ".join(f"{k}: {v}" for k, v in counts.items())
            lines.append(f"**상태별**: {status_line}")

        # Blocked items
        if self.blocked_items:
            lines.append("")
            lines.append(f"🚫 **차단된 항목** ({len(self.blocked_items)}건):")
            for item in self.blocked_items[:3]:
                lines.append(f"  - {item['title']}")

        # Summary
        if self.summary:
            lines.append("")
            lines.append(f"💡 **요약**: {self.summary}")

        # Data gaps warning
        if self.data_gaps:
            lines.append("")
            lines.append(f"⚠️ 데이터 부족: {', '.join(self.data_gaps)}")

        return "\n".join(lines)
```

---

## 3. Implementation Steps

### Phase 1: Core Infrastructure (Priority: Highest)

| Step | Component | File | Description |
|------|-----------|------|-------------|
| 1.1 | Answer Type Classifier | `answer_type_classifier.py` | Keyword + pattern based classification |
| 1.2 | Query Plan Schema | `status_query_plan.py` | Dataclasses with validation |
| 1.3 | Query Plan Validator | `status_query_plan.py` | Whitelist validation |
| 1.4 | Source Policy Gate | `source_policy_gate.py` | Context filtering by answer type |

### Phase 2: Query Execution (Priority: High)

| Step | Component | File | Description |
|------|-----------|------|-------------|
| 2.1 | Metric Executors | `status_query_executor.py` | Individual metric query functions |
| 2.2 | Security Filter Injection | `status_query_executor.py` | project_id, access_level enforcement |
| 2.3 | Result Aggregator | `status_query_executor.py` | Combine metric results |

### Phase 3: Workflow Integration (Priority: High)

| Step | Component | File | Description |
|------|-----------|------|-------------|
| 3.1 | New Workflow Nodes | `chat_workflow_v2.py` | Add status-specific nodes |
| 3.2 | Routing Logic | `chat_workflow_v2.py` | Route based on answer type |
| 3.3 | Summarization Prompt | `chat_workflow_v2.py` | Status-specific LLM prompt |
| 3.4 | Response Contract | `status_response_contract.py` | Structured output |

### Phase 4: Testing & Optimization (Priority: Medium)

| Step | Component | File | Description |
|------|-----------|------|-------------|
| 4.1 | Unit Tests | `tests/test_status_query_*.py` | Test each component |
| 4.2 | Integration Tests | `tests/test_status_workflow.py` | End-to-end flow tests |
| 4.3 | Hallucination Tests | `tests/test_anti_hallucination.py` | Verify no PDF-based answers |

---

## 4. Metrics Specification

### 4.1 Supported Metrics

| Metric ID | Description | Data Source | SQL/Cypher |
|-----------|-------------|-------------|------------|
| `story_counts_by_status` | Count by status | PostgreSQL | GROUP BY status |
| `completion_rate` | Done / Total % | PostgreSQL | COUNT FILTER |
| `blocked_items` | Blocked stories | PostgreSQL | WHERE blocked=true |
| `overdue_items` | Past due date | PostgreSQL | WHERE end_date < NOW |
| `recent_activity` | Last N changes | PostgreSQL | ORDER BY updated_at |
| `sprint_burndown` | Sprint progress | PostgreSQL | Daily aggregation |
| `velocity` | Story points/sprint | PostgreSQL | SUM(story_points) |
| `wip_status` | WIP vs limit | PostgreSQL | COUNT WHERE status=IN_PROGRESS |
| `risk_summary` | Active risks | PostgreSQL | FROM project.issues WHERE type=RISK |
| `issue_summary` | Open issues | PostgreSQL | FROM project.issues |

### 4.2 Access Level Mapping

| Role | Level | Viewable Metrics |
|------|-------|------------------|
| MEMBER | 1 | story_counts, completion_rate, wip_status |
| DEVELOPER | 1 | + blocked_items, overdue_items |
| QA | 2 | + issue_summary |
| BA | 2 | + risk_summary |
| PM | 3 | All metrics + budget (if exists) |
| PMO_HEAD | 4 | All + cross-project |
| SPONSOR | 5 | All + financial |
| ADMIN | 6 | All |

---

## 5. Example Flows

### Example 1: "현재 프로젝트 진행 현황 알려줘"

```
1. classify_answer_type
   → AnswerType.STATUS_METRIC
   → scope: project_id from context
   → metrics_requested: ["story_counts_by_status", "completion_rate"]

2. generate_query_plan (LLM)
   → {
       "answer_type": "status_metric",
       "scope": {"project_id": "proj-001"},
       "metrics": ["story_counts_by_status", "completion_rate", "blocked_items"],
       "output": {"blocked_top_n": 3}
     }

3. validate_query_plan
   → OK (all metrics in whitelist)
   → Inject: access_level_max=3 (user is PM)

4. execute_status_query
   → story_counts: {DONE: 12, IN_PROGRESS: 5, READY: 3}
   → completion_rate: 60.0%
   → blocked_items: []

5. summarize_status (LLM with DB results only)
   → "AI 보험심사 처리 시스템의 현재 진행률은 60% (20건 중 12건 완료)입니다.
      5건이 진행 중이며, 차단된 항목은 없습니다."

6. Response Contract
   → 기준 시각: 2026-01-27 15:30 KST
   → 범위: AI 보험심사 처리 시스템
   → 진행률: 60% (12/20)
   → 상태별: 완료 12, 진행 5, 대기 3
   → 차단: 0건
```

### Example 2: "스프린트란 뭐야?" (How-to)

```
1. classify_answer_type
   → AnswerType.HOWTO_POLICY
   → Pattern matched: "란" + no time/metric context

2. Route to existing Track A (Document RAG)
   → RAG search: "스프린트 정의 설명"
   → Generate response from PDF documents
```

### Example 3: "현황 알려주고, 진행률 산정 기준도 알려줘" (Mixed)

```
1. classify_answer_type
   → AnswerType.MIXED
   → Has both: "현황" (status) + "기준" (howto)

2. Execute Status Query first
   → Get real metrics

3. Execute Document RAG for supplement
   → Search: "진행률 산정 기준"
   → Mark as "참고 문서"

4. Combine with clear separation
   → "📊 현황: 진행률 60% ..."
   → "📚 참고 - 진행률 산정 기준: ..."
```

---

## 6. File Structure

```
llm-service/
├── answer_type_classifier.py      # NEW: Answer type classification
├── status_query_plan.py           # NEW: Query plan schema & validation
├── status_query_executor.py       # NEW: DB query execution
├── source_policy_gate.py          # NEW: Source filtering policy
├── status_response_contract.py    # NEW: Response structure
├── chat_workflow_v2.py            # MODIFY: Add status workflow nodes
├── context_snapshot.py            # EXISTING: Can be reused for caching
├── entity_chunk_service.py        # EXISTING: Keep for RAG boost (optional)
└── tests/
    ├── test_answer_type_classifier.py
    ├── test_status_query_plan.py
    ├── test_status_query_executor.py
    └── test_status_workflow.py
```

---

## 7. Success Criteria

1. **Zero Hallucination**: Status questions NEVER use PDF documents as evidence
2. **Data Accuracy**: All numbers in response traceable to DB query results
3. **Response Time**: Status queries complete in <500ms (using snapshot cache)
4. **Access Control**: Users only see data matching their access level
5. **Fallback Safety**: If DB has no data, respond "데이터가 부족합니다" (not hallucinate)

---

## 8. Migration Strategy

1. **Phase 1**: Deploy new components alongside existing workflow
2. **Phase 2**: A/B test with `STATUS_QUERY_ENABLED` feature flag
3. **Phase 3**: Monitor hallucination rate, gradually increase traffic
4. **Phase 4**: Full rollout, deprecate Entity Chunk approach for status queries

---

## 9. Dependencies

- PostgreSQL connection (existing via `pg_neo4j_sync.py`)
- LLM for plan generation and summarization (existing)
- User context (project_id, access_level) from request
- Redis for snapshot caching (optional, existing)

---

## Appendix A: SQL Query Templates

```sql
-- story_counts_by_status
SELECT status, COUNT(*) as count
FROM task.user_stories
WHERE project_id = $1
  AND ($2::text IS NULL OR sprint_id = $2)
GROUP BY status;

-- completion_rate
WITH stats AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'DONE') as done,
        COUNT(*) as total
    FROM task.user_stories
    WHERE project_id = $1
      AND ($2::text IS NULL OR sprint_id = $2)
)
SELECT done, total,
       ROUND(100.0 * done / NULLIF(total, 0), 1) as rate
FROM stats;

-- blocked_items
SELECT id, title, status, assignee_id, updated_at
FROM task.user_stories
WHERE project_id = $1
  AND status IN ('IN_PROGRESS', 'REVIEW')
  AND description ILIKE '%blocked%' OR status = 'BLOCKED'
ORDER BY updated_at DESC
LIMIT $2;

-- active_sprint
SELECT id, name, goal, status, start_date, end_date
FROM task.sprints
WHERE project_id = $1
  AND status = 'ACTIVE'
ORDER BY start_date DESC
LIMIT 1;

-- recent_activity (last 7 days)
SELECT id, title, status, updated_at
FROM task.user_stories
WHERE project_id = $1
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC
LIMIT $2;
```

---

## Appendix B: LLM Prompts

### Query Plan Generation Prompt

```
You are a PMS query planner. Generate a JSON query plan based on the user's question.

User question: {question}
User context: project_id={project_id}, access_level={access_level}

Available metrics: story_counts_by_status, completion_rate, blocked_items,
                   overdue_items, recent_activity, sprint_burndown, velocity,
                   wip_status, risk_summary, issue_summary

Output ONLY valid JSON in this format:
{
  "answer_type": "status_metric",
  "scope": {"project_id": "...", "sprint_id": null},
  "metrics": ["completion_rate", "blocked_items"],
  "group_by": [],
  "output": {"blocked_top_n": 5}
}
```

### Status Summarization Prompt

```
You are a PMS assistant. Summarize the project status based ONLY on the provided data.

STRICT RULES:
1. Use ONLY the data provided below. Do NOT make up numbers.
2. If data is missing or zero, say "데이터가 부족합니다" or "없음".
3. Be concise and factual.

Data:
{data_json}

Generate a natural Korean summary of the project status.
```
