"""
Status Query Plan Schema and Validation

Defines structured JSON schema for status query plans with whitelist validation.
LLM generates plans in this format, code validates and executes them.

Reference: docs/STATUS_QUERY_IMPLEMENTATION_PLAN.md
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any, Set
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# Whitelist Definitions
# =============================================================================

ALLOWED_METRICS: Set[str] = {
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
    "active_sprint",
    "project_summary",
}

ALLOWED_GROUP_BY: Set[str] = {
    "sprint",
    "assignee",
    "priority",
    "epic",
    "feature",
    "status",
}

ALLOWED_TIME_MODES: Set[str] = {
    "current",
    "this_week",
    "last_week",
    "this_sprint",
    "last_sprint",
    "this_month",
    "custom",
}

ALLOWED_STATUS_FILTERS: Set[str] = {
    "IDEA",
    "REFINED",
    "READY",
    "IN_SPRINT",
    "IN_PROGRESS",
    "REVIEW",
    "DONE",
    "CANCELLED",
    "BLOCKED",
}

# Metric access level requirements (minimum level to access)
METRIC_ACCESS_LEVELS: Dict[str, int] = {
    "story_counts_by_status": 1,
    "completion_rate": 1,
    "wip_status": 1,
    "blocked_items": 1,
    "overdue_items": 1,
    "recent_activity": 1,
    "active_sprint": 1,
    "project_summary": 1,
    "sprint_burndown": 2,
    "velocity": 2,
    "issue_summary": 2,
    "risk_summary": 2,
}


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class QueryScope:
    """Query scope definition"""
    project_id: Optional[str] = None
    sprint_id: Optional[str] = None
    epic_id: Optional[str] = None
    feature_id: Optional[str] = None
    story_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class TimeRange:
    """Time range for query"""
    mode: str = "current"  # "current", "this_week", "last_sprint", "custom"
    start: Optional[str] = None  # ISO date string
    end: Optional[str] = None    # ISO date string

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class QueryFilters:
    """Query filters"""
    access_level_max: int = 6      # Injected by system
    assignee_id: Optional[str] = None
    status_in: Optional[List[str]] = None
    priority_in: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {"access_level_max": self.access_level_max}
        if self.assignee_id:
            result["assignee_id"] = self.assignee_id
        if self.status_in:
            result["status_in"] = self.status_in
        if self.priority_in:
            result["priority_in"] = self.priority_in
        return result


@dataclass
class OutputConfig:
    """Output configuration"""
    blocked_top_n: int = 5
    overdue_top_n: int = 5
    activity_top_n: int = 10
    activity_days: int = 7
    include_details: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StatusQueryPlan:
    """
    Status Query Plan schema.

    LLM generates this plan, which is then validated and executed.
    """
    answer_type: str = "status_metric"  # "status_metric", "status_list", "status_drilldown"

    scope: QueryScope = field(default_factory=QueryScope)
    time_range: TimeRange = field(default_factory=TimeRange)
    metrics: List[str] = field(default_factory=list)
    group_by: List[str] = field(default_factory=list)
    filters: QueryFilters = field(default_factory=QueryFilters)
    output: OutputConfig = field(default_factory=OutputConfig)

    # Metadata (populated during validation)
    validated: bool = False
    validation_errors: List[str] = field(default_factory=list)
    validation_warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "answer_type": self.answer_type,
            "scope": self.scope.to_dict(),
            "time_range": self.time_range.to_dict(),
            "metrics": self.metrics,
            "group_by": self.group_by,
            "filters": self.filters.to_dict(),
            "output": self.output.to_dict(),
        }

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StatusQueryPlan":
        """Create from dictionary"""
        plan = cls()
        plan.answer_type = data.get("answer_type", "status_metric")

        # Parse scope
        scope_data = data.get("scope", {})
        plan.scope = QueryScope(
            project_id=scope_data.get("project_id"),
            sprint_id=scope_data.get("sprint_id"),
            epic_id=scope_data.get("epic_id"),
            feature_id=scope_data.get("feature_id"),
            story_id=scope_data.get("story_id"),
        )

        # Parse time range
        time_data = data.get("time_range", {})
        plan.time_range = TimeRange(
            mode=time_data.get("mode", "current"),
            start=time_data.get("start"),
            end=time_data.get("end"),
        )

        # Parse metrics
        plan.metrics = data.get("metrics", [])

        # Parse group by
        plan.group_by = data.get("group_by", [])

        # Parse filters
        filter_data = data.get("filters", {})
        plan.filters = QueryFilters(
            access_level_max=filter_data.get("access_level_max", 6),
            assignee_id=filter_data.get("assignee_id"),
            status_in=filter_data.get("status_in"),
            priority_in=filter_data.get("priority_in"),
        )

        # Parse output config
        output_data = data.get("output", {})
        plan.output = OutputConfig(
            blocked_top_n=output_data.get("blocked_top_n", 5),
            overdue_top_n=output_data.get("overdue_top_n", 5),
            activity_top_n=output_data.get("activity_top_n", 10),
            activity_days=output_data.get("activity_days", 7),
            include_details=output_data.get("include_details", True),
        )

        return plan

    @classmethod
    def from_json(cls, json_str: str) -> "StatusQueryPlan":
        """Create from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)


# =============================================================================
# Plan Validator
# =============================================================================

class StatusQueryPlanValidator:
    """
    Validates StatusQueryPlan against whitelist rules.

    Validation rules:
    1. project_id is required (can be injected from context)
    2. metrics must be in whitelist
    3. group_by must be in whitelist
    4. time_range.mode must be in whitelist
    5. status_in filters must be valid statuses
    6. access_level is enforced (system injects, cannot be elevated by LLM)
    """

    def validate(
        self,
        plan: StatusQueryPlan,
        user_access_level: int,
        default_project_id: Optional[str] = None,
    ) -> StatusQueryPlan:
        """
        Validate and normalize the query plan.

        Args:
            plan: The plan to validate
            user_access_level: User's access level (will be enforced)
            default_project_id: Default project ID if not specified

        Returns:
            Validated plan (modified in place)
        """
        plan.validation_errors = []
        plan.validation_warnings = []

        # 1. Validate and set project_id
        if not plan.scope.project_id:
            if default_project_id:
                plan.scope.project_id = default_project_id
                plan.validation_warnings.append(
                    f"project_id not specified, using default: {default_project_id}"
                )
            else:
                plan.validation_errors.append("project_id is required")

        # 2. Validate metrics
        invalid_metrics = [m for m in plan.metrics if m not in ALLOWED_METRICS]
        if invalid_metrics:
            plan.validation_errors.append(
                f"Invalid metrics: {invalid_metrics}. Allowed: {sorted(ALLOWED_METRICS)}"
            )
            # Remove invalid metrics
            plan.metrics = [m for m in plan.metrics if m in ALLOWED_METRICS]

        # Check metric access levels
        for metric in plan.metrics:
            required_level = METRIC_ACCESS_LEVELS.get(metric, 1)
            if user_access_level < required_level:
                plan.validation_warnings.append(
                    f"Metric '{metric}' requires access level {required_level}, "
                    f"user has {user_access_level}. Removing."
                )
                plan.metrics.remove(metric)

        # Set default metrics if none specified
        if not plan.metrics:
            plan.metrics = ["story_counts_by_status", "completion_rate"]
            plan.validation_warnings.append(
                "No valid metrics specified, using defaults: story_counts_by_status, completion_rate"
            )

        # 3. Validate group_by
        invalid_groups = [g for g in plan.group_by if g not in ALLOWED_GROUP_BY]
        if invalid_groups:
            plan.validation_errors.append(
                f"Invalid group_by: {invalid_groups}. Allowed: {sorted(ALLOWED_GROUP_BY)}"
            )
            plan.group_by = [g for g in plan.group_by if g in ALLOWED_GROUP_BY]

        # 4. Validate time range mode
        if plan.time_range.mode not in ALLOWED_TIME_MODES:
            plan.validation_warnings.append(
                f"Invalid time mode '{plan.time_range.mode}', defaulting to 'current'"
            )
            plan.time_range.mode = "current"

        # 5. Validate status filters
        if plan.filters.status_in:
            invalid_statuses = [s for s in plan.filters.status_in if s not in ALLOWED_STATUS_FILTERS]
            if invalid_statuses:
                plan.validation_warnings.append(
                    f"Invalid status filters: {invalid_statuses}. Removing."
                )
                plan.filters.status_in = [s for s in plan.filters.status_in if s in ALLOWED_STATUS_FILTERS]

        # 6. CRITICAL: Enforce access level (cannot be elevated by LLM)
        plan.filters.access_level_max = min(
            plan.filters.access_level_max,
            user_access_level
        )

        # 7. Validate output limits
        plan.output.blocked_top_n = min(max(1, plan.output.blocked_top_n), 20)
        plan.output.overdue_top_n = min(max(1, plan.output.overdue_top_n), 20)
        plan.output.activity_top_n = min(max(1, plan.output.activity_top_n), 50)
        plan.output.activity_days = min(max(1, plan.output.activity_days), 30)

        # Set validation status
        plan.validated = len(plan.validation_errors) == 0

        if plan.validation_errors:
            logger.warning(f"Plan validation errors: {plan.validation_errors}")
        if plan.validation_warnings:
            logger.info(f"Plan validation warnings: {plan.validation_warnings}")

        return plan

    def is_valid(self, plan: StatusQueryPlan) -> bool:
        """Check if plan is valid"""
        return plan.validated and len(plan.validation_errors) == 0


# =============================================================================
# Plan Generator (LLM Prompt)
# =============================================================================

PLAN_GENERATION_PROMPT = """You are a PMS query planner. Generate a JSON query plan based on the user's question.

User question: {question}
User context: project_id={project_id}, access_level={access_level}
Current sprint: {current_sprint}

Available metrics (choose relevant ones):
- story_counts_by_status: Count stories by status (IDEA, REFINED, READY, IN_SPRINT, IN_PROGRESS, REVIEW, DONE)
- completion_rate: Calculate completion percentage
- blocked_items: List blocked tasks/stories
- overdue_items: List overdue items
- recent_activity: Recent changes in last N days
- sprint_burndown: Sprint burndown data
- velocity: Team velocity (story points per sprint)
- wip_status: Work in progress vs limit
- risk_summary: Active risks summary
- issue_summary: Open issues summary
- active_sprint: Current active sprint info
- project_summary: Project overview

Available group_by: sprint, assignee, priority, epic, feature, status
Available time modes: current, this_week, last_week, this_sprint, last_sprint, this_month

Output ONLY valid JSON in this exact format (no explanation):
{{
  "answer_type": "status_metric",
  "scope": {{"project_id": "{project_id}", "sprint_id": null}},
  "time_range": {{"mode": "current", "start": null, "end": null}},
  "metrics": ["completion_rate", "story_counts_by_status"],
  "group_by": [],
  "filters": {{}},
  "output": {{"blocked_top_n": 5, "overdue_top_n": 5, "activity_days": 7}}
}}"""


def get_plan_generation_prompt(
    question: str,
    project_id: str,
    access_level: int,
    current_sprint: Optional[str] = None,
) -> str:
    """Generate the LLM prompt for plan generation"""
    return PLAN_GENERATION_PROMPT.format(
        question=question,
        project_id=project_id,
        access_level=access_level,
        current_sprint=current_sprint or "Unknown",
    )


# =============================================================================
# Convenience Functions
# =============================================================================

def create_default_plan(project_id: str, access_level: int = 6) -> StatusQueryPlan:
    """Create a default status query plan"""
    plan = StatusQueryPlan(
        answer_type="status_metric",
        scope=QueryScope(project_id=project_id),
        time_range=TimeRange(mode="current"),
        metrics=["story_counts_by_status", "completion_rate", "active_sprint"],
        group_by=[],
        filters=QueryFilters(access_level_max=access_level),
        output=OutputConfig(),
    )
    plan.validated = True
    return plan


def validate_plan(
    plan: StatusQueryPlan,
    user_access_level: int,
    default_project_id: Optional[str] = None,
) -> StatusQueryPlan:
    """Validate a query plan"""
    validator = StatusQueryPlanValidator()
    return validator.validate(plan, user_access_level, default_project_id)


def parse_llm_plan_response(
    response: str,
    user_access_level: int,
    default_project_id: Optional[str] = None,
) -> StatusQueryPlan:
    """
    Parse LLM response and create validated plan.

    Handles common LLM response issues:
    - Extra text before/after JSON
    - Markdown code blocks
    """
    # Extract JSON from response
    json_str = response.strip()

    # Remove markdown code blocks
    if "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0]
    elif "```" in json_str:
        json_str = json_str.split("```")[1].split("```")[0]

    # Try to find JSON object
    start_idx = json_str.find("{")
    end_idx = json_str.rfind("}") + 1
    if start_idx >= 0 and end_idx > start_idx:
        json_str = json_str[start_idx:end_idx]

    try:
        plan = StatusQueryPlan.from_json(json_str)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse LLM plan response: {e}")
        # Create default plan on parse failure
        plan = create_default_plan(
            project_id=default_project_id or "unknown",
            access_level=user_access_level
        )
        plan.validation_warnings.append(f"LLM response parse failed: {str(e)}")

    # Validate the plan
    return validate_plan(plan, user_access_level, default_project_id)
