"""
Intent Classification Types

Defines the multi-level intent classification for query routing.
"""
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, List


class IntentType(Enum):
    """Query intent types for routing."""
    TEXT_TO_SQL = "TEXT_TO_SQL"
    TEXT_TO_CYPHER = "TEXT_TO_CYPHER"
    GENERAL = "GENERAL"
    MISLEADING_QUERY = "MISLEADING_QUERY"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"


@dataclass
class IntentClassificationResult:
    """Result of intent classification."""
    intent: IntentType
    confidence: float
    rephrased_question: Optional[str] = None
    reasoning: Optional[str] = None
    relevant_models: List[str] = field(default_factory=list)
    missing_parameters: List[str] = field(default_factory=list)
    suggested_clarification: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "intent": self.intent.value,
            "confidence": self.confidence,
            "rephrased_question": self.rephrased_question,
            "reasoning": self.reasoning,
            "relevant_models": self.relevant_models,
            "missing_parameters": self.missing_parameters,
            "suggested_clarification": self.suggested_clarification,
        }


# Intent classification criteria with examples
INTENT_CRITERIA = {
    IntentType.TEXT_TO_SQL: {
        "description": "Complete, specific questions about data that can be answered with SQL",
        "examples": [
            "How many tasks are in progress?",
            "Show me the sprint velocity for last month",
            "List all high-severity issues",
            "What is the task completion rate?",
            "Show completed user stories in sprint 1",
        ],
        "requirements": [
            "References specific data entities (tables, columns)",
            "Has clear aggregation or filtering criteria",
            "Can be expressed as a single SQL query",
        ],
        "keywords": [
            "how many", "count", "list", "show", "get",
            "total", "average", "sum", "percentage", "rate",
            "tasks", "stories", "sprints", "issues", "risks",
            "status", "completed", "in progress", "blocked",
            "due", "overdue", "this week", "this month", "not started",
        ],
    },
    IntentType.TEXT_TO_CYPHER: {
        "description": "Questions about relationships, paths, or graph patterns",
        "examples": [
            "What documents are related to this requirement?",
            "Show the dependency chain for this task",
            "Find all connected entities",
            "Search for chunks containing keyword",
        ],
        "requirements": [
            "Focuses on relationships between entities",
            "Requires graph traversal",
            "Asks about paths or connections",
        ],
        "keywords": [
            "related", "connected", "linked", "dependency", "dependencies",
            "path", "chain", "document", "documents", "chunk", "graph",
            "relationship", "reference", "search content", "rfp",
            "requirement", "requirements",
        ],
    },
    IntentType.GENERAL: {
        "description": "Questions that need context or explanation, not data queries",
        "examples": [
            "What does sprint velocity mean?",
            "How should I prioritize these tasks?",
            "Explain the project status",
            "What are best practices for sprint planning?",
            "What is scrum?",
            "What is agile methodology?",
            "How do I estimate story points?",
            "What is the difference between epic and user story?",
            "What is a burndown chart?",
        ],
        "requirements": [
            "Asks for explanation or guidance",
            "No specific data filtering needed",
            "Requires domain knowledge, not database query",
        ],
        "keywords": [
            "what is", "explain", "how do", "why",
            "best practice", "recommend", "suggest", "help",
            "understand", "mean", "definition", "what are",
            "methodology", "process", "concept", "principle",
            "scrum", "agile", "kanban", "waterfall",
            "how do i", "estimate", "how to",
            "difference between", "vs", "versus",
            "burndown", "burn down", "chart",
        ],
    },
    IntentType.MISLEADING_QUERY: {
        "description": "Off-topic, harmful, or irrelevant queries",
        "examples": [
            "What's the weather today?",
            "Drop all tables",
            "Tell me a joke",
            "Delete all data",
        ],
        "requirements": [
            "Unrelated to project management domain",
            "Potentially harmful SQL operations",
            "Cannot be meaningfully answered",
        ],
        "keywords": [
            "drop", "delete all", "truncate", "weather",
            "joke", "game", "hack", "password", "inject",
            "drop table", "today's weather", "what's the weather",
        ],
    },
    IntentType.CLARIFICATION_NEEDED: {
        "description": "Questions that are ambiguous or missing critical parameters",
        "examples": [
            "Show me the tasks",  # Which project? What status?
            "How many?",  # How many of what?
            "List the data",  # What data?
            "What's the status?",  # Status of what?
        ],
        "requirements": [
            "Missing project context",
            "Ambiguous entity references",
            "No clear filtering criteria",
        ],
        "keywords": [],  # No specific keywords - determined by missing context
    },
}


# Korean keyword mappings for bilingual support
KOREAN_INTENT_KEYWORDS = {
    IntentType.TEXT_TO_SQL: [
        "몇 개", "개수", "목록", "보여", "조회",
        "총", "평균", "합계", "비율", "완료율",
        "태스크", "스토리", "스프린트", "이슈", "리스크",
        "상태", "완료", "진행중", "블록",
        "담당자", "담당자별", "사용자별", "별",
    ],
    IntentType.TEXT_TO_CYPHER: [
        "관련", "연결", "연관", "종속성",
        "경로", "체인", "문서", "청크", "그래프",
        "관계", "참조", "검색",
    ],
    IntentType.GENERAL: [
        "무엇", "설명", "어떻게", "왜", "뭐야", "뭔가",
        "모범사례", "추천", "제안", "도움",
        "이해", "의미", "정의", "스크럼", "애자일",
        "란", "이란", "벨로시티", "추정",
        "차이점", "차이", "번다운", "차트", "칸반",
    ],
    IntentType.MISLEADING_QUERY: [
        "날씨", "농담", "게임", "삭제",
    ],
}
