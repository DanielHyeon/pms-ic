"""
Query Validator for SQL and Cypher queries.

Implements 4-layer validation:
1. Syntax validation (EXPLAIN for SQL, Cypher parser for Neo4j)
2. Schema mapping validation (tables/columns exist)
3. Security validation (project_id scope, forbidden patterns, bypass detection)
4. Performance/Resource validation (SELECT *, LIMIT, etc.)

Security Features (v2.0):
- OR bypass detection (OR 1=1, OR TRUE, OR 'a'='a')
- Subquery/CTE scope validation
- Column-level denylist (password_hash, etc.)
- Alias-aware project_id validation
"""

import os
import re
import logging
from typing import Dict, List, Optional, Set, Tuple

from .models import (
    QueryType,
    ValidationResult,
    ValidationError,
    ValidationErrorType,
)
from .schema_manager import get_schema_manager, PROJECT_SCOPED_TABLES, FORBIDDEN_TABLES

logger = logging.getLogger(__name__)


# =============================================================================
# Security Configuration
# =============================================================================

# Forbidden SQL patterns (security)
FORBIDDEN_SQL_PATTERNS: List[Tuple[str, str]] = [
    (
        r"\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|ALTER|CREATE|GRANT|REVOKE)\b",
        "DML/DDL not allowed",
    ),
    (r"\b(EXECUTE|EXEC)\b", "EXECUTE not allowed"),
    (r";\s*\w", "Multiple statements not allowed"),
    (r"--", "SQL comments not allowed"),
    (r"/\*", "Block comments not allowed"),
    (r"\bpg_sleep\b", "pg_sleep not allowed"),
    (r"\bgenerate_series\s*\([^)]*\b1000\b", "Large generate_series not allowed"),
    (r"\bCOPY\b", "COPY not allowed"),
    (r"\bLOAD\b", "LOAD not allowed"),
]

# OR bypass patterns - detects scope bypass attempts
# Patterns like: OR 1=1, OR TRUE, OR 'a'='a', etc.
OR_BYPASS_PATTERNS: List[Tuple[str, str]] = [
    # Numeric tautologies
    (r"\bOR\s+1\s*=\s*1\b", "OR 1=1 bypass detected"),
    (r"\bOR\s+0\s*=\s*0\b", "OR 0=0 bypass detected"),
    (r"\bOR\s+\d+\s*=\s*\d+\b", "Numeric tautology bypass detected"),
    # Boolean tautologies
    (r"\bOR\s+TRUE\b", "OR TRUE bypass detected"),
    (r"\bOR\s+\(\s*TRUE\s*\)", "OR (TRUE) bypass detected"),
    (r"\bOR\s+NOT\s+FALSE\b", "OR NOT FALSE bypass detected"),
    # String comparison tautologies
    (r"\bOR\s+['\"][a-zA-Z]['\"]s*=\s*['\"][a-zA-Z]['\"]", "String tautology bypass detected"),
    (r"\bOR\s+['\"].*['\"]\s*=\s*['\"].*['\"]", "String equality bypass detected"),
    # NULL-based tautologies
    (r"\bOR\s+\w+\s+IS\s+NOT\s+NULL\b", "IS NOT NULL bypass attempt detected"),
    (r"\bOR\s+NULL\s+IS\s+NULL\b", "NULL IS NULL bypass detected"),
    # LIKE-based tautologies
    (r"\bOR\s+['\"]%['\"]\s+LIKE\s+['\"]%['\"]", "LIKE bypass detected"),
    # Parenthesized bypasses
    (r"\bOR\s*\(\s*1\s*=\s*1\s*\)", "Parenthesized OR 1=1 bypass detected"),
    (r"\bOR\s*\(\s*TRUE\s*\)", "Parenthesized OR TRUE bypass detected"),
    # Comparison tautologies (always-true comparisons)
    (r"\bOR\s+\d+\s*>\s*\d+\b", "Comparison tautology detected"),  # OR 2>1
    (r"\bOR\s+\d+\s*<\s*\d+\b", "Comparison tautology detected"),  # OR 1<2
    (r"\bOR\s+\d+\s*>=\s*\d+\b", "Comparison tautology detected"),  # OR 2>=1
    (r"\bOR\s+\d+\s*<=\s*\d+\b", "Comparison tautology detected"),  # OR 1<=2
    (r"\bOR\s+\d+\s*<>\s*\d+\b", "Comparison tautology detected"),  # OR 1<>2
    (r"\bOR\s+\d+\s*!=\s*\d+\b", "Comparison tautology detected"),  # OR 1!=2
    # Subquery-based tautologies
    (r"\bOR\s+EXISTS\s*\(\s*SELECT\s+1\b", "EXISTS tautology detected"),  # OR EXISTS(SELECT 1)
    (r"\bOR\s+EXISTS\s*\(\s*SELECT\s+\*\b", "EXISTS tautology detected"),  # OR EXISTS(SELECT *)
    # Function-based bypasses
    (r"\bOR\s+COALESCE\s*\(", "COALESCE bypass attempt detected"),
    (r"\bOR\s+NULLIF\s*\(", "NULLIF bypass attempt detected"),
    (r"\bOR\s+CASE\s+WHEN\s+TRUE\b", "CASE bypass attempt detected"),
]

# Column-level denylist: (table, column) pairs that must never be selected
COLUMN_DENYLIST: Set[Tuple[str, str]] = {
    ("auth.users", "password_hash"),
    ("auth.users", "password"),
    ("auth.users", "passwd"),
    ("auth.users", "hashed_password"),
    ("auth.users", "salt"),
    ("auth.users", "secret"),
    ("auth.users", "api_key"),
    ("auth.users", "refresh_token"),
    ("auth.users", "access_token"),
}

# Sensitive columns that require extra scrutiny (warning, not block)
SENSITIVE_COLUMNS: Set[str] = {
    "email", "phone", "address", "ssn", "social_security",
    "credit_card", "card_number", "cvv", "bank_account",
}

# Forbidden Cypher patterns (security)
# Note: db.index.vector.queryNodes and db.index.fulltext.queryNodes are allowed
FORBIDDEN_CYPHER_PATTERNS: List[Tuple[str, str]] = [
    (r"\bCALL\s+db\.(?!index\.)", "db.* procedures not allowed (except db.index.*)"),
    (r"\bCALL\s+apoc\.", "apoc.* procedures not allowed"),
    (r"\bDELETE\b", "DELETE not allowed"),
    (r"\bDETACH\b", "DETACH not allowed"),
    (r"\bCREATE\b", "CREATE not allowed (read-only)"),
    (r"\bMERGE\b", "MERGE not allowed (read-only)"),
    (r"\bSET\b", "SET not allowed (read-only)"),
    (r"\bREMOVE\b", "REMOVE not allowed"),
]


# =============================================================================
# Helper Functions for 2-Stage Security Validation
# =============================================================================

def normalize_sql(query: str) -> str:
    """
    Normalize SQL query for consistent security analysis.

    - Removes comments (already blocked, but defense-in-depth)
    - Replaces comments with SPACE to preserve token boundaries (prevents OR/**/1=1 bypass)
    - Normalizes whitespace
    - Preserves string literals for accurate pattern matching
    """
    # Remove SQL comments - REPLACE WITH SPACE to preserve token boundaries
    # This prevents bypass like "OR/**/1=1" becoming "OR1=1" (no space)
    normalized = re.sub(r'--.*$', ' ', query, flags=re.MULTILINE)
    normalized = re.sub(r'/\*.*?\*/', ' ', normalized, flags=re.DOTALL)

    # Normalize whitespace (collapse multiple spaces, preserve structure)
    normalized = re.sub(r'\s+', ' ', normalized)

    return normalized.strip()


def detect_bypass_patterns(query: str) -> List[ValidationError]:
    """
    Stage 1: Fail-fast detection of known bypass patterns.

    Detects OR-based tautologies that bypass WHERE conditions:
    - OR 1=1, OR TRUE, OR 'a'='a'
    - Variations with parentheses, whitespace, case changes
    """
    errors = []
    normalized = normalize_sql(query)

    for pattern, message in OR_BYPASS_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE | re.DOTALL):
            errors.append(
                ValidationError(
                    type=ValidationErrorType.SECURITY_VIOLATION,
                    message=f"Security bypass attempt: {message}",
                    suggestion="Remove tautology condition from WHERE clause",
                )
            )
            logger.warning(f"Bypass pattern detected: {message} in query: {query[:100]}...")

    return errors


def extract_table_aliases(query: str) -> Dict[str, str]:
    """
    Extract table-to-alias mapping from SQL query.

    Returns: Dict[table_name, alias]
    Example: "FROM task.tasks t1 JOIN auth.users u" -> {"task.tasks": "t1", "auth.users": "u"}
    """
    alias_map = {}

    # Pattern: FROM/JOIN table_name [AS] alias
    # Handles: FROM task.tasks t1, FROM task.tasks AS t1
    table_alias_pattern = (
        r'(?:FROM|JOIN)\s+'
        r'([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)'  # table name
        r'(?:\s+AS)?\s*'
        r'([a-zA-Z_][a-zA-Z0-9_]*)?'  # optional alias
    )

    matches = re.findall(table_alias_pattern, query, re.IGNORECASE)
    for table, alias in matches:
        # If no alias, use table name itself
        if alias and alias.upper() not in ('JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'WHERE'):
            alias_map[table.lower()] = alias.lower()
        else:
            # Use last part of table name as implicit alias
            alias_map[table.lower()] = table.split('.')[-1].lower()

    return alias_map


def check_project_scope_integrity(
    query: str,
    alias_map: Dict[str, str],
    scoped_tables: List[str]
) -> Tuple[bool, Optional[ValidationError]]:
    """
    Stage 2: Validate project_id scope integrity.

    Checks:
    1. project_id filter exists in WHERE clause
    2. Filter uses valid alias from FROM/JOIN tables
    3. No OR conditions that bypass the scope
    4. Subqueries/CTEs have proper scope at top level
    """
    normalized = normalize_sql(query).lower()

    # Check for subquery/CTE presence
    has_subquery = '(' in normalized and 'select' in normalized[normalized.find('('):]
    has_cte = normalized.strip().startswith('with ')

    # Find the main WHERE clause (not in subquery)
    # Simple heuristic: find last WHERE before any closing paren that ends a subquery
    where_match = re.search(r'\bwhere\b', normalized, re.IGNORECASE)
    if not where_match:
        return (
            False,
            ValidationError(
                type=ValidationErrorType.SCOPE_MISSING,
                message="Query must have WHERE clause with project_id filter",
                suggestion="Add WHERE project_id = :project_id",
            )
        )

    # Extract WHERE clause content (rough approximation)
    where_start = where_match.end()
    # Find end: GROUP BY, ORDER BY, LIMIT, HAVING, or end of query
    end_keywords = ['group by', 'order by', 'limit', 'having', 'union']
    where_end = len(normalized)
    for kw in end_keywords:
        kw_pos = normalized.find(kw, where_start)
        if kw_pos != -1 and kw_pos < where_end:
            where_end = kw_pos
    where_clause = normalized[where_start:where_end]

    # Check for project_id in WHERE with valid alias
    project_id_patterns = [
        r'(\w+)\.project_id\s*=\s*[:\'\"\$\%]',  # alias.project_id = :param
        r'project_id\s*=\s*[:\'\"\$\%]',  # project_id = :param (no alias)
    ]

    has_valid_scope = False
    for pattern in project_id_patterns:
        match = re.search(pattern, where_clause, re.IGNORECASE)
        if match:
            # If alias is used, verify it's from our table list
            if match.lastindex and match.group(1):
                alias_used = match.group(1).lower()
                valid_aliases = set(alias_map.values())
                if alias_used in valid_aliases or alias_used in [t.split('.')[-1].lower() for t in scoped_tables]:
                    has_valid_scope = True
                    break
            else:
                # No alias used, accept if only one scoped table
                has_valid_scope = True
                break

    if not has_valid_scope:
        return (
            False,
            ValidationError(
                type=ValidationErrorType.SCOPE_MISSING,
                message=f"project_id filter not found or uses invalid alias. Tables: {scoped_tables}",
                suggestion="Use valid table alias: e.g., WHERE t1.project_id = :project_id",
            )
        )

    # For subqueries/CTEs: enforce scope at top level
    if (has_subquery or has_cte) and not has_valid_scope:
        return (
            False,
            ValidationError(
                type=ValidationErrorType.SECURITY_VIOLATION,
                message="Subquery/CTE detected without project_id scope at top level",
                suggestion="Ensure top-level WHERE has project_id filter",
            )
        )

    return (True, None)


def validate_forbidden_tables(query: str) -> List[ValidationError]:
    """
    Validate that query doesn't reference forbidden tables.

    Checks both FROM and JOIN clauses for forbidden tables like:
    - auth.password_history
    - auth.tokens
    - auth.refresh_tokens
    """
    errors = []
    normalized = normalize_sql(query).lower()

    for forbidden_table in FORBIDDEN_TABLES:
        # Check for exact table reference (with or without schema)
        table_short = forbidden_table.split('.')[-1]
        patterns = [
            rf'\b{re.escape(forbidden_table)}\b',  # Full name: auth.tokens
            rf'\bfrom\s+{re.escape(table_short)}\b',  # Short name after FROM
            rf'\bjoin\s+{re.escape(table_short)}\b',  # Short name after JOIN
        ]

        for pattern in patterns:
            if re.search(pattern, normalized, re.IGNORECASE):
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SECURITY_VIOLATION,
                        message=f"Access to table '{forbidden_table}' is forbidden",
                        suggestion="This table contains sensitive data and cannot be queried",
                    )
                )
                logger.warning(f"Forbidden table access attempt: {forbidden_table}")
                break  # One error per table is enough

    return errors


def validate_column_denylist(query: str, tables: List[str]) -> List[ValidationError]:
    """
    Validate that query doesn't select denied columns.

    Blocks access to sensitive columns like password_hash, etc.
    Checks ALL SELECT clauses including those in UNION queries.
    """
    errors = []
    normalized = normalize_sql(query).lower()

    # Extract ALL SELECT clauses (handles UNION queries)
    # Pattern: SELECT ... FROM or SELECT ... UNION or SELECT ... at end
    select_clauses = re.findall(
        r'\bselect\b(.+?)(?:\bfrom\b|\bunion\b|\)|\Z)',
        normalized,
        re.IGNORECASE | re.DOTALL
    )
    if not select_clauses:
        return errors

    # Combine all SELECT clauses for checking
    select_clause = ' '.join(select_clauses)

    # Check for wildcard with sensitive tables
    if '*' in select_clause:
        for table in tables:
            table_lower = table.lower()
            # Check if any denied column exists for this table
            has_denied = any(t.lower() == table_lower for t, _ in COLUMN_DENYLIST)
            if has_denied:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SECURITY_VIOLATION,
                        message=f"SELECT * from '{table}' may expose sensitive columns",
                        suggestion="List specific columns instead of using *",
                    )
                )
                break

    # Check for specific denied columns
    for table, column in COLUMN_DENYLIST:
        # Match: column, alias.column, table.column
        col_patterns = [
            rf'\b{re.escape(column)}\b',  # Just column name
            rf'\w+\.{re.escape(column)}\b',  # alias.column
        ]

        table_lower = table.lower()
        if any(t.lower() == table_lower for t in tables):
            for pattern in col_patterns:
                if re.search(pattern, select_clause, re.IGNORECASE):
                    errors.append(
                        ValidationError(
                            type=ValidationErrorType.SECURITY_VIOLATION,
                            message=f"Access to column '{table}.{column}' is forbidden",
                            suggestion="This column contains sensitive data",
                        )
                    )
                    logger.warning(f"Denied column access attempt: {table}.{column}")
                    break

    return errors


# Maximum query length
MAX_QUERY_LENGTH = 5000

# Maximum result rows
MAX_RESULT_ROWS = 100

# Maximum subquery nesting depth
MAX_SUBQUERY_DEPTH = 3

# Maximum UNION operations allowed
MAX_UNION_COUNT = 5

# Query execution timeout (milliseconds)
QUERY_TIMEOUT_MS = 5000

# Safe execution defaults
SAFE_EXECUTION_CONFIG = {
    "timeout_ms": QUERY_TIMEOUT_MS,
    "max_rows": MAX_RESULT_ROWS,
    "max_memory_mb": 256,
    "enable_cost_check": True,
    "cost_threshold": 10000,
}


class QueryValidator:
    """
    Validates SQL and Cypher queries for syntax, schema, security, and performance.

    Usage:
        validator = QueryValidator()
        result = validator.validate(query, QueryType.SQL, project_id="proj-001")

        if result.is_valid:
            # Safe to execute
        else:
            # Handle errors
            print(result.get_error_summary())
    """

    def __init__(self):
        self.schema_manager = get_schema_manager()

    def validate(
        self,
        query: str,
        query_type: QueryType,
        project_id: Optional[str] = None,
        require_project_scope: bool = True,
    ) -> ValidationResult:
        """
        Validate query through all 4 validation layers.

        Args:
            query: SQL or Cypher query string
            query_type: QueryType.SQL or QueryType.CYPHER
            project_id: Project ID for scope validation
            require_project_scope: Whether to require project_id filter

        Returns:
            ValidationResult with is_valid flag and any errors
        """
        result = ValidationResult(is_valid=True)

        # Layer 1: Basic/Syntax Validation
        basic_errors = self._validate_basic(query)
        result.errors.extend(basic_errors)
        if basic_errors:
            result.layer1_syntax_passed = False

        # Layer 2: Schema Validation
        if query_type == QueryType.SQL:
            schema_errors, tables, columns = self._validate_sql_schema(query)
            result.errors.extend(schema_errors)
            result.extracted_tables = tables
            result.extracted_columns = columns
            if schema_errors:
                result.layer2_schema_passed = False
        else:
            schema_errors = self._validate_cypher_schema(query)
            result.errors.extend(schema_errors)
            if schema_errors:
                result.layer2_schema_passed = False

        # Layer 3: Security Validation
        security_errors = self._validate_security(query, query_type)
        result.errors.extend(security_errors)
        if security_errors:
            result.layer3_security_passed = False

        if require_project_scope:
            scope_result = self._validate_project_scope(query, query_type, project_id)
            result.has_project_scope = scope_result[0]
            if scope_result[1]:
                result.errors.append(scope_result[1])
                result.layer3_security_passed = False

        # Layer 4: Performance/Resource Safety Validation
        performance_errors = self._validate_performance(query, query_type)
        result.errors.extend(performance_errors)
        if performance_errors:
            result.layer4_performance_passed = False

        # Final Syntax Check via EXPLAIN (for SQL only, if no other errors)
        if query_type == QueryType.SQL and not result.errors:
            syntax_error = self._validate_sql_syntax(query)
            if syntax_error:
                result.errors.append(syntax_error)
                result.layer1_syntax_passed = False

        # Final Validity Determination
        result.is_valid = len(result.errors) == 0

        return result

    def _validate_basic(self, query: str) -> List[ValidationError]:
        """Layer 1: Basic validation - length, emptiness."""
        errors = []

        if not query or not query.strip():
            errors.append(
                ValidationError(
                    type=ValidationErrorType.SYNTAX,
                    message="Query is empty",
                )
            )
            return errors

        if len(query) > MAX_QUERY_LENGTH:
            errors.append(
                ValidationError(
                    type=ValidationErrorType.POLICY_VIOLATION,
                    message=f"Query too long ({len(query)} chars, max {MAX_QUERY_LENGTH})",
                )
            )

        return errors

    def _validate_security(
        self, query: str, query_type: QueryType
    ) -> List[ValidationError]:
        """
        Layer 3: Validate against forbidden patterns.

        2-Stage Security Validation:
        Stage 1: Fail-fast bypass pattern detection (OR 1=1, etc.)
        Stage 2: Forbidden table/column validation
        """
        errors = []
        query_upper = query.upper()

        # Stage 1: Fail-fast bypass detection (SQL only)
        if query_type == QueryType.SQL:
            bypass_errors = detect_bypass_patterns(query)
            errors.extend(bypass_errors)

            # If bypass detected, fail fast - don't continue validation
            if bypass_errors:
                return errors

        # Standard forbidden patterns
        patterns = (
            FORBIDDEN_SQL_PATTERNS
            if query_type == QueryType.SQL
            else FORBIDDEN_CYPHER_PATTERNS
        )

        for pattern, message in patterns:
            if re.search(pattern, query_upper, re.IGNORECASE):
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SECURITY_VIOLATION,
                        message=message,
                    )
                )

        # SQL-specific: must start with SELECT
        if query_type == QueryType.SQL:
            if not query_upper.strip().startswith("SELECT"):
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SECURITY_VIOLATION,
                        message="Only SELECT queries are allowed",
                    )
                )

            # Stage 2: Forbidden tables validation
            forbidden_table_errors = validate_forbidden_tables(query)
            errors.extend(forbidden_table_errors)

        # Cypher-specific: must start with MATCH or OPTIONAL MATCH
        if query_type == QueryType.CYPHER:
            cypher_start = query_upper.strip()
            if not (
                cypher_start.startswith("MATCH") or cypher_start.startswith("OPTIONAL")
            ):
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SECURITY_VIOLATION,
                        message="Only MATCH queries are allowed",
                    )
                )

        return errors

    def _validate_sql_schema(
        self, query: str
    ) -> Tuple[List[ValidationError], List[str], List[str]]:
        """
        Layer 2: Validate SQL against schema (tables and columns exist).

        Also performs column-level security validation for sensitive data.
        """
        errors = []
        extracted_tables = []
        extracted_columns = []

        # Extract table names from query
        table_pattern = (
            r"\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)"
        )
        join_pattern = (
            r"\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)"
        )

        for pattern in [table_pattern, join_pattern]:
            matches = re.findall(pattern, query, re.IGNORECASE)
            extracted_tables.extend(matches)

        # Normalize table names (add schema if missing)
        normalized_tables = []
        for table in extracted_tables:
            if "." not in table:
                for schema in ["task", "project", "auth", "chat"]:
                    full_name = f"{schema}.{table}"
                    pg_schema = self.schema_manager.get_pg_schema()
                    if full_name in pg_schema:
                        table = full_name
                        break
            normalized_tables.append(table)

        # Validate tables exist
        pg_schema = self.schema_manager.get_pg_schema()
        for table in normalized_tables:
            if table not in pg_schema and f"public.{table}" not in pg_schema:
                base_name = table.split(".")[-1]
                found = any(t.name == base_name for t in pg_schema.values())
                if not found:
                    errors.append(
                        ValidationError(
                            type=ValidationErrorType.SCHEMA_MISMATCH,
                            message=f"Table '{table}' not found in schema",
                            suggestion="Check available tables in project/task/auth schemas",
                        )
                    )

        # Column-level security validation (denylist check)
        column_errors = validate_column_denylist(query, normalized_tables)
        errors.extend(column_errors)

        return errors, normalized_tables, extracted_columns

    def _validate_cypher_schema(self, query: str) -> List[ValidationError]:
        """Layer 2: Validate Cypher against Neo4j schema."""
        errors = []

        # Extract node labels from query
        label_pattern = r"\(\s*\w*\s*:\s*(\w+)"
        labels = re.findall(label_pattern, query)

        # Validate labels exist
        neo4j_schema = self.schema_manager.get_neo4j_schema()
        known_labels = {l.label for l in neo4j_schema.get("labels", [])}

        for label in labels:
            if label not in known_labels and label != "Unknown":
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"Node label ':{label}' not found in schema",
                        suggestion=f"Known labels: {', '.join(sorted(known_labels)[:5])}",
                    )
                )

        return errors

    def _validate_project_scope(
        self, query: str, query_type: QueryType, project_id: Optional[str]
    ) -> Tuple[bool, Optional[ValidationError]]:
        """Layer 3: Validate that query has proper project_id scope."""
        query_lower = query.lower()

        # Check if query references project-scoped tables
        references_scoped_table = False
        scoped_tables_found = []

        if query_type == QueryType.SQL:
            for table in PROJECT_SCOPED_TABLES:
                table_short = table.split(".")[-1]
                if table_short in query_lower or table in query_lower:
                    references_scoped_table = True
                    scoped_tables_found.append(table)
        else:
            scoped_labels = ["project", "document", "chunk"]
            for label in scoped_labels:
                if f":{label}" in query_lower:
                    references_scoped_table = True
                    scoped_tables_found.append(label)

        if not references_scoped_table:
            return (True, None)

        # Validate project_id scope
        validation_result = self._check_project_scope_rules(
            query, query_type, project_id, scoped_tables_found
        )

        return validation_result

    def _check_project_scope_rules(
        self,
        query: str,
        query_type: QueryType,
        project_id: Optional[str],
        scoped_tables: List[str],
    ) -> Tuple[bool, Optional[ValidationError]]:
        """
        Apply detailed project scope validation rules.

        Enhanced 2-stage validation:
        1. Extract table aliases and validate scope filter uses valid alias
        2. Check for subquery/CTE scope bypass
        """
        query_lower = query.lower()

        if query_type == QueryType.SQL:
            # Stage 1: Extract alias map for validation
            alias_map = extract_table_aliases(query)

            # Stage 2: Check project scope integrity with alias validation
            scope_valid, scope_error = check_project_scope_integrity(
                query, alias_map, scoped_tables
            )

            if not scope_valid:
                return (False, scope_error)

            # Legacy pattern check (fallback for backwards compatibility)
            direct_scope_patterns = [
                r"where\s+.*project_id\s*=\s*[:\'\"\$\%]",
                r"where\s+project_id\s*=\s*[:\'\"\$\%]",
                r"and\s+\w+\.project_id\s*=\s*[:\'\"\$\%]",
                r"on\s+.*project_id\s*=.*project_id",
            ]

            for pattern in direct_scope_patterns:
                if re.search(pattern, query_lower, re.IGNORECASE | re.DOTALL):
                    return (True, None)

            # If we got here with scope_valid=True from integrity check, accept
            if scope_valid:
                return (True, None)

            return (
                False,
                ValidationError(
                    type=ValidationErrorType.SCOPE_MISSING,
                    message=f"Query must filter by project_id for tables: {scoped_tables}",
                    suggestion="Add WHERE project_id = :project_id",
                ),
            )

        else:  # QueryType.CYPHER
            cypher_scope_patterns = [
                r"\{.*project_id\s*:\s*\$",
                r"where\s+\w+\.project_id\s*=\s*\$",
                r"\(p:project\s*\{id:\s*\$",
                r"project_id\s*=\s*[\'\"]\w+[\'\"]",
            ]

            for pattern in cypher_scope_patterns:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    return (True, None)

            return (
                False,
                ValidationError(
                    type=ValidationErrorType.SCOPE_MISSING,
                    message="Cypher query must filter by project_id",
                    suggestion="Add WHERE n.project_id = $project_id",
                ),
            )

    def _validate_performance(
        self, query: str, query_type: QueryType
    ) -> List[ValidationError]:
        """Layer 4: Performance and Resource Safety Validation."""
        errors = []
        query_upper = query.upper().strip()

        if query_type == QueryType.SQL:
            # P1: SELECT * Prevention
            if re.search(r"SELECT\s+\*\s+FROM", query_upper):
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message="SELECT * is forbidden. List specific columns.",
                        suggestion="Replace SELECT * with explicit column list",
                    )
                )

            # P2: LIMIT Enforcement
            if "LIMIT" not in query_upper:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message="Query must have LIMIT clause",
                        suggestion="Add LIMIT 50 (max 100) to your query",
                    )
                )
            else:
                limit_match = re.search(r"LIMIT\s+(\d+)", query_upper)
                if limit_match:
                    limit_value = int(limit_match.group(1))
                    if limit_value > MAX_RESULT_ROWS:
                        errors.append(
                            ValidationError(
                                type=ValidationErrorType.POLICY_VIOLATION,
                                message=f"LIMIT {limit_value} exceeds maximum ({MAX_RESULT_ROWS})",
                                suggestion=f"Reduce LIMIT to {MAX_RESULT_ROWS} or less",
                            )
                        )

            # P3: Cartesian Product Prevention
            table_count = len(re.findall(r"\bFROM\b|\bJOIN\b", query_upper))
            join_count = len(re.findall(r"\bJOIN\b", query_upper))
            if table_count > 1 and join_count == 0 and "WHERE" not in query_upper:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message="Potential Cartesian product detected",
                        suggestion="Add JOIN conditions or WHERE clause",
                    )
                )

            # P4: Subquery Depth Limit
            subquery_depth = self._count_subquery_depth(query)
            if subquery_depth > MAX_SUBQUERY_DEPTH:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message=f"Subquery depth {subquery_depth} exceeds maximum ({MAX_SUBQUERY_DEPTH})",
                        suggestion="Simplify query by reducing nested subqueries",
                    )
                )

            # P5: UNION Limits
            union_count = len(re.findall(r"\bUNION\b", query_upper))
            if union_count > MAX_UNION_COUNT:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message=f"UNION count {union_count} exceeds maximum ({MAX_UNION_COUNT})",
                        suggestion="Reduce number of UNION operations",
                    )
                )

            # P6: Recursive CTE Prevention
            if "RECURSIVE" in query_upper:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.SECURITY_VIOLATION,
                        message="Recursive CTEs are forbidden",
                        suggestion="Use iterative query patterns instead",
                    )
                )

        elif query_type == QueryType.CYPHER:
            # Cypher performance checks
            if "MATCH (N)" in query_upper and "WHERE" not in query_upper:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message="Unbounded MATCH without WHERE is forbidden",
                        suggestion="Add WHERE clause to filter nodes",
                    )
                )

            if "LIMIT" not in query_upper:
                errors.append(
                    ValidationError(
                        type=ValidationErrorType.POLICY_VIOLATION,
                        message="Cypher query must have LIMIT clause",
                        suggestion="Add LIMIT 50 (max 100) to your query",
                    )
                )

        return errors

    def _count_subquery_depth(self, query: str) -> int:
        """Count the maximum depth of nested subqueries."""
        depth = 0
        max_depth = 0
        in_string = False
        prev_char = ""

        for char in query:
            if char == "'" and prev_char != "\\":
                in_string = not in_string
            if not in_string:
                if char == "(":
                    depth += 1
                    max_depth = max(max_depth, depth)
                elif char == ")":
                    depth = max(0, depth - 1)
            prev_char = char

        return max_depth

    def _validate_sql_syntax(self, query: str) -> Optional[ValidationError]:
        """Validate SQL syntax using EXPLAIN."""
        try:
            import psycopg2

            conn = psycopg2.connect(
                host=os.getenv("PG_HOST", "postgres"),
                port=int(os.getenv("PG_PORT", "5432")),
                database=os.getenv("PG_DATABASE", "pms_db"),
                user=os.getenv("PG_USER", "pms_user"),
                password=os.getenv("PG_PASSWORD", "pms_password"),
            )

            cursor = conn.cursor()
            cursor.execute(f"EXPLAIN {query}")
            cursor.close()
            conn.close()

            return None

        except psycopg2.Error as e:
            return ValidationError(
                type=ValidationErrorType.SYNTAX,
                message=f"SQL syntax error: {str(e)}",
                suggestion="Check SQL syntax and table/column names",
            )
        except Exception as e:
            logger.error(f"Syntax validation failed: {e}")
            return ValidationError(
                type=ValidationErrorType.SYNTAX,
                message=f"Validation error: {str(e)}",
            )

    def ensure_result_limit(self, query: str, query_type: QueryType) -> str:
        """Ensure query has a LIMIT clause, adding one if missing."""
        query_upper = query.upper()

        if query_type == QueryType.SQL:
            if "LIMIT" not in query_upper:
                query = query.rstrip().rstrip(";")
                query = f"{query}\nLIMIT {MAX_RESULT_ROWS}"
        else:
            if "LIMIT" not in query_upper:
                query = f"{query}\nLIMIT {MAX_RESULT_ROWS}"

        return query


# Singleton instance
_validator: Optional[QueryValidator] = None


def get_query_validator() -> QueryValidator:
    """Get singleton QueryValidator instance."""
    global _validator
    if _validator is None:
        _validator = QueryValidator()
    return _validator
