"""
LLM Service configuration constants
Centralizes magic numbers and configuration values

Reference: docs/PMS 최적화 방안.md
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List
import os


# =============================================================================
# Two-Track Workflow Configuration
# =============================================================================

@dataclass(frozen=True)
class TrackAConfig:
    """Track A (High-frequency, fast) configuration"""
    TARGET_P95_MS: int = 500  # Target p95 latency
    MAX_LATENCY_MS: int = 1000  # Hard limit
    MAX_TOKENS: int = 1200  # Shorter responses
    TEMPERATURE: float = 0.35
    CACHE_HIT_TARGET: float = 0.70  # 70% cache hit target
    VERIFY_SAMPLE_RATE: float = 0.10  # 10% sampling for verification


@dataclass(frozen=True)
class TrackBConfig:
    """Track B (High-value, quality) configuration"""
    MIN_LATENCY_S: int = 30  # Expected minimum
    MAX_LATENCY_S: int = 90  # Acceptable maximum
    MAX_TOKENS: int = 3000  # Longer, detailed responses
    TEMPERATURE: float = 0.35
    ALWAYS_VERIFY: bool = True  # Always verify Track B responses


@dataclass(frozen=True)
class TrackRouterConfig:
    """Track routing configuration"""
    # Keywords that trigger Track B (high-value)
    HIGH_VALUE_KEYWORDS: tuple = (
        # Korean
        "주간보고", "주간 보고", "월간보고", "월간 보고",
        "스프린트계획", "스프린트 계획", "스프린트플래닝",
        "영향도분석", "영향도 분석", "임팩트분석",
        "회고", "레트로", "retrospective",
        "리파인먼트", "refinement", "백로그정리",
        "분석", "보고서", "리포트",
        "요약해", "정리해", "종합해",
        # English
        "weekly report", "monthly report",
        "sprint plan", "sprint planning",
        "impact analysis", "dependency analysis",
        "retrospective", "retro",
        "refinement", "backlog grooming",
        "analysis", "report", "summary",
    )


# =============================================================================
# L0 Policy Engine Configuration
# =============================================================================

@dataclass(frozen=True)
class PolicyConfig:
    """L0 Policy Engine configuration"""
    # Response limits
    MAX_RESPONSE_LENGTH: int = 4000
    MIN_RESPONSE_LENGTH: int = 10
    MAX_REQUEST_LENGTH: int = 10000

    # Feature toggles
    ENABLE_PII_MASKING: bool = True
    ENABLE_SCOPE_VALIDATION: bool = True
    ENABLE_SCRUM_RULES: bool = True
    ENABLE_CONTENT_FILTERING: bool = True

    # Scrum rules
    DEFAULT_WIP_LIMIT: int = 5


# =============================================================================
# L1/L2 Model Gateway Configuration
# =============================================================================

@dataclass(frozen=True)
class L1ModelConfig:
    """L1 (Fast) Model configuration - LFM2"""
    DEFAULT_PATH: str = "./models/LFM2-2.6B-Uncensored-X64.i1-Q6_K.gguf"
    N_CTX: int = 4096
    N_THREADS: int = 6
    N_GPU_LAYERS: int = 0
    MAX_TOKENS: int = 1200
    TEMPERATURE: float = 0.35
    TOP_P: float = 0.90
    MIN_P: float = 0.12
    REPEAT_PENALTY: float = 1.10


@dataclass(frozen=True)
class L2ModelConfig:
    """L2 (Quality) Model configuration - Gemma-3-12B"""
    DEFAULT_PATH: str = "./models/google.gemma-3-12b-pt.Q5_K_M.gguf"
    N_CTX: int = 4096
    N_THREADS: int = 6
    N_GPU_LAYERS: int = 0
    MAX_TOKENS: int = 3000
    TEMPERATURE: float = 0.35
    TOP_P: float = 0.90
    MIN_P: float = 0.12
    REPEAT_PENALTY: float = 1.10


# =============================================================================
# Context Snapshot Configuration
# =============================================================================

@dataclass(frozen=True)
class SnapshotConfig:
    """Now/Next/Why Snapshot configuration"""
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    MAX_TASKS_IN_NOW: int = 10
    MAX_BLOCKERS_IN_NOW: int = 5
    MAX_RISKS_IN_NOW: int = 5
    MAX_MILESTONES_IN_NEXT: int = 5
    MAX_REVIEWS_IN_NEXT: int = 5
    MAX_CHANGES_IN_WHY: int = 10
    MAX_DECISIONS_IN_WHY: int = 5


# =============================================================================
# PostgreSQL to Neo4j Sync Configuration
# =============================================================================

@dataclass(frozen=True)
class PGNeo4jSyncConfig:
    """PostgreSQL to Neo4j sync configuration"""
    # Sync intervals
    FULL_SYNC_INTERVAL_HOURS: int = 24
    INCREMENTAL_SYNC_INTERVAL_MINUTES: int = 5

    # Batch sizes
    BATCH_SIZE: int = 100
    MAX_RETRY_ATTEMPTS: int = 3
    RETRY_BACKOFF_SECONDS: int = 5

    # Entity types to sync
    SYNC_ENTITIES: tuple = (
        "Project", "Sprint", "Task", "UserStory",
        "Phase", "Deliverable", "Issue", "User"
    )

    # Relationship types to sync
    SYNC_RELATIONSHIPS: tuple = (
        "BELONGS_TO", "DEPENDS_ON", "BLOCKED_BY",
        "ASSIGNED_TO", "CREATED_BY", "PART_OF"
    )


# =============================================================================
# Hybrid RAG Configuration
# =============================================================================

@dataclass(frozen=True)
class HybridRAGConfig:
    """Hybrid RAG (Document + Graph) configuration"""
    # Strategy selection thresholds
    RELATIONSHIP_KEYWORDS: tuple = (
        "의존", "dependency", "블로커", "blocker", "차단",
        "연관", "관련", "관계", "relationship", "연결",
        "영향", "impact", "선행", "predecessor", "후행",
    )

    # Weighting
    DOCUMENT_RAG_WEIGHT: float = 0.6
    GRAPH_RAG_WEIGHT: float = 0.4

    # Fallback behavior
    FALLBACK_TO_DOCUMENT_ONLY: bool = True


# =============================================================================
# PMS Monitoring Configuration
# =============================================================================

@dataclass(frozen=True)
class MonitoringConfig:
    """PMS-specific monitoring configuration"""
    # Track A targets
    TRACK_A_P95_TARGET_MS: int = 500
    TRACK_A_CACHE_HIT_TARGET: float = 0.70

    # Track B targets
    TRACK_B_MAX_GEN_TIME_S: int = 90

    # Metrics collection
    METRICS_RETENTION_HOURS: int = 24
    METRICS_AGGREGATION_INTERVAL_S: int = 60

    # Hallucination detection
    HALLUCINATION_REPORT_THRESHOLD: float = 0.05  # 5% alert threshold

    # Evidence tracking
    MIN_EVIDENCE_LINKS: int = 1  # Minimum links for Track B responses


# =============================================================================
# Original RAG Configuration (kept for backward compatibility)
# =============================================================================

@dataclass(frozen=True)
class RAGConfig:
    """RAG search and quality configuration"""
    MIN_RELEVANCE_SCORE: float = 0.3
    QUALITY_THRESHOLD: float = 0.6
    MAX_QUERY_RETRIES: int = 4  # 증가: 2 → 4 (Gemma 3 안정성 개선)
    FUZZY_MATCH_THRESHOLD: int = 70
    DEFAULT_TOP_K: int = 5
    KEYWORD_MATCH_GOOD_RATIO: float = 0.5

    # Response validation thresholds
    MIN_RESPONSE_LENGTH: int = 10
    MAX_RESPONSE_LENGTH: int = 4000

    # Timeout configuration (ms)
    LLM_RESPONSE_TIMEOUT: int = 30000  # 30초
    QUERY_TIMEOUT: int = 60000  # 1분


@dataclass(frozen=True)
class LLMConfig:
    """LLM generation configuration"""
    MAX_TOKENS: int = 8182
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.9
    REPEAT_PENALTY: float = 1.1
    CONTEXT_MESSAGE_LIMIT: int = 5


@dataclass(frozen=True)
class CacheConfig:
    """Redis cache configuration"""
    SESSION_TTL_HOURS: int = 1
    MESSAGE_CACHE_PREFIX: str = "chat:session:"


@dataclass(frozen=True)
class ConfidenceScores:
    """Response confidence scores by intent type"""
    CASUAL: float = 0.95
    PMS_QUERY: float = 0.70
    GENERAL: float = 0.80
    DEFAULT: float = 0.75
    MAX_CONFIDENCE: float = 0.95
    RAG_BOOST_PER_DOC: float = 0.05
    MAX_RAG_BOOST: float = 0.15


# =============================================================================
# Singleton Instances
# =============================================================================

# Two-Track Workflow
TRACK_A = TrackAConfig()
TRACK_B = TrackBConfig()
TRACK_ROUTER = TrackRouterConfig()

# L0/L1/L2 Architecture
POLICY = PolicyConfig()
L1_MODEL = L1ModelConfig()
L2_MODEL = L2ModelConfig()
SNAPSHOT = SnapshotConfig()

# Hybrid RAG & Sync
PG_NEO4J_SYNC = PGNeo4jSyncConfig()
HYBRID_RAG = HybridRAGConfig()

# Monitoring
MONITORING = MonitoringConfig()

# Original (backward compatibility)
RAG = RAGConfig()
LLM = LLMConfig()
CACHE = CacheConfig()
CONFIDENCE = ConfidenceScores()


# =============================================================================
# Paths
# =============================================================================
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def get_prompt(name: str) -> str:
    """Load prompt from file"""
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if prompt_file.exists():
        return prompt_file.read_text(encoding="utf-8").strip()
    raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
