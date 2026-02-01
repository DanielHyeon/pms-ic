"""
Semantic Layer - MDL Parser and Resolver

Bridges business terminology and database schema for intelligent SQL generation.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, NamedTuple
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class MetricHint(NamedTuple):
    """Metric type hint for intelligent table selection."""
    tables: List[str]
    metric_type: str  # count, sum, avg, rate, list
    grain: str        # task, story, sprint, project


# Dynamic top-k configuration
MIN_RELEVANCE_SCORE = 2   # Minimum score to include a model
SCORE_DROP_RATIO = 0.5    # Include if score >= top_score * ratio
MAX_MODELS = 5            # Hard cap on returned models

# Relationship triggers for auto-expansion
# When these keywords are detected, automatically include related tables via JOIN
RELATIONSHIP_TRIGGERS = {
    "담당자": ["task_assignee", "user_story_assignee"],
    "assignee": ["task_assignee", "user_story_assignee"],
    "사용자": ["task_assignee", "user_story_assignee"],
    "user": ["task_assignee", "user_story_assignee"],
}

# =============================================================================
# Metric-Aware Table Mapping
# =============================================================================
# When these patterns are detected, ensure specific tables are included.
# Each mapping includes:
#   - Required tables
#   - Metric type hint (for SQL generation)
#   - Grain (task, story, sprint, project)

# Metric-aware query patterns with type hints
METRIC_PATTERNS: Dict[str, MetricHint] = {
    # Completion rate (various synonyms)
    "완료율": MetricHint(["tasks"], "rate", "task"),
    "completion rate": MetricHint(["tasks"], "rate", "task"),
    "completion_rate": MetricHint(["tasks"], "rate", "task"),
    "완료 비율": MetricHint(["tasks"], "rate", "task"),
    "완료 퍼센트": MetricHint(["tasks"], "rate", "task"),
    "달성률": MetricHint(["user_stories"], "rate", "story"),
    "진행률": MetricHint(["tasks"], "rate", "task"),

    # Sprint velocity
    "sprint velocity": MetricHint(["sprints", "user_stories"], "sum", "sprint"),
    "스프린트 벨로시티": MetricHint(["sprints", "user_stories"], "sum", "sprint"),
    "velocity": MetricHint(["sprints", "user_stories"], "sum", "sprint"),
    "벨로시티": MetricHint(["sprints", "user_stories"], "sum", "sprint"),

    # Story points aggregation
    "스토리 포인트": MetricHint(["user_stories"], "sum", "story"),
    "story points": MetricHint(["user_stories"], "sum", "story"),
    "포인트 합계": MetricHint(["user_stories"], "sum", "story"),

    # Burndown
    "번다운": MetricHint(["sprints", "user_stories"], "sum", "sprint"),
    "burndown": MetricHint(["sprints", "user_stories"], "sum", "sprint"),
    "burn down": MetricHint(["sprints", "user_stories"], "sum", "sprint"),

    # Project-level aggregations
    "프로젝트별": MetricHint(["projects"], "count", "project"),
    "by project": MetricHint(["projects"], "count", "project"),
    "per project": MetricHint(["projects"], "count", "project"),

    # Sprint-level aggregations
    "스프린트별": MetricHint(["sprints"], "count", "sprint"),
    "by sprint": MetricHint(["sprints"], "count", "sprint"),
    "per sprint": MetricHint(["sprints"], "count", "sprint"),

    # Assignee-level aggregations
    "담당자별": MetricHint(["users", "tasks"], "count", "task"),
    "by assignee": MetricHint(["users", "tasks"], "count", "task"),
    "사용자별": MetricHint(["users", "tasks"], "count", "task"),

    # Risk metrics
    "high risk": MetricHint(["risks"], "count", "project"),
    "high priority risk": MetricHint(["risks"], "count", "project"),
    "고위험": MetricHint(["risks"], "count", "project"),

    # Issue metrics
    "open issues": MetricHint(["issues"], "count", "project"),
    "unresolved issues": MetricHint(["issues"], "count", "project"),
    "미해결 이슈": MetricHint(["issues"], "count", "project"),
}

# Legacy compatibility: simple pattern -> tables mapping
QUERY_PATTERN_TABLES = {
    pattern: hint.tables
    for pattern, hint in METRIC_PATTERNS.items()
}

# Korean to English term mapping for bilingual support
KOREAN_TERM_MAPPING = {
    # Model names
    "프로젝트": ["projects", "project"],
    "태스크": ["tasks", "task"],
    "스토리": ["user_stories", "story", "user story"],
    "스프린트": ["sprints", "sprint"],
    "이슈": ["issues", "issue"],
    "리스크": ["risks", "risk"],
    "사용자": ["users", "user"],
    "담당자": ["users", "user", "assignee"],
    "페이즈": ["phases", "phase"],
    "단계": ["phases", "phase"],
    "문서": ["documents", "document"],
    "요구사항": ["requirements", "requirement"],
    "마일스톤": ["milestones", "milestone"],
    # Status terms
    "완료": ["completed", "done", "status"],
    "진행중": ["in_progress", "in progress", "status"],
    "블록": ["blocked", "status"],
    "차단": ["blocked", "status"],
    "대기": ["pending", "ready", "status"],
    # Metrics
    "완료율": ["completion_rate", "completion", "done"],
    "진척률": ["progress", "progress_percentage"],
    "포인트": ["story_points", "points"],
    # Aggregations
    "개수": ["count"],
    "합계": ["sum", "total"],
    "평균": ["average", "avg"],
    # Time
    "지난주": ["last_week", "updated_at"],
    "이번주": ["this_week", "updated_at"],
    "오늘": ["today", "updated_at"],
}


@dataclass
class Column:
    """Represents a table column with metadata."""
    name: str
    type: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    not_null: bool = False
    expression: Optional[str] = None  # Calculated field


@dataclass
class Model:
    """Represents a database table/model with semantic metadata."""
    name: str
    table_reference: Dict[str, str]  # {"schema": "task", "table": "tasks"}
    columns: List[Column]
    display_name: Optional[str] = None
    description: Optional[str] = None
    primary_key: Optional[str] = None
    project_scoped: bool = False

    @property
    def full_table_name(self) -> str:
        """Get fully qualified table name."""
        schema = self.table_reference.get("schema", "public")
        table = self.table_reference.get("table", self.name)
        return f"{schema}.{table}"

    def get_column(self, name: str) -> Optional[Column]:
        """Get column by name."""
        for col in self.columns:
            if col.name == name:
                return col
        return None


@dataclass
class Relationship:
    """Represents a relationship between two models."""
    name: str
    models: List[str]  # [source, target]
    join_type: str  # ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, MANY_TO_MANY
    condition: str  # JOIN condition


@dataclass
class Metric:
    """Represents a predefined metric/measure."""
    name: str
    base_model: str
    measure: List[str]
    display_name: Optional[str] = None
    description: Optional[str] = None
    dimension: List[str] = field(default_factory=list)
    time_grain: Optional[str] = None


class SemanticLayer:
    """
    MDL-based semantic layer for PMS domain.

    Provides:
    - Business term to schema mapping
    - Relationship inference for JOINs
    - Calculated field expansion
    - Metric definitions
    """

    def __init__(self, mdl_path: Optional[str] = None):
        self.models: Dict[str, Model] = {}
        self.relationships: Dict[str, Relationship] = {}
        self.metrics: Dict[str, Metric] = {}
        self._display_name_index: Dict[str, str] = {}  # display_name -> model_name
        self._term_index: Dict[str, Set[str]] = {}  # term -> model_names
        self._column_index: Dict[str, Set[str]] = {}  # column_name -> model_names
        self._initialized = False

        if mdl_path:
            self.load_mdl(mdl_path)

    def load_mdl(self, path: str) -> None:
        """Load MDL from JSON file."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            self._parse_mdl(data)
            self._initialized = True
            logger.info(
                f"Loaded MDL: {len(self.models)} models, "
                f"{len(self.relationships)} relationships, "
                f"{len(self.metrics)} metrics"
            )
        except Exception as e:
            logger.error(f"Failed to load MDL from {path}: {e}")
            raise

    def _parse_mdl(self, data: Dict) -> None:
        """Parse MDL JSON data."""
        # Parse models
        for model_data in data.get("models", []):
            columns = [
                Column(
                    name=c["name"],
                    type=c["type"],
                    display_name=c.get("displayName"),
                    description=c.get("description"),
                    not_null=c.get("notNull", False),
                    expression=c.get("expression")
                )
                for c in model_data.get("columns", [])
            ]

            model = Model(
                name=model_data["name"],
                table_reference=model_data["tableReference"],
                columns=columns,
                display_name=model_data.get("displayName"),
                description=model_data.get("description"),
                primary_key=model_data.get("primaryKey"),
                project_scoped=model_data.get("projectScoped", False)
            )
            self.models[model.name] = model

            # Build display name index
            if model.display_name:
                self._display_name_index[model.display_name.lower()] = model.name

            # Build term index from description
            self._index_terms(model)

        # Parse relationships
        for rel_data in data.get("relationships", []):
            rel = Relationship(
                name=rel_data["name"],
                models=rel_data["models"],
                join_type=rel_data["joinType"],
                condition=rel_data["condition"]
            )
            self.relationships[rel.name] = rel

        # Parse metrics
        for metric_data in data.get("metrics", []):
            metric = Metric(
                name=metric_data["name"],
                base_model=metric_data["baseModel"],
                measure=metric_data["measure"],
                display_name=metric_data.get("displayName"),
                description=metric_data.get("description"),
                dimension=metric_data.get("dimension", []),
                time_grain=metric_data.get("timeGrain")
            )
            self.metrics[metric.name] = metric

    def _index_terms(self, model: Model) -> None:
        """Index model by relevant terms for search."""
        terms = set()

        # Model name and display name
        terms.add(model.name.lower())
        if model.display_name:
            terms.update(model.display_name.lower().split())

        # Description words
        if model.description:
            words = model.description.lower().split()
            # Filter out common words
            stopwords = {'the', 'a', 'an', 'is', 'are', 'for', 'with', 'and', 'or'}
            terms.update(w for w in words if w not in stopwords and len(w) > 2)

        # Column names and descriptions
        for col in model.columns:
            terms.add(col.name.lower().replace('_', ' '))
            terms.add(col.name.lower())
            if col.display_name:
                terms.update(col.display_name.lower().split())

            # Index column names separately
            col_name = col.name.lower()
            if col_name not in self._column_index:
                self._column_index[col_name] = set()
            self._column_index[col_name].add(model.name)

        for term in terms:
            if term not in self._term_index:
                self._term_index[term] = set()
            self._term_index[term].add(model.name)

    def resolve_model(self, term: str) -> Optional[Model]:
        """Resolve a business term to a model."""
        term_lower = term.lower()

        # Direct match by name
        if term_lower in self.models:
            return self.models[term_lower]

        # Match by display name
        if term_lower in self._display_name_index:
            return self.models[self._display_name_index[term_lower]]

        # Fuzzy match by terms
        if term_lower in self._term_index:
            model_names = self._term_index[term_lower]
            if len(model_names) == 1:
                return self.models[list(model_names)[0]]

        return None

    def find_relevant_models(
        self,
        query: str,
        min_score: int = MIN_RELEVANCE_SCORE,
        score_drop_ratio: float = SCORE_DROP_RATIO,
        max_models: int = MAX_MODELS,
        expand_relationships: bool = True
    ) -> List[Model]:
        """
        Find models relevant to a natural language query.

        Uses dynamic thresholding instead of fixed top-k:
        1. Filter models with score >= min_score
        2. Apply score drop ratio: only include if score >= top_score * ratio
        3. Cap at max_models
        4. Optionally expand by relationships (e.g., "담당자" triggers auth.users)

        Args:
            query: Natural language query
            min_score: Minimum score to include a model
            score_drop_ratio: Include if score >= top_score * ratio
            max_models: Hard cap on returned models
            expand_relationships: Whether to auto-include related tables

        Returns:
            List of relevant Model objects, sorted by relevance score
        """
        query_terms = set(query.lower().split())
        model_scores: Dict[str, int] = {}

        # Expand query terms with Korean-English mappings
        expanded_terms = set(query_terms)
        for term in query_terms:
            # Check Korean mapping
            if term in KOREAN_TERM_MAPPING:
                expanded_terms.update(KOREAN_TERM_MAPPING[term])
            # Also check partial matches for compound Korean words
            for korean_term, english_terms in KOREAN_TERM_MAPPING.items():
                if korean_term in term:
                    expanded_terms.update(english_terms)

        # Check query pattern -> required tables mapping
        query_lower = query.lower()
        pattern_required_models: Set[str] = set()
        for pattern, required_tables in QUERY_PATTERN_TABLES.items():
            if pattern in query_lower:
                for table_name in required_tables:
                    # Find model name that contains this table name
                    for model_name in self.models.keys():
                        if table_name in model_name.lower():
                            pattern_required_models.add(model_name)

        for term in expanded_terms:
            # Check term index
            if term in self._term_index:
                for model_name in self._term_index[term]:
                    model_scores[model_name] = model_scores.get(model_name, 0) + 2

            # Check column index
            if term in self._column_index:
                for model_name in self._column_index[term]:
                    model_scores[model_name] = model_scores.get(model_name, 0) + 1

            # Check model names directly
            for model_name in self.models.keys():
                if term in model_name.lower() or model_name.lower() in term:
                    model_scores[model_name] = model_scores.get(model_name, 0) + 3

        # Sort by relevance score
        sorted_models = sorted(
            model_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        if not sorted_models:
            return []

        # Dynamic filtering instead of fixed top-k
        top_score = sorted_models[0][1]
        threshold = max(min_score, int(top_score * score_drop_ratio))

        result_names = []
        for name, score in sorted_models:
            if score < threshold:
                break
            result_names.append(name)
            if len(result_names) >= max_models:
                break

        # Add pattern-required models (e.g., "완료율" requires tasks)
        for name in pattern_required_models:
            if name not in result_names and len(result_names) < max_models:
                result_names.append(name)

        # Expand by relationships if enabled
        if expand_relationships:
            expanded_names = self._expand_by_relationships(query, result_names)
            # Add newly discovered models (up to max_models)
            for name in expanded_names:
                if name not in result_names and len(result_names) < max_models:
                    result_names.append(name)

        return [self.models[name] for name in result_names]

    def _expand_by_relationships(
        self,
        query: str,
        selected_models: List[str]
    ) -> List[str]:
        """
        Auto-include related tables via MDL relationships.

        When certain keywords are detected (e.g., "담당자", "assignee"),
        automatically include related tables via defined relationships.

        Args:
            query: Original query text
            selected_models: Already selected model names

        Returns:
            Expanded list of model names
        """
        query_lower = query.lower()
        expanded = set(selected_models)

        for keyword, rel_names in RELATIONSHIP_TRIGGERS.items():
            if keyword in query_lower:
                for rel_name in rel_names:
                    if rel_name in self.relationships:
                        rel = self.relationships[rel_name]
                        # Add both models from the relationship
                        for model_name in rel.models:
                            if model_name in self.models:
                                expanded.add(model_name)

        return list(expanded)

    def get_metric_hint(self, query: str) -> Optional[MetricHint]:
        """
        Get metric hint for a query based on pattern matching.

        Useful for:
        - Determining query type (count, sum, avg, rate)
        - Selecting appropriate grain (task, story, sprint, project)
        - Ensuring correct tables are included

        Args:
            query: Natural language query

        Returns:
            MetricHint if a pattern matches, None otherwise
        """
        query_lower = query.lower()

        # Check metric patterns
        for pattern, hint in METRIC_PATTERNS.items():
            if pattern in query_lower:
                return hint

        return None

    def find_join_path(self, model1: str, model2: str) -> Optional[Relationship]:
        """Find relationship between two models."""
        for rel in self.relationships.values():
            if model1 in rel.models and model2 in rel.models:
                return rel
        return None

    def find_all_paths(self, source: str, target: str, max_depth: int = 3) -> List[List[Relationship]]:
        """Find all relationship paths between two models up to max_depth."""
        paths = []
        visited = set()

        def dfs(current: str, path: List[Relationship], depth: int):
            if depth > max_depth:
                return
            if current == target:
                paths.append(path.copy())
                return

            visited.add(current)
            for rel in self.relationships.values():
                if current in rel.models:
                    next_model = rel.models[1] if rel.models[0] == current else rel.models[0]
                    if next_model not in visited:
                        path.append(rel)
                        dfs(next_model, path, depth + 1)
                        path.pop()
            visited.remove(current)

        dfs(source, [], 0)
        return paths

    def get_project_scoped_models(self) -> List[Model]:
        """Get all models that require project_id filtering."""
        return [m for m in self.models.values() if m.project_scoped]

    def get_metric(self, name: str) -> Optional[Metric]:
        """Get a predefined metric by name."""
        return self.metrics.get(name)

    def find_metric_by_query(self, query: str) -> Optional[Metric]:
        """Find a metric that matches the query."""
        query_lower = query.lower()
        for metric in self.metrics.values():
            if metric.name in query_lower:
                return metric
            if metric.display_name and metric.display_name.lower() in query_lower:
                return metric
        return None

    def expand_calculated_field(self, model: str, column: str) -> Optional[str]:
        """Expand a calculated field to its SQL expression."""
        if model not in self.models:
            return None

        for col in self.models[model].columns:
            if col.name == column and col.expression:
                return col.expression

        return None

    def generate_schema_context(self, models: List[str]) -> str:
        """Generate DDL-like context for LLM prompt."""
        context_parts = []

        for model_name in models:
            if model_name not in self.models:
                continue

            model = self.models[model_name]

            # Table definition
            columns_ddl = []
            for col in model.columns:
                col_def = f"  {col.name} {col.type}"
                if col.not_null:
                    col_def += " NOT NULL"
                if col.description:
                    col_def += f"  -- {col.description}"
                columns_ddl.append(col_def)

            table_ddl = f"""
-- {model.display_name or model.name}: {model.description or ''}
-- Project Scoped: {model.project_scoped}
CREATE TABLE {model.full_table_name} (
{chr(10).join(columns_ddl)}
);
"""
            context_parts.append(table_ddl.strip())

        # Add relationships
        rel_context = []
        for rel in self.relationships.values():
            if rel.models[0] in models or rel.models[1] in models:
                rel_context.append(
                    f"-- Relationship: {rel.name} ({rel.join_type})"
                    f"\n-- {rel.condition}"
                )

        if rel_context:
            context_parts.append("\n-- Relationships:\n" + "\n".join(rel_context))

        return "\n\n".join(context_parts)

    def get_model_summary(self) -> str:
        """Get a summary of all models for LLM context."""
        summaries = []
        for model in self.models.values():
            cols = ", ".join(c.name for c in model.columns[:5])
            if len(model.columns) > 5:
                cols += f", ... (+{len(model.columns) - 5} more)"

            summaries.append(
                f"- {model.display_name or model.name} ({model.full_table_name}): {cols}"
            )
        return "\n".join(summaries)


# Singleton instance
_semantic_layer: Optional[SemanticLayer] = None


def get_semantic_layer() -> SemanticLayer:
    """Get or create semantic layer singleton."""
    global _semantic_layer
    if _semantic_layer is None:
        mdl_path = Path(__file__).parent / "pms_mdl.json"
        _semantic_layer = SemanticLayer(str(mdl_path))
    return _semantic_layer


def reset_semantic_layer() -> None:
    """Reset the semantic layer singleton (for testing)."""
    global _semantic_layer
    _semantic_layer = None
