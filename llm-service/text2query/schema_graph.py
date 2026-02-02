"""
Schema Graph Module

Provides graph-based schema navigation for:
1. Dynamic JOIN path resolution from MDL relationships
2. Project scope enforcement via FK traversal
3. Intent-based retriever routing

This module replaces hardcoded JOIN_PATHS and TABLES_NEEDING_BRIDGE with
a schema-aware approach that automatically adapts to MDL changes.
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class IntentType(str, Enum):
    """Query intent types for routing."""
    TEXT_TO_SQL = "TEXT_TO_SQL"
    TEXT_TO_CYPHER = "TEXT_TO_CYPHER"
    GENERAL = "GENERAL"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"
    MISLEADING_QUERY = "MISLEADING_QUERY"


@dataclass
class ForeignKey:
    """Represents a foreign key relationship."""
    from_table: str  # schema.table format
    from_column: str
    to_table: str    # schema.table format
    to_column: str
    relationship_name: str

    def __hash__(self):
        return hash((self.from_table, self.from_column, self.to_table, self.to_column))


@dataclass
class TableInfo:
    """Information about a table from MDL."""
    full_name: str           # schema.table format
    model_name: str          # MDL model name
    has_project_id: bool     # Whether table has direct project_id
    project_scoped: bool     # From MDL projectScoped field
    primary_key: str
    columns: Set[str] = field(default_factory=set)


@dataclass
class JoinPath:
    """A path for joining two tables."""
    tables: List[str]
    conditions: List[str]
    aliases: Dict[str, str]


class SchemaGraph:
    """
    Schema graph built from MDL for intelligent query generation.

    Provides:
    1. Graph-based FK traversal for JOIN path discovery
    2. Project scope enforcement via shortest path to project_id
    3. Intent-based retriever policy
    """

    def __init__(self, mdl_path: Optional[str] = None):
        """Initialize schema graph from MDL file."""
        self.tables: Dict[str, TableInfo] = {}
        self.edges: Dict[str, List[ForeignKey]] = {}  # adjacency list
        self.reverse_edges: Dict[str, List[ForeignKey]] = {}  # reverse adjacency
        self._model_to_table: Dict[str, str] = {}  # model_name -> full_table_name

        if mdl_path:
            self._load_from_mdl(mdl_path)
        else:
            # Default path
            default_path = Path(__file__).parent / "semantic" / "pms_mdl.json"
            if default_path.exists():
                self._load_from_mdl(str(default_path))

    def _load_from_mdl(self, mdl_path: str) -> None:
        """Load schema graph from MDL JSON file."""
        try:
            with open(mdl_path, 'r', encoding='utf-8') as f:
                mdl = json.load(f)

            # Load models (tables)
            for model in mdl.get("models", []):
                table_ref = model.get("tableReference", {})
                schema = table_ref.get("schema", "public")
                table = table_ref.get("table", model["name"])
                full_name = f"{schema}.{table}"

                columns = {col["name"] for col in model.get("columns", [])}
                has_project_id = "project_id" in columns

                self.tables[full_name] = TableInfo(
                    full_name=full_name,
                    model_name=model["name"],
                    has_project_id=has_project_id,
                    project_scoped=model.get("projectScoped", False),
                    primary_key=model.get("primaryKey", "id"),
                    columns=columns
                )

                self._model_to_table[model["name"]] = full_name
                self.edges[full_name] = []
                self.reverse_edges[full_name] = []

            # Load relationships as edges
            for rel in mdl.get("relationships", []):
                models = rel.get("models", [])
                condition = rel.get("condition", "")

                if len(models) != 2 or not condition:
                    continue

                # Parse condition: "model1.col = model2.col"
                fk = self._parse_relationship(rel["name"], models, condition)
                if fk:
                    self.edges[fk.from_table].append(fk)
                    self.reverse_edges[fk.to_table].append(fk)

            logger.info(
                f"SchemaGraph loaded: {len(self.tables)} tables, "
                f"{sum(len(e) for e in self.edges.values())} edges"
            )

        except Exception as e:
            logger.error(f"Failed to load MDL: {e}")
            raise

    def _parse_relationship(
        self,
        rel_name: str,
        models: List[str],
        condition: str
    ) -> Optional[ForeignKey]:
        """Parse MDL relationship condition into ForeignKey."""
        # Expected format: "model1.col1 = model2.col2"
        parts = condition.replace(" ", "").split("=")
        if len(parts) != 2:
            return None

        left_parts = parts[0].split(".")
        right_parts = parts[1].split(".")

        if len(left_parts) != 2 or len(right_parts) != 2:
            return None

        left_model, left_col = left_parts
        right_model, right_col = right_parts

        # Convert model names to full table names
        left_table = self._model_to_table.get(left_model)
        right_table = self._model_to_table.get(right_model)

        if not left_table or not right_table:
            return None

        # Determine direction: FK points from the table with the FK column
        # to the table with the PK
        # Convention: if col ends with _id, it's likely the FK side
        if left_col.endswith("_id") and not right_col.endswith("_id"):
            # left has FK pointing to right
            return ForeignKey(
                from_table=left_table,
                from_column=left_col,
                to_table=right_table,
                to_column=right_col,
                relationship_name=rel_name
            )
        elif right_col.endswith("_id") and not left_col.endswith("_id"):
            # right has FK pointing to left
            return ForeignKey(
                from_table=right_table,
                from_column=right_col,
                to_table=left_table,
                to_column=left_col,
                relationship_name=rel_name
            )
        else:
            # Heuristic: assume first model is the parent
            return ForeignKey(
                from_table=right_table,
                from_column=right_col,
                to_table=left_table,
                to_column=left_col,
                relationship_name=rel_name
            )

    def has_project_id(self, table: str) -> bool:
        """Check if table has direct project_id column."""
        table_info = self.tables.get(table)
        return table_info.has_project_id if table_info else False

    def is_project_scoped(self, table: str) -> bool:
        """Check if table is project-scoped according to MDL."""
        table_info = self.tables.get(table)
        return table_info.project_scoped if table_info else False

    def find_path_to_project_id(
        self,
        start_table: str,
        max_depth: int = 3
    ) -> Optional[List[ForeignKey]]:
        """
        Find shortest path from start_table to a table with project_id.

        Uses BFS to find the shortest path through FK relationships.
        Returns the path as a list of ForeignKey edges.
        """
        if self.has_project_id(start_table):
            return []  # Already has project_id

        visited: Set[str] = set()
        queue: List[Tuple[str, List[ForeignKey]]] = [(start_table, [])]

        while queue:
            current, path = queue.pop(0)

            if current in visited:
                continue
            visited.add(current)

            if len(path) >= max_depth:
                continue

            # Check outgoing edges (FK from current table)
            for fk in self.edges.get(current, []):
                if fk.to_table in visited:
                    continue

                new_path = path + [fk]

                # Check if target has project_id
                if self.has_project_id(fk.to_table):
                    return new_path

                queue.append((fk.to_table, new_path))

        return None  # No path found

    def find_join_path(
        self,
        primary_table: str,
        secondary_table: str
    ) -> Optional[ForeignKey]:
        """Find direct FK relationship between two tables."""
        # Check direct edge
        for fk in self.edges.get(primary_table, []):
            if fk.to_table == secondary_table:
                return fk

        # Check reverse edge
        for fk in self.reverse_edges.get(primary_table, []):
            if fk.from_table == secondary_table:
                # Return reversed FK
                return ForeignKey(
                    from_table=primary_table,
                    from_column=fk.to_column,
                    to_table=secondary_table,
                    to_column=fk.from_column,
                    relationship_name=fk.relationship_name
                )

        return None

    def build_join_clause(
        self,
        tables: List[str],
        primary_alias: str = "t1"
    ) -> Tuple[str, Dict[str, str], str]:
        """
        Build JOIN clause for multiple tables.

        Returns:
            - JOIN clause string
            - Alias map {table_name: alias}
            - Alias that has project_id (for WHERE clause)
        """
        if not tables:
            return "", {}, primary_alias

        alias_map = {tables[0]: primary_alias}
        join_clauses = []
        project_id_alias = primary_alias if self.has_project_id(tables[0]) else None

        alias_counter = 2
        for table in tables[1:]:
            alias = f"t{alias_counter}"
            alias_map[table] = alias

            # Find join condition from primary table
            fk = self.find_join_path(tables[0], table)

            if fk:
                # Build condition with correct aliases
                if fk.from_table == tables[0]:
                    condition = f"{primary_alias}.{fk.from_column} = {alias}.{fk.to_column}"
                else:
                    condition = f"{alias}.{fk.from_column} = {primary_alias}.{fk.to_column}"
            else:
                # Try to find indirect path or use heuristic
                condition = self._heuristic_join(tables[0], table, primary_alias, alias)

            join_clauses.append(f"JOIN {table} {alias} ON {condition}")

            # Track project_id alias
            if project_id_alias is None and self.has_project_id(table):
                project_id_alias = alias

            alias_counter += 1

        # If still no project_id alias, try to add bridge table
        if project_id_alias is None:
            bridge_path = self.find_path_to_project_id(tables[0])
            if bridge_path:
                for fk in bridge_path:
                    if fk.to_table not in alias_map:
                        alias = f"t{alias_counter}"
                        alias_map[fk.to_table] = alias

                        from_alias = alias_map.get(fk.from_table, primary_alias)
                        condition = f"{from_alias}.{fk.from_column} = {alias}.{fk.to_column}"
                        join_clauses.append(f"JOIN {fk.to_table} {alias} ON {condition}")

                        if self.has_project_id(fk.to_table):
                            project_id_alias = alias
                            break

                        alias_counter += 1

        return "\n".join(join_clauses), alias_map, project_id_alias or primary_alias

    def _heuristic_join(
        self,
        table1: str,
        table2: str,
        alias1: str,
        alias2: str
    ) -> str:
        """Generate heuristic join condition when no FK found."""
        # Common patterns
        table2_simple = table2.split(".")[-1]

        # Check for common FK patterns
        if "users" in table2_simple:
            if "assignee_id" in self.tables.get(table1, TableInfo("", "", False, False, "")).columns:
                return f"{alias1}.assignee_id = {alias2}.id"
            if "reporter_id" in self.tables.get(table1, TableInfo("", "", False, False, "")).columns:
                return f"{alias1}.reporter_id = {alias2}.id"
            if "owner_id" in self.tables.get(table1, TableInfo("", "", False, False, "")).columns:
                return f"{alias1}.owner_id = {alias2}.id"

        if "sprints" in table2_simple:
            return f"{alias1}.sprint_id = {alias2}.id"

        if "projects" in table2_simple:
            return f"{alias1}.project_id = {alias2}.id"

        if "user_stories" in table2_simple:
            return f"{alias1}.user_story_id = {alias2}.id"

        # Default: assume FK naming convention
        fk_col = f"{table2_simple.rstrip('s')}_id"
        return f"{alias1}.{fk_col} = {alias2}.id"

    def get_tables_needing_bridge(self) -> List[str]:
        """
        Get list of tables that need a bridge table for project scope.

        These are project-scoped tables (projectScoped=true) that don't have
        a direct project_id column.
        """
        result = []
        for table_name, table_info in self.tables.items():
            if table_info.project_scoped and not table_info.has_project_id:
                result.append(table_name)
        return result

    def get_tables_with_project_id(self) -> List[str]:
        """Get list of tables that have direct project_id column."""
        return [
            table_name
            for table_name, table_info in self.tables.items()
            if table_info.has_project_id
        ]


class QueryPolicyEngine:
    """
    Enforces query generation policies based on intent and schema.

    Policies:
    1. Intent routing: SQL vs Cypher vs General
    2. Project scope enforcement
    3. Table selection validation
    """

    def __init__(self, schema_graph: SchemaGraph):
        self.schema = schema_graph

    def should_retrieve_sql_tables(self, intent: str) -> bool:
        """Check if SQL tables should be retrieved for this intent."""
        return intent in (IntentType.TEXT_TO_SQL.value, "TEXT_TO_SQL")

    def should_retrieve_graph_schema(self, intent: str) -> bool:
        """Check if graph schema should be retrieved for this intent."""
        return intent in (IntentType.TEXT_TO_CYPHER.value, "TEXT_TO_CYPHER")

    def ensure_project_scope(
        self,
        tables: List[str]
    ) -> Tuple[List[str], Optional[str]]:
        """
        Ensure project scope is available for the selected tables.

        Returns:
            - Updated list of tables (may include bridge table)
            - Name of the table/alias that provides project_id
        """
        if not tables:
            return tables, None

        primary = tables[0]

        # If primary has project_id, we're good
        if self.schema.has_project_id(primary):
            return tables, primary

        # Check if any other table has project_id
        for table in tables[1:]:
            if self.schema.has_project_id(table):
                return tables, table

        # Need to find bridge table
        path = self.schema.find_path_to_project_id(primary)
        if path:
            bridge_table = path[0].to_table
            if bridge_table not in tables:
                tables = list(tables) + [bridge_table]
            return tables, bridge_table

        # Fallback: assume primary has project_id somehow
        return tables, primary

    def validate_table_selection(
        self,
        tables: List[str],
        intent: str
    ) -> Tuple[bool, str]:
        """
        Validate that table selection is appropriate for the intent.

        Returns:
            - (True, "") if valid
            - (False, reason) if invalid
        """
        if intent == IntentType.TEXT_TO_CYPHER.value:
            if tables:
                return False, "CYPHER intent should not select SQL tables"
            return True, ""

        if intent == IntentType.TEXT_TO_SQL.value:
            if not tables:
                return False, "SQL intent requires at least one table"

            # Validate all tables exist
            for table in tables:
                if table not in self.schema.tables:
                    return False, f"Unknown table: {table}"

            return True, ""

        # GENERAL, CLARIFICATION, MISLEADING don't need tables
        return True, ""


# Neo4j schema labels (should be loaded from actual Neo4j metadata)
NEO4J_LABELS = ["Chunk", "Document", "Task", "Requirement"]
NEO4J_RELATIONSHIPS = ["HAS_CHUNK", "NEXT_CHUNK", "DEPENDS_ON", "RELATED_TO", "REFERENCES"]


class CypherSchemaManager:
    """
    Manages Neo4j schema for Cypher query generation.

    Provides schema-aware label and relationship selection
    instead of hardcoded values.
    """

    def __init__(self, labels: Optional[List[str]] = None,
                 relationships: Optional[List[str]] = None):
        self.labels = labels or NEO4J_LABELS
        self.relationships = relationships or NEO4J_RELATIONSHIPS

        # Keyword to label mapping for intelligent selection
        self.keyword_label_map = {
            "chunk": "Chunk",
            "document": "Document",
            "doc": "Document",
            "rfp": "Chunk",  # RFP content stored in chunks
            "requirement": "Chunk",
            "task": "Task",
        }

        self.keyword_relationship_map = {
            "dependency": "DEPENDS_ON",
            "related": "RELATED_TO",
            "reference": "REFERENCES",
            "next": "NEXT_CHUNK",
            "connected": "RELATED_TO",
        }

    def select_label(self, keywords: List[str]) -> str:
        """Select appropriate label based on keywords."""
        keywords_lower = [k.lower() for k in keywords]

        for kw in keywords_lower:
            for pattern, label in self.keyword_label_map.items():
                if pattern in kw:
                    return label

        # Default to Chunk (most common for RAG)
        return "Chunk"

    def select_relationship(self, keywords: List[str]) -> Optional[str]:
        """Select appropriate relationship based on keywords."""
        keywords_lower = [k.lower() for k in keywords]

        for kw in keywords_lower:
            for pattern, rel in self.keyword_relationship_map.items():
                if pattern in kw:
                    return rel

        return None

    def validate_labels(self, query: str) -> Tuple[bool, List[str]]:
        """
        Validate that all labels in a Cypher query exist in schema.

        Note: Distinguishes between node labels (after parentheses) and
        relationship types (inside brackets).

        Returns:
            - (True, []) if valid
            - (False, [invalid_labels]) if invalid
        """
        import re

        # Extract node labels only (pattern: (var:Label) - after opening paren)
        # This excludes relationship types which are in brackets [r:TYPE]
        label_pattern = r'\([\w]*:(\w+)'
        found_labels = re.findall(label_pattern, query)

        # Also check for labels after standalone colon followed by paren
        # e.g., MATCH (a:Label) or MATCH (:Label)
        invalid = [l for l in found_labels if l not in self.labels]
        return len(invalid) == 0, invalid

    def validate_relationships(self, query: str) -> Tuple[bool, List[str]]:
        """
        Validate that all relationship types in a Cypher query exist in schema.

        Returns:
            - (True, []) if valid
            - (False, [invalid_rels]) if invalid
        """
        import re

        # Extract relationship types (pattern: [var:TYPE] - inside brackets)
        rel_pattern = r'\[[\w]*:(\w+)'
        found_rels = re.findall(rel_pattern, query)

        invalid = [r for r in found_rels if r not in self.relationships]
        return len(invalid) == 0, invalid


# Singleton instances
_schema_graph: Optional[SchemaGraph] = None
_policy_engine: Optional[QueryPolicyEngine] = None
_cypher_schema: Optional[CypherSchemaManager] = None


def get_schema_graph() -> SchemaGraph:
    """Get or create schema graph singleton."""
    global _schema_graph
    if _schema_graph is None:
        _schema_graph = SchemaGraph()
    return _schema_graph


def get_policy_engine() -> QueryPolicyEngine:
    """Get or create policy engine singleton."""
    global _policy_engine
    if _policy_engine is None:
        _policy_engine = QueryPolicyEngine(get_schema_graph())
    return _policy_engine


def get_cypher_schema() -> CypherSchemaManager:
    """Get or create Cypher schema manager singleton."""
    global _cypher_schema
    if _cypher_schema is None:
        _cypher_schema = CypherSchemaManager()
    return _cypher_schema


def reset_schema_graph() -> None:
    """Reset all schema singletons (for testing)."""
    global _schema_graph, _policy_engine, _cypher_schema
    _schema_graph = None
    _policy_engine = None
    _cypher_schema = None
