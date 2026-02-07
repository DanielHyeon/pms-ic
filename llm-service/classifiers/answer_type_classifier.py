"""
Answer Type Classifier for Status Query Engine

Classifies user queries based on expected output format:
- STATUS_METRIC: Numbers, percentages, counts, progress
- STATUS_LIST: Task lists, issue lists, blockers
- STATUS_DRILLDOWN: Specific entity status (Epic/Feature/Story)
- HOWTO_POLICY: Methodology, guides, policies (Document RAG)
- MIXED: Status + explanation
- CASUAL: Greetings, small talk

Reference: docs/STATUS_QUERY_IMPLEMENTATION_PLAN.md
"""

import re
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Set, Tuple

from utils.korean_normalizer import apply_typo_corrections, fuzzy_keyword_in_query
from services.threshold_tuner import get_keyword_threshold

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================

class AnswerType(Enum):
    """
    Answer type classification with lowercase snake_case values.

    IMPORTANT: Use .value directly as the intent key.
    Do NOT use .upper() or string transformations.

    Priority order for classification:
    - Priority 1: Specific domain intents (check first)
    - Priority 2: General status (constrained)
    - Priority 3: Non-status
    - Fallback: UNKNOWN (goes to RAG, NOT status)
    """
    # Priority 1: Specific domain intents (check first)
    RISK_ANALYSIS = "risk_analysis"           # Risk queries
    TASK_DUE_THIS_WEEK = "task_due_this_week" # Tasks due this week
    SPRINT_PROGRESS = "sprint_progress"       # Sprint progress/burndown
    BACKLOG_LIST = "backlog_list"             # Product backlog items
    COMPLETED_TASKS = "completed_tasks"       # Completed tasks list
    TASKS_BY_STATUS = "tasks_by_status"       # Tasks filtered by specific status
    KANBAN_OVERVIEW = "kanban_overview"        # Kanban board summary
    ENTITY_PROGRESS = "entity_progress"      # Specific entity progress query

    # Priority 2: General status (constrained)
    STATUS_METRIC = "status_metric"           # Numbers, percentages, counts
    STATUS_LIST = "status_list"               # Task lists, issue lists, blockers
    STATUS_DRILLDOWN = "status_drilldown"     # Specific entity status

    # Priority 3: Non-status
    HOWTO_POLICY = "howto_policy"             # Methodology, guides, policies
    MIXED = "mixed"                           # Status + explanation
    CASUAL = "casual"                         # Greetings, small talk

    # Fallback (goes to RAG, NOT status)
    UNKNOWN = "unknown"                       # Ambiguous queries -> RAG


class QueryScope(Enum):
    """Query scope level"""
    PROJECT = "project"
    SPRINT = "sprint"
    EPIC = "epic"
    FEATURE = "feature"
    STORY = "story"
    TASK = "task"


@dataclass
class ScopeInfo:
    """Extracted scope information"""
    level: QueryScope = QueryScope.PROJECT
    project_id: Optional[str] = None
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None
    epic_id: Optional[str] = None
    feature_id: Optional[str] = None
    story_id: Optional[str] = None


@dataclass
class AnswerTypeResult:
    """Classification result"""
    answer_type: AnswerType
    confidence: float
    scope: ScopeInfo = field(default_factory=ScopeInfo)
    metrics_requested: List[str] = field(default_factory=list)
    time_context: str = "current"  # "current", "this_week", "last_sprint", etc.
    matched_patterns: List[str] = field(default_factory=list)
    reasoning: str = ""


# =============================================================================
# Priority-Based Intent Patterns (P0 Implementation)
# =============================================================================
# These patterns are checked FIRST by priority order to prevent
# "all questions → status template" regression.

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
        "requires_any": ["태스크", "할 일", "task", "작업", "마감", "완료해야", "해야 할", "due", "what's", "tasks"],
        "priority": 1,
    },
    AnswerType.SPRINT_PROGRESS: {
        # COMBINATION RULE: sprint context + progress context
        "keywords": ["스프린트", "sprint"],
        "requires_any": [
            "진행", "상황", "진척", "번다운", "velocity", "속도", "현황", "진행률",
            "progress", "going", "status", "how", "백로그", "항목", "스토리",
            "시작", "안한", "대기", "할 일", "태스크", "뭐", "뭐야",
        ],
        "priority": 1,
    },
    AnswerType.BACKLOG_LIST: {
        "keywords": ["백로그", "backlog", "제품 백로그"],
        "priority": 1,
    },
    AnswerType.COMPLETED_TASKS: {
        # Completed/done tasks queries
        "keywords": ["완료된", "완료한", "끝난", "done", "completed", "완료 task", "완료 태스크", "완료 상태"],
        "requires_any": [
            "task", "태스크", "작업", "일", "목록", "리스트", "뭐", "보여", "알려", "list",
            "것", "거", "건",  # Korean pro-forms for "thing/item"
        ],
        "priority": 1,
    },
    AnswerType.TASKS_BY_STATUS: {
        # Tasks filtered by status (테스트 중인, 검토 중인, 진행 중인, etc.)
        "keywords": [
            "테스트 중", "검토 중", "리뷰 중", "진행 중", "대기 중",
            "코드 리뷰", "qa", "작업 중",
            "in review", "in progress", "testing",
            "review", "in_progress", "todo",
        ],
        "requires_any": [
            "task", "태스크", "작업", "뭐", "뭔가", "있", "보여", "알려",
            "목록", "리스트", "상태",
            "것", "거", "건",  # Korean pro-forms for "thing/item"
        ],
        "priority": 1,
    },
    AnswerType.KANBAN_OVERVIEW: {
        # Kanban board summary / overview
        "keywords": ["칸반", "kanban", "보드", "board", "전체 현황", "컬럼별"],
        "requires_any": [
            "현황", "상태", "태스크", "보여", "알려", "몇", "요약",
            "보여줘", "알려줘",
        ],
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
        "keywords": ["안녕", "고마워", "감사", "반가워", "hello", "hi", "thanks"],
        "max_length": 15,
        "priority": 3,
    },
}


# =============================================================================
# Pattern Definitions (Legacy - still used for detailed matching)
# =============================================================================

# Status/Metric patterns - require data aggregation/calculation
STATUS_METRIC_PATTERNS = [
    # Progress and status (Korean)
    (r"(현재|지금|오늘|금일).*(진행|현황|상태|진척|상황)", "time_progress"),
    (r"(진행률|완료율|진척률|달성률)", "rate_metric"),
    (r"(몇\s*%|몇\s*퍼센트|얼마나.*완료|얼마나.*진행)", "percentage_query"),
    (r"(완료|진행|미착수|대기).*(몇\s*개|몇\s*건|개수|숫자)", "count_query"),
    (r"(프로젝트|스프린트).*(현황|상태|진행|요약|일정)", "entity_status"),

    # Schedule/Timeline queries (Korean) - actual project schedule data
    (r"(프로젝트|스프린트)?\s*일정.*(알려|보여|어떻게|뭐)", "schedule_query"),
    (r"일정이?\s*(어떻게|뭐야|어때)", "schedule_status"),
    (r"(마감|데드라인|기한).*(언제|알려|보여)", "deadline_query"),

    # Specific metrics
    (r"(wip|재공|작업중).*(현황|상태|몇)", "wip_status"),
    (r"(velocity|속도|벨로시티)", "velocity"),
    (r"(번다운|burn.*down|소진)", "burndown"),

    # Korean time context + progress
    (r"(이번\s*주|금주|이번주).*(진행|현황|상태)", "this_week_status"),
    (r"(이번\s*스프린트|현재\s*스프린트).*(진행|현황|상태)", "current_sprint_status"),
    (r"(지난\s*주|전주).*(결과|완료|진행)", "last_week_status"),

    # Weak keyword patterns (informal progress inquiries) - Phase 1 enhancement
    (r"어디까지\s*(왔|됐|했|진행)", "progress_informal"),
    (r"(요즘|최근)\s*(진행|상황|어떻게)\s*(어때|돼)", "recent_status_informal"),
    (r"(마무리|끝|완료).*(가능|될|돼|할 수)", "completion_feasibility"),
    (r"(일정|스케줄|데드라인).*(괜찮|문제|늦|지연)", "schedule_status"),
    (r"(급한|긴급|우선|빠른)\s*(거|건|것|일|작업)", "urgent_items"),
    (r"(오늘|내일|이번주)\s*(할|해야)\s*(일|것|거)", "today_tasks"),
    (r"(다음|그\s*다음)\s*(뭐|무엇|작업|할)", "next_work"),
    # Very informal patterns
    (r"어떻게\s*(되|돼|진행).*(있|가)", "progress_vague"),
    (r"(되|돼)고\s*있", "ongoing_status"),
]

# Status/List patterns - require data listing
STATUS_LIST_PATTERNS = [
    # Blocked and overdue (Korean)
    (r"(차단|블로커|막힌|blocked).*(목록|리스트|뭐|있어|알려)?", "blocked_list"),
    (r"(지연|늦은|늦어지|overdue|미완료).*(목록|리스트|뭐|있어|알려)?", "overdue_list"),

    # Task and issue lists
    (r"(남은|미완료|해야\s*할).*(일|작업|태스크|스토리|거|것)", "remaining_tasks"),
    (r"(이슈|문제|리스크).*(목록|리스트|뭐|있어|알려)?", "issue_list"),
    (r"(뭐|무엇|어떤).*(남았|해야|진행중)", "what_remains"),

    # Backlog queries - need actual item list
    # Sprint backlog should match before product backlog
    (r"(이번|현재|활성|금주).*(스프린트).*(백로그|항목|스토리|뭐|있어|보여)", "sprint_progress"),
    (r"(스프린트).*(백로그|항목).*(뭐|있어|보여|알려)?", "sprint_progress"),
    (r"(제품\s*)?백로그.*(목록|리스트|뭐|있어|알려|보여)?", "backlog_list"),
    (r"(남은|현재).*(제품\s*)?백로그", "remaining_backlog"),
    (r"백로그\s*(항목|아이템)", "backlog_items"),
    (r"(스토리|story).*(목록|리스트|뭐|있어|보여)", "story_list"),
    (r"(진행중|진행\s*중|IN_PROGRESS).*(스토리|항목|뭐)", "in_progress_list"),

    # Activity
    (r"(최근|오늘|어제).*(변경|수정|업데이트|활동)", "recent_activity"),

    # Weak keyword list patterns - Phase 1 enhancement
    (r"남은\s*(거|것|게)\s*(뭐|뭔|무엇)", "remaining_informal"),
    (r"(막힌|멈춘|정체)\s*(거|것|게)\s*(있|뭐)", "blocked_informal"),
    (r"(완료|끝난|된)\s*(것|거|건)만\s*(보여|알려)", "completed_filter"),
    (r"(늦어지|지연되)\s*(는|고 있)", "delay_check"),
    # Completed task queries (flexible patterns)
    (r"(완료된|완료한|done|끝난|DONE|COMPLETED).*(task|태스크|작업|일).*(뭐|뭔|목록|리스트|있|보여|알려)?", "completed_tasks"),
    (r"(task|태스크|작업).*(완료|끝|done|DONE|COMPLETED)", "tasks_completed"),
    # Status-based task queries (테스트 중인, 검토 중인, 진행 중인, etc.)
    (r"(테스트|검토|리뷰|review|testing)\s*중인?.*(task|태스크|작업).*(뭐|뭔|목록|있|보여|알려)?", "in_review_tasks"),
    (r"(진행|작업)\s*중인?.*(task|태스크|작업).*(뭐|뭔|목록|있|보여|알려)?", "in_progress_tasks"),
    (r"(task|태스크|작업).*(테스트|검토|리뷰|review)\s*중", "tasks_in_review"),
]

# Status/Drilldown patterns - specific entity detail
STATUS_DRILLDOWN_PATTERNS = [
    (r"(스프린트\s*\d+|sprint\s*\d+).*(상태|현황|진행)", "sprint_detail"),
    (r"(에픽|epic)\s*['\"]?[\w가-힣]+['\"]?.*(상태|현황|진행)", "epic_detail"),
    (r"(피처|feature)\s*['\"]?[\w가-힣]+['\"]?.*(상태|현황|진행)", "feature_detail"),
    (r"(스토리|story|us)\s*['\"]?[\w가-힣\-]+['\"]?.*(상태|현황|상세)", "story_detail"),
]

# How-to/Policy patterns - require document search
HOWTO_POLICY_PATTERNS = [
    # Definition questions (Korean)
    (r"(뭐야|뭔가요|무엇인가요|무엇이야)", "definition"),
    (r"(이란|란|이?라는\s*게)", "definition"),
    (r"(정의|개념|의미).*알려", "definition"),

    # Process questions
    (r"(어떻게|방법|절차|프로세스)", "process"),
    (r"(가이드|지침|규칙|정책|규정)", "guide"),
    (r"(템플릿|양식|포맷)", "template"),

    # Explanation requests
    (r"설명.*해\s*(줘|주세요)", "explanation"),
    (r"(차이|비교|vs|versus)", "comparison"),

    # Best practices
    (r"(모범\s*사례|베스트\s*프랙티스|best\s*practice)", "best_practice"),

    # Task assignment questions (require RAG lookup)
    (r"누가\s*(하고\s*있|맡고\s*있|담당|진행)", "task_assignment"),
    (r"(담당자|담당).*(누구|알려|보여)", "assignee_query"),
    (r".+(은|는)\s*누가\s*(하|맡|담당)", "specific_task_assignee"),
    (r"(who|assignee|assigned)", "task_assignment_en"),
]

# Mixed patterns - both status and explanation
MIXED_PATTERNS = [
    (r"(현황|상태|진행).*(기준|정의|방법).*알려", "status_and_criteria"),
    (r"(알려주고|그리고|또한).*(기준|방법|정의)", "status_plus_howto"),
    (r"(요약|현황).*(설명|이유|왜)", "status_with_explanation"),
    # Enhanced mixed patterns - Phase 1
    (r"(진행률|완료율).*(이랑|랑|하고|그리고).*(계산|방식|기준)", "rate_and_method"),
    (r"(현황|상황).*(이랑|랑|하고|그리고).*(템플릿|가이드|방법)", "status_and_template"),
    (r"알려주고.*(어떻게|가이드|방법)", "status_then_howto"),
]

# =============================================================================
# Secondary Gate Signals (Phase 1-2)
# =============================================================================

# Aggregation/List signals -> lean toward STATUS
AGGREGATION_SIGNALS = [
    r"몇\s*(개|건|%|퍼센트)",
    r"(완료|남은|진행|지연|차단)\s*(건|개|것)",
    r"목록|리스트",
    r"(있어|없어)\?$",
    r"(어때|어떻게)\?$",
    r"괜찮",
    r"(프로젝트|스프린트)?\s*일정",  # Schedule inquiry signal
]

# HOWTO signals -> lean toward HOWTO (methodology questions)
HOWTO_SIGNALS = [
    r"(어떻게).*(계산|산정|작성|진행)",
    r"(방법|절차|프로세스)\s*(알려|설명)",
    r"(보는|읽는|작성하는)\s*(법|방법)",
    r"(정의|개념|의미)\s*(가|이)\s*(뭐|무엇)",
    r"(기준|규칙|정책)\s*(이|가)\s*(뭐|무엇|어떻게)",
    # Task assignment signals - require RAG lookup
    r"누가\s*(하고|맡고|담당|진행)",
    r"(담당자|담당).*(누구|누가)",
    r".+(은|는)\s*누가",
]

# Casual patterns - greetings, thanks
CASUAL_PATTERNS = [
    (r"^(안녕|하이|헬로|hi|hello)\s*$", "greeting"),
    (r"^(고마워|감사|thanks|thank you)", "thanks"),
    (r"^(ㅎㅎ|ㅋㅋ|ㅠㅠ|;;)", "emoticon"),
    (r"^(네|응|오케이|ok|okay)\s*$", "acknowledgment"),
]

# Metric type inference patterns
METRIC_INFERENCE_PATTERNS = {
    "story_counts_by_status": [r"(상태별|status)", r"(몇\s*개|개수|카운트)"],
    "completion_rate": [r"(완료율|진행률|진척률|달성률)", r"(몇\s*%|퍼센트)"],
    "blocked_items": [r"(차단|블로커|막힌|blocked)"],
    "overdue_items": [r"(지연|늦은|overdue|미완료.*(일|작업))"],
    "recent_activity": [r"(최근|오늘|어제).*(변경|활동|업데이트)"],
    "sprint_burndown": [r"(번다운|burn.*down|소진)"],
    "velocity": [r"(velocity|속도|벨로시티)"],
    "wip_status": [r"(wip|재공|작업중)"],
    "risk_summary": [r"(리스크|위험|risk)"],
    "issue_summary": [r"(이슈|문제|issue)"],
}

# Time context inference patterns
TIME_CONTEXT_PATTERNS = {
    "current": [r"(현재|지금|오늘)", r"(이번\s*스프린트)"],
    "this_week": [r"(이번\s*주|금주|이번주)"],
    "last_week": [r"(지난\s*주|전주|저번\s*주)"],
    "last_sprint": [r"(지난\s*스프린트|이전\s*스프린트)"],
    "this_month": [r"(이번\s*달|금월)"],
}


# =============================================================================
# Answer Type Classifier
# =============================================================================

class AnswerTypeClassifier:
    """
    Classifies user queries into answer types.

    Classification priority:
    1. Casual (short, greeting patterns)
    2. Mixed (explicit both-type markers)
    3. Status patterns (metric, list, drilldown)
    4. How-to patterns
    5. Default to STATUS_METRIC for ambiguous project queries
    """

    def __init__(self):
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for performance"""
        self._status_metric = [(re.compile(p, re.IGNORECASE), name) for p, name in STATUS_METRIC_PATTERNS]
        self._status_list = [(re.compile(p, re.IGNORECASE), name) for p, name in STATUS_LIST_PATTERNS]
        self._status_drilldown = [(re.compile(p, re.IGNORECASE), name) for p, name in STATUS_DRILLDOWN_PATTERNS]
        self._howto_policy = [(re.compile(p, re.IGNORECASE), name) for p, name in HOWTO_POLICY_PATTERNS]
        self._mixed = [(re.compile(p, re.IGNORECASE), name) for p, name in MIXED_PATTERNS]
        self._casual = [(re.compile(p, re.IGNORECASE), name) for p, name in CASUAL_PATTERNS]
        # Secondary gate signals (Phase 1-2)
        self._aggregation_signals = [re.compile(p, re.IGNORECASE) for p in AGGREGATION_SIGNALS]
        self._howto_signals = [re.compile(p, re.IGNORECASE) for p in HOWTO_SIGNALS]

    def classify(self, query: str) -> AnswerTypeResult:
        """
        Classify a user query into an answer type.

        IMPORTANT:
        - Returns AnswerType enum
        - Use result.answer_type.value for the intent key
        - Fallback is UNKNOWN (→ RAG), NOT status_metric

        Priority-based classification:
        1. Priority 1: Specific intents (RISK, TASK_DUE, SPRINT, BACKLOG)
        2. Priority 2: General status (STATUS_METRIC, STATUS_LIST)
        3. Priority 3: Casual
        4. Legacy pattern matching
        5. Fallback to UNKNOWN

        Args:
            query: User's question text

        Returns:
            AnswerTypeResult with classification details
        """
        if not query or not query.strip():
            return AnswerTypeResult(
                answer_type=AnswerType.UNKNOWN,
                confidence=0.0,
                reasoning="Empty query"
            )

        query = query.strip()

        # Layer 2: Apply typo dictionary corrections before classification
        original_query = query
        query = apply_typo_corrections(query)
        was_corrected = query != original_query
        if was_corrected:
            logger.info(f"Typo correction: '{original_query}' -> '{query}'")

        query_lower = query.lower()

        # =================================================================
        # PRE-CLASSIFICATION: Negation-aware backlog detection
        # "스프린트에 안 들어간 스토리" = backlog, NOT sprint_progress
        # Must run BEFORE priority loop to override "스프린트" keyword
        # =================================================================
        _negation_backlog_patterns = [
            r"(안\s*들어간|못\s*들어간|안\s*배정|미배정|미할당|스프린트\s*(전|밖))",
        ]
        _negation_context_words = ["스토리", "항목", "뭐", "있", "보여", "알려", "어떤"]
        if any(re.search(p, query_lower) for p in _negation_backlog_patterns):
            if any(kw in query_lower for kw in _negation_context_words):
                reasoning = "Negation pattern detected: items NOT in sprint = backlog"
                if was_corrected:
                    reasoning += f" (typo corrected: '{original_query}')"
                return AnswerTypeResult(
                    answer_type=AnswerType.BACKLOG_LIST,
                    confidence=0.90,
                    matched_patterns=["negation_backlog"],
                    reasoning=reasoning,
                )

        # =================================================================
        # PRIORITY-BASED CLASSIFICATION (P0 Implementation)
        # Check by priority order (1, 2, 3)
        # Layer 1: Uses fuzzy jamo matching for keyword tolerance
        # =================================================================
        from utils.entity_resolver import extract_entity_name, has_progress_signal

        for priority in [1, 2, 3]:
            # Entity progress intercept: between P1 and P2
            # P1 intents (sprint, backlog, risk, etc.) already checked;
            # catch entity-specific progress BEFORE P2 STATUS_METRIC absorbs it
            if priority == 2:
                if has_progress_signal(query_lower):
                    entity_candidate = extract_entity_name(query)
                    if entity_candidate:
                        reasoning = f"Entity progress query: target='{entity_candidate}'"
                        if was_corrected:
                            reasoning += f" (typo corrected: '{original_query}')"
                        return AnswerTypeResult(
                            answer_type=AnswerType.ENTITY_PROGRESS,
                            confidence=0.85,
                            matched_patterns=["entity_progress"],
                            reasoning=reasoning,
                        )

            for answer_type, config in INTENT_PATTERNS.items():
                if config.get("priority") != priority:
                    continue

                # Check max_length constraint (for CASUAL)
                max_len = config.get("max_length")
                if max_len and len(query) > max_len:
                    continue

                # Check primary keywords (Layer 1: fuzzy jamo matching)
                # Per-group thresholds (Phase 3): each keyword gets its
                # group-appropriate threshold via get_keyword_threshold()
                keywords = config.get("keywords", [])
                matched = [
                    kw for kw in keywords
                    if fuzzy_keyword_in_query(
                        kw, query_lower,
                        threshold=get_keyword_threshold(kw),
                    )
                ]

                if not matched:
                    continue

                # Check requires_any constraint (Layer 1: fuzzy jamo matching)
                requires_any = config.get("requires_any")
                if requires_any:
                    has_required = any(
                        fuzzy_keyword_in_query(
                            req, query_lower,
                            threshold=get_keyword_threshold(req),
                        )
                        for req in requires_any
                    )
                    if not has_required:
                        continue

                confidence = min(0.95, 0.7 + len(matched) * 0.1)
                reasoning = f"Priority {priority} intent matched: {matched}"
                if was_corrected:
                    reasoning += f" (typo corrected: '{original_query}')"
                return AnswerTypeResult(
                    answer_type=answer_type,
                    confidence=confidence,
                    matched_patterns=matched,
                    reasoning=reasoning,
                )

        # =================================================================
        # LEGACY PATTERN MATCHING (for backward compatibility)
        # =================================================================

        # 1. Check for casual (short messages, greetings)
        if len(query) <= 15:
            casual_matches = self._match_patterns(query, self._casual)
            if casual_matches:
                return AnswerTypeResult(
                    answer_type=AnswerType.CASUAL,
                    confidence=0.95,
                    matched_patterns=casual_matches,
                    reasoning="Short message with casual pattern"
                )

        # 2. Check for mixed patterns (explicit both-type markers)
        mixed_matches = self._match_patterns(query, self._mixed)
        if mixed_matches:
            metrics = self._infer_metrics(query)
            time_ctx = self._infer_time_context(query)
            return AnswerTypeResult(
                answer_type=AnswerType.MIXED,
                confidence=0.85,
                metrics_requested=metrics,
                time_context=time_ctx,
                matched_patterns=mixed_matches,
                reasoning="Contains both status and how-to markers"
            )

        # 3. Check for status patterns
        status_metric_matches = self._match_patterns(query, self._status_metric)
        status_list_matches = self._match_patterns(query, self._status_list)
        status_drilldown_matches = self._match_patterns(query, self._status_drilldown)

        # 4. Check for how-to patterns
        howto_matches = self._match_patterns(query, self._howto_policy)

        # 5. Secondary gate: Check for HOWTO trap patterns
        # If query has "어떻게/방법/계산" with status keywords, it's asking HOW, not actual status
        howto_trap_detected = self._detect_howto_trap(query)
        if howto_trap_detected and (status_metric_matches or status_list_matches):
            # This looks like status but is actually asking about methodology
            return AnswerTypeResult(
                answer_type=AnswerType.HOWTO_POLICY,
                confidence=0.85,
                matched_patterns=howto_matches + ["howto_trap"],
                reasoning=f"HOWTO trap detected: asking methodology, not actual status"
            )

        # 6. Calculate base scores
        status_score = (
            len(status_metric_matches) * 1.5 +
            len(status_list_matches) * 1.2 +
            len(status_drilldown_matches) * 1.3
        )
        howto_score = len(howto_matches) * 1.0

        # 7. Secondary gate: Apply signal adjustments
        agg_signal_count = self._count_signal_matches(query, self._aggregation_signals)
        howto_signal_count = self._count_signal_matches(query, self._howto_signals)

        # Boost status score for aggregation signals
        status_score += agg_signal_count * 0.8
        # Boost howto score for howto signals
        howto_score += howto_signal_count * 1.2

        # 8. Determine answer type based on adjusted scores
        if status_score > 0 and status_score > howto_score:
            # Determine specific status type
            if status_drilldown_matches:
                answer_type = AnswerType.STATUS_DRILLDOWN
                matches = status_drilldown_matches
            elif status_list_matches and len(status_list_matches) >= len(status_metric_matches):
                answer_type = AnswerType.STATUS_LIST
                matches = status_list_matches
            else:
                answer_type = AnswerType.STATUS_METRIC
                matches = status_metric_matches or ["secondary_gate"]

            metrics = self._infer_metrics(query)
            time_ctx = self._infer_time_context(query)
            scope = self._infer_scope(query)

            confidence = min(0.95, 0.6 + status_score * 0.1)

            return AnswerTypeResult(
                answer_type=answer_type,
                confidence=confidence,
                scope=scope,
                metrics_requested=metrics or ["story_counts_by_status", "completion_rate"],
                time_context=time_ctx,
                matched_patterns=matches,
                reasoning=f"Status patterns matched: {status_score:.1f} vs howto: {howto_score:.1f}"
            )

        elif howto_score > 0:
            return AnswerTypeResult(
                answer_type=AnswerType.HOWTO_POLICY,
                confidence=min(0.95, 0.6 + howto_score * 0.15),
                matched_patterns=howto_matches,
                reasoning=f"How-to patterns matched: {howto_score:.1f}"
            )

        # 9. Default heuristics for ambiguous queries
        # Check for informal status inquiry patterns
        if self._is_informal_status_inquiry(query):
            return AnswerTypeResult(
                answer_type=AnswerType.STATUS_METRIC,
                confidence=0.7,
                metrics_requested=["story_counts_by_status", "completion_rate"],
                time_context="current",
                matched_patterns=["informal_status"],
                reasoning="Informal status inquiry detected"
            )

        # If query mentions project/sprint + time context, assume status
        if self._has_entity_reference(query) and self._has_time_context(query):
            metrics = self._infer_metrics(query)
            time_ctx = self._infer_time_context(query)
            return AnswerTypeResult(
                answer_type=AnswerType.STATUS_METRIC,
                confidence=0.6,
                metrics_requested=metrics or ["story_counts_by_status", "completion_rate"],
                time_context=time_ctx,
                matched_patterns=[],
                reasoning="Entity + time context detected, assuming status query"
            )

        # 10. Final fallback: Check aggregation signals one more time
        if agg_signal_count > 0:
            return AnswerTypeResult(
                answer_type=AnswerType.STATUS_METRIC,
                confidence=0.65,
                metrics_requested=["story_counts_by_status", "completion_rate"],
                time_context="current",
                matched_patterns=["aggregation_signal"],
                reasoning="Aggregation signal detected, defaulting to status"
            )

        # =================================================================
        # CRITICAL: Fallback to UNKNOWN, NOT status_metric
        # This prevents "all questions → status template" regression
        # UNKNOWN routes to document_query (RAG)
        # =================================================================
        return AnswerTypeResult(
            answer_type=AnswerType.UNKNOWN,
            confidence=0.3,
            matched_patterns=[],
            reasoning="No clear pattern match, routing to RAG (document_query)"
        )

    def _detect_howto_trap(self, query: str) -> bool:
        """Detect HOWTO trap: query looks like status but asks about methodology"""
        query_lower = query.lower()

        # First, check for progress inquiry patterns (NOT howto trap)
        progress_patterns = [
            r"어떻게\s*(되|돼|진행).*(있|가|돼)",  # "어떻게 되고 있어?" = progress
            r"(되|돼)고\s*있",
        ]
        for pattern in progress_patterns:
            if re.search(pattern, query_lower):
                return False  # This is a progress inquiry, not a howto trap

        # Check for methodology question markers
        methodology_markers = [
            r"어떻게.*(계산|산정|측정|작성|진행해야)",
            r"(계산|산정|측정).*(방법|법|하는)",
            r"(보는|읽는|작성하는)\s*(법|방법)",
            r"(어떻게|방법으로).*(작성|만들)",
        ]
        for pattern in methodology_markers:
            if re.search(pattern, query_lower):
                return True
        return False

    def _count_signal_matches(self, query: str, signals: List[re.Pattern]) -> int:
        """Count how many secondary gate signals match"""
        count = 0
        for pattern in signals:
            if pattern.search(query):
                count += 1
        return count

    def _is_informal_status_inquiry(self, query: str) -> bool:
        """Check if query is an informal status inquiry"""
        informal_patterns = [
            r"어디까지",
            r"(요즘|최근).*(어때|어떻게)",
            r"(마무리|끝).*(가능|될|돼)",
            r"(상황|상태).*(어때|어떻게)",
            r"(괜찮|잘).*(가|되)",
            r"(할|해야).*(거|것|일).*(있|뭐)",
            r"(급한|긴급).*(거|건)",
            r"(늦어지|지연되)",
            # Additional informal patterns
            r"(다음|그\s*다음).*(뭐|무엇).*(해|하)",  # "다음에 뭐 해?"
            r"어떻게\s*(되|돼|진행)",  # "어떻게 되고 있어?"
            r"(되고|진행되고)\s*(있|있어)",
        ]
        query_lower = query.lower()
        for pattern in informal_patterns:
            if re.search(pattern, query_lower):
                return True
        return False

    def _match_patterns(
        self,
        query: str,
        patterns: List[Tuple[re.Pattern, str]]
    ) -> List[str]:
        """Match query against pattern list, return matched pattern names"""
        matches = []
        for pattern, name in patterns:
            if pattern.search(query):
                matches.append(name)
        return matches

    def _infer_metrics(self, query: str) -> List[str]:
        """Infer requested metrics from query"""
        metrics = []
        query_lower = query.lower()

        for metric, patterns in METRIC_INFERENCE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    if metric not in metrics:
                        metrics.append(metric)
                    break

        return metrics

    def _infer_time_context(self, query: str) -> str:
        """Infer time context from query"""
        query_lower = query.lower()

        for context, patterns in TIME_CONTEXT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    return context

        return "current"

    def _infer_scope(self, query: str) -> ScopeInfo:
        """Infer query scope from query"""
        scope = ScopeInfo()
        query_lower = query.lower()

        # Check for sprint reference
        sprint_match = re.search(r"스프린트\s*(\d+|[가-힣]+)", query_lower)
        if sprint_match:
            scope.level = QueryScope.SPRINT
            scope.sprint_name = sprint_match.group(1)

        # Check for epic reference
        epic_match = re.search(r"에픽\s*['\"]?([가-힣\w]+)['\"]?", query_lower)
        if epic_match:
            scope.level = QueryScope.EPIC

        # Check for feature reference
        feature_match = re.search(r"피처\s*['\"]?([가-힣\w]+)['\"]?", query_lower)
        if feature_match:
            scope.level = QueryScope.FEATURE

        return scope

    def _has_entity_reference(self, query: str) -> bool:
        """Check if query references PMS entities"""
        entity_keywords = [
            "프로젝트", "스프린트", "에픽", "피처", "스토리", "태스크",
            "project", "sprint", "epic", "feature", "story", "task",
            "백로그", "backlog", "이슈", "issue", "리스크", "risk",
            "일정", "schedule", "마감", "데드라인", "deadline"
        ]
        query_lower = query.lower()
        return any(kw in query_lower for kw in entity_keywords)

    def _has_time_context(self, query: str) -> bool:
        """Check if query has time context"""
        time_keywords = [
            "현재", "지금", "오늘", "이번", "금주", "금일",
            "지난", "전주", "어제", "최근",
            "current", "now", "today", "this week"
        ]
        query_lower = query.lower()
        return any(kw in query_lower for kw in time_keywords)

    def is_status_query(self, answer_type: AnswerType) -> bool:
        """Check if answer type is a status query type (uses existing status engine)"""
        return answer_type in {
            AnswerType.STATUS_METRIC,
            AnswerType.STATUS_LIST,
            AnswerType.STATUS_DRILLDOWN,
        }

    def has_dedicated_handler(self, answer_type: AnswerType) -> bool:
        """Check if answer type has a dedicated intent handler (P0 handlers)"""
        return answer_type in {
            AnswerType.BACKLOG_LIST,
            AnswerType.SPRINT_PROGRESS,
            AnswerType.TASK_DUE_THIS_WEEK,
            AnswerType.RISK_ANALYSIS,
            AnswerType.CASUAL,
            AnswerType.UNKNOWN,
            AnswerType.COMPLETED_TASKS,
            AnswerType.TASKS_BY_STATUS,
            AnswerType.KANBAN_OVERVIEW,
            AnswerType.ENTITY_PROGRESS,
        }

    def should_use_rag(self, answer_type: AnswerType) -> bool:
        """Check if answer type should be handled by RAG (document_query)"""
        return answer_type in {
            AnswerType.UNKNOWN,
            AnswerType.HOWTO_POLICY,
        }


# =============================================================================
# Singleton Instance
# =============================================================================

_classifier: Optional[AnswerTypeClassifier] = None


def get_answer_type_classifier() -> AnswerTypeClassifier:
    """Get singleton classifier instance"""
    global _classifier
    if _classifier is None:
        _classifier = AnswerTypeClassifier()
    return _classifier


# =============================================================================
# Convenience Functions
# =============================================================================

def classify_answer_type(query: str) -> AnswerTypeResult:
    """Convenience function to classify a query"""
    return get_answer_type_classifier().classify(query)


def is_status_query(query: str) -> bool:
    """Check if query should be handled by Status Query Engine"""
    result = classify_answer_type(query)
    classifier = get_answer_type_classifier()
    return classifier.is_status_query(result.answer_type) or result.answer_type == AnswerType.MIXED
