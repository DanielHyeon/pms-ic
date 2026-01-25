"""
Value Metrics Module - Business Value Measurement

Provides:
- Efficiency metrics (time savings, automation rate)
- Quality metrics (accuracy, error rate)
- Adoption metrics (usage, acceptance rate)
- Cost metrics (cost per action, token efficiency)

Purpose:
Measure and demonstrate the business value delivered by the AI system.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class MetricCategory(Enum):
    """Categories of value metrics."""
    EFFICIENCY = "efficiency"
    QUALITY = "quality"
    ADOPTION = "adoption"
    COST = "cost"


class TimeUnit(Enum):
    """Time units for measurements."""
    SECONDS = "seconds"
    MINUTES = "minutes"
    HOURS = "hours"
    DAYS = "days"


@dataclass
class MetricDefinition:
    """
    Definition of a value metric.

    Attributes:
        name: Metric name
        description: Metric description
        category: Metric category
        unit: Unit of measurement
        higher_is_better: Whether higher values are better
        target: Target value
        baseline: Baseline (before AI) value
    """
    name: str
    description: str
    category: MetricCategory
    unit: str
    higher_is_better: bool = True
    target: Optional[float] = None
    baseline: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "unit": self.unit,
            "higher_is_better": self.higher_is_better,
            "target": self.target,
            "baseline": self.baseline,
        }


@dataclass
class MetricObservation:
    """
    Single observation of a metric value.

    Attributes:
        metric_name: Name of the metric
        value: Observed value
        timestamp: When observed
        context: Additional context
        project_id: Associated project
        user_id: Associated user
    """
    metric_name: str
    value: float
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    context: Dict[str, Any] = field(default_factory=dict)
    project_id: Optional[str] = None
    user_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric_name": self.metric_name,
            "value": self.value,
            "timestamp": self.timestamp,
            "context": self.context,
            "project_id": self.project_id,
            "user_id": self.user_id,
        }


@dataclass
class MetricReport:
    """
    Aggregated metric report.

    Attributes:
        metric_name: Name of the metric
        period: Report period (e.g., "weekly", "monthly")
        observations: Number of observations
        current_value: Most recent value
        average: Average over period
        min_value: Minimum value
        max_value: Maximum value
        trend: Trend direction
        improvement: Improvement vs baseline
    """
    metric_name: str
    period: str
    observations: int
    current_value: float
    average: float
    min_value: float
    max_value: float
    trend: str = "stable"  # increasing, decreasing, stable
    improvement: Optional[float] = None  # percentage improvement

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric_name": self.metric_name,
            "period": self.period,
            "observations": self.observations,
            "current_value": self.current_value,
            "average": self.average,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "trend": self.trend,
            "improvement": self.improvement,
        }


# Pre-defined metrics

EFFICIENCY_METRICS = [
    MetricDefinition(
        name="report_generation_time",
        description="Time to generate a report (minutes)",
        category=MetricCategory.EFFICIENCY,
        unit="minutes",
        higher_is_better=False,
        target=5.0,
        baseline=60.0,
    ),
    MetricDefinition(
        name="planning_time",
        description="Time spent on sprint planning (hours)",
        category=MetricCategory.EFFICIENCY,
        unit="hours",
        higher_is_better=False,
        target=1.0,
        baseline=4.0,
    ),
    MetricDefinition(
        name="query_response_time",
        description="Time to answer a knowledge query (seconds)",
        category=MetricCategory.EFFICIENCY,
        unit="seconds",
        higher_is_better=False,
        target=10.0,
        baseline=300.0,
    ),
    MetricDefinition(
        name="automation_rate",
        description="Percentage of tasks automated",
        category=MetricCategory.EFFICIENCY,
        unit="percent",
        higher_is_better=True,
        target=80.0,
        baseline=0.0,
    ),
]

QUALITY_METRICS = [
    MetricDefinition(
        name="risk_detection_accuracy",
        description="Accuracy of risk detection",
        category=MetricCategory.QUALITY,
        unit="percent",
        higher_is_better=True,
        target=90.0,
        baseline=50.0,
    ),
    MetricDefinition(
        name="false_positive_rate",
        description="False positive rate for alerts",
        category=MetricCategory.QUALITY,
        unit="percent",
        higher_is_better=False,
        target=5.0,
        baseline=30.0,
    ),
    MetricDefinition(
        name="traceability_score",
        description="Overall traceability score",
        category=MetricCategory.QUALITY,
        unit="percent",
        higher_is_better=True,
        target=95.0,
        baseline=60.0,
    ),
    MetricDefinition(
        name="evidence_grounding_rate",
        description="Percentage of AI responses with evidence",
        category=MetricCategory.QUALITY,
        unit="percent",
        higher_is_better=True,
        target=98.0,
        baseline=0.0,
    ),
]

ADOPTION_METRICS = [
    MetricDefinition(
        name="ai_response_acceptance",
        description="Rate of AI responses accepted by users",
        category=MetricCategory.ADOPTION,
        unit="percent",
        higher_is_better=True,
        target=70.0,
        baseline=None,
    ),
    MetricDefinition(
        name="human_intervention_rate",
        description="Rate of human intervention required",
        category=MetricCategory.ADOPTION,
        unit="percent",
        higher_is_better=False,
        target=20.0,
        baseline=100.0,
    ),
    MetricDefinition(
        name="escalation_rate",
        description="Rate of requests escalated to humans",
        category=MetricCategory.ADOPTION,
        unit="percent",
        higher_is_better=False,
        target=10.0,
        baseline=100.0,
    ),
    MetricDefinition(
        name="daily_active_users",
        description="Number of daily active AI users",
        category=MetricCategory.ADOPTION,
        unit="users",
        higher_is_better=True,
        target=None,
        baseline=0,
    ),
]

COST_METRICS = [
    MetricDefinition(
        name="cost_per_report",
        description="Cost to generate one report",
        category=MetricCategory.COST,
        unit="USD",
        higher_is_better=False,
        target=0.50,
        baseline=50.0,  # Human labor cost
    ),
    MetricDefinition(
        name="token_efficiency",
        description="Useful output per token",
        category=MetricCategory.COST,
        unit="ratio",
        higher_is_better=True,
        target=0.8,
        baseline=None,
    ),
    MetricDefinition(
        name="monthly_ai_cost",
        description="Total monthly AI operational cost",
        category=MetricCategory.COST,
        unit="USD",
        higher_is_better=False,
        target=None,
        baseline=None,
    ),
]

ALL_METRICS = EFFICIENCY_METRICS + QUALITY_METRICS + ADOPTION_METRICS + COST_METRICS


# Import submodules
from .collector import ValueMetricsCollector, get_collector


__all__ = [
    # Enums
    "MetricCategory",
    "TimeUnit",
    # Data classes
    "MetricDefinition",
    "MetricObservation",
    "MetricReport",
    # Pre-defined metrics
    "EFFICIENCY_METRICS",
    "QUALITY_METRICS",
    "ADOPTION_METRICS",
    "COST_METRICS",
    "ALL_METRICS",
    # Collector
    "ValueMetricsCollector",
    "get_collector",
]
