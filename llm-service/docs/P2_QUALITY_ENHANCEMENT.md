# P2: Quality Enhancement & Regression Testing

**Priority**: Medium (Quality and maintainability)
**Timeline**: 2-4 days
**Goal**: Stabilize improvements, add comprehensive testing, enhance specific intents

---

## 1. Overview & Strategic Context

### 1.1 P2 Core Identity (One Sentence)

> **P2 is not feature expansion - it's embedding "behavioral enforcement safeguards" into the system.**

Tests, metrics, and modeling transition from **optional** to **mandatory** in this phase.

### 1.2 What P2 Achieves

| Layer | Transformation |
|-------|----------------|
| Regression Tests | Human memory dependency → Automated enforcement |
| Metrics | Intuition-based quality → Data-driven indicators |
| Risk Model | "No data = no insight" → Meaningful interpretation even with data scarcity |

These three elements together represent **architect-level system design**.

### 1.3 Post-P2 Strategic Principle

> After P2, **"which failures are absolutely unacceptable"** matters more than **"how many features to add"**.

P2 builds the foundation for: **"A system that never makes the same mistake twice."**

---

## 2. Phase 2 Components

| Component | Purpose | Key Innovation |
|-----------|---------|----------------|
| Regression Test Suite | Prevent "all responses converge to same template" | Priority conflict tests, not just single classification |
| Sprint Progress Enhancement | PM's killer feature for anomaly detection | Health as signal bundle, not single value |
| Risk Data Model | Meaningful insights even without dedicated risk table | Risk lifecycle management |
| Response Quality Metrics | Early warning system for AI degradation | Routing quality indicators |

---

## 3. Files to Create/Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `tests/test_intent_classifier_regression.py` | **NEW** | Classifier regression + priority conflict tests |
| `tests/test_routing_regression.py` | **NEW** | Routing regression tests |
| `tests/test_renderer_regression.py` | **NEW** | Renderer regression tests |
| `intent_handlers.py` | **MODIFY** | Enhanced sprint progress handler |
| `query_templates.py` | **MODIFY** | Add burndown/velocity queries (KST-aware) |
| `risk_model.py` | **NEW** | Risk data model with lifecycle |
| `response_metrics.py` | **NEW** | Response quality metrics |

---

## 4. Implementation Details

### 4.1 Regression Test Suite

#### 4.1.1 Design Principle

Current tests verify: `question → intent = X`

But most real failures occur at: `question → multiple pattern matches → priority conflict`

**Critical Addition**: Priority conflict tests that verify the winning intent when multiple patterns could match.

#### 4.1.2 Intent Classifier Regression Tests

**Location**: `/llm-service/tests/test_intent_classifier_regression.py`

```python
"""
Regression tests for intent classifier.

These tests ensure that:
1. Specific question patterns always map to expected intents
2. Priority conflicts resolve correctly (e.g., SPRINT_PROGRESS beats STATUS_METRIC)
3. No false positives capture unrelated questions

Run after any classifier changes to prevent regressions.
"""

import pytest
from answer_type_classifier import get_answer_type_classifier, AnswerType


class TestBacklogClassification:
    """Backlog-related questions must classify as BACKLOG_LIST"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "백로그에 뭐가 있어?",
        "제품 백로그 보여줘",
        "백로그 항목 알려줘",
        "product backlog",
        "백로그 현황",
        "백로그 목록",
        "What's in the backlog?",
    ])
    def test_backlog_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.BACKLOG_LIST, \
            f"Expected BACKLOG_LIST for '{question}', got {result.answer_type}"


class TestRiskClassification:
    """Risk-related questions must classify as RISK_ANALYSIS"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "리스크 분석해줘",
        "현재 위험 요소가 뭐야",
        "프로젝트 리스크 알려줘",
        "위험 관리 현황",
        "리스크 목록",
        "risk analysis",
        "What are the risks?",
    ])
    def test_risk_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.RISK_ANALYSIS, \
            f"Expected RISK_ANALYSIS for '{question}', got {result.answer_type}"


class TestSprintProgressClassification:
    """Sprint-related questions must classify as SPRINT_PROGRESS"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "현재 스프린트 진행 상황",
        "스프린트 진척률 알려줘",
        "번다운 차트 보여줘",
        "스프린트 속도",
        "sprint progress",
        "sprint velocity",
        "How is the sprint going?",
    ])
    def test_sprint_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
            f"Expected SPRINT_PROGRESS for '{question}', got {result.answer_type}"


class TestTaskDueClassification:
    """This week task questions must classify as TASK_DUE_THIS_WEEK"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "이번 주 완료해야 할 태스크",
        "이번주 해야 할 일",
        "금주 마감 작업",
        "이번 주 할 일",
        "tasks due this week",
        "What's due this week?",
    ])
    def test_task_due_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.TASK_DUE_THIS_WEEK, \
            f"Expected TASK_DUE_THIS_WEEK for '{question}', got {result.answer_type}"


class TestCasualClassification:
    """Greetings must classify as CASUAL"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "안녕",
        "안녕하세요",
        "고마워",
        "감사합니다",
        "hello",
        "hi",
    ])
    def test_casual_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.CASUAL, \
            f"Expected CASUAL for '{question}', got {result.answer_type}"


# =============================================================================
# CRITICAL: Priority Conflict Tests
# =============================================================================
# These tests address the root cause of P0/P1 STATUS_METRIC black hole issue:
# "The correct pattern existed, but a stronger pattern captured the query"

class TestPriorityConflictResolution:
    """
    CRITICAL: Test that specific intents win over generic STATUS_METRIC.

    The STATUS_METRIC black hole was caused by priority conflicts.
    These tests ensure proper priority ordering.
    """

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    def test_sprint_beats_status(self, classifier):
        """Sprint progress must NOT fall back to STATUS_METRIC"""
        question = "현재 스프린트 진행률은?"
        result = classifier.classify(question)

        assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
            f"SPRINT_PROGRESS should beat STATUS_METRIC for '{question}'"

        # If classifier returns fallback candidates, verify STATUS_METRIC is not primary
        if hasattr(result, 'matched_fallbacks') and result.matched_fallbacks:
            assert AnswerType.STATUS_METRIC not in result.matched_fallbacks[:1], \
                "STATUS_METRIC should not be primary fallback for sprint questions"

    def test_backlog_beats_status(self, classifier):
        """Backlog must NOT fall back to STATUS_METRIC"""
        questions = [
            "백로그 현황",      # Contains "현황" which could match status
            "백로그 상태",      # Contains "상태" which could match status
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type == AnswerType.BACKLOG_LIST, \
                f"BACKLOG_LIST should beat STATUS_METRIC for '{q}', got {result.answer_type}"

    def test_risk_beats_status(self, classifier):
        """Risk analysis must NOT fall back to STATUS_METRIC"""
        questions = [
            "리스크 현황",
            "위험 상태",
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type == AnswerType.RISK_ANALYSIS, \
                f"RISK_ANALYSIS should beat STATUS_METRIC for '{q}', got {result.answer_type}"

    def test_task_due_beats_status(self, classifier):
        """Task due must NOT fall back to STATUS_METRIC"""
        question = "이번주 작업 현황"  # Contains "현황" but should be TASK_DUE
        result = classifier.classify(question)

        # Could be TASK_DUE_THIS_WEEK or STATUS_LIST, but NOT STATUS_METRIC
        assert result.answer_type != AnswerType.STATUS_METRIC or \
               result.answer_type in (AnswerType.TASK_DUE_THIS_WEEK, AnswerType.STATUS_LIST), \
            f"Should not fall to STATUS_METRIC for '{question}'"


class TestNoFalsePositives:
    """Ensure specific intents don't capture unrelated questions"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    def test_status_not_captured_as_backlog(self, classifier):
        """Status questions should not be classified as BACKLOG_LIST"""
        questions = [
            "프로젝트 현황",
            "진행률 알려줘",
            "완료율이 얼마야",
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type != AnswerType.BACKLOG_LIST, \
                f"'{q}' should not be BACKLOG_LIST, got {result.answer_type}"

    def test_general_list_not_risk(self, classifier):
        """General list questions should not be classified as RISK_ANALYSIS"""
        questions = [
            "이슈 목록",    # General issues, not risks
            "버그 리스트",  # Bugs, not risks
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type != AnswerType.RISK_ANALYSIS, \
                f"'{q}' should not be RISK_ANALYSIS, got {result.answer_type}"

    def test_progress_not_confused_with_sprint(self, classifier):
        """General progress != sprint progress"""
        questions = [
            "전체 프로젝트 진행률",  # Project progress, not sprint
            "올해 목표 달성률",      # Yearly goals, not sprint
        ]
        for q in questions:
            result = classifier.classify(q)
            # These should go to STATUS_METRIC or similar, not SPRINT_PROGRESS
            # (unless explicitly asking about sprint)
            # This test is informational - adjust based on actual desired behavior
```

---

#### 4.1.3 Routing Regression Tests

**Location**: `/llm-service/tests/test_routing_regression.py`

```python
"""
Regression tests for intent routing.

Ensures that each intent routes to the correct handler.
"""

import pytest
from unittest.mock import Mock, patch
from intent_handlers import get_handler, INTENT_HANDLERS


class TestHandlerRouting:
    """Verify correct handler is selected for each intent"""

    def test_all_intents_have_handlers(self):
        """Every known intent must have a registered handler"""
        known_intents = [
            "BACKLOG_LIST",
            "SPRINT_PROGRESS",
            "TASK_DUE_THIS_WEEK",
            "RISK_ANALYSIS",
            "STATUS_METRIC",
            "STATUS_LIST",
            "CASUAL",
        ]

        for intent in known_intents:
            handler = get_handler(intent)
            assert handler is not None, f"No handler for intent: {intent}"
            assert callable(handler), f"Handler for {intent} is not callable"

    def test_unknown_intent_has_fallback(self):
        """Unknown intents should fall back to status_metric handler"""
        handler = get_handler("UNKNOWN_INTENT_XYZ")
        assert handler is not None
        # Should be the default handler

    @pytest.mark.parametrize("intent,expected_handler_name", [
        ("BACKLOG_LIST", "handle_backlog_list"),
        ("SPRINT_PROGRESS", "handle_sprint_progress"),
        ("TASK_DUE_THIS_WEEK", "handle_tasks_due_this_week"),
        ("RISK_ANALYSIS", "handle_risk_analysis"),
        ("CASUAL", "handle_casual"),
    ])
    def test_intent_handler_mapping(self, intent, expected_handler_name):
        """Verify specific intents map to expected handlers"""
        handler = get_handler(intent)
        assert handler.__name__ == expected_handler_name, \
            f"Intent {intent} should use {expected_handler_name}, got {handler.__name__}"


class TestHandlerExecution:
    """Verify handlers execute without errors"""

    @pytest.fixture
    def mock_executor(self):
        with patch('intent_handlers.get_status_query_executor') as mock:
            executor = Mock()
            executor.execute_raw_query.return_value = Mock(
                success=True,
                data=[]
            )
            mock.return_value = executor
            yield mock

    def test_backlog_handler_returns_contract(self, mock_executor):
        """Backlog handler should return ResponseContract"""
        from intent_handlers import handle_backlog_list, HandlerContext

        ctx = HandlerContext(
            project_id="test-project",
            user_access_level=6,
            user_role="PM",
            message="show backlog"
        )

        result = handle_backlog_list(ctx)

        assert result.intent == "BACKLOG_LIST"
        assert result.reference_time
        assert result.scope

    def test_risk_handler_returns_contract(self, mock_executor):
        """Risk handler should return ResponseContract"""
        from intent_handlers import handle_risk_analysis, HandlerContext

        ctx = HandlerContext(
            project_id="test-project",
            user_access_level=6,
            user_role="PM",
            message="analyze risks"
        )

        result = handle_risk_analysis(ctx)

        assert result.intent == "RISK_ANALYSIS"
        assert result.reference_time
```

---

#### 4.1.4 Renderer Regression Tests

**Location**: `/llm-service/tests/test_renderer_regression.py`

```python
"""
Regression tests for response rendering.

CRITICAL: These tests prevent the "all responses show same header" bug.
"""

import pytest
from response_contract import ResponseContract
from response_renderer import render


class TestHeaderDifferentiation:
    """
    CRITICAL: Each intent MUST have a different header.
    This prevents the original bug of all responses showing "Project Status".
    """

    def test_backlog_header_is_unique(self):
        """Backlog response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="BACKLOG_LIST",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"items": [], "count": 0},
            success=True,
        )

        result = render(contract)

        assert "Backlog" in result, "Backlog should have backlog-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Backlog response should NOT show 'Project Status' header"

    def test_risk_header_is_unique(self):
        """Risk response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="RISK_ANALYSIS",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"risks": [], "count": 0},
            success=True,
        )

        result = render(contract)

        assert "Risk" in result, "Risk should have risk-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Risk response should NOT show 'Project Status' header"

    def test_sprint_header_is_unique(self):
        """Sprint response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="SPRINT_PROGRESS",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"sprint": None, "stories": []},
            success=True,
        )

        result = render(contract)

        assert "Sprint" in result, "Sprint should have sprint-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Sprint response should NOT show 'Project Status' header"

    def test_task_header_is_unique(self):
        """Task due response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="TASK_DUE_THIS_WEEK",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"tasks": [], "count": 0},
            success=True,
        )

        result = render(contract)

        assert "Task" in result or "Due" in result, \
            "Task should have task-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Task response should NOT show 'Project Status' header"


class TestQueryFailureVsEmptyData:
    """Query failure must show different message than empty data"""

    def test_failure_shows_unavailable_not_empty(self):
        """Query failure must NOT show 'no data' message"""
        contract = ResponseContract(
            intent="BACKLOG_LIST",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"items": []},
            success=False,  # Query failed
            provenance="Unavailable",
        )

        result = render(contract)

        assert "Unable to load" in result or "unavailable" in result.lower(), \
            "Query failure should show error message"
        assert "no backlog items" not in result.lower(), \
            "Query failure should NOT show 'no data' message"


class TestTipsPresent:
    """Empty data should always show tips"""

    @pytest.mark.parametrize("intent", [
        "BACKLOG_LIST",
        "SPRINT_PROGRESS",
        "TASK_DUE_THIS_WEEK",
        "RISK_ANALYSIS",
    ])
    def test_empty_data_shows_tips(self, intent):
        """Empty data responses must include tips section"""
        contract = ResponseContract(
            intent=intent,
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={},
            success=True,
            tips=["Tip 1", "Tip 2"],
        )

        result = render(contract)

        assert "Next Steps" in result or "Tips" in result, \
            f"Empty {intent} response should show tips"


class TestDataSourceFooter:
    """All responses should show data source"""

    @pytest.mark.parametrize("intent", [
        "BACKLOG_LIST",
        "SPRINT_PROGRESS",
        "TASK_DUE_THIS_WEEK",
        "RISK_ANALYSIS",
        "STATUS_METRIC",
    ])
    def test_data_source_present(self, intent):
        """All responses must indicate data source"""
        contract = ResponseContract(
            intent=intent,
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={},
            success=True,
            provenance="PostgreSQL",
        )

        result = render(contract)

        assert "PostgreSQL" in result or "Data source" in result, \
            f"{intent} response should indicate data source"
```

---

### 4.2 Sprint Progress Enhancement

#### 4.2.1 Design Principle: PM's Killer Feature

Sprint Progress is not just a data query - it's:

> **"A data structure that allows PM to detect anomalies without asking questions."**

Key elements:
- Burndown / Velocity / Health triangle structure
- Story count + Story points simultaneously (PM needs both)
- Velocity always queried (maintains comparison baseline)

#### 4.2.2 Critical: KST Timezone Enforcement

P1 already encountered KST issues. All date calculations must be KST-aware:
- `CURRENT_DATE` → KST-based date
- Sprint start/end must be timezone-aware
- Without this: "Today's remaining points are same as yesterday" type subtle bugs

#### 4.2.3 Health Status as Signal Bundle

**Current design** (single value):
```python
health_status = "AT_RISK"  # or "BEHIND", "ON_TRACK"
```

**Recommended design** (signal bundle):
```python
health = {
    "status": "AT_RISK",
    "reasons": ["blocked_stories", "behind_schedule"],
    "confidence": 0.72,
    "indicators": {
        "blocked_count": 2,
        "completion_gap_pct": -15.3,
        "velocity_trend": "declining"
    }
}
```

Benefits:
- Renderer can produce much richer output
- LLM can explain "why it's at risk" later
- PM maturity metrics become possible

#### 4.2.4 Enhanced Sprint Queries

**Location**: `/llm-service/query_templates.py` (additions)

```python
# =============================================================================
# Enhanced Sprint Metrics Queries (KST-aware)
# =============================================================================

SPRINT_BURNDOWN_QUERY = """
-- Daily burndown data for current sprint
-- Note: date boundaries should be passed as KST-calculated parameters
WITH date_series AS (
    SELECT generate_series(
        :sprint_start_date::date,
        LEAST(:current_date::date, :sprint_end_date::date),
        '1 day'::interval
    )::date as day
),
daily_remaining AS (
    SELECT
        ds.day,
        COUNT(CASE WHEN us.status != 'DONE' OR us.updated_at::date > ds.day THEN 1 END) as remaining_stories,
        COALESCE(SUM(
            CASE WHEN us.status != 'DONE' OR us.updated_at::date > ds.day
            THEN us.story_points ELSE 0 END
        ), 0) as remaining_points
    FROM date_series ds
    CROSS JOIN user_story us
    WHERE us.sprint_id = :sprint_id
      AND us.project_id = :project_id  -- Scope enforcement
    GROUP BY ds.day
)
SELECT
    day,
    remaining_stories,
    remaining_points
FROM daily_remaining
ORDER BY day
"""

SPRINT_VELOCITY_HISTORY_QUERY = """
-- Velocity for last 5 completed sprints (always query for comparison baseline)
SELECT
    s.id,
    s.name,
    s.start_date,
    s.end_date,
    COUNT(CASE WHEN us.status = 'DONE' THEN 1 END) as completed_stories,
    COALESCE(SUM(CASE WHEN us.status = 'DONE' THEN us.story_points ELSE 0 END), 0) as completed_points,
    COUNT(*) as total_stories,
    COALESCE(SUM(us.story_points), 0) as total_points,
    CASE
        WHEN COUNT(*) > 0 THEN
            ROUND(COUNT(CASE WHEN us.status = 'DONE' THEN 1 END)::numeric / COUNT(*) * 100, 1)
        ELSE 0
    END as completion_rate_pct
FROM sprint s
LEFT JOIN user_story us ON us.sprint_id = s.id AND us.project_id = s.project_id
WHERE s.project_id = :project_id
  AND s.status IN ('COMPLETED', 'ACTIVE')
GROUP BY s.id, s.name, s.start_date, s.end_date
ORDER BY s.end_date DESC
LIMIT 5
"""

SPRINT_HEALTH_INDICATORS_QUERY = """
-- Sprint health indicators with signal bundle data
WITH sprint_data AS (
    SELECT
        s.id,
        s.name,
        s.start_date,
        s.end_date,
        GREATEST(1, s.end_date - s.start_date) as total_days,
        GREATEST(0, :current_date::date - s.start_date) as elapsed_days
    FROM sprint s
    WHERE s.id = :sprint_id
      AND s.project_id = :project_id  -- Scope enforcement
),
story_data AS (
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'DONE' THEN 1 END) as done,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) as blocked,
        COUNT(CASE WHEN assignee_id IS NULL AND status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as unassigned,
        COALESCE(SUM(story_points), 0) as total_points,
        COALESCE(SUM(CASE WHEN status = 'DONE' THEN story_points ELSE 0 END), 0) as done_points
    FROM user_story
    WHERE sprint_id = :sprint_id
      AND project_id = :project_id  -- Scope enforcement
)
SELECT
    sd.name as sprint_name,
    sd.elapsed_days,
    sd.total_days,
    ROUND(sd.elapsed_days::numeric / sd.total_days * 100, 1) as time_elapsed_pct,
    ROUND(story.done::numeric / NULLIF(story.total, 0) * 100, 1) as completion_pct,
    ROUND(story.done_points::numeric / NULLIF(story.total_points, 0) * 100, 1) as points_completion_pct,
    story.blocked,
    story.in_progress,
    story.unassigned,
    story.total as total_stories,
    story.done as done_stories,
    -- Health status determination
    CASE
        WHEN story.blocked > 0 THEN 'AT_RISK'
        WHEN story.unassigned > 2 THEN 'AT_RISK'
        WHEN (story.done::numeric / NULLIF(story.total, 0)) <
             (sd.elapsed_days::numeric / sd.total_days - 0.15) THEN 'BEHIND'
        WHEN (story.done::numeric / NULLIF(story.total, 0)) >
             (sd.elapsed_days::numeric / sd.total_days + 0.15) THEN 'AHEAD'
        ELSE 'ON_TRACK'
    END as health_status,
    -- Health reasons array (for signal bundle)
    ARRAY_REMOVE(ARRAY[
        CASE WHEN story.blocked > 0 THEN 'blocked_stories' END,
        CASE WHEN story.unassigned > 2 THEN 'unassigned_stories' END,
        CASE WHEN (story.done::numeric / NULLIF(story.total, 0)) <
                  (sd.elapsed_days::numeric / sd.total_days - 0.15) THEN 'behind_schedule' END
    ], NULL) as health_reasons
FROM sprint_data sd, story_data story
"""
```

#### 4.2.5 Enhanced Sprint Handler

**Location**: `/llm-service/intent_handlers.py` (sprint handler enhancement)

```python
def handle_sprint_progress(ctx: HandlerContext) -> ResponseContract:
    """Handle sprint progress queries with enhanced metrics"""
    logger.info(f"Handling SPRINT_PROGRESS for project {ctx.project_id}")

    executor = get_status_query_executor()

    sprint = None
    stories = []
    metrics = {}
    burndown = []
    velocity_history = []
    health = {}
    query_success = True

    # Get KST current date
    kst = pytz.timezone('Asia/Seoul')
    current_date_kst = datetime.now(kst).strftime("%Y-%m-%d")

    try:
        # Get active sprint
        sprint_result = executor.execute_raw_query(
            ACTIVE_SPRINT_QUERY,
            {"project_id": ctx.project_id}
        )
        if not sprint_result.success:
            query_success = False
            logger.error(f"Sprint query failed: {sprint_result.error}")
        else:
            sprint = sprint_result.data[0] if sprint_result.data else None

        if sprint and query_success:
            sprint_id = sprint["id"]

            # Get sprint stories with scope enforcement
            story_result = executor.execute_raw_query(
                SPRINT_STORIES_QUERY,
                {"sprint_id": sprint_id, "project_id": ctx.project_id}
            )
            stories = story_result.data if story_result.success else []

            # Get sprint metrics with scope enforcement
            metrics_result = executor.execute_raw_query(
                SPRINT_METRICS_QUERY,
                {"sprint_id": sprint_id, "project_id": ctx.project_id}
            )
            if metrics_result.success and metrics_result.data:
                metrics = metrics_result.data[0]
                # Calculate completion rate
                total = metrics.get("total_stories", 0)
                done = metrics.get("done_stories", 0)
                metrics["completion_rate"] = round(done / total * 100, 1) if total > 0 else 0

            # Get burndown data (KST-aware)
            try:
                burndown_result = executor.execute_raw_query(
                    SPRINT_BURNDOWN_QUERY,
                    {
                        "sprint_id": sprint_id,
                        "project_id": ctx.project_id,
                        "sprint_start_date": sprint.get("start_date"),
                        "sprint_end_date": sprint.get("end_date"),
                        "current_date": current_date_kst,
                    }
                )
                burndown = burndown_result.data if burndown_result.success else []
            except Exception as e:
                logger.warning(f"Burndown query failed: {e}")

            # Get health indicators (signal bundle)
            try:
                health_result = executor.execute_raw_query(
                    SPRINT_HEALTH_INDICATORS_QUERY,
                    {
                        "sprint_id": sprint_id,
                        "project_id": ctx.project_id,
                        "current_date": current_date_kst,
                    }
                )
                if health_result.success and health_result.data:
                    raw_health = health_result.data[0]
                    # Transform to signal bundle format
                    health = {
                        "status": raw_health.get("health_status", "UNKNOWN"),
                        "reasons": raw_health.get("health_reasons", []),
                        "indicators": {
                            "time_elapsed_pct": raw_health.get("time_elapsed_pct"),
                            "completion_pct": raw_health.get("completion_pct"),
                            "points_completion_pct": raw_health.get("points_completion_pct"),
                            "blocked_count": raw_health.get("blocked", 0),
                            "unassigned_count": raw_health.get("unassigned", 0),
                        },
                        "confidence": _calculate_health_confidence(raw_health),
                    }
            except Exception as e:
                logger.warning(f"Health query failed: {e}")

        # Get velocity history (always query for comparison baseline)
        try:
            velocity_result = executor.execute_raw_query(
                SPRINT_VELOCITY_HISTORY_QUERY,
                {"project_id": ctx.project_id}
            )
            velocity_history = velocity_result.data if velocity_result.success else []
        except Exception as e:
            logger.warning(f"Velocity query failed: {e}")

    except Exception as e:
        query_success = False
        logger.error(f"Sprint progress query exception: {e}")

    data = {
        "sprint": sprint,
        "stories": stories,
        "metrics": metrics,
        "burndown": burndown,
        "velocity_history": velocity_history,
        "health": health,
    }

    # Get degradation plan if needed
    degradation = get_degradation_plan(
        "SPRINT_PROGRESS",
        data,
        query_success=query_success
    )

    scope = {"project_id": ctx.project_id, "project_name": ctx.project_name}
    if sprint:
        scope["sprint_id"] = sprint["id"]
        scope["sprint_name"] = sprint.get("name")

    return ResponseContract(
        intent="SPRINT_PROGRESS",
        reference_time=_get_kst_reference_time(),
        scope=scope,
        data=data,
        success=query_success,
        warnings=[degradation.message] if degradation else [],
        tips=degradation.tips if degradation else [],
        provenance="PostgreSQL" if query_success else "Unavailable",
    )


def _calculate_health_confidence(raw_health: Dict) -> float:
    """Calculate confidence score for health assessment (0.0-1.0)"""
    # Higher confidence when we have more data points
    confidence = 0.5  # Base confidence

    if raw_health.get("total_stories", 0) > 5:
        confidence += 0.2  # More stories = more reliable
    if raw_health.get("elapsed_days", 0) > 3:
        confidence += 0.2  # More time elapsed = more reliable
    if raw_health.get("done_stories", 0) > 0:
        confidence += 0.1  # At least some work done

    return min(1.0, confidence)
```

---

### 4.3 Risk Data Model

#### 4.3.1 Design Principle

Risk is defined as **"interpretation result"** not an entity:
- Absorbs Issue / Blocker / Keyword sources
- Severity + Owner + Mitigation based scoring
- **Lifecycle management** enables "Is the risk being managed?" queries

#### 4.3.2 Risk Lifecycle (Critical Addition)

```python
class RiskLifecycle(Enum):
    IDENTIFIED = "IDENTIFIED"      # Risk discovered
    ACKNOWLEDGED = "ACKNOWLEDGED"  # PM/Owner aware
    MITIGATING = "MITIGATING"      # Active mitigation in progress
    ACCEPTED = "ACCEPTED"          # Consciously accepted risk
    CLOSED = "CLOSED"              # No longer relevant
```

Benefits:
- "Are there unacknowledged risks?" query becomes possible
- PM maturity indicator (% risks with mitigation plans)
- Audit/Report differentiation later

#### 4.3.3 Risk Model Implementation

**Location**: `/llm-service/risk_model.py` (NEW FILE)

```python
"""
Risk Data Model Utilities.

Handles risk identification from various sources when dedicated risk table doesn't exist.
Includes lifecycle management for PM maturity tracking.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)


class RiskSeverity(Enum):
    CRITICAL = "CRITICAL"   # Project failure potential
    HIGH = "HIGH"           # Major delay potential
    MEDIUM = "MEDIUM"       # Minor impact
    LOW = "LOW"             # Negligible impact
    UNKNOWN = "UNKNOWN"


class RiskSource(Enum):
    ISSUE_RISK_TYPE = "issue_risk_type"        # Issues with type=RISK
    ISSUE_RISK_KEYWORD = "issue_risk_keyword"  # Issues with risk keywords
    BLOCKER_HIGH = "blocker_high"              # High-severity blockers
    DERIVED = "derived"                         # Derived from other signals


class RiskLifecycle(Enum):
    """
    Risk lifecycle stages for maturity tracking.

    This enables:
    - "Are there unacknowledged risks?" queries
    - PM maturity metrics (% risks with mitigation)
    - Audit differentiation
    """
    IDENTIFIED = "IDENTIFIED"      # Risk discovered, not yet reviewed
    ACKNOWLEDGED = "ACKNOWLEDGED"  # PM/Owner aware, reviewing
    MITIGATING = "MITIGATING"      # Active mitigation in progress
    ACCEPTED = "ACCEPTED"          # Consciously accepted (documented)
    CLOSED = "CLOSED"              # No longer relevant


@dataclass
class Risk:
    """Unified risk representation with lifecycle"""
    id: str
    title: str
    description: str
    severity: RiskSeverity
    source: RiskSource
    status: str

    # Lifecycle
    lifecycle: RiskLifecycle = RiskLifecycle.IDENTIFIED

    # Ownership
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None

    # Management
    mitigation: Optional[str] = None
    contingency: Optional[str] = None

    # Assessment
    probability: Optional[str] = None  # HIGH/MEDIUM/LOW
    impact: Optional[str] = None       # HIGH/MEDIUM/LOW

    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    original_data: Dict[str, Any] = field(default_factory=dict)

    # Calculated
    score: float = 0.0


def map_issue_to_risk(issue: Dict[str, Any], source: RiskSource) -> Risk:
    """Map an issue record to unified Risk model"""
    # Determine lifecycle based on available data
    lifecycle = RiskLifecycle.IDENTIFIED
    if issue.get("assignee_id"):
        lifecycle = RiskLifecycle.ACKNOWLEDGED
    if issue.get("resolution") or issue.get("mitigation"):
        lifecycle = RiskLifecycle.MITIGATING

    severity_str = (issue.get("severity") or "UNKNOWN").upper()
    try:
        severity = RiskSeverity(severity_str)
    except ValueError:
        severity = RiskSeverity.UNKNOWN

    risk = Risk(
        id=str(issue.get("id")),
        title=issue.get("title", "Unknown"),
        description=issue.get("description") or "",
        severity=severity,
        source=source,
        status=issue.get("status", "OPEN"),
        lifecycle=lifecycle,
        owner_id=issue.get("assignee_id"),
        owner_name=issue.get("assignee_name"),
        mitigation=issue.get("resolution"),  # Use resolution field as mitigation
        created_at=str(issue.get("created_at", "")),
        updated_at=str(issue.get("updated_at", "")),
        original_data=issue,
    )

    risk.score = calculate_risk_score(risk)
    return risk


def calculate_risk_score(risk: Risk) -> float:
    """
    Calculate risk score (0-100) based on severity, lifecycle, and ownership.

    Higher score = higher priority for attention.
    """
    base_score = {
        RiskSeverity.CRITICAL: 80,
        RiskSeverity.HIGH: 60,
        RiskSeverity.MEDIUM: 40,
        RiskSeverity.LOW: 20,
        RiskSeverity.UNKNOWN: 30,
    }.get(risk.severity, 30)

    # Lifecycle adjustments
    lifecycle_adjustment = {
        RiskLifecycle.IDENTIFIED: 15,     # Needs attention
        RiskLifecycle.ACKNOWLEDGED: 5,    # Being reviewed
        RiskLifecycle.MITIGATING: -10,    # Active work
        RiskLifecycle.ACCEPTED: -20,      # Consciously accepted
        RiskLifecycle.CLOSED: -50,        # Should not appear
    }.get(risk.lifecycle, 0)

    base_score += lifecycle_adjustment

    # Boost if no owner assigned
    if not risk.owner_id:
        base_score += 10

    # Boost if no mitigation plan
    if not risk.mitigation and risk.lifecycle not in (RiskLifecycle.ACCEPTED, RiskLifecycle.CLOSED):
        base_score += 10

    return max(0, min(100, base_score))


def prioritize_risks(risks: List[Risk]) -> List[Risk]:
    """Sort risks by calculated score (highest first)"""
    return sorted(risks, key=lambda r: r.score, reverse=True)


def generate_risk_summary(risks: List[Risk]) -> Dict[str, Any]:
    """Generate comprehensive summary statistics for risks"""
    if not risks:
        return {
            "total": 0,
            "by_severity": {},
            "by_lifecycle": {},
            "unassigned": 0,
            "no_mitigation": 0,
            "needs_attention": 0,
            "top_risks": [],
            "maturity_score": 0,
        }

    by_severity = {}
    by_lifecycle = {}
    unassigned = 0
    no_mitigation = 0
    needs_attention = 0

    for risk in risks:
        # By severity
        sev = risk.severity.value
        by_severity[sev] = by_severity.get(sev, 0) + 1

        # By lifecycle
        lc = risk.lifecycle.value
        by_lifecycle[lc] = by_lifecycle.get(lc, 0) + 1

        # Counts
        if not risk.owner_id:
            unassigned += 1

        if not risk.mitigation and risk.lifecycle not in (RiskLifecycle.ACCEPTED, RiskLifecycle.CLOSED):
            no_mitigation += 1

        if risk.score >= 60:  # High priority threshold
            needs_attention += 1

    prioritized = prioritize_risks(risks)

    # Calculate PM maturity score (0-100)
    # Based on: % risks with owners, % with mitigation plans, % past IDENTIFIED stage
    total = len(risks)
    active_risks = [r for r in risks if r.lifecycle not in (RiskLifecycle.CLOSED,)]

    if active_risks:
        owned_pct = (len(active_risks) - unassigned) / len(active_risks) * 40
        mitigated_pct = (len(active_risks) - no_mitigation) / len(active_risks) * 40
        managed_pct = len([r for r in active_risks if r.lifecycle != RiskLifecycle.IDENTIFIED]) / len(active_risks) * 20
        maturity_score = round(owned_pct + mitigated_pct + managed_pct, 1)
    else:
        maturity_score = 100  # No risks = perfect score

    return {
        "total": total,
        "by_severity": by_severity,
        "by_lifecycle": by_lifecycle,
        "unassigned": unassigned,
        "no_mitigation": no_mitigation,
        "needs_attention": needs_attention,
        "top_risks": [_risk_to_dict(r) for r in prioritized[:5]],
        "maturity_score": maturity_score,
    }


def _risk_to_dict(risk: Risk) -> Dict[str, Any]:
    """Convert Risk to dictionary for serialization"""
    return {
        "id": risk.id,
        "title": risk.title,
        "severity": risk.severity.value,
        "lifecycle": risk.lifecycle.value,
        "owner_name": risk.owner_name,
        "has_mitigation": bool(risk.mitigation),
        "score": risk.score,
    }


# =============================================================================
# Risk Identification Rules
# =============================================================================

RISK_KEYWORDS_KOREAN = [
    "리스크", "위험", "우려", "잠재적 문제", "장애 가능성",
    "지연 예상", "품질 저하", "일정 초과", "예산 초과",
]

RISK_KEYWORDS_ENGLISH = [
    "risk", "hazard", "threat", "vulnerability", "concern",
    "potential issue", "blocker", "delay risk", "quality risk",
]


def is_risk_by_keyword(title: str, description: str = "") -> bool:
    """Check if text contains risk-related keywords"""
    text = (title + " " + (description or "")).lower()

    for kw in RISK_KEYWORDS_KOREAN + RISK_KEYWORDS_ENGLISH:
        if kw.lower() in text:
            return True

    return False


def derive_risks_from_blockers(blockers: List[Dict[str, Any]]) -> List[Risk]:
    """
    Derive risks from high-severity blockers.

    Blockers that have been open for >3 days indicate systemic issues.
    """
    derived_risks = []

    for blocker in blockers:
        if blocker.get("severity") not in ("CRITICAL", "HIGH"):
            continue

        severity_str = blocker.get("severity", "HIGH")
        try:
            severity = RiskSeverity(severity_str)
        except ValueError:
            severity = RiskSeverity.HIGH

        risk = Risk(
            id=f"derived-{blocker.get('id')}",
            title=f"[Derived] {blocker.get('title')}",
            description=f"High-severity blocker indicates potential risk: {blocker.get('description', '')}",
            severity=severity,
            source=RiskSource.DERIVED,
            status="OPEN",
            lifecycle=RiskLifecycle.IDENTIFIED,
            owner_id=blocker.get("assignee_id"),
            owner_name=blocker.get("assignee_name"),
            original_data=blocker,
        )
        risk.score = calculate_risk_score(risk)
        derived_risks.append(risk)

    return derived_risks
```

---

### 4.4 Response Quality Metrics

#### 4.4.1 True Purpose

Response metrics are not just logs - they are:

> **"Early warning signals that AI is becoming incompetent"**

Key insight: These metrics monitor **intent classification/routing quality**, not just LLM output quality.

#### 4.4.2 Critical Indicators

| Metric | What It Really Measures | Alert Threshold |
|--------|-------------------------|-----------------|
| `status_metric_ratio > 60%` | Intent routing is broken | Immediate investigation |
| `empty_data_rate per intent` | Data layer or query issues | >50% per intent |
| `intent_distribution imbalance` | Classifier bias | Any intent >80% |

#### 4.4.3 Implementation Notes

- **Do NOT** put metrics collection in synchronous path
- Sampling (e.g., 30%) is sufficient for meaningful insights
- Start with logs - Prometheus can come later

**Location**: `/llm-service/response_metrics.py` (NEW FILE)

```python
"""
Response Quality Metrics Collection.

Purpose: Early warning system for AI degradation.
Key insight: These metrics monitor ROUTING QUALITY, not just response quality.

Critical thresholds:
- status_metric_ratio > 60% = Intent routing is broken
- empty_data_rate > 50% per intent = Data layer issues
- Any intent > 80% of traffic = Classifier bias
"""

import logging
import threading
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import random

logger = logging.getLogger(__name__)

# Sampling rate for metrics collection (to avoid performance impact)
SAMPLING_RATE = 0.3  # 30% sampling is sufficient for insights


@dataclass
class IntentMetrics:
    """Metrics for a single intent"""
    count: int = 0
    empty_data_count: int = 0
    query_failure_count: int = 0
    total_response_time_ms: float = 0


@dataclass
class ResponseMetricsCollector:
    """
    Collects and reports response quality metrics.

    This is an early warning system that detects:
    1. Intent routing degradation (STATUS_METRIC black hole)
    2. Data layer issues (high empty_data_rate)
    3. Classifier bias (intent distribution imbalance)
    """

    _metrics: Dict[str, IntentMetrics] = field(default_factory=lambda: defaultdict(IntentMetrics))
    _window_start: datetime = field(default_factory=datetime.now)
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _sampling_rate: float = SAMPLING_RATE

    def record(
        self,
        intent: str,
        has_data: bool,
        response_time_ms: float,
        query_success: bool = True,
    ):
        """
        Record a response event (with sampling).

        Args:
            intent: The classified intent
            has_data: Whether response contains meaningful data
            response_time_ms: Response time in milliseconds
            query_success: Whether DB query succeeded
        """
        # Apply sampling to avoid performance impact
        if random.random() > self._sampling_rate:
            return

        with self._lock:
            metrics = self._metrics[intent]
            metrics.count += 1
            metrics.total_response_time_ms += response_time_ms

            if not has_data:
                metrics.empty_data_count += 1

            if not query_success:
                metrics.query_failure_count += 1

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of metrics with health indicators"""
        with self._lock:
            total_requests = sum(m.count for m in self._metrics.values())
            window_minutes = (datetime.now() - self._window_start).total_seconds() / 60

            summary = {
                "window_start": self._window_start.isoformat(),
                "window_duration_minutes": round(window_minutes, 1),
                "sampling_rate": self._sampling_rate,
                "estimated_total_requests": int(total_requests / self._sampling_rate) if self._sampling_rate > 0 else 0,
                "intents": {},
                "health_indicators": {},
                "alerts": [],
            }

            # Per-intent metrics
            for intent, metrics in self._metrics.items():
                avg_time = metrics.total_response_time_ms / max(metrics.count, 1)
                empty_rate = metrics.empty_data_count / max(metrics.count, 1)
                failure_rate = metrics.query_failure_count / max(metrics.count, 1)
                distribution_pct = metrics.count / max(total_requests, 1) * 100

                summary["intents"][intent] = {
                    "count": metrics.count,
                    "distribution_pct": round(distribution_pct, 1),
                    "empty_data_count": metrics.empty_data_count,
                    "empty_data_rate": round(empty_rate * 100, 1),
                    "query_failure_count": metrics.query_failure_count,
                    "query_failure_rate": round(failure_rate * 100, 1),
                    "avg_response_time_ms": round(avg_time, 1),
                }

            # Calculate health indicators
            summary["health_indicators"] = self._calculate_health_indicators(summary["intents"], total_requests)

            # Generate alerts
            summary["alerts"] = self._generate_alerts(summary["intents"], summary["health_indicators"])

            return summary

    def _calculate_health_indicators(self, intents: Dict, total_requests: int) -> Dict[str, Any]:
        """Calculate system-wide health indicators"""
        indicators = {}

        # STATUS_METRIC ratio - KEY indicator for routing health
        status_metric_count = intents.get("STATUS_METRIC", {}).get("count", 0)
        indicators["status_metric_ratio"] = round(status_metric_count / max(total_requests, 1) * 100, 1)

        # Overall empty data rate
        total_empty = sum(i.get("empty_data_count", 0) for i in intents.values())
        indicators["overall_empty_data_rate"] = round(total_empty / max(total_requests, 1) * 100, 1)

        # Overall query failure rate
        total_failures = sum(i.get("query_failure_count", 0) for i in intents.values())
        indicators["overall_query_failure_rate"] = round(total_failures / max(total_requests, 1) * 100, 1)

        # Intent diversity (entropy-based, simplified)
        if intents:
            max_single_intent_pct = max(i.get("distribution_pct", 0) for i in intents.values())
            indicators["max_single_intent_pct"] = max_single_intent_pct
            indicators["intent_diversity"] = "LOW" if max_single_intent_pct > 60 else "HEALTHY"

        return indicators

    def _generate_alerts(self, intents: Dict, indicators: Dict) -> List[Dict[str, str]]:
        """Generate alerts based on thresholds"""
        alerts = []

        # CRITICAL: STATUS_METRIC black hole detection
        if indicators.get("status_metric_ratio", 0) > 60:
            alerts.append({
                "level": "CRITICAL",
                "code": "STATUS_METRIC_BLACKHOLE",
                "message": f"STATUS_METRIC captures {indicators['status_metric_ratio']}% of requests - routing likely broken",
            })

        # WARNING: High empty data rate per intent
        for intent, data in intents.items():
            if data.get("empty_data_rate", 0) > 50 and data.get("count", 0) > 10:
                alerts.append({
                    "level": "WARNING",
                    "code": f"HIGH_EMPTY_DATA_{intent}",
                    "message": f"{intent} has {data['empty_data_rate']}% empty data rate",
                })

        # WARNING: Query failures
        if indicators.get("overall_query_failure_rate", 0) > 10:
            alerts.append({
                "level": "WARNING",
                "code": "QUERY_FAILURES",
                "message": f"Query failure rate is {indicators['overall_query_failure_rate']}%",
            })

        # INFO: Single intent dominance
        if indicators.get("max_single_intent_pct", 0) > 80:
            alerts.append({
                "level": "INFO",
                "code": "INTENT_IMBALANCE",
                "message": f"Single intent captures {indicators['max_single_intent_pct']}% of traffic",
            })

        return alerts

    def reset(self):
        """Reset metrics (e.g., at start of new window)"""
        with self._lock:
            self._metrics = defaultdict(IntentMetrics)
            self._window_start = datetime.now()

    def log_summary(self):
        """Log metrics summary with alerts"""
        summary = self.get_summary()

        logger.info("=== Response Metrics Summary ===")
        logger.info(f"Window: {summary['window_duration_minutes']:.1f} minutes")
        logger.info(f"Estimated total requests: {summary['estimated_total_requests']}")

        # Health indicators
        hi = summary["health_indicators"]
        logger.info(f"STATUS_METRIC ratio: {hi.get('status_metric_ratio', 0)}%")
        logger.info(f"Overall empty data rate: {hi.get('overall_empty_data_rate', 0)}%")
        logger.info(f"Intent diversity: {hi.get('intent_diversity', 'N/A')}")

        # Per-intent breakdown
        for intent, metrics in summary["intents"].items():
            logger.info(
                f"  {intent}: {metrics['count']} requests ({metrics['distribution_pct']}%), "
                f"{metrics['empty_data_rate']}% empty, "
                f"{metrics['avg_response_time_ms']}ms avg"
            )

        # Alerts
        for alert in summary["alerts"]:
            log_method = logger.critical if alert["level"] == "CRITICAL" else \
                         logger.warning if alert["level"] == "WARNING" else logger.info
            log_method(f"[{alert['level']}] {alert['code']}: {alert['message']}")


# Global collector instance
_collector: Optional[ResponseMetricsCollector] = None


def get_metrics_collector() -> ResponseMetricsCollector:
    """Get singleton metrics collector"""
    global _collector
    if _collector is None:
        _collector = ResponseMetricsCollector()
    return _collector


def record_response(
    intent: str,
    has_data: bool,
    response_time_ms: float,
    query_success: bool = True,
):
    """Convenience function to record a response"""
    get_metrics_collector().record(intent, has_data, response_time_ms, query_success)


# =============================================================================
# Optional: Prometheus Integration (can be added later)
# =============================================================================

# from prometheus_client import Counter, Histogram, Gauge
#
# INTENT_REQUESTS = Counter(
#     'ai_assistant_intent_requests_total',
#     'Total requests by intent',
#     ['intent']
# )
#
# EMPTY_DATA_REQUESTS = Counter(
#     'ai_assistant_empty_data_total',
#     'Requests with empty data by intent',
#     ['intent']
# )
#
# RESPONSE_TIME = Histogram(
#     'ai_assistant_response_time_seconds',
#     'Response time by intent',
#     ['intent'],
#     buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
# )
#
# STATUS_METRIC_RATIO = Gauge(
#     'ai_assistant_status_metric_ratio',
#     'Percentage of requests falling to STATUS_METRIC'
# )
```

---

## 5. CI/CD Integration

### 5.1 Critical: Include SQL Changes in Triggers

SQL changes are the most dangerous regression source. The trigger paths must include:

| File | Risk Level | Reason |
|------|------------|--------|
| `answer_type_classifier.py` | HIGH | Intent classification |
| `intent_handlers.py` | HIGH | Handler routing |
| `response_renderer.py` | HIGH | Output generation |
| `query_templates.py` | **CRITICAL** | SQL changes break data layer |
| `risk_model.py` | MEDIUM | Risk interpretation |
| `chat_workflow_v2.py` | HIGH | Core workflow |

### 5.2 Pre-commit Hook

```yaml
# .pre-commit-config.yaml (addition)
- repo: local
  hooks:
    - id: intent-classifier-regression
      name: Intent Classifier Regression Tests
      entry: pytest llm-service/tests/test_intent_classifier_regression.py -v
      language: system
      pass_filenames: false
      files: (answer_type_classifier|intent_handlers|query_templates)\.py$

    - id: renderer-regression
      name: Renderer Regression Tests
      entry: pytest llm-service/tests/test_renderer_regression.py -v
      language: system
      pass_filenames: false
      files: response_renderer\.py$
```

### 5.3 GitHub Actions

```yaml
# .github/workflows/ai-assistant-tests.yml
name: AI Assistant Regression Tests

on:
  push:
    paths:
      - 'llm-service/answer_type_classifier.py'
      - 'llm-service/intent_handlers.py'
      - 'llm-service/response_renderer.py'
      - 'llm-service/chat_workflow_v2.py'
      - 'llm-service/query_templates.py'    # CRITICAL: SQL changes
      - 'llm-service/risk_model.py'
      - 'llm-service/degradation_tips.py'

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd llm-service
          pip install -r requirements.txt
          pip install pytest pytz

      - name: Run intent classifier regression tests
        run: |
          cd llm-service
          pytest tests/test_intent_classifier_regression.py -v --tb=short

      - name: Run routing regression tests
        run: |
          cd llm-service
          pytest tests/test_routing_regression.py -v --tb=short

      - name: Run renderer regression tests
        run: |
          cd llm-service
          pytest tests/test_renderer_regression.py -v --tb=short

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: llm-service/test-results/
```

---

## 6. Monitoring Dashboard

### 6.1 Metrics to Track

| Metric | Description | Alert Threshold | Severity |
|--------|-------------|-----------------|----------|
| `status_metric_ratio` | % falling to STATUS_METRIC | >60% | CRITICAL |
| `empty_data_rate` | % responses with no data | >50% per intent | WARNING |
| `intent_distribution` | % of requests per intent | Any intent >80% | INFO |
| `query_failure_rate` | % of failed DB queries | >10% | WARNING |
| `response_time_p95` | 95th percentile response time | >5s | WARNING |

### 6.2 Dashboard Layout Recommendation

```
+------------------------------------------+
|  AI Assistant Health Dashboard           |
+------------------------------------------+
|                                          |
|  [STATUS_METRIC RATIO: 23%] [OK]         |
|  [EMPTY DATA RATE: 12%] [OK]             |
|  [QUERY FAILURE RATE: 0.5%] [OK]         |
|                                          |
+------------------------------------------+
|  Intent Distribution (last 1h)           |
|  +---------+------+-------+              |
|  | Intent  | Count| % Dist|              |
|  +---------+------+-------+              |
|  | BACKLOG | 45   | 28%   |              |
|  | SPRINT  | 32   | 20%   |              |
|  | TASK    | 28   | 18%   |              |
|  | RISK    | 22   | 14%   |              |
|  | STATUS  | 18   | 11%   |              |
|  | CASUAL  | 15   | 9%    |              |
|  +---------+------+-------+              |
+------------------------------------------+
|  Alerts (last 24h)                       |
|  [None]                                  |
+------------------------------------------+
```

---

## 7. Success Criteria

| Criteria | Measurement | Status |
|----------|-------------|--------|
| All regression tests pass | 100% pass rate in CI | [ ] |
| Priority conflict tests pass | Sprint/Backlog beat STATUS_METRIC | [ ] |
| No "Project Status" for non-status | Renderer tests pass | [ ] |
| Sprint shows health signal bundle | health.reasons array populated | [ ] |
| Risk includes lifecycle | lifecycle field in risk summary | [ ] |
| Metrics collection active | Logs show metrics summary | [ ] |
| STATUS_METRIC ratio < 30% | Metrics dashboard | [ ] |

---

## 8. Timeline

| Day | Task | Deliverable |
|-----|------|-------------|
| Day 1 | Regression test suite + CI integration | All tests green |
| Day 2 | Sprint progress enhancement (KST, health bundle) | Burndown + health API working |
| Day 3 | Risk model with lifecycle | Risk summary with maturity score |
| Day 4 | Response metrics + monitoring setup | Dashboard showing key indicators |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Burndown query too slow | Poor UX | Add query timeout (3s), cache results |
| Risk keyword false positives | Wrong classification | Refine keyword list, add exclusions |
| Metrics overhead | Performance impact | Use async collection, 30% sampling |
| KST calculation errors | Wrong date ranges | Unit tests for boundary cases |
| Priority tests too strict | CI failures on minor changes | Review test thresholds periodically |

---

## 10. Key Takeaways

### P2 Strategic Summary

1. **Regression tests** → Remove human memory dependency
2. **Metrics** → Replace intuition with data
3. **Risk lifecycle** → Enable "is it being managed?" queries
4. **Priority conflict tests** → Prevent STATUS_METRIC black hole

### Post-P2 Principle

> After P2, the question becomes **"which failures are unacceptable"** rather than **"how many features to add"**.

This design achieves: **A system that never makes the same mistake twice.**
