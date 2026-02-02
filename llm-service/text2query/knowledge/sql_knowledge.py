"""
SQL Knowledge Components

Manages calculated fields, metrics, and SQL functions for query generation.
Provides contextual help for the LLM to generate better queries.
"""
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CalculatedFieldInfo:
    """Information about a calculated/derived field."""
    name: str
    expression: str
    return_type: str
    description: str
    model: str


@dataclass
class SQLFunctionInfo:
    """Information about a SQL function."""
    name: str
    syntax: str
    description: str
    examples: List[str]
    category: str  # aggregate, date, string, conditional, etc.


class SQLKnowledgeManager:
    """
    Manages SQL knowledge for enhanced query generation.

    Provides:
    - Calculated field definitions from semantic layer
    - Metric templates
    - SQL function documentation (PostgreSQL)
    - JSON field access patterns
    - Common query patterns
    """

    def __init__(self):
        self._semantic_layer = None
        self._calculated_fields: Dict[str, CalculatedFieldInfo] = {}
        self._sql_functions: Dict[str, SQLFunctionInfo] = {}
        self._initialized = False

    def _ensure_initialized(self) -> None:
        """Initialize knowledge from semantic layer and defaults."""
        if self._initialized:
            return

        # Load semantic layer
        try:
            from ..semantic import get_semantic_layer
            self._semantic_layer = get_semantic_layer()

            # Extract calculated fields from semantic layer
            for model in self._semantic_layer.models.values():
                for col in model.columns:
                    if col.expression:
                        key = f"{model.name}.{col.name}"
                        self._calculated_fields[key] = CalculatedFieldInfo(
                            name=col.name,
                            expression=col.expression,
                            return_type=col.type,
                            description=col.description or "",
                            model=model.name
                        )
        except Exception as e:
            logger.warning(f"Could not load semantic layer for knowledge: {e}")

        # Load default SQL functions
        self._load_default_functions()
        self._initialized = True
        logger.info(f"SQLKnowledgeManager initialized with {len(self._sql_functions)} functions")

    def _load_default_functions(self) -> None:
        """Load PostgreSQL function documentation."""
        self._sql_functions = {
            # =========== Aggregate Functions ===========
            "COUNT": SQLFunctionInfo(
                name="COUNT",
                syntax="COUNT(*) | COUNT(column) | COUNT(DISTINCT column)",
                description="Counts rows or non-null values",
                examples=[
                    "COUNT(*) -- count all rows",
                    "COUNT(assignee_id) -- count non-null values",
                    "COUNT(DISTINCT status) -- count unique statuses"
                ],
                category="aggregate"
            ),
            "SUM": SQLFunctionInfo(
                name="SUM",
                syntax="SUM(numeric_column)",
                description="Sums numeric values, ignores NULL",
                examples=[
                    "SUM(story_points)",
                    "SUM(estimated_hours)"
                ],
                category="aggregate"
            ),
            "AVG": SQLFunctionInfo(
                name="AVG",
                syntax="AVG(numeric_column)",
                description="Calculates average of numeric values",
                examples=[
                    "AVG(story_points)",
                    "AVG(actual_hours)"
                ],
                category="aggregate"
            ),
            "MAX": SQLFunctionInfo(
                name="MAX",
                syntax="MAX(column)",
                description="Returns maximum value",
                examples=[
                    "MAX(created_at)",
                    "MAX(story_points)"
                ],
                category="aggregate"
            ),
            "MIN": SQLFunctionInfo(
                name="MIN",
                syntax="MIN(column)",
                description="Returns minimum value",
                examples=[
                    "MIN(start_date)",
                    "MIN(priority)"
                ],
                category="aggregate"
            ),
            "FILTER": SQLFunctionInfo(
                name="FILTER",
                syntax="aggregate_function(...) FILTER (WHERE condition)",
                description="Applies filter to aggregate function (PostgreSQL)",
                examples=[
                    "COUNT(*) FILTER (WHERE status = 'DONE')",
                    "SUM(hours) FILTER (WHERE billable = true)",
                    "COUNT(*) FILTER (WHERE status = 'DONE') * 100.0 / NULLIF(COUNT(*), 0) as completion_rate"
                ],
                category="aggregate"
            ),

            # =========== Date Functions ===========
            "DATE_TRUNC": SQLFunctionInfo(
                name="DATE_TRUNC",
                syntax="DATE_TRUNC('unit', timestamp)",
                description="Truncates timestamp to specified precision (year, quarter, month, week, day, hour)",
                examples=[
                    "DATE_TRUNC('month', created_at)",
                    "DATE_TRUNC('week', start_date)",
                    "DATE_TRUNC('day', NOW())"
                ],
                category="date"
            ),
            "NOW": SQLFunctionInfo(
                name="NOW",
                syntax="NOW()",
                description="Returns current timestamp with timezone",
                examples=[
                    "NOW()",
                    "NOW() - INTERVAL '1 month'",
                    "WHERE created_at > NOW() - INTERVAL '7 days'"
                ],
                category="date"
            ),
            "CURRENT_DATE": SQLFunctionInfo(
                name="CURRENT_DATE",
                syntax="CURRENT_DATE",
                description="Returns current date (no time)",
                examples=[
                    "WHERE end_date < CURRENT_DATE",
                    "WHERE start_date >= CURRENT_DATE - 30"
                ],
                category="date"
            ),
            "INTERVAL": SQLFunctionInfo(
                name="INTERVAL",
                syntax="INTERVAL 'value unit'",
                description="Represents a time interval for date arithmetic",
                examples=[
                    "INTERVAL '1 month'",
                    "INTERVAL '7 days'",
                    "INTERVAL '2 weeks'",
                    "NOW() - INTERVAL '1 week'"
                ],
                category="date"
            ),
            "EXTRACT": SQLFunctionInfo(
                name="EXTRACT",
                syntax="EXTRACT(field FROM timestamp)",
                description="Extracts date/time component (year, month, day, hour, dow)",
                examples=[
                    "EXTRACT(MONTH FROM created_at)",
                    "EXTRACT(YEAR FROM start_date)",
                    "EXTRACT(DOW FROM completed_at) -- day of week (0=Sun)"
                ],
                category="date"
            ),
            "AGE": SQLFunctionInfo(
                name="AGE",
                syntax="AGE(timestamp, timestamp) | AGE(timestamp)",
                description="Calculates interval between timestamps",
                examples=[
                    "AGE(NOW(), created_at)",
                    "EXTRACT(DAY FROM AGE(end_date, start_date))"
                ],
                category="date"
            ),

            # =========== String Functions ===========
            "CONCAT": SQLFunctionInfo(
                name="CONCAT",
                syntax="CONCAT(string1, string2, ...)",
                description="Concatenates strings (NULL becomes empty)",
                examples=[
                    "CONCAT(first_name, ' ', last_name)",
                    "CONCAT('#', id::text)"
                ],
                category="string"
            ),
            "LOWER": SQLFunctionInfo(
                name="LOWER",
                syntax="LOWER(string)",
                description="Converts to lowercase",
                examples=[
                    "LOWER(status)",
                    "WHERE LOWER(email) = LOWER(:email)"
                ],
                category="string"
            ),
            "UPPER": SQLFunctionInfo(
                name="UPPER",
                syntax="UPPER(string)",
                description="Converts to uppercase",
                examples=["UPPER(code)"],
                category="string"
            ),
            "LIKE": SQLFunctionInfo(
                name="LIKE",
                syntax="column LIKE 'pattern'",
                description="Pattern matching: % = any chars, _ = single char",
                examples=[
                    "title LIKE '%bug%'",
                    "name LIKE 'Sprint%'"
                ],
                category="string"
            ),
            "ILIKE": SQLFunctionInfo(
                name="ILIKE",
                syntax="column ILIKE 'pattern'",
                description="Case-insensitive pattern matching (PostgreSQL)",
                examples=[
                    "title ILIKE '%urgent%'",
                    "description ILIKE '%error%'"
                ],
                category="string"
            ),
            "COALESCE": SQLFunctionInfo(
                name="COALESCE",
                syntax="COALESCE(value1, value2, ...)",
                description="Returns first non-null value",
                examples=[
                    "COALESCE(actual_hours, estimated_hours, 0)",
                    "COALESCE(description, 'No description')"
                ],
                category="conditional"
            ),
            "NULLIF": SQLFunctionInfo(
                name="NULLIF",
                syntax="NULLIF(value1, value2)",
                description="Returns null if values are equal (useful for division)",
                examples=[
                    "100.0 / NULLIF(COUNT(*), 0) -- avoid division by zero",
                    "NULLIF(status, '')"
                ],
                category="conditional"
            ),

            # =========== Conditional ===========
            "CASE": SQLFunctionInfo(
                name="CASE",
                syntax="CASE WHEN condition THEN result [WHEN...] [ELSE default] END",
                description="Conditional expression",
                examples=[
                    "CASE WHEN status = 'DONE' THEN 1 ELSE 0 END",
                    "CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END",
                    "CASE WHEN story_points > 8 THEN 'large' WHEN story_points > 3 THEN 'medium' ELSE 'small' END"
                ],
                category="conditional"
            ),

            # =========== Type Casting ===========
            "CAST": SQLFunctionInfo(
                name="CAST / ::",
                syntax="CAST(value AS type) or value::type",
                description="Converts value to specified type",
                examples=[
                    "CAST(id AS text)",
                    "story_points::decimal",
                    "'2024-01-01'::date",
                    "progress::integer"
                ],
                category="type"
            ),
        }

    def get_calculated_field_instructions(
        self,
        models: List[str]
    ) -> str:
        """
        Generate instructions for calculated fields in specified models.

        Args:
            models: List of model names to get calculated fields for

        Returns:
            Formatted string with calculated field instructions
        """
        self._ensure_initialized()
        instructions = []

        for model_name in models:
            for key, field in self._calculated_fields.items():
                if field.model == model_name:
                    instructions.append(
                        f"- **{model_name}.{field.name}**: Use expression `{field.expression}` "
                        f"(returns {field.return_type})"
                    )
                    if field.description:
                        instructions.append(f"  Description: {field.description}")

        if not instructions:
            return ""

        return "## Calculated Fields\nThese fields are computed, use the expressions directly:\n" + "\n".join(instructions)

    def get_metric_instructions(self) -> str:
        """Generate instructions for predefined metrics."""
        self._ensure_initialized()

        if not self._semantic_layer:
            return ""

        instructions = ["## Predefined Metrics\nUse these patterns for common metrics:"]

        for metric in self._semantic_layer.metrics.values():
            dimensions = ", ".join(metric.dimension) if metric.dimension else "None"
            measures = ", ".join(metric.measure)

            instructions.append(
                f"\n### {metric.display_name or metric.name}\n"
                f"- Description: {metric.description or 'N/A'}\n"
                f"- Base Table: {metric.base_model}\n"
                f"- Dimensions (GROUP BY): {dimensions}\n"
                f"- Measures: `{measures}`\n"
                f"- Time Grain: {metric.time_grain or 'N/A'}"
            )

        return "\n".join(instructions)

    def get_sql_functions_context(
        self,
        categories: Optional[List[str]] = None
    ) -> str:
        """
        Generate SQL functions documentation for prompt.

        Args:
            categories: Optional filter for function categories

        Returns:
            Formatted string with function documentation
        """
        self._ensure_initialized()
        context = ["## Available SQL Functions (PostgreSQL)"]

        funcs_by_category: Dict[str, List[SQLFunctionInfo]] = {}
        for func in self._sql_functions.values():
            if categories and func.category not in categories:
                continue
            if func.category not in funcs_by_category:
                funcs_by_category[func.category] = []
            funcs_by_category[func.category].append(func)

        # Order categories sensibly
        category_order = ["aggregate", "date", "string", "conditional", "type"]
        for category in category_order:
            if category not in funcs_by_category:
                continue
            funcs = funcs_by_category[category]
            context.append(f"\n### {category.title()} Functions")
            for func in funcs:
                context.append(f"- **{func.name}**: {func.description}")
                context.append(f"  - Syntax: `{func.syntax}`")
                context.append(f"  - Example: `{func.examples[0]}`")

        return "\n".join(context)

    def get_json_field_instructions(self) -> str:
        """Generate instructions for JSON field access (PostgreSQL)."""
        return """## JSON Field Access (PostgreSQL JSONB)
- Get text value: `column->>'key'` (returns text)
- Get JSON value: `column->'key'` (returns JSON)
- Nested access: `column->'level1'->>'level2'`
- Array element: `column->0` (first element), `column->>0` (as text)
- Check key exists: `column ? 'key'`
- Example: `metadata->>'author'` to get metadata.author as text"""

    def get_common_patterns(self) -> str:
        """Get common SQL query patterns for PMS domain."""
        return """## Common Query Patterns

### Count with Percentage
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'DONE') as completed,
  COUNT(*) FILTER (WHERE status = 'DONE') * 100.0 / NULLIF(COUNT(*), 0) as completion_rate
FROM task.tasks
WHERE project_id = :project_id
```

### Group by Status with Order
```sql
SELECT status, COUNT(*) as count
FROM task.tasks
WHERE project_id = :project_id
GROUP BY status
ORDER BY CASE status
  WHEN 'BLOCKED' THEN 1
  WHEN 'IN_PROGRESS' THEN 2
  WHEN 'TODO' THEN 3
  WHEN 'DONE' THEN 4
END
```

### Date Range Filter (Last N Days)
```sql
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND project_id = :project_id
```

### Join with User Names
```sql
SELECT t.title, u.full_name as assignee_name
FROM task.tasks t
LEFT JOIN auth.users u ON t.assignee_id = u.id
WHERE t.project_id = :project_id
```
"""

    def get_full_context(
        self,
        models: Optional[List[str]] = None,
        include_functions: bool = True,
        include_metrics: bool = True,
        include_patterns: bool = False
    ) -> str:
        """
        Get full SQL knowledge context for LLM prompt.

        Args:
            models: Models to include calculated fields for
            include_functions: Include SQL function docs
            include_metrics: Include metric definitions
            include_patterns: Include common patterns

        Returns:
            Combined knowledge context string
        """
        self._ensure_initialized()
        parts = []

        if models:
            calc_fields = self.get_calculated_field_instructions(models)
            if calc_fields:
                parts.append(calc_fields)

        if include_metrics:
            metrics = self.get_metric_instructions()
            if metrics:
                parts.append(metrics)

        if include_functions:
            parts.append(self.get_sql_functions_context())

        parts.append(self.get_json_field_instructions())

        if include_patterns:
            parts.append(self.get_common_patterns())

        return "\n\n".join(parts)


# Singleton instance
_sql_knowledge: Optional[SQLKnowledgeManager] = None


def get_sql_knowledge() -> SQLKnowledgeManager:
    """Get or create SQL knowledge manager singleton."""
    global _sql_knowledge
    if _sql_knowledge is None:
        _sql_knowledge = SQLKnowledgeManager()
    return _sql_knowledge


def reset_sql_knowledge() -> None:
    """Reset the SQL knowledge manager singleton (for testing)."""
    global _sql_knowledge
    _sql_knowledge = None
