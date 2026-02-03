# P0: Intent Routing & Handler Implementation (Revised v2.1)

**Priority**: Critical (Immediate impact)
**Timeline**: 0-1 day
**Goal**: Eliminate "all questions return same template" problem

---

## 1. Problem Statement

Currently, almost all questions are classified as `status_metric` or `status_list`, resulting in identical "Project Status" responses regardless of user intent.

**Before**:
```
User: "What's in the backlog?"
AI: 📊 **Project Status** (as of: 2026-02-03)...

User: "Analyze risks"
AI: 📊 **Project Status** (as of: 2026-02-03)...
```

**After**:
```
User: "What's in the backlog?"
AI: 📋 **Product Backlog** (as of: 2026-02-03)...

User: "Analyze risks"
AI: ⚠️ **Risk Analysis** (as of: 2026-02-03)...
```

---

## 2. Risk Mitigations Applied

This revision addresses the following critical risks:

| Risk | Issue | Mitigation |
|------|-------|------------|
| **(A)** | enum/string mixing breaks routing | Standardize on **lowercase snake_case** strings (`"backlog_list"`) |
| **(B)** | STATUS_LIST becomes "black hole" | Constrain STATUS_LIST with status-domain keywords |
| **(C)** | fallback=STATUS_METRIC causes regression | Fallback to **UNKNOWN → RAG** instead |
| **(D)** | `execute_raw_query()` may not exist | Create **separate `db_query.py`** module |
| **(E)** | SQL week boundaries ignore KST | Calculate KST boundaries in **Python** as `datetime`, use `< next_start` comparison |
| **(F)** | No access control in handlers | Output **minimal fields** (title/status only), no description |
| **(G)** | render_status_metric conflicts | STATUS_METRIC uses **existing StatusResponseContract** |
| **(H)** | `answer_type` vs `intent` key confusion | **Single key: `state["intent"]` only** |
| **(I)** | Unbounded queries / data leak | **db_query.py enforces project_id, outer LIMIT wrapper, timeout** |
| **(J)** | Schema mismatch crashes handler | **Graceful degrade: empty result + `error_code` + tips** |
| **(K)** | Error detection via string matching | **Use structured `error_code` field, not string contains** |
| **(L)** | `was_limited` inaccurate | **Use LIMIT+1 fetch, drop extra row if present** |
| **(M)** | Fallback usage untracked | **Add `used_fallback` flag for monitoring** |

---

## 3. Implementation Checklist (Must Pass Before Deploy)

Before considering P0 complete, verify ALL items:

| # | Checklist Item | Verification |
|---|----------------|--------------|
| 1 | Intent key is **single**: `state["intent"]` only | `state["answer_type"]` is NOT used in routing |
| 2 | Intent value is **always snake_case lowercase** | No `.upper()` in router/handler/renderer |
| 3 | UNKNOWN goes to **document_query**, NOT status | Test: ambiguous question → RAG response |
| 4 | STATUS_* uses **existing StatusResponseContract** | No new renderer for status_metric |
| 5 | Non-status uses **response_renderer** only | Backlog/Sprint/Task/Risk have unique headers |
| 6 | db_query enforces **project_id / outer LIMIT / timeout** | Query without project_id returns error |
| 7 | Handlers return **minimal fields only** | No description/assignee in P0 output |
| 8 | Regression test: **`"📊 **프로젝트 현황**"` in non-status = FAIL** | Test suite catches full status header string |
| 9 | Error detection uses **`error_code` field** | No `"데이터 조회 실패" in str(...)` pattern |
| 10 | **Graph node names match exactly** | Verify `intent_handler`, `execute_status_query`, `casual_response`, etc. |

---

## 4. Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Classifier    │ -> │  Intent Router  │ -> │     Handler     │ -> │    Renderer     │
│ (lowercase key) │    │ (routing table) │    │ (db_query.py)   │    │ (format output) │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
        │                      │                      │                      │
        ↓                      ↓                      ↓                      ↓
   "backlog_list"        INTENT_HANDLERS      ResponseContract       Formatted text
```

**Key Design Decisions**:

- **Single state key**: `state["intent"]` only (NOT `state["answer_type"]`)
- Intent key = `AnswerType.value` (lowercase snake_case) throughout
- No `.upper()` transformations - use value directly
- Fallback → `unknown` → `document_query` (RAG), NOT status_metric
- DB access via `db_query.py`, not status_query_executor
- Schema mismatch → graceful degrade (not crash)
- **Error detection via `error_code` field**, not string matching
- **LIMIT enforced via outer wrapper** to guarantee limit works
- **`was_limited` uses LIMIT+1 pattern** for accuracy

---

## 5. Files to Modify/Create

| File | Change Type | Description |
|------|-------------|-------------|
| `answer_type_classifier.py` | **MODIFY** | Priority-based classification, fallback=UNKNOWN |
| `chat_workflow_v2.py` | **MODIFY** | Add intent-to-handler routing, single `state["intent"]` key |
| `intent_handlers.py` | **NEW** | Intent-specific handlers (minimal fields, graceful degrade) |
| `response_renderer.py` | **NEW** | Intent-aware rendering (non-status only) |
| `response_contract.py` | **NEW** | Generic response contract with `error_code` field |
| `db_query.py` | **NEW** | Safe raw query utility with enforced guards |

---

## 6. Implementation Details

### 6.1 State Key Standardization (Risk H)

**CRITICAL RULE**: All modules use `state["intent"]` only.

```python
# ============================================================
# SINGLE STATE KEY RULE
# ============================================================
#
# ✅ CORRECT: Use state["intent"]
# ❌ WRONG: Use state["answer_type"]
#
# The key "answer_type" is DEPRECATED.
# All routing, handling, rendering reads from "intent" only.
# ============================================================

# In classifier node:
state["intent"] = result.answer_type.value  # e.g., "backlog_list"

# In router:
intent = state.get("intent", "unknown")  # NOT state.get("answer_type")

# In handler:
intent = state.get("intent")  # NOT state.get("answer_type")
```

**Backward Compatibility** (optional alias):
```python
# If legacy code reads answer_type, set as alias (read-only)
state["answer_type"] = state["intent"]  # Alias for legacy, DO NOT read from this
```

---

### 6.2 Intent Key Normalization Strategy

**Mode: STRICT (Recommended)**

- Router normalizes input ONCE at entry point
- All downstream code assumes lowercase snake_case
- Uppercase/mixed case → logged warning + normalized

```python
def normalize_intent(raw_intent: str) -> str:
    """
    Normalize intent to lowercase snake_case.

    STRICT MODE:
    - Normalizes at router entry only
    - Logs warning if normalization was needed
    - Downstream assumes already normalized
    """
    if not raw_intent:
        return "unknown"

    normalized = raw_intent.lower().strip()

    # Log if normalization changed the value (indicates upstream bug)
    if normalized != raw_intent:
        logger.warning(
            f"Intent normalization applied: '{raw_intent}' -> '{normalized}'. "
            "This indicates an upstream bug - classifier should return lowercase."
        )

    return normalized


# In router (SINGLE normalization point):
def _route_after_answer_type(self, state: TwoTrackState) -> str:
    raw_intent = state.get("intent", "unknown")
    intent = normalize_intent(raw_intent)
    state["intent"] = intent  # Overwrite with normalized value

    # ... routing logic using normalized intent ...
```

**Why STRICT mode?**
- If uppercase leaks through, it goes to `document_query` (RAG) instead of crashing
- Better than "all questions → 📊 status" regression
- Warning logs help identify upstream bugs

---

### 6.3 answer_type_classifier.py Modifications

**Location**: `/llm-service/answer_type_classifier.py`

#### Intent Key Standard

**CRITICAL**: All intent keys use **lowercase snake_case** (`AnswerType.value`):

```python
class AnswerType(Enum):
    """
    Intent types with lowercase snake_case values.

    IMPORTANT: Use .value directly as the intent key.
    Do NOT use .upper() or string transformations.
    """
    # Priority 1: Specific domain intents (check first)
    RISK_ANALYSIS = "risk_analysis"
    TASK_DUE_THIS_WEEK = "task_due_this_week"
    SPRINT_PROGRESS = "sprint_progress"
    BACKLOG_LIST = "backlog_list"

    # Priority 2: General status (constrained)
    STATUS_METRIC = "status_metric"
    STATUS_LIST = "status_list"

    # Priority 3: Non-status
    HOWTO_POLICY = "howto_policy"
    CASUAL = "casual"

    # Fallback (goes to RAG, NOT status)
    UNKNOWN = "unknown"
```

#### Priority-Based Classification Rules

```python
INTENT_PATTERNS = {
    # =================================================================
    # Priority 1 - Specific intents (check first, win over STATUS_*)
    # =================================================================
    AnswerType.RISK_ANALYSIS: {
        "keywords": ["리스크", "위험", "risk", "위험요소", "리스크 분석"],
        # NOTE: Removed "이슈" as it conflicts with general issues
        "priority": 1,
    },
    AnswerType.TASK_DUE_THIS_WEEK: {
        # COMBINATION RULE: "이번 주" + task-related word required
        "keywords": ["이번 주", "이번주", "금주", "this week"],
        "requires_any": ["태스크", "할 일", "task", "작업", "마감", "완료해야"],
        "priority": 1,
    },
    AnswerType.SPRINT_PROGRESS: {
        # COMBINATION RULE: sprint context + progress context
        "keywords": ["스프린트"],
        "requires_any": ["진행", "상황", "진척", "번다운", "velocity", "속도", "현황"],
        "priority": 1,
    },
    AnswerType.BACKLOG_LIST: {
        "keywords": ["백로그", "backlog", "제품 백로그"],
        "priority": 1,
    },

    # =================================================================
    # Priority 2 - General status (CONSTRAINED to avoid black hole)
    # =================================================================
    AnswerType.STATUS_METRIC: {
        # MUST have explicit status-domain keywords
        "keywords": ["완료율", "진척률", "WIP", "진행률"],
        "requires_any": ["프로젝트", "전체", "현재"],  # Context required
        "priority": 2,
    },
    AnswerType.STATUS_LIST: {
        # REMOVED: "목록", "리스트", "뭐가 있" - too broad
        # Now requires explicit status context
        "keywords": ["상태별", "스토리 수", "진행 상태"],
        "requires_any": ["조회", "보여", "알려"],
        "priority": 2,
    },

    # =================================================================
    # Priority 3 - Casual (short messages only)
    # =================================================================
    AnswerType.CASUAL: {
        "keywords": ["안녕", "고마워", "감사", "반가워", "hello", "hi"],
        "max_length": 15,
        "priority": 3,
    },
}
```

#### New classify() Method

**CRITICAL CHANGE**: Fallback is `UNKNOWN`, not `STATUS_METRIC`

```python
@dataclass
class AnswerTypeResult:
    """Classification result"""
    answer_type: AnswerType
    confidence: float
    matched_patterns: List[str] = field(default_factory=list)


def classify(self, message: str) -> AnswerTypeResult:
    """
    Classify message intent with priority-based rules.

    IMPORTANT:
    - Returns AnswerType enum
    - Use result.answer_type.value for the intent key
    - Fallback is UNKNOWN (→ RAG), NOT status_metric
    """
    if not message or not message.strip():
        return AnswerTypeResult(AnswerType.UNKNOWN, 0.0)

    message_lower = message.lower().strip()

    # Check by priority order (1, 2, 3)
    for priority in [1, 2, 3]:
        for answer_type, config in INTENT_PATTERNS.items():
            if config.get("priority") != priority:
                continue

            # Check max_length constraint (for CASUAL)
            max_len = config.get("max_length")
            if max_len and len(message) > max_len:
                continue

            # Check primary keywords
            keywords = config.get("keywords", [])
            matched = [kw for kw in keywords if kw in message_lower]

            if not matched:
                continue

            # Check requires_any constraint (combination rule)
            requires_any = config.get("requires_any")
            if requires_any:
                has_required = any(req in message_lower for req in requires_any)
                if not has_required:
                    continue

            confidence = min(0.95, 0.7 + len(matched) * 0.1)
            return AnswerTypeResult(
                answer_type=answer_type,
                confidence=confidence,
                matched_patterns=matched,
            )

    # =================================================================
    # CRITICAL: Fallback to UNKNOWN, NOT status_metric
    # This prevents "all questions → status template" regression
    # =================================================================
    return AnswerTypeResult(AnswerType.UNKNOWN, 0.3)
```

---

### 6.4 response_contract.py (NEW FILE) - With Error Code Field

**Location**: `/llm-service/response_contract.py`

**Key Features**:
- **`error_code` field** for structured error detection (Risk K)
- Eliminates fragile string matching in renderer

```python
"""
Response Contract for Intent Handlers.

IMPORTANT: Use error_code for error detection, NOT string matching on warnings.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# =============================================================================
# Error Codes (Structured Error Detection - Risk K)
# =============================================================================

class ErrorCode:
    """
    Structured error codes for graceful degradation.

    Use these instead of matching warning message strings.
    """
    DB_QUERY_FAILED = "DB_QUERY_FAILED"
    DB_TIMEOUT = "DB_TIMEOUT"
    SCHEMA_MISMATCH = "SCHEMA_MISMATCH"
    FALLBACK_USED = "FALLBACK_USED"
    NO_DATA = "NO_DATA"


@dataclass
class ResponseContract:
    """
    Generic response contract for intent handlers.

    Attributes:
        intent: The classified intent (lowercase snake_case)
        reference_time: KST timestamp string
        scope: Context scope (e.g., "프로젝트: ABC")
        data: Response data (intent-specific)
        warnings: Warning messages for user
        tips: Actionable next steps
        provenance: Data source identifier
        error_code: Structured error code (use instead of string matching)
    """
    intent: str
    reference_time: str
    scope: str
    data: Dict[str, Any]
    warnings: List[str] = field(default_factory=list)
    tips: List[str] = field(default_factory=list)
    provenance: str = "realtime"
    error_code: Optional[str] = None  # <-- CRITICAL: Use this for error detection

    def has_data(self) -> bool:
        """Check if response has meaningful data"""
        if not self.data:
            return False

        # Check common data patterns
        if "items" in self.data:
            return len(self.data["items"]) > 0
        if "tasks" in self.data:
            return len(self.data["tasks"]) > 0
        if "risks" in self.data:
            return len(self.data["risks"]) > 0
        if "sprint" in self.data:
            return self.data["sprint"] is not None

        return len(self.data) > 0

    def has_error(self) -> bool:
        """
        Check if response represents an error condition.

        IMPORTANT: Use this instead of checking warning message strings.
        """
        return self.error_code is not None
```

---

### 6.5 db_query.py (NEW FILE) - With Safety Guards

**Location**: `/llm-service/db_query.py`

**Safety Guards (Risk I)**:

1. **project_id REQUIRED** - Query fails without it
2. **LIMIT enforced via outer wrapper** - Guarantees max rows regardless of inner LIMIT
3. **TIMEOUT set** - Statement timeout prevents runaway queries
4. **`was_limited` uses LIMIT+1 pattern** - Accurate truncation detection
5. **`used_fallback` tracking** - Monitoring for schema issues

```python
"""
Database Query Utility for Intent Handlers.

IMPORTANT: This is SEPARATE from status_query_executor.
- status_query_executor: whitelist metrics only, strict policy
- db_query: intent handler queries, project-scoped, limited

============================================================
SAFETY GUARDS (P0 Minimum)
============================================================
1. project_id REQUIRED - All queries MUST have project_id parameter
2. LIMIT ENFORCED - Outer wrapper guarantees cap at MAX_QUERY_LIMIT
3. TIMEOUT SET - Statement timeout (QUERY_TIMEOUT_MS)
4. was_limited - Uses LIMIT+1 fetch for accurate detection
5. used_fallback - Tracks when fallback query was used
============================================================
"""

import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from contextlib import contextmanager
from sqlalchemy import text

logger = logging.getLogger(__name__)

# =============================================================================
# Safety Constants
# =============================================================================

MAX_QUERY_LIMIT = 100        # Hard limit: never return more than this
QUERY_TIMEOUT_MS = 5000      # 5 seconds max per query
DEFAULT_LIMIT = 50           # Default if handler doesn't specify


# =============================================================================
# Query Result
# =============================================================================

@dataclass
class QueryResult:
    """Result from database query"""
    success: bool
    data: List[Dict[str, Any]]
    error: Optional[str] = None
    row_count: int = 0
    was_limited: bool = False    # True if results were truncated (accurate via LIMIT+1)
    used_fallback: bool = False  # True if fallback query was used (Risk M)


# =============================================================================
# Safety Validation
# =============================================================================

def _validate_params(params: Dict[str, Any]) -> Optional[str]:
    """
    Validate query parameters.

    Returns error message if validation fails, None if OK.
    """
    # GUARD 1: project_id is REQUIRED
    if "project_id" not in params:
        return "Missing required parameter: project_id"

    if not params["project_id"]:
        return "project_id cannot be empty"

    return None


def _wrap_with_outer_limit(sql: str, effective_limit: int) -> str:
    """
    Wrap query with outer LIMIT to guarantee row cap.

    IMPORTANT (Risk I completeness):
    Even if inner SQL has LIMIT 10000, outer wrapper enforces our cap.

    Pattern: SELECT * FROM ( <original SQL> ) AS q LIMIT :effective_limit

    We use LIMIT+1 to accurately detect truncation.
    """
    # Remove trailing semicolon if present
    sql_clean = sql.rstrip().rstrip(';')

    # Wrap with outer SELECT to enforce limit
    # Use effective_limit + 1 to detect truncation accurately
    wrapped = f"SELECT * FROM ( {sql_clean} ) AS __limited_q LIMIT {effective_limit + 1}"

    logger.debug(f"Wrapped query with outer LIMIT {effective_limit + 1}")
    return wrapped


def _calculate_effective_limit(requested_limit: Optional[int]) -> int:
    """Calculate the effective limit to use."""
    if requested_limit is None:
        return DEFAULT_LIMIT
    return min(requested_limit, MAX_QUERY_LIMIT)


# =============================================================================
# Query Execution
# =============================================================================

@contextmanager
def _get_connection_with_timeout():
    """
    Get database connection with statement timeout set.
    """
    from database import get_session

    session = get_session()
    try:
        # Set statement timeout (PostgreSQL specific)
        session.execute(text(f"SET statement_timeout = {QUERY_TIMEOUT_MS}"))
        logger.debug(f"Set statement_timeout = {QUERY_TIMEOUT_MS}ms")
        yield session
    finally:
        # Reset timeout and close
        try:
            session.execute(text("SET statement_timeout = 0"))
            logger.debug("Reset statement_timeout to 0")
        except Exception as e:
            logger.warning(f"Failed to reset statement_timeout: {e}")
        session.close()


def execute_query(
    sql: str,
    params: Dict[str, Any],
    limit: Optional[int] = None,
) -> QueryResult:
    """
    Execute a parameterized SQL query safely.

    Args:
        sql: SQL query with :param placeholders
        params: Parameter dict (MUST include project_id)
        limit: Optional row limit (capped at MAX_QUERY_LIMIT)

    Returns:
        QueryResult with data or error

    Safety:
        - project_id is REQUIRED (returns error if missing)
        - LIMIT is enforced via outer wrapper (always effective)
        - TIMEOUT is set (QUERY_TIMEOUT_MS)
        - was_limited uses LIMIT+1 pattern for accuracy
    """
    # GUARD 1: Validate parameters
    validation_error = _validate_params(params)
    if validation_error:
        logger.error(f"Query validation failed: {validation_error}")
        return QueryResult(success=False, data=[], error=validation_error)

    # GUARD 2: Calculate effective limit
    effective_limit = _calculate_effective_limit(limit)

    # GUARD 3: Wrap with outer LIMIT (guarantees limit works even with inner LIMIT)
    wrapped_sql = _wrap_with_outer_limit(sql, effective_limit)

    try:
        # GUARD 4: Execute with timeout
        with _get_connection_with_timeout() as session:
            result = session.execute(text(wrapped_sql), params)

            # ============================================================
            # CRITICAL (Risk 2): Use mappings().all() for reliable dict conversion
            # This is more portable across SQLAlchemy versions than
            # result.keys() + zip pattern.
            # ============================================================
            data = [dict(row) for row in result.mappings().all()]

            # ============================================================
            # CRITICAL (Risk L): Accurate was_limited detection
            # We fetched LIMIT+1 rows. If we got exactly limit+1,
            # there's more data. Drop the extra row.
            # ============================================================
            was_limited = len(data) > effective_limit
            if was_limited:
                data = data[:effective_limit]
                logger.debug(f"Query result truncated to {effective_limit} rows")

            return QueryResult(
                success=True,
                data=data,
                row_count=len(data),
                was_limited=was_limited,
            )

    except Exception as e:
        error_msg = str(e)

        # Check for timeout
        if "statement timeout" in error_msg.lower():
            logger.error(f"Query timeout after {QUERY_TIMEOUT_MS}ms")
            return QueryResult(
                success=False,
                data=[],
                error=f"Query timeout ({QUERY_TIMEOUT_MS}ms exceeded)",
            )

        logger.error(f"Query execution failed: {e}")
        return QueryResult(success=False, data=[], error=error_msg)


def execute_query_with_fallback(
    sql: str,
    params: Dict[str, Any],
    fallback_sql: Optional[str] = None,
    limit: Optional[int] = None,
) -> QueryResult:
    """
    Execute query with optional fallback for schema mismatches.

    GRACEFUL DEGRADATION (Risk J):
    - If primary query fails (e.g., column doesn't exist), try fallback
    - If fallback also fails, return empty result with error in warnings
    - NEVER crash the handler

    MONITORING (Risk M):
    - Sets used_fallback=True when fallback query was used
    - Also adds warning for logging/monitoring
    """
    result = execute_query(sql, params, limit)

    if not result.success and fallback_sql:
        logger.info(f"Primary query failed ({result.error}), trying fallback")
        result = execute_query(fallback_sql, params, limit)

        if result.success:
            logger.info("Fallback query succeeded")
            # Mark that fallback was used (Risk M: tracking)
            result.used_fallback = True

    return result
```

---

### 6.6 intent_handlers.py (NEW FILE) - With Graceful Degradation

**Location**: `/llm-service/intent_handlers.py`

**Key Features**:

- Uses `db_query.py` with safety guards
- Minimal fields only (no description/sensitive data)
- KST week calculation in Python using `datetime` objects
- **Graceful degradation with `error_code`** (Risk J, K)
- **Week boundary uses `< next_start` pattern** (Risk 5)

```python
"""
Intent-specific handlers for AI Assistant.

Each handler:
1. Queries data via db_query.py (with safety guards)
2. Returns minimal fields (title/status only, no description)
3. Builds ResponseContract for rendering
4. GRACEFULLY DEGRADES on errors (returns empty result + error_code)

============================================================
GRACEFUL DEGRADATION STRATEGY (Risk J)
============================================================
- If query fails: return empty data + error_code + warning message
- If schema mismatch: try fallback query, then empty + warning
- NEVER crash or raise exception to caller
- Always return valid ResponseContract with error_code set
============================================================
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional  # <-- CRITICAL (Risk 1): List import required!
from dataclasses import dataclass, field
import pytz

from response_contract import ResponseContract, ErrorCode
from db_query import execute_query, execute_query_with_fallback, QueryResult

logger = logging.getLogger(__name__)

# KST timezone for week calculations
KST = pytz.timezone('Asia/Seoul')


# =============================================================================
# Handler Context
# =============================================================================

@dataclass
class HandlerContext:
    """Context passed to all handlers"""
    project_id: str
    user_access_level: int = 6  # Default: MEMBER (lowest)
    user_role: str = "MEMBER"
    message: str = ""


# =============================================================================
# Helper: KST Week Boundaries (Risk 5 - Proper datetime handling)
# =============================================================================

def get_kst_week_boundaries() -> tuple[datetime, datetime]:
    """
    Calculate this week's start (Monday 00:00) and next week start in KST.

    Returns:
        (week_start_dt, next_week_start_dt) as datetime objects

    IMPORTANT (Risk 5):
    - Returns datetime objects, not strings
    - Use `due_date >= start AND due_date < next_start` pattern
    - This avoids edge cases with 23:59:59 or TIMESTAMP precision
    """
    now_kst = datetime.now(KST)

    # Monday of this week at 00:00:00
    days_since_monday = now_kst.weekday()
    monday = now_kst - timedelta(days=days_since_monday)
    week_start = monday.replace(hour=0, minute=0, second=0, microsecond=0)

    # Monday of next week at 00:00:00 (exclusive boundary)
    next_week_start = week_start + timedelta(days=7)

    return week_start, next_week_start


def get_kst_week_boundaries_str() -> tuple[str, str]:
    """
    Get week boundaries as formatted strings for display.

    Returns:
        (start_str, end_str) as 'YYYY-MM-DD' strings
    """
    week_start, next_week_start = get_kst_week_boundaries()
    # End date for display is Sunday (day before next_week_start)
    week_end = next_week_start - timedelta(days=1)
    return week_start.strftime('%Y-%m-%d'), week_end.strftime('%Y-%m-%d')


# =============================================================================
# Helper: Create Error Response (Graceful Degradation)
# =============================================================================

def _create_error_response(
    intent: str,
    project_id: str,
    error_message: str,
    error_code: str,  # <-- CRITICAL (Risk K): Structured error code
    tips: List[str],
) -> ResponseContract:
    """
    Create a graceful error response instead of crashing.

    GRACEFUL DEGRADATION: Returns valid contract with error_code.

    Args:
        intent: The intent type
        project_id: Project context
        error_message: Human-readable error description
        error_code: Structured error code from ErrorCode class
        tips: Actionable next steps
    """
    return ResponseContract(
        intent=intent,
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {project_id}",
        data={},
        warnings=[f"데이터 조회 실패: {error_message}"],
        tips=tips,
        error_code=error_code,  # <-- Use structured code, not string matching
    )


# =============================================================================
# BACKLOG_LIST Handler
# =============================================================================

def handle_backlog_list(ctx: HandlerContext) -> ResponseContract:
    """
    Handle backlog list queries.

    Output: title, status, priority, story_points only
    NO description (privacy concern)

    GRACEFUL DEGRADATION:
    - Primary query fails → try fallback (no priority column)
    - Fallback fails → return empty with error_code
    """
    logger.info(f"[BACKLOG_LIST] project={ctx.project_id}")

    try:
        # Query with fallback for schema variations
        result = execute_query_with_fallback(
            sql="""
                SELECT id, title, status, priority, story_points
                FROM user_story
                WHERE project_id = :project_id
                  AND (sprint_id IS NULL
                       OR status IN ('IDEA', 'REFINED', 'READY', 'BACKLOG'))
                ORDER BY
                    CASE priority
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END,
                    created_at DESC
            """,
            params={"project_id": ctx.project_id},
            fallback_sql="""
                SELECT id, title, status, story_points
                FROM user_story
                WHERE project_id = :project_id
                  AND (sprint_id IS NULL
                       OR status IN ('IDEA', 'REFINED', 'READY', 'BACKLOG'))
                ORDER BY created_at DESC
            """,
            limit=20,
        )

        if not result.success:
            # GRACEFUL DEGRADATION: Return error response with error_code
            return _create_error_response(
                intent="backlog_list",
                project_id=ctx.project_id,
                error_message=result.error or "Unknown error",
                error_code=ErrorCode.DB_QUERY_FAILED,
                tips=[
                    "'백로그 관리' 메뉴에서 스토리 추가",
                    "관리자에게 데이터베이스 연결 확인 요청",
                ],
            )

        items = result.data

        # Track if fallback was used (Risk M)
        error_code = ErrorCode.FALLBACK_USED if result.used_fallback else None

    except Exception as e:
        # GRACEFUL DEGRADATION: Catch any unexpected error
        logger.exception(f"Unexpected error in handle_backlog_list: {e}")
        return _create_error_response(
            intent="backlog_list",
            project_id=ctx.project_id,
            error_message=str(e),
            error_code=ErrorCode.DB_QUERY_FAILED,
            tips=["시스템 관리자에게 문의해주세요"],
        )

    warnings = []
    if not items:
        warnings.append("등록된 백로그 항목이 없습니다")
    if result.used_fallback:
        warnings.append("일부 컬럼 정보가 제한되었습니다 (fallback query)")

    return ResponseContract(
        intent="backlog_list",
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {ctx.project_id}",
        data={"items": items, "count": len(items), "was_limited": result.was_limited},
        warnings=warnings,
        tips=[
            "'백로그 관리' 메뉴에서 스토리 추가",
            "우선순위 설정으로 백로그 정렬",
            "준비되면 스프린트로 이동",
        ] if not items else [],
        error_code=error_code,
    )


# =============================================================================
# SPRINT_PROGRESS Handler
# =============================================================================

def handle_sprint_progress(ctx: HandlerContext) -> ResponseContract:
    """
    Handle sprint progress queries.

    Output: sprint name, goal, dates, story counts by status
    NO assignee details (privacy concern)
    """
    logger.info(f"[SPRINT_PROGRESS] project={ctx.project_id}")

    try:
        # Query active sprint
        sprint_result = execute_query(
            """
            SELECT id, name, status, start_date, end_date, goal
            FROM sprint
            WHERE project_id = :project_id AND status = 'ACTIVE'
            ORDER BY start_date DESC
            """,
            {"project_id": ctx.project_id},
            limit=1,
        )

        if not sprint_result.success:
            return _create_error_response(
                intent="sprint_progress",
                project_id=ctx.project_id,
                error_message=sprint_result.error or "Unknown error",
                error_code=ErrorCode.DB_QUERY_FAILED,
                tips=["'스프린트 관리' 메뉴에서 스프린트 생성"],
            )

        sprint = sprint_result.data[0] if sprint_result.data else None

        stories = []
        metrics = {"total": 0, "done": 0, "in_progress": 0, "completion_rate": 0}

        if sprint:
            # Query stories in sprint (minimal fields)
            story_result = execute_query(
                """
                SELECT id, title, status, story_points
                FROM user_story
                WHERE sprint_id = :sprint_id
                """,
                {"sprint_id": sprint["id"], "project_id": ctx.project_id},
            )
            stories = story_result.data if story_result.success else []

            # Calculate metrics
            total = len(stories)
            done = sum(1 for s in stories if s.get("status") == "DONE")
            in_progress = sum(1 for s in stories if s.get("status") == "IN_PROGRESS")
            metrics = {
                "total": total,
                "done": done,
                "in_progress": in_progress,
                "completion_rate": (done / total * 100) if total > 0 else 0,
            }

    except Exception as e:
        logger.exception(f"Unexpected error in handle_sprint_progress: {e}")
        return _create_error_response(
            intent="sprint_progress",
            project_id=ctx.project_id,
            error_message=str(e),
            error_code=ErrorCode.DB_QUERY_FAILED,
            tips=["시스템 관리자에게 문의해주세요"],
        )

    return ResponseContract(
        intent="sprint_progress",
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {ctx.project_id}" + (f", 스프린트: {sprint['name']}" if sprint else ""),
        data={
            "sprint": sprint,
            "stories": stories,
            "metrics": metrics,
        },
        warnings=[] if sprint else ["활성 스프린트가 없습니다"],
        tips=[
            "'스프린트 관리'에서 스프린트 생성 및 시작",
            "백로그 항목을 스프린트로 이동",
            "스프린트 목표 설정으로 팀 정렬",
        ] if not sprint else [],
    )


# =============================================================================
# TASK_DUE_THIS_WEEK Handler
# =============================================================================

def handle_tasks_due_this_week(ctx: HandlerContext) -> ResponseContract:
    """
    Handle tasks due this week queries.

    IMPORTANT (Risk 5): Week boundaries calculated in Python (KST).
    Uses datetime objects with < next_start pattern for accuracy.
    """
    logger.info(f"[TASK_DUE_THIS_WEEK] project={ctx.project_id}")

    try:
        # Calculate KST week boundaries as datetime
        week_start_dt, next_week_start_dt = get_kst_week_boundaries()

        # Get string versions for display
        week_start_str, week_end_str = get_kst_week_boundaries_str()

        result = execute_query_with_fallback(
            sql="""
                SELECT t.id, t.title, t.status, t.due_date,
                       us.title as story_title
                FROM task t
                LEFT JOIN user_story us ON t.user_story_id = us.id
                WHERE t.project_id = :project_id
                  AND t.due_date >= :week_start
                  AND t.due_date < :next_week_start
                  AND t.status != 'DONE'
                ORDER BY t.due_date ASC
            """,
            params={
                "project_id": ctx.project_id,
                "week_start": week_start_dt,          # datetime object
                "next_week_start": next_week_start_dt,  # datetime object (exclusive)
            },
            fallback_sql="""
                SELECT id, title, status, due_date
                FROM task
                WHERE project_id = :project_id
                  AND due_date >= :week_start
                  AND due_date < :next_week_start
                  AND status != 'DONE'
                ORDER BY due_date ASC
            """,
            limit=30,
        )

        if not result.success:
            return _create_error_response(
                intent="task_due_this_week",
                project_id=ctx.project_id,
                error_message=result.error or "Unknown error",
                error_code=ErrorCode.DB_QUERY_FAILED,
                tips=["태스크 생성 시 마감일(due_date) 설정"],
            )

        tasks = result.data

        # Track fallback usage
        error_code = ErrorCode.FALLBACK_USED if result.used_fallback else None

    except Exception as e:
        logger.exception(f"Unexpected error in handle_tasks_due_this_week: {e}")
        return _create_error_response(
            intent="task_due_this_week",
            project_id=ctx.project_id,
            error_message=str(e),
            error_code=ErrorCode.DB_QUERY_FAILED,
            tips=["시스템 관리자에게 문의해주세요"],
        )

    warnings = []
    if not tasks:
        warnings.append("이번 주 마감 태스크가 없습니다")
    if result.used_fallback:
        warnings.append("일부 정보가 제한되었습니다 (fallback query)")

    return ResponseContract(
        intent="task_due_this_week",
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {ctx.project_id}, 기간: {week_start_str} ~ {week_end_str}",
        data={"tasks": tasks, "count": len(tasks), "was_limited": result.was_limited},
        warnings=warnings,
        tips=[
            "태스크 생성 시 마감일(due_date) 설정",
            "칸반 보드에서 태스크 진행 관리",
            "정기적으로 지연 태스크 검토",
        ] if not tasks else [],
        error_code=error_code,
    )


# =============================================================================
# RISK_ANALYSIS Handler
# =============================================================================

def handle_risk_analysis(ctx: HandlerContext) -> ResponseContract:
    """
    Handle risk analysis queries.

    Output: title, severity, status only
    NO description (may contain sensitive info)

    NOTE: If issue table doesn't have type/severity columns,
    falls back to title-based filtering only.
    """
    logger.info(f"[RISK_ANALYSIS] project={ctx.project_id}")

    try:
        result = execute_query_with_fallback(
            sql="""
                SELECT id, title, severity, status, created_at
                FROM issue
                WHERE project_id = :project_id
                  AND (
                      type = 'RISK'
                      OR LOWER(title) LIKE '%risk%'
                      OR LOWER(title) LIKE '%위험%'
                      OR LOWER(title) LIKE '%리스크%'
                  )
                  AND status != 'CLOSED'
                ORDER BY
                    CASE severity
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END,
                    created_at DESC
            """,
            params={"project_id": ctx.project_id},
            fallback_sql="""
                SELECT id, title, status, created_at
                FROM issue
                WHERE project_id = :project_id
                  AND (
                      LOWER(title) LIKE '%risk%'
                      OR LOWER(title) LIKE '%위험%'
                      OR LOWER(title) LIKE '%리스크%'
                  )
                  AND status != 'CLOSED'
                ORDER BY created_at DESC
            """,
            limit=10,
        )

        if not result.success:
            return _create_error_response(
                intent="risk_analysis",
                project_id=ctx.project_id,
                error_message=result.error or "Unknown error",
                error_code=ErrorCode.DB_QUERY_FAILED,
                tips=["'이슈 관리'에서 type=RISK로 리스크 등록"],
            )

        risks = result.data

        # Group by severity (if available)
        by_severity = {}
        for risk in risks:
            sev = risk.get("severity", "UNKNOWN")
            if sev not in by_severity:
                by_severity[sev] = []
            by_severity[sev].append(risk)

        # Track fallback usage
        error_code = ErrorCode.FALLBACK_USED if result.used_fallback else None

    except Exception as e:
        logger.exception(f"Unexpected error in handle_risk_analysis: {e}")
        return _create_error_response(
            intent="risk_analysis",
            project_id=ctx.project_id,
            error_message=str(e),
            error_code=ErrorCode.DB_QUERY_FAILED,
            tips=["시스템 관리자에게 문의해주세요"],
        )

    warnings = []
    if not risks:
        warnings.append("등록된 리스크가 없습니다")
    if result.used_fallback:
        warnings.append("일부 컬럼 정보가 제한되었습니다 (fallback query)")

    return ResponseContract(
        intent="risk_analysis",
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {ctx.project_id}",
        data={
            "risks": risks,
            "count": len(risks),
            "by_severity": by_severity,
            "was_limited": result.was_limited,
        },
        warnings=warnings,
        tips=[
            "'이슈 관리'에서 type=RISK로 리스크 등록",
            "심각도(CRITICAL/HIGH/MEDIUM/LOW) 설정으로 우선순위 지정",
            "각 리스크에 담당자와 완화 계획 할당",
            "주간 회의에서 리스크 검토",
        ] if not risks else [
            "정기적으로 리스크 상태 업데이트",
            "고위험 항목에 완화 계획 확인",
        ],
        error_code=error_code,
    )


# =============================================================================
# CASUAL Handler
# =============================================================================

def handle_casual(ctx: HandlerContext) -> ResponseContract:
    """Handle casual greetings - no DB query needed"""
    return ResponseContract(
        intent="casual",
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope="",
        data={"greeting": True},
        warnings=[],
        tips=[],
    )


# =============================================================================
# UNKNOWN Handler (fallback to RAG)
# =============================================================================

def handle_unknown(ctx: HandlerContext) -> ResponseContract:
    """
    Handle unknown intents.

    Returns a contract that signals "use RAG/document_query".
    This is NOT rendered directly - it triggers the document_query path.
    """
    return ResponseContract(
        intent="unknown",
        reference_time=datetime.now(KST).strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {ctx.project_id}",
        data={"requires_rag": True},
        warnings=[],
        tips=[],
    )


# =============================================================================
# Handler Registry
# =============================================================================

# IMPORTANT: Keys are lowercase snake_case (AnswerType.value)
INTENT_HANDLERS = {
    "backlog_list": handle_backlog_list,
    "sprint_progress": handle_sprint_progress,
    "task_due_this_week": handle_tasks_due_this_week,
    "risk_analysis": handle_risk_analysis,
    "casual": handle_casual,
    "unknown": handle_unknown,
    # STATUS_* intents are NOT in this registry
    # They use existing StatusResponseContract path
}


def get_handler(intent: str):
    """
    Get handler function for given intent.

    Args:
        intent: Intent key (lowercase snake_case, e.g., "backlog_list")

    Returns:
        Handler function, or None if not found

    NOTE: Returns None for uppercase keys (strict mode).
    Caller should normalize before calling.
    """
    return INTENT_HANDLERS.get(intent)


def has_dedicated_handler(intent: str) -> bool:
    """Check if intent has a dedicated handler (vs status engine)"""
    return intent in INTENT_HANDLERS
```

---

### 6.7 response_renderer.py (NEW FILE)

**Location**: `/llm-service/response_renderer.py`

**Key Changes**:

- Renders ONLY non-status intents
- STATUS_* uses existing StatusResponseContract.to_text()
- **Error detection via `error_code` field** (Risk K)

```python
"""
Intent-aware response renderer.

IMPORTANT:
- This renders NON-STATUS intents only
- STATUS_METRIC/STATUS_LIST use existing StatusResponseContract.to_text()
- This separation prevents conflicts with existing status logic
- Error detection uses contract.error_code, NOT string matching
"""

import logging
from typing import List
from response_contract import ResponseContract

logger = logging.getLogger(__name__)


# =============================================================================
# Main Renderer
# =============================================================================

def render(contract: ResponseContract) -> str:
    """
    Render ResponseContract to text based on intent.

    Args:
        contract: ResponseContract with data

    Returns:
        Formatted text for user

    NOTE: STATUS_* intents should NOT reach here.
    They use StatusResponseContract.to_text() directly.
    """
    intent = contract.intent.lower()

    renderers = {
        "backlog_list": render_backlog_list,
        "sprint_progress": render_sprint_progress,
        "task_due_this_week": render_tasks_due_this_week,
        "risk_analysis": render_risk_analysis,
        "casual": render_casual,
    }

    renderer = renderers.get(intent, render_default)
    return renderer(contract)


# =============================================================================
# Intent-Specific Renderers
# =============================================================================

def render_backlog_list(contract: ResponseContract) -> str:
    """Render backlog list with priority grouping"""
    lines = []

    # Header (distinct from Project Status)
    lines.append(f"📋 **제품 백로그** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # ============================================================
    # CRITICAL (Risk K): Use error_code, NOT string matching
    # ============================================================
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    items = contract.data.get("items", [])
    count = contract.data.get("count", 0)

    if items:
        lines.append(f"**전체 항목**: {count}건")
        if contract.data.get("was_limited"):
            lines.append(f"_(더 많은 항목이 있을 수 있습니다)_")
        lines.append("")

        # Group by priority
        by_priority = {}
        for item in items:
            prio = item.get("priority", "MEDIUM")
            if prio not in by_priority:
                by_priority[prio] = []
            by_priority[prio].append(item)

        priority_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        priority_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}

        for prio in priority_order:
            if prio in by_priority:
                emoji = priority_emoji.get(prio, "⚪")
                lines.append(f"{emoji} **{prio}** ({len(by_priority[prio])}건)")
                for item in by_priority[prio][:5]:
                    title = item.get("title", "Untitled")[:50]
                    points = item.get("story_points", "-")
                    status = _translate_status(item.get("status"))
                    lines.append(f"  - {title} ({points}pts, {status})")
                lines.append("")
    else:
        lines.append("현재 등록된 백로그 항목이 없습니다.")
        lines.append("")

    # Show non-error warnings (e.g., fallback used)
    for warning in contract.warnings:
        if "데이터 조회 실패" not in warning:
            lines.append(f"ℹ️ {warning}")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_sprint_progress(contract: ResponseContract) -> str:
    """Render sprint progress with completion bar"""
    lines = []

    lines.append(f"🏃 **스프린트 현황** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    sprint = contract.data.get("sprint")
    metrics = contract.data.get("metrics", {})
    stories = contract.data.get("stories", [])

    if sprint:
        lines.append(f"**스프린트**: {sprint.get('name')}")
        if sprint.get("goal"):
            lines.append(f"**목표**: {sprint.get('goal')}")
        lines.append(f"**기간**: {sprint.get('start_date')} ~ {sprint.get('end_date')}")
        lines.append("")

        # Metrics
        total = metrics.get("total", 0)
        done = metrics.get("done", 0)
        in_progress = metrics.get("in_progress", 0)
        rate = metrics.get("completion_rate", 0)

        lines.append(f"**완료율**: {rate:.1f}% ({done}/{total} 완료)")
        lines.append(f"**진행 중**: {in_progress}건")
        lines.append("")

        # Progress bar
        filled = int(rate / 10)
        bar = "█" * filled + "░" * (10 - filled)
        lines.append(f"[{bar}] {rate:.0f}%")
        lines.append("")

        # Story breakdown by status
        if stories:
            status_counts = {}
            for story in stories:
                status = story.get("status", "UNKNOWN")
                status_counts[status] = status_counts.get(status, 0) + 1

            lines.append("**상태별 분포**:")
            for status, cnt in sorted(status_counts.items()):
                status_kr = _translate_status(status)
                lines.append(f"  - {status_kr}: {cnt}건")
            lines.append("")
    else:
        lines.append("활성 스프린트가 없습니다.")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_tasks_due_this_week(contract: ResponseContract) -> str:
    """Render tasks grouped by due date"""
    lines = []

    lines.append(f"📅 **이번 주 마감 태스크** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    tasks = contract.data.get("tasks", [])
    count = contract.data.get("count", 0)

    if tasks:
        lines.append(f"**마감 예정**: {count}건")
        if contract.data.get("was_limited"):
            lines.append(f"_(더 많은 항목이 있을 수 있습니다)_")
        lines.append("")

        # Group by due date
        by_date = {}
        for task in tasks:
            due = str(task.get("due_date", "Unknown"))[:10]
            if due not in by_date:
                by_date[due] = []
            by_date[due].append(task)

        for date in sorted(by_date.keys()):
            lines.append(f"**{date}** ({len(by_date[date])}건)")
            for task in by_date[date]:
                title = task.get("title", "Untitled")[:40]
                status = _translate_status(task.get("status"))
                story = task.get("story_title", "")
                lines.append(f"  - [{status}] {title}")
                if story:
                    lines.append(f"    └─ 스토리: {story[:20]}")
            lines.append("")
    else:
        lines.append("이번 주 마감 예정인 태스크가 없습니다.")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_risk_analysis(contract: ResponseContract) -> str:
    """Render risks grouped by severity"""
    lines = []

    lines.append(f"⚠️ **리스크 분석** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    risks = contract.data.get("risks", [])
    count = contract.data.get("count", 0)
    by_severity = contract.data.get("by_severity", {})

    if risks:
        lines.append(f"**활성 리스크**: {count}건")
        if contract.data.get("was_limited"):
            lines.append(f"_(더 많은 항목이 있을 수 있습니다)_")
        lines.append("")

        severity_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢", "UNKNOWN": "⚪"}
        severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]

        for sev in severity_order:
            if sev in by_severity and by_severity[sev]:
                emoji = severity_emoji.get(sev, "⚪")
                sev_risks = by_severity[sev]
                lines.append(f"{emoji} **{sev}** ({len(sev_risks)}건)")
                for risk in sev_risks[:3]:
                    title = risk.get("title", "Untitled")[:50]
                    status = _translate_status(risk.get("status"))
                    lines.append(f"  - {title} ({status})")
                lines.append("")

        # Summary alert
        critical_count = len(by_severity.get("CRITICAL", []))
        high_count = len(by_severity.get("HIGH", []))
        if critical_count > 0:
            lines.append(f"🚨 **주의**: {critical_count}건의 심각한 리스크가 즉각 조치 필요")
        elif high_count > 0:
            lines.append(f"⚠️ **참고**: {high_count}건의 고위험 항목 검토 필요")
        lines.append("")
    else:
        lines.append("등록된 활성 리스크가 없습니다.")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_casual(contract: ResponseContract) -> str:
    """Render casual greeting"""
    return (
        "안녕하세요! PMS 어시스턴트입니다 😊\n"
        "프로젝트 일정, 백로그, 리스크, 이슈 등 무엇이든 물어보세요!"
    )


def render_default(contract: ResponseContract) -> str:
    """Default fallback - should rarely be used"""
    lines = []
    lines.append(f"📝 **응답** (기준: {contract.reference_time})")
    if contract.scope:
        lines.append(f"📍 {contract.scope}")
    lines.append("")

    if contract.has_data():
        lines.append("데이터를 조회했습니다.")
    else:
        lines.append("요청하신 정보를 찾을 수 없습니다.")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


# =============================================================================
# Helpers
# =============================================================================

def _append_tips(lines: List[str], tips: List[str]) -> None:
    """Append tips section if tips exist"""
    if tips:
        lines.append("")
        lines.append("💡 **다음 단계**:")
        for tip in tips:
            lines.append(f"  - {tip}")
        lines.append("")


def _translate_status(status: str | None) -> str:
    """Translate status to Korean"""
    if not status:
        return "알 수 없음"

    translations = {
        "IDEA": "아이디어",
        "REFINED": "정제됨",
        "READY": "준비됨",
        "BACKLOG": "백로그",
        "IN_SPRINT": "스프린트 내",
        "IN_PROGRESS": "진행 중",
        "REVIEW": "검토 중",
        "DONE": "완료",
        "CANCELLED": "취소됨",
        "BLOCKED": "차단됨",
        "OPEN": "열림",
        "CLOSED": "닫힘",
        "TODO": "할 일",
    }

    return translations.get(status.upper(), status)
```

---

### 6.8 chat_workflow_v2.py Modifications

**Location**: `/llm-service/chat_workflow_v2.py`

**Key Changes**:

- **Single state key**: `state["intent"]` only
- Normalization at router entry point
- UNKNOWN → `document_query`, NOT `status_query`
- STATUS_* intents use existing path

**IMPORTANT (Risk 10)**: Verify that node names in conditional edges match exactly with actual graph node definitions.

```python
# =============================================================================
# Add imports at top of file
# =============================================================================

from intent_handlers import (
    get_handler,
    has_dedicated_handler,
    HandlerContext,
    INTENT_HANDLERS
)
from response_renderer import render as render_intent_response


# =============================================================================
# Intent Normalization (Strict Mode)
# =============================================================================

def _normalize_intent(raw_intent: str) -> str:
    """
    Normalize intent to lowercase snake_case.

    STRICT MODE: Normalizes and logs warning if needed.
    """
    if not raw_intent:
        return "unknown"

    normalized = raw_intent.lower().strip()

    if normalized != raw_intent:
        logger.warning(
            f"Intent normalization applied: '{raw_intent}' -> '{normalized}'. "
            "Upstream should return lowercase."
        )

    return normalized


# =============================================================================
# Modify: Store intent as SINGLE KEY (Risk H)
# =============================================================================

def _classify_answer_type_node(self, state: TwoTrackState) -> TwoTrackState:
    """Classify the answer type for routing"""
    # ... existing code ...

    result = classifier.classify(message)

    # ============================================================
    # CRITICAL: Single state key - use "intent" ONLY
    # DO NOT use "answer_type" for routing decisions
    # ============================================================
    intent_value = result.answer_type.value  # e.g., "backlog_list"
    state["intent"] = intent_value

    # Optional: keep answer_type as read-only alias for legacy compatibility
    # But NEVER read from this for routing decisions
    state["answer_type"] = intent_value  # Alias only, DO NOT USE

    state["answer_type_confidence"] = result.confidence
    state["debug_info"]["classifier_result"] = {
        "intent": intent_value,
        "confidence": result.confidence,
        "matched_patterns": result.matched_patterns,
    }

    logger.info(f"Classified intent: {intent_value} (confidence: {result.confidence})")

    return state


# =============================================================================
# Modify: Routing logic with normalization
# =============================================================================

def _route_after_answer_type(self, state: TwoTrackState) -> str:
    """
    Route based on answer type classification.

    Routing rules:
    1. casual → casual_response
    2. Dedicated handler exists → intent_handler
    3. status_metric/status_list → status_query (existing path)
    4. unknown/howto → document_query (RAG) - NOT status!

    IMPORTANT:
    - Reads from state["intent"] ONLY
    - Normalizes at entry (strict mode)

    CRITICAL (Risk 10): Return values MUST match actual graph node names exactly.
    Verify these match your graph builder:
    - "casual_response"
    - "intent_handler"
    - "execute_status_query" (or whatever your status node is named)
    - "document_query"
    """
    # Get and normalize intent (single normalization point)
    raw_intent = state.get("intent", "unknown")
    intent = _normalize_intent(raw_intent)
    state["intent"] = intent  # Store normalized value back

    logger.debug(f"Routing intent: {intent}")

    # 1. Casual: direct response
    if intent == "casual":
        return "casual_response"

    # 2. Dedicated handlers (backlog, sprint, task, risk)
    if has_dedicated_handler(intent):
        return "intent_handler"

    # 3. Status queries: use existing status engine
    if intent in ("status_metric", "status_list"):
        return "execute_status_query"  # <-- VERIFY this matches your actual node name

    # 4. CRITICAL: Unknown/howto → RAG, NOT status
    # This prevents regression to "all questions → status template"
    logger.info(f"Intent '{intent}' routed to document_query (RAG)")
    return "document_query"


# =============================================================================
# Add: Intent handler node
# =============================================================================

def _execute_intent_handler_node(self, state: TwoTrackState) -> TwoTrackState:
    """
    Execute intent-specific handler.

    For: backlog_list, sprint_progress, task_due_this_week, risk_analysis
    """
    start_time = time.time()

    # Read from state["intent"] ONLY
    intent = state.get("intent", "unknown")
    project_id = state.get("project_id")
    user_access_level = state.get("user_access_level", 6)
    user_role = state.get("user_role", "MEMBER")
    message = state.get("message", "")

    # Create handler context
    ctx = HandlerContext(
        project_id=project_id,
        user_access_level=user_access_level,
        user_role=user_role,
        message=message,
    )

    # Get handler
    handler = get_handler(intent)

    if handler is None:
        # Should not happen if routing is correct
        logger.error(f"No handler for intent: {intent}")
        state["response"] = "요청을 처리할 수 없습니다."
        return state

    # Execute handler (graceful degradation built into handlers)
    contract = handler(ctx)

    # Render response using intent-specific renderer
    response_text = render_intent_response(contract)

    # Update state
    state["response"] = response_text
    state["confidence"] = 0.95 if contract.has_data() else 0.7
    state["metrics"]["handler_time_ms"] = (time.time() - start_time) * 1000
    state["debug_info"]["handler"] = intent
    state["debug_info"]["has_data"] = contract.has_data()
    state["debug_info"]["error_code"] = contract.error_code  # Track errors

    logger.info(f"Intent handler executed: {intent}, has_data={contract.has_data()}")

    return state


# =============================================================================
# Modify: Graph builder to include intent_handler node
# =============================================================================

def _build_graph(self) -> CompiledGraph:
    """Build the LangGraph workflow"""

    # ... existing node additions ...

    # Add intent handler node
    graph.add_node("intent_handler", self._execute_intent_handler_node)

    # ... existing edge definitions ...

    # ============================================================
    # CRITICAL (Risk 10): Verify these node names match EXACTLY
    # with your actual node definitions above.
    # ============================================================
    graph.add_conditional_edges(
        "classify_answer_type",
        self._route_after_answer_type,
        {
            "casual_response": "casual_response",
            "intent_handler": "intent_handler",
            "execute_status_query": "execute_status_query",  # <-- VERIFY
            "document_query": "document_query",
        }
    )

    # Intent handler goes to END
    graph.add_edge("intent_handler", END)

    # ... rest of graph building ...
```

---

## 7. Verification Tests

### 7.1 Classifier Tests (Regression Prevention)

```python
# test_answer_type_classifier.py

import pytest
from answer_type_classifier import AnswerTypeClassifier, AnswerType


@pytest.fixture
def classifier():
    return AnswerTypeClassifier()


class TestPriority1Intents:
    """Priority 1 intents should win over STATUS_*"""

    def test_backlog_list(self, classifier):
        cases = [
            "백로그에 뭐가 있어?",
            "제품 백로그 보여줘",
            "백로그 항목 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.BACKLOG_LIST, \
                f"Expected BACKLOG_LIST for '{msg}', got {result.answer_type}"

    def test_risk_analysis(self, classifier):
        cases = [
            "리스크 분석해줘",
            "현재 위험 요소가 뭐야",
            "프로젝트 리스크 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.RISK_ANALYSIS

    def test_sprint_progress(self, classifier):
        cases = [
            "현재 스프린트 진행 상황",
            "스프린트 진척률 알려줘",
            "스프린트 현황 보여줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.SPRINT_PROGRESS

    def test_task_due_this_week(self, classifier):
        """Combination rule: "이번 주" + task word"""
        cases = [
            "이번 주 마감 태스크",
            "이번주 해야 할 일",
            "금주 완료해야 할 작업",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.TASK_DUE_THIS_WEEK


class TestStatusListNotBlackHole:
    """STATUS_LIST should NOT absorb all "목록" queries"""

    def test_backlog_with_list_keyword(self, classifier):
        """'백로그 목록' should be BACKLOG_LIST, not STATUS_LIST"""
        result = classifier.classify("백로그 목록 보여줘")
        assert result.answer_type == AnswerType.BACKLOG_LIST
        assert result.answer_type != AnswerType.STATUS_LIST

    def test_risk_with_list_keyword(self, classifier):
        """'리스크 목록' should be RISK_ANALYSIS, not STATUS_LIST"""
        result = classifier.classify("리스크 목록")
        assert result.answer_type == AnswerType.RISK_ANALYSIS


class TestFallbackIsNotStatus:
    """Unknown intents should NOT fall back to STATUS_METRIC"""

    def test_ambiguous_question(self, classifier):
        """Ambiguous questions should be UNKNOWN, not STATUS_METRIC"""
        cases = [
            "이거 어떻게 생각해?",
            "그냥 궁금해서",
            "뭐라고 해야 하지",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.UNKNOWN, \
                f"Expected UNKNOWN for '{msg}', got {result.answer_type}"
            # CRITICAL: Must NOT be STATUS_METRIC
            assert result.answer_type != AnswerType.STATUS_METRIC


class TestCasualShortOnly:
    """CASUAL should only match short messages"""

    def test_short_greeting(self, classifier):
        result = classifier.classify("안녕")
        assert result.answer_type == AnswerType.CASUAL

    def test_long_with_greeting(self, classifier):
        """Long message with greeting word should NOT be CASUAL"""
        result = classifier.classify("안녕하세요 프로젝트 현황 알려주세요")
        assert result.answer_type != AnswerType.CASUAL
```

### 7.2 Renderer Tests (Header Differentiation)

```python
# test_response_renderer.py

import pytest
from response_contract import ResponseContract, ErrorCode
from response_renderer import render


class TestIntentHeaders:
    """Each intent must have a distinct header - REGRESSION TEST"""

    def test_backlog_header_not_status(self):
        """CRITICAL: Backlog must NOT have 📊 **프로젝트 현황** header"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"items": [], "count": 0},
        )
        result = render(contract)

        assert "📋 **제품 백로그**" in result
        # ============================================================
        # REGRESSION CHECK (Risk 7): Use FULL template string, not just emoji
        # This prevents false failures if data contains the emoji
        # ============================================================
        assert "📊 **프로젝트 현황**" not in result, \
            "REGRESSION: Status header in backlog response!"

    def test_sprint_header_not_status(self):
        """CRITICAL: Sprint must NOT have 📊 **프로젝트 현황** header"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"sprint": None, "stories": [], "metrics": {}},
        )
        result = render(contract)

        assert "🏃 **스프린트 현황**" in result
        assert "📊 **프로젝트 현황**" not in result, \
            "REGRESSION: Status header in sprint response!"

    def test_task_header_not_status(self):
        """CRITICAL: Task must NOT have 📊 **프로젝트 현황** header"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"tasks": [], "count": 0},
        )
        result = render(contract)

        assert "📅 **이번 주 마감 태스크**" in result
        assert "📊 **프로젝트 현황**" not in result, \
            "REGRESSION: Status header in task response!"

    def test_risk_header_not_status(self):
        """CRITICAL: Risk must NOT have 📊 **프로젝트 현황** header"""
        contract = ResponseContract(
            intent="risk_analysis",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"risks": [], "count": 0, "by_severity": {}},
        )
        result = render(contract)

        assert "⚠️ **리스크 분석**" in result
        assert "📊 **프로젝트 현황**" not in result, \
            "REGRESSION: Status header in risk response!"


class TestGracefulDegradation:
    """Renderer should handle error cases gracefully using error_code"""

    def test_error_response_uses_error_code(self):
        """Error contract should use error_code field, not string matching"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={},
            warnings=["데이터 조회 실패: Connection timeout"],
            tips=["관리자에게 문의"],
            error_code=ErrorCode.DB_QUERY_FAILED,  # <-- Use structured code
        )

        # Verify error detection works via error_code
        assert contract.has_error()

        result = render(contract)
        assert "⚠️" in result
        assert "데이터 조회 실패" in result
        assert "관리자에게 문의" in result

    def test_non_error_contract_has_no_error(self):
        """Contract without error_code should not be detected as error"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"items": [{"title": "Test"}], "count": 1},
        )

        assert not contract.has_error()


class TestTipsForEmptyData:
    """Tips should appear when data is empty"""

    def test_backlog_tips_when_empty(self):
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"items": [], "count": 0},
            tips=["'백로그 관리' 메뉴에서 스토리 추가"],
        )
        result = render(contract)

        assert "💡 **다음 단계**" in result
        assert "백로그 관리" in result


class TestWasLimitedDisplay:
    """was_limited should be displayed to user"""

    def test_was_limited_shows_message(self):
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="프로젝트: Test",
            data={"items": [{"title": "Test"}], "count": 1, "was_limited": True},
        )
        result = render(contract)

        assert "더 많은 항목이 있을 수 있습니다" in result
```

### 7.3 Routing & Handler Tests

```python
# test_intent_routing.py

import pytest
from intent_handlers import get_handler, has_dedicated_handler


class TestHandlerRegistry:
    """Handler registry must use lowercase keys only"""

    def test_lowercase_keys_work(self):
        """Lowercase keys should return handlers"""
        assert get_handler("backlog_list") is not None
        assert get_handler("sprint_progress") is not None
        assert get_handler("task_due_this_week") is not None
        assert get_handler("risk_analysis") is not None
        assert get_handler("casual") is not None
        assert get_handler("unknown") is not None

    def test_uppercase_keys_return_none(self):
        """STRICT MODE: Uppercase keys must return None"""
        assert get_handler("BACKLOG_LIST") is None
        assert get_handler("SPRINT_PROGRESS") is None
        assert get_handler("Backlog_List") is None

    def test_status_not_in_handlers(self):
        """STATUS_* must NOT be in INTENT_HANDLERS"""
        assert not has_dedicated_handler("status_metric")
        assert not has_dedicated_handler("status_list")


class TestStateKeyStandard:
    """Verify single state key usage"""

    def test_workflow_uses_intent_key(self):
        """Workflow should read from state['intent'], not state['answer_type']"""
        # This is a documentation/code review check
        # In real test, would mock state and verify key access
        pass
```

### 7.4 db_query Safety Tests

```python
# test_db_query.py

import pytest
from db_query import (
    execute_query,
    _validate_params,
    _wrap_with_outer_limit,
    _calculate_effective_limit,
    MAX_QUERY_LIMIT,
    DEFAULT_LIMIT,
)


class TestSafetyGuards:
    """db_query must enforce safety guards"""

    def test_project_id_required(self):
        """Query without project_id must fail"""
        result = execute_query(
            "SELECT * FROM user_story",
            {}  # No project_id
        )
        assert not result.success
        assert "project_id" in result.error.lower()

    def test_empty_project_id_fails(self):
        """Empty project_id must fail"""
        result = execute_query(
            "SELECT * FROM user_story WHERE project_id = :project_id",
            {"project_id": ""}
        )
        assert not result.success

    def test_validation_passes_with_project_id(self):
        """Valid params should pass validation"""
        error = _validate_params({"project_id": "test-123"})
        assert error is None


class TestLimitEnforcement:
    """LIMIT must be enforced via outer wrapper"""

    def test_outer_wrapper_applied(self):
        """Query should be wrapped with outer LIMIT"""
        sql = "SELECT * FROM user_story WHERE project_id = :project_id"
        wrapped = _wrap_with_outer_limit(sql, 50)

        assert "SELECT * FROM (" in wrapped
        assert ") AS __limited_q LIMIT" in wrapped
        # LIMIT+1 pattern for accurate was_limited detection
        assert "LIMIT 51" in wrapped

    def test_outer_wrapper_handles_inner_limit(self):
        """Outer wrapper should cap even queries with inner LIMIT"""
        sql = "SELECT * FROM user_story LIMIT 10000"
        wrapped = _wrap_with_outer_limit(sql, 50)

        # Should still have outer wrapper enforcing our limit
        assert "LIMIT 51" in wrapped
        assert "LIMIT 10000" in wrapped  # Inner limit preserved but capped

    def test_effective_limit_calculation(self):
        """Effective limit should be capped at MAX_QUERY_LIMIT"""
        assert _calculate_effective_limit(None) == DEFAULT_LIMIT
        assert _calculate_effective_limit(10) == 10
        assert _calculate_effective_limit(1000) == MAX_QUERY_LIMIT
        assert _calculate_effective_limit(MAX_QUERY_LIMIT + 100) == MAX_QUERY_LIMIT


class TestWasLimitedAccuracy:
    """was_limited should use LIMIT+1 pattern"""

    def test_was_limited_concept(self):
        """
        Conceptual test for was_limited accuracy.

        LIMIT+1 pattern:
        - Fetch 51 rows when limit is 50
        - If 51 returned → was_limited=True, return 50
        - If ≤50 returned → was_limited=False, return all
        """
        # This would need DB to test fully
        # Document the expected behavior
        pass
```

### 7.5 Week Boundary Tests

```python
# test_week_boundaries.py

import pytest
from datetime import datetime, timedelta
import pytz
from intent_handlers import get_kst_week_boundaries, get_kst_week_boundaries_str

KST = pytz.timezone('Asia/Seoul')


class TestKSTWeekBoundaries:
    """Week boundary calculation must be accurate"""

    def test_returns_datetime_objects(self):
        """Should return datetime objects, not strings"""
        week_start, next_week_start = get_kst_week_boundaries()

        assert isinstance(week_start, datetime)
        assert isinstance(next_week_start, datetime)

    def test_week_start_is_monday(self):
        """Week start should be Monday 00:00:00"""
        week_start, _ = get_kst_week_boundaries()

        assert week_start.weekday() == 0  # Monday
        assert week_start.hour == 0
        assert week_start.minute == 0
        assert week_start.second == 0

    def test_next_week_start_is_7_days_later(self):
        """Next week start should be exactly 7 days after week start"""
        week_start, next_week_start = get_kst_week_boundaries()

        delta = next_week_start - week_start
        assert delta.days == 7

    def test_less_than_comparison_pattern(self):
        """
        Due dates should use >= start AND < next_start pattern.

        This avoids edge cases with 23:59:59 or timestamp precision.
        """
        week_start, next_week_start = get_kst_week_boundaries()

        # A task due on Sunday 23:59:59 should be included
        sunday_late = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        assert sunday_late >= week_start
        assert sunday_late < next_week_start

        # A task due on next Monday 00:00:00 should NOT be included
        next_monday = next_week_start
        assert next_monday >= week_start
        assert not (next_monday < next_week_start)  # Excluded!

    def test_string_boundaries_for_display(self):
        """String boundaries should be YYYY-MM-DD format"""
        start_str, end_str = get_kst_week_boundaries_str()

        # Should match YYYY-MM-DD format
        datetime.strptime(start_str, '%Y-%m-%d')
        datetime.strptime(end_str, '%Y-%m-%d')
```

---

## 8. Schema Check Checklist

Before deploying, verify these columns exist:

| Table | Required Columns | Fallback |
|-------|------------------|----------|
| `user_story` | `id, title, status` | ✅ Always works |
| `user_story` | `priority, story_points` | Falls back to no ordering |
| `sprint` | `id, name, status, start_date, end_date` | Required |
| `sprint` | `goal` | Optional, shows if present |
| `task` | `id, title, status, due_date` | Required for task queries |
| `task` | `user_story_id` (FK) | Falls back to no story title |
| `issue` | `id, title, status` | Required for risk queries |
| `issue` | `type, severity` | Falls back to title-based filtering |

---

## 9. Execution Order (0-1 Day)

**Hour 1-2**: Classifier changes

1. Add `AnswerType.UNKNOWN`
2. Update `INTENT_PATTERNS` with combination rules
3. Change fallback to `UNKNOWN`
4. Run classifier tests

**Hour 3-4**: Database + Handlers

1. Create `response_contract.py` with `error_code` field
2. Create `db_query.py` with safety guards (outer LIMIT, LIMIT+1 pattern)
3. Create `intent_handlers.py` (6 handlers with graceful degradation, datetime week boundaries)

**Hour 5-6**: Renderer + Integration

1. Create `response_renderer.py` (use `error_code`, not string matching)
2. Modify `chat_workflow_v2.py` - single `state["intent"]` key
3. Add `intent_handler` node with normalization
4. **Verify graph node names match exactly** (Risk 10)

**Hour 7-8**: Testing + Verification

1. Run all tests (10 checklist items)
2. Manual test: "백로그에 뭐가 있어?" → 📋
3. Manual test: "리스크 분석해줘" → ⚠️
4. Manual test: "이거 어떻게 해?" → RAG response (not 📊)

---

## 10. Success Criteria

| Criteria | Pass Condition |
|----------|----------------|
| Single state key | Only `state["intent"]` used in routing |
| Different headers | Each intent has unique emoji+title |
| No STATUS_LIST black hole | "백로그 목록" → BACKLOG_LIST |
| Fallback not status | "애매한 질문" → UNKNOWN → RAG |
| Safety guards work | Query without project_id fails |
| Graceful degradation | Schema error → `error_code` + tips (not crash) |
| Week boundaries KST | Python-calculated datetime, `< next_start` pattern |
| Regression test passes | `"📊 **프로젝트 현황**"` in non-status = FAIL |
| Error detection structured | Uses `error_code` field, not string matching |
| LIMIT guaranteed | Outer wrapper enforces limit even with inner LIMIT |
| `was_limited` accurate | Uses LIMIT+1 pattern |
| Fallback tracked | `used_fallback` flag set when fallback query used |

---

## 11. Rollback Plan

If issues arise:

1. **Quick rollback**: Revert `_route_after_answer_type` to always return `"execute_status_query"`
2. **Partial rollback**: Keep classifier changes, disable handler routing
3. **Full rollback**: Revert all files to previous commit

The existing `status_response_contract.py` is UNCHANGED and remains as fallback.

---

## 12. Critical Fixes Summary (Pre-Implementation Checklist)

Before implementing, ensure these fixes from code review are incorporated:

### Must-Fix (P0 Blockers)

| # | Issue | Fix |
|---|-------|-----|
| 1 | `List` import missing in intent_handlers.py | Add `from typing import List, Optional` |
| 2 | SQLAlchemy result conversion fragile | Use `result.mappings().all()` instead of `keys()` + zip |
| 3 | `_enforce_limit()` ineffective with existing LIMIT | Use outer wrapper: `SELECT * FROM (...) LIMIT` |
| 4 | `was_limited` inaccurate | Use LIMIT+1 fetch, drop extra row |
| 5 | KST week boundaries as strings | Use `datetime` objects, `< next_start` pattern |

### Strongly Recommended

| # | Issue | Fix |
|---|-------|-----|
| 6 | Error detection via string matching | Add `error_code` field to ResponseContract |
| 7 | Test assertion `"📊" not in result` too broad | Use `"📊 **프로젝트 현황**" not in result` |
| 8 | Fallback usage untracked | Add `used_fallback: bool` to QueryResult |
| 9 | `statement_timeout` reliability | Add debug logging for timeout set/reset |
| 10 | Node name mismatch risk | Verify routing return values match actual graph node names |
