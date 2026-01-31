"""
Schema Manager for PostgreSQL and Neo4j.

Extracts and caches schema information for LLM context generation.
Supports schema scoping based on question relevance.
"""

import os
import logging
from typing import List, Dict, Optional, Set
from datetime import datetime, timedelta

from .models import (
    TableInfo,
    NodeLabelInfo,
    RelationshipTypeInfo,
    SchemaContext,
    QueryType,
)

logger = logging.getLogger(__name__)


# Tables that require project_id filtering
PROJECT_SCOPED_TABLES: Set[str] = {
    "project.projects",
    "project.phases",
    "project.parts",
    "project.part_members",
    "project.deliverables",
    "project.issues",
    "project.risks",
    "task.sprints",
    "task.user_stories",
    "task.tasks",
    "task.backlogs",
    "task.backlog_items",
    "chat.chat_sessions",
    "chat.chat_messages",
}

# Tables that should never be queried directly (system tables)
FORBIDDEN_TABLES: Set[str] = {
    "auth.password_history",
    "auth.tokens",
    "auth.refresh_tokens",
}

# Keywords to table mapping for intelligent scoping
KEYWORD_TABLE_MAP: Dict[str, List[str]] = {
    # Sprint/Agile related (Korean)
    "스프린트": ["task.sprints", "task.user_stories"],
    "스토리": ["task.user_stories", "task.tasks"],
    "백로그": ["task.backlogs", "task.backlog_items"],
    "태스크": ["task.tasks"],
    # Sprint/Agile related (English)
    "sprint": ["task.sprints", "task.user_stories"],
    "story": ["task.user_stories", "task.tasks"],
    "backlog": ["task.backlogs", "task.backlog_items"],
    "task": ["task.tasks"],
    # Project related (Korean)
    "프로젝트": ["project.projects", "project.phases"],
    "단계": ["project.phases"],
    "파트": ["project.parts", "project.part_members"],
    # Project related (English)
    "project": ["project.projects", "project.phases"],
    "phase": ["project.phases"],
    "part": ["project.parts", "project.part_members"],
    # Issue/Risk related
    "이슈": ["project.issues"],
    "issue": ["project.issues"],
    "리스크": ["project.risks"],
    "risk": ["project.risks"],
    # User related
    "사용자": ["auth.users"],
    "user": ["auth.users"],
    "담당자": ["auth.users", "task.user_stories"],
    "assignee": ["auth.users", "task.user_stories"],
}


class SchemaManager:
    """
    Manages schema information for PostgreSQL and Neo4j.

    Features:
    - Schema extraction and caching
    - Intelligent schema scoping based on question keywords
    - Project-scoped table identification
    - LLM-optimized context generation
    """

    def __init__(self):
        self._pg_schema_cache: Optional[Dict[str, TableInfo]] = None
        self._neo4j_schema_cache: Optional[Dict] = None
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl = timedelta(hours=1)

    def _get_pg_connection(self):
        """Get PostgreSQL connection."""
        import psycopg2

        return psycopg2.connect(
            host=os.getenv("PG_HOST", "postgres"),
            port=int(os.getenv("PG_PORT", "5432")),
            database=os.getenv("PG_DATABASE", "pms_db"),
            user=os.getenv("PG_USER", "pms_user"),
            password=os.getenv("PG_PASSWORD", "pms_password"),
        )

    def _get_neo4j_driver(self):
        """Get Neo4j driver."""
        from neo4j import GraphDatabase

        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "pmspassword123")
        return GraphDatabase.driver(uri, auth=(user, password))

    def _is_cache_valid(self) -> bool:
        """Check if schema cache is still valid."""
        if self._cache_timestamp is None:
            return False
        return datetime.now() - self._cache_timestamp < self._cache_ttl

    def invalidate_cache(self) -> None:
        """Invalidate the schema cache to force refresh."""
        self._pg_schema_cache = None
        self._neo4j_schema_cache = None
        self._cache_timestamp = None
        logger.info("Schema cache invalidated")

    def get_pg_schema(
        self, schemas: Optional[List[str]] = None
    ) -> Dict[str, TableInfo]:
        """
        Extract PostgreSQL schema information.

        Args:
            schemas: List of schema names to extract (default: project, task, auth, chat)

        Returns:
            Dictionary of table_name -> TableInfo
        """
        if self._pg_schema_cache and self._is_cache_valid():
            return self._pg_schema_cache

        if schemas is None:
            schemas = ["project", "task", "auth", "chat"]

        tables: Dict[str, TableInfo] = {}

        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor

            conn = self._get_pg_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Get tables and columns
            cursor.execute(
                """
                SELECT
                    t.table_schema,
                    t.table_name,
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    tc.constraint_type
                FROM information_schema.tables t
                JOIN information_schema.columns c
                    ON t.table_schema = c.table_schema
                    AND t.table_name = c.table_name
                LEFT JOIN information_schema.key_column_usage kcu
                    ON c.table_schema = kcu.table_schema
                    AND c.table_name = kcu.table_name
                    AND c.column_name = kcu.column_name
                LEFT JOIN information_schema.table_constraints tc
                    ON kcu.constraint_name = tc.constraint_name
                    AND kcu.table_schema = tc.table_schema
                WHERE t.table_schema = ANY(%s)
                    AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema, t.table_name, c.ordinal_position
            """,
                (schemas,),
            )

            rows = cursor.fetchall()

            # Build TableInfo objects
            for row in rows:
                full_name = f"{row['table_schema']}.{row['table_name']}"

                if full_name in FORBIDDEN_TABLES:
                    continue

                if full_name not in tables:
                    tables[full_name] = TableInfo(
                        schema=row["table_schema"],
                        name=row["table_name"],
                        columns={},
                        foreign_keys=[],
                    )

                tables[full_name].columns[row["column_name"]] = row["data_type"]

                if row["constraint_type"] == "PRIMARY KEY":
                    tables[full_name].primary_key = row["column_name"]

            # Get foreign key relationships
            cursor.execute(
                """
                SELECT
                    tc.table_schema,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_schema AS ref_schema,
                    ccu.table_name AS ref_table,
                    ccu.column_name AS ref_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = ANY(%s)
            """,
                (schemas,),
            )

            for row in cursor.fetchall():
                full_name = f"{row['table_schema']}.{row['table_name']}"
                if full_name in tables:
                    tables[full_name].foreign_keys.append(
                        {
                            "column": row["column_name"],
                            "references": f"{row['ref_schema']}.{row['ref_table']}.{row['ref_column']}",
                        }
                    )

            cursor.close()
            conn.close()

            self._pg_schema_cache = tables
            self._cache_timestamp = datetime.now()

            logger.info(f"Loaded PostgreSQL schema: {len(tables)} tables")
            return tables

        except Exception as e:
            logger.error(f"Failed to load PostgreSQL schema: {e}")
            return {}

    def get_neo4j_schema(self) -> Dict:
        """
        Extract Neo4j schema information.

        Returns:
            Dictionary with 'labels' and 'relationships'
        """
        if self._neo4j_schema_cache and self._is_cache_valid():
            return self._neo4j_schema_cache

        schema: Dict = {"labels": [], "relationships": []}

        try:
            driver = self._get_neo4j_driver()

            with driver.session() as session:
                # Get node labels and properties
                result = session.run(
                    """
                    CALL db.schema.nodeTypeProperties()
                    YIELD nodeLabels, propertyName, propertyTypes
                    RETURN nodeLabels, propertyName, propertyTypes
                """
                )

                label_props: Dict[str, Dict[str, str]] = {}
                for record in result:
                    for label in record["nodeLabels"]:
                        if label not in label_props:
                            label_props[label] = {}
                        prop_type = (
                            record["propertyTypes"][0]
                            if record["propertyTypes"]
                            else "Any"
                        )
                        label_props[label][record["propertyName"]] = prop_type

                schema["labels"] = [
                    NodeLabelInfo(label=label, properties=props)
                    for label, props in label_props.items()
                ]

                # Get relationship types
                result = session.run(
                    """
                    CALL db.schema.relTypeProperties()
                    YIELD relType, propertyName, propertyTypes
                    RETURN relType, propertyName, propertyTypes
                """
                )

                rel_props: Dict[str, Dict[str, str]] = {}
                for record in result:
                    rel_type = record["relType"].replace(":`", "").replace("`", "")
                    if rel_type not in rel_props:
                        rel_props[rel_type] = {}
                    if record["propertyName"]:
                        prop_type = (
                            record["propertyTypes"][0]
                            if record["propertyTypes"]
                            else "Any"
                        )
                        rel_props[rel_type][record["propertyName"]] = prop_type

                # Get relationship patterns (start -> end)
                pattern_result = session.run(
                    """
                    CALL db.schema.visualization()
                    YIELD nodes, relationships
                    RETURN nodes, relationships
                """
                )

                for record in pattern_result:
                    for rel in record["relationships"]:
                        rel_type = rel.type
                        start_label = (
                            list(rel.start_node.labels)[0]
                            if rel.start_node.labels
                            else "Unknown"
                        )
                        end_label = (
                            list(rel.end_node.labels)[0]
                            if rel.end_node.labels
                            else "Unknown"
                        )

                        schema["relationships"].append(
                            RelationshipTypeInfo(
                                type=rel_type,
                                start_label=start_label,
                                end_label=end_label,
                                properties=rel_props.get(rel_type, {}),
                            )
                        )

            driver.close()

            self._neo4j_schema_cache = schema
            self._cache_timestamp = datetime.now()

            logger.info(
                f"Loaded Neo4j schema: {len(schema['labels'])} labels, "
                f"{len(schema['relationships'])} relationships"
            )
            return schema

        except Exception as e:
            logger.error(f"Failed to load Neo4j schema: {e}")
            return schema

    def get_relevant_tables(self, question: str) -> List[str]:
        """
        Identify relevant tables based on question keywords.

        Args:
            question: User's natural language question

        Returns:
            List of relevant table names
        """
        question_lower = question.lower()
        relevant: Set[str] = set()

        for keyword, tables in KEYWORD_TABLE_MAP.items():
            if keyword in question_lower:
                relevant.update(tables)

        # If no specific keywords found, return common tables
        if not relevant:
            relevant = {"project.projects", "task.sprints", "task.user_stories"}

        return list(relevant)

    def get_schema_context(
        self, question: str, query_type: QueryType, max_tables: int = 8
    ) -> SchemaContext:
        """
        Get schema context optimized for LLM prompt.

        Args:
            question: User's question (for relevance filtering)
            query_type: SQL or Cypher
            max_tables: Maximum number of tables to include

        Returns:
            SchemaContext with filtered, relevant schema
        """
        context = SchemaContext()

        if query_type == QueryType.SQL:
            all_tables = self.get_pg_schema()
            relevant_names = self.get_relevant_tables(question)

            # Add relevant tables first
            for name in relevant_names:
                if name in all_tables:
                    context.tables.append(all_tables[name])

            # Fill up to max_tables with other important tables
            for name, table in all_tables.items():
                if len(context.tables) >= max_tables:
                    break
                if name not in relevant_names:
                    context.tables.append(table)

            # Add join hints based on foreign keys
            for table in context.tables:
                for fk in table.foreign_keys:
                    context.join_hints.append(
                        f"{table.schema}.{table.name}.{fk['column']} -> {fk['references']}"
                    )

        elif query_type == QueryType.CYPHER:
            neo4j_schema = self.get_neo4j_schema()
            context.node_labels = neo4j_schema.get("labels", [])
            context.relationships = neo4j_schema.get("relationships", [])

        return context

    def is_project_scoped_table(self, table_name: str) -> bool:
        """Check if table requires project_id filtering."""
        return table_name in PROJECT_SCOPED_TABLES

    def get_project_scoped_tables(self) -> Set[str]:
        """Get set of all project-scoped tables."""
        return PROJECT_SCOPED_TABLES.copy()

    def get_forbidden_tables(self) -> Set[str]:
        """Get set of all forbidden tables."""
        return FORBIDDEN_TABLES.copy()


# Singleton instance
_schema_manager: Optional[SchemaManager] = None


def get_schema_manager() -> SchemaManager:
    """Get singleton SchemaManager instance."""
    global _schema_manager
    if _schema_manager is None:
        _schema_manager = SchemaManager()
    return _schema_manager
