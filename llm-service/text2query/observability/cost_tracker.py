"""
Cost Tracker for LLM Operations

Tracks token usage and calculates costs for LLM API calls.
Supports multiple models with configurable pricing.
"""
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
from enum import Enum

logger = logging.getLogger(__name__)


class ModelProvider(str, Enum):
    """LLM model providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    LOCAL = "local"  # Local models (Gemma, Llama, etc.)
    CUSTOM = "custom"


@dataclass
class TokenUsage:
    """Token usage for a single LLM call."""
    model: str
    provider: ModelProvider
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int = 0
    timestamp: datetime = field(default_factory=datetime.now)

    # Optional metadata
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[int] = None
    operation: str = "query_generation"

    def __post_init__(self):
        if self.total_tokens == 0:
            self.total_tokens = self.prompt_tokens + self.completion_tokens


@dataclass
class CostEntry:
    """Cost calculation for token usage."""
    usage: TokenUsage
    prompt_cost: float
    completion_cost: float
    total_cost: float
    currency: str = "USD"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "model": self.usage.model,
            "provider": self.usage.provider.value,
            "prompt_tokens": self.usage.prompt_tokens,
            "completion_tokens": self.usage.completion_tokens,
            "total_tokens": self.usage.total_tokens,
            "prompt_cost": self.prompt_cost,
            "completion_cost": self.completion_cost,
            "total_cost": self.total_cost,
            "currency": self.currency,
            "timestamp": self.usage.timestamp.isoformat(),
            "operation": self.usage.operation,
            "project_id": self.usage.project_id,
        }


# Default pricing per 1K tokens (as of 2025)
DEFAULT_PRICING = {
    # OpenAI models
    "gpt-4": {"prompt": 0.03, "completion": 0.06},
    "gpt-4-turbo": {"prompt": 0.01, "completion": 0.03},
    "gpt-4o": {"prompt": 0.005, "completion": 0.015},
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},

    # Anthropic models
    "claude-3-opus": {"prompt": 0.015, "completion": 0.075},
    "claude-3-sonnet": {"prompt": 0.003, "completion": 0.015},
    "claude-3-haiku": {"prompt": 0.00025, "completion": 0.00125},
    "claude-3.5-sonnet": {"prompt": 0.003, "completion": 0.015},

    # Google models
    "gemini-pro": {"prompt": 0.00025, "completion": 0.0005},
    "gemini-1.5-pro": {"prompt": 0.00125, "completion": 0.005},
    "gemini-1.5-flash": {"prompt": 0.000075, "completion": 0.0003},

    # Local models (free but track for comparison)
    "gemma-3-12b": {"prompt": 0.0, "completion": 0.0},
    "gemma-3-12b-q5": {"prompt": 0.0, "completion": 0.0},
    "llama-3": {"prompt": 0.0, "completion": 0.0},
    "mistral": {"prompt": 0.0, "completion": 0.0},

    # Default fallback
    "default": {"prompt": 0.001, "completion": 0.002},
}


class CostTracker:
    """
    Tracks costs for LLM operations.

    Features:
    - Token usage tracking per model
    - Cost calculation with configurable pricing
    - Budget alerts and limits
    - Cost aggregation by project, user, operation
    - Historical cost analysis
    """

    def __init__(
        self,
        pricing: Optional[Dict[str, Dict[str, float]]] = None,
        monthly_budget: Optional[float] = None,
        daily_budget: Optional[float] = None,
        retention_days: int = 30
    ):
        """
        Initialize the cost tracker.

        Args:
            pricing: Custom pricing per 1K tokens {model: {prompt: x, completion: y}}
            monthly_budget: Optional monthly budget limit (USD)
            daily_budget: Optional daily budget limit (USD)
            retention_days: Days to retain cost history
        """
        self.pricing = {**DEFAULT_PRICING, **(pricing or {})}
        self.monthly_budget = monthly_budget
        self.daily_budget = daily_budget
        self.retention_days = retention_days

        # Cost entries storage
        self._entries: List[CostEntry] = []

        # Aggregated counters
        self._total_cost = 0.0
        self._daily_cost: Dict[str, float] = defaultdict(float)  # date -> cost
        self._project_cost: Dict[int, float] = defaultdict(float)  # project_id -> cost
        self._model_cost: Dict[str, float] = defaultdict(float)  # model -> cost
        self._operation_cost: Dict[str, float] = defaultdict(float)  # operation -> cost

        # Token counters
        self._total_tokens = 0
        self._model_tokens: Dict[str, int] = defaultdict(int)

    def track(self, usage: TokenUsage) -> CostEntry:
        """
        Track token usage and calculate cost.

        Args:
            usage: TokenUsage instance

        Returns:
            CostEntry with calculated costs
        """
        # Get pricing for model
        model_key = self._normalize_model_name(usage.model)
        pricing = self.pricing.get(model_key, self.pricing["default"])

        # Calculate costs (price per 1K tokens)
        prompt_cost = (usage.prompt_tokens / 1000) * pricing["prompt"]
        completion_cost = (usage.completion_tokens / 1000) * pricing["completion"]
        total_cost = prompt_cost + completion_cost

        entry = CostEntry(
            usage=usage,
            prompt_cost=prompt_cost,
            completion_cost=completion_cost,
            total_cost=total_cost
        )

        # Store entry
        self._entries.append(entry)

        # Update counters
        self._total_cost += total_cost
        self._total_tokens += usage.total_tokens

        date_key = usage.timestamp.strftime("%Y-%m-%d")
        self._daily_cost[date_key] += total_cost

        if usage.project_id:
            self._project_cost[usage.project_id] += total_cost

        self._model_cost[usage.model] += total_cost
        self._model_tokens[usage.model] += usage.total_tokens
        self._operation_cost[usage.operation] += total_cost

        # Cleanup old entries
        self._cleanup_old_entries()

        # Check budget alerts
        self._check_budget_alerts()

        logger.debug(
            f"Tracked cost: ${total_cost:.6f} for {usage.model} "
            f"({usage.total_tokens} tokens)"
        )

        return entry

    def _normalize_model_name(self, model: str) -> str:
        """Normalize model name for pricing lookup."""
        model_lower = model.lower()

        # Try exact match first
        if model_lower in self.pricing:
            return model_lower

        # Try partial match
        for key in self.pricing:
            if key in model_lower or model_lower in key:
                return key

        return "default"

    def _cleanup_old_entries(self) -> None:
        """Remove entries older than retention period."""
        cutoff = datetime.now() - timedelta(days=self.retention_days)
        self._entries = [e for e in self._entries if e.usage.timestamp > cutoff]

    def _check_budget_alerts(self) -> None:
        """Check if budget limits are exceeded."""
        today = datetime.now().strftime("%Y-%m-%d")
        daily_spent = self._daily_cost.get(today, 0.0)

        if self.daily_budget and daily_spent > self.daily_budget:
            logger.warning(
                f"Daily budget exceeded: ${daily_spent:.4f} / ${self.daily_budget:.4f}"
            )

        if self.monthly_budget:
            monthly_spent = self.get_monthly_cost()
            if monthly_spent > self.monthly_budget:
                logger.warning(
                    f"Monthly budget exceeded: ${monthly_spent:.4f} / ${self.monthly_budget:.4f}"
                )

    def get_total_cost(self) -> float:
        """Get total cost across all time."""
        return self._total_cost

    def get_daily_cost(self, date: Optional[str] = None) -> float:
        """
        Get cost for a specific day.

        Args:
            date: Date string (YYYY-MM-DD), default is today

        Returns:
            Total cost for the day
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        return self._daily_cost.get(date, 0.0)

    def get_monthly_cost(self, year: Optional[int] = None, month: Optional[int] = None) -> float:
        """
        Get cost for a specific month.

        Args:
            year: Year (default: current year)
            month: Month (default: current month)

        Returns:
            Total cost for the month
        """
        if year is None:
            year = datetime.now().year
        if month is None:
            month = datetime.now().month

        prefix = f"{year}-{month:02d}"
        total = 0.0
        for date_key, cost in self._daily_cost.items():
            if date_key.startswith(prefix):
                total += cost
        return total

    def get_cost_by_project(self, project_id: int) -> float:
        """Get total cost for a project."""
        return self._project_cost.get(project_id, 0.0)

    def get_cost_by_model(self) -> Dict[str, float]:
        """Get cost breakdown by model."""
        return dict(self._model_cost)

    def get_cost_by_operation(self) -> Dict[str, float]:
        """Get cost breakdown by operation type."""
        return dict(self._operation_cost)

    def get_tokens_by_model(self) -> Dict[str, int]:
        """Get token usage breakdown by model."""
        return dict(self._model_tokens)

    def get_budget_status(self) -> Dict[str, Any]:
        """
        Get current budget status.

        Returns:
            Dictionary with budget usage info
        """
        today = datetime.now().strftime("%Y-%m-%d")
        daily_spent = self._daily_cost.get(today, 0.0)
        monthly_spent = self.get_monthly_cost()

        status = {
            "daily": {
                "spent": daily_spent,
                "budget": self.daily_budget,
                "remaining": (
                    self.daily_budget - daily_spent
                    if self.daily_budget else None
                ),
                "percentage": (
                    (daily_spent / self.daily_budget * 100)
                    if self.daily_budget else None
                )
            },
            "monthly": {
                "spent": monthly_spent,
                "budget": self.monthly_budget,
                "remaining": (
                    self.monthly_budget - monthly_spent
                    if self.monthly_budget else None
                ),
                "percentage": (
                    (monthly_spent / self.monthly_budget * 100)
                    if self.monthly_budget else None
                )
            },
            "total": {
                "spent": self._total_cost,
                "tokens": self._total_tokens,
            }
        }

        return status

    def get_cost_summary(
        self,
        window_days: int = 7
    ) -> Dict[str, Any]:
        """
        Get cost summary for dashboard.

        Args:
            window_days: Number of days to include

        Returns:
            Comprehensive cost summary
        """
        cutoff = datetime.now() - timedelta(days=window_days)
        recent_entries = [e for e in self._entries if e.usage.timestamp > cutoff]

        # Calculate daily breakdown
        daily_breakdown = defaultdict(float)
        for entry in recent_entries:
            date_key = entry.usage.timestamp.strftime("%Y-%m-%d")
            daily_breakdown[date_key] += entry.total_cost

        # Calculate model breakdown
        model_breakdown = defaultdict(float)
        for entry in recent_entries:
            model_breakdown[entry.usage.model] += entry.total_cost

        # Calculate operation breakdown
        operation_breakdown = defaultdict(float)
        for entry in recent_entries:
            operation_breakdown[entry.usage.operation] += entry.total_cost

        total_recent = sum(e.total_cost for e in recent_entries)
        total_tokens_recent = sum(e.usage.total_tokens for e in recent_entries)

        return {
            "window_days": window_days,
            "total_cost": total_recent,
            "total_tokens": total_tokens_recent,
            "avg_cost_per_query": (
                total_recent / len(recent_entries)
                if recent_entries else 0
            ),
            "avg_tokens_per_query": (
                total_tokens_recent / len(recent_entries)
                if recent_entries else 0
            ),
            "daily_breakdown": dict(sorted(daily_breakdown.items())),
            "model_breakdown": dict(model_breakdown),
            "operation_breakdown": dict(operation_breakdown),
            "budget_status": self.get_budget_status(),
            "query_count": len(recent_entries),
        }

    def get_recent_entries(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent cost entries for debugging."""
        return [e.to_dict() for e in self._entries[-limit:]]

    def set_pricing(self, model: str, prompt_per_1k: float, completion_per_1k: float) -> None:
        """
        Set custom pricing for a model.

        Args:
            model: Model name
            prompt_per_1k: Cost per 1K prompt tokens
            completion_per_1k: Cost per 1K completion tokens
        """
        self.pricing[model.lower()] = {
            "prompt": prompt_per_1k,
            "completion": completion_per_1k
        }
        logger.info(f"Set pricing for {model}: ${prompt_per_1k}/${completion_per_1k} per 1K tokens")


# Singleton instance
_cost_tracker: Optional[CostTracker] = None


def get_cost_tracker(**kwargs) -> CostTracker:
    """Get or create the cost tracker singleton."""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = CostTracker(**kwargs)
    return _cost_tracker


def reset_cost_tracker() -> None:
    """Reset the cost tracker singleton (for testing)."""
    global _cost_tracker
    _cost_tracker = None
