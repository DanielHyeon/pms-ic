"""
Text-to-SQL Service.

Converts natural language questions to SQL queries using LLM.
Provides schema context and sanitization for safe query generation.
"""

import os
import re
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Database schema context for SQL generation
DB_SCHEMA_CONTEXT = """
You are a SQL query generator for a Project Management System.

## Database Schema (PostgreSQL)

### Schema: project
- projects: id, name, status, start_date, end_date, description, created_at
- phases: id, project_id, name, status, start_date, end_date, progress
- epics: id, project_id, name, status, priority, description
- features: id, epic_id, name, status, priority
- wbs_groups: id, phase_id, code, name, status, progress
- wbs_items: id, group_id, phase_id, code, name, status, progress

### Schema: task
- tasks: id, project_id, phase_id, sprint_id, user_story_id, title, status, priority, assignee_id, story_points, created_at
- user_stories: id, project_id, epic, title, status, priority, story_points, sprint_id
- sprints: id, project_id, name, status, start_date, end_date, goal

### Schema: auth
- users: id, name, email, role, department, created_at

### Schema: report
- reports: id, project_id, report_type, report_scope, title, status, period_start, period_end, created_by, created_at
- report_metrics_history: id, project_id, recorded_at, total_tasks, completed_tasks, in_progress_tasks

## Common Query Patterns
- Task status: SELECT status, COUNT(*) FROM task.tasks WHERE project_id = ? GROUP BY status
- Sprint progress: SELECT s.name, COUNT(t.id), SUM(t.story_points) FROM task.sprints s LEFT JOIN task.tasks t ON...
- User workload: SELECT u.name, COUNT(t.id) FROM auth.users u JOIN task.tasks t ON t.assignee_id = u.id...

## Rules
1. ONLY generate SELECT statements
2. Always include project_id filter when querying project-related data
3. Use proper schema prefixes (project., task., auth., report.)
4. Include LIMIT clause for safety (max 1000)
5. Use proper JOINs with explicit ON conditions
6. Return results as JSON-friendly column names (use AS aliases)
"""

# SQL patterns that should be blocked
DANGEROUS_PATTERNS = [
    r'\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\b',
    r'\b(GRANT|REVOKE|EXEC|EXECUTE)\b',
    r'(xp_|sp_|--)',
    r'(;.*SELECT)',  # Stacked queries
]


class TextToSqlService:
    """Service for converting natural language to SQL."""

    def __init__(self, llm_model=None):
        """Initialize with optional LLM model."""
        self.model = llm_model
        self.max_tokens = int(os.getenv("SQL_MAX_TOKENS", "500"))
        self.temperature = float(os.getenv("SQL_TEMPERATURE", "0.1"))

    def set_model(self, model):
        """Set the LLM model to use for SQL generation."""
        self.model = model

    def generate_sql(
        self,
        question: str,
        project_id: str,
        user_role: str,
        user_id: str,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate SQL from natural language question.

        Args:
            question: Natural language question
            project_id: Project ID for context
            user_role: User's role for permission context
            user_id: User's ID
            additional_context: Optional additional context

        Returns:
            Dict with sql, explanation, confidence, success
        """
        if self.model is None:
            logger.error("LLM model not set for TextToSqlService")
            return {
                "success": False,
                "error": "LLM model not initialized",
                "sql": None,
                "explanation": None,
                "confidence": 0.0
            }

        try:
            # Build prompt
            prompt = self._build_prompt(question, project_id, user_role, additional_context)

            # Generate SQL
            logger.info(f"Generating SQL for: {question[:100]}...")
            response = self.model(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stop=["```", "\n\n\n"]
            )

            generated_text = response["choices"][0]["text"].strip()

            # Parse response
            sql, explanation = self._parse_response(generated_text)

            # Validate SQL
            is_valid, validation_msg = self._validate_sql(sql)
            if not is_valid:
                return {
                    "success": False,
                    "error": validation_msg,
                    "sql": sql,
                    "explanation": explanation,
                    "confidence": 0.0
                }

            # Inject project_id if missing
            sql = self._inject_project_filter(sql, project_id)

            # Calculate confidence based on model's response quality
            confidence = self._calculate_confidence(sql, question)

            return {
                "success": True,
                "sql": sql,
                "explanation": explanation,
                "confidence": confidence
            }

        except Exception as e:
            logger.error(f"SQL generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "sql": None,
                "explanation": None,
                "confidence": 0.0
            }

    def _build_prompt(
        self,
        question: str,
        project_id: str,
        user_role: str,
        additional_context: Optional[str]
    ) -> str:
        """Build the prompt for SQL generation."""
        role_context = self._get_role_context(user_role)

        prompt = f"""{DB_SCHEMA_CONTEXT}

## User Context
- Project ID: {project_id}
- User Role: {user_role}
{role_context}

## Question
{question}

{f"## Additional Context: {additional_context}" if additional_context else ""}

## Task
Generate a safe, read-only SQL SELECT query to answer the question.
Return ONLY the SQL query, followed by a brief explanation.

Format:
```sql
SELECT ...
```
Explanation: [Brief explanation of what the query does]

SQL Query:
```sql
"""
        return prompt

    def _get_role_context(self, user_role: str) -> str:
        """Get role-specific context for the prompt."""
        role_contexts = {
            "sponsor": "- Can view all project data including budgets and high-level metrics",
            "pmo_head": "- Can view all project data and cross-project analytics",
            "pm": "- Can view all project data including team performance",
            "team_lead": "- Can view team-level data and individual contributions",
            "developer": "- Should primarily see own tasks and team-related data",
            "qa": "- Should focus on testing-related tasks and quality metrics",
        }
        return role_contexts.get(user_role, "- Standard project member access")

    def _parse_response(self, response: str) -> tuple[Optional[str], Optional[str]]:
        """Parse SQL and explanation from LLM response."""
        sql = None
        explanation = None

        # Try to extract SQL from code block
        sql_match = re.search(r'```sql\s*([\s\S]*?)\s*```', response, re.IGNORECASE)
        if sql_match:
            sql = sql_match.group(1).strip()
        else:
            # Try to find SELECT statement directly
            select_match = re.search(r'(SELECT[\s\S]+?)(?:;|$)', response, re.IGNORECASE)
            if select_match:
                sql = select_match.group(1).strip()

        # Extract explanation
        exp_match = re.search(r'Explanation:\s*(.+)', response, re.IGNORECASE | re.DOTALL)
        if exp_match:
            explanation = exp_match.group(1).strip()
            # Truncate if too long
            if len(explanation) > 500:
                explanation = explanation[:500] + "..."

        return sql, explanation

    def _validate_sql(self, sql: Optional[str]) -> tuple[bool, str]:
        """Validate SQL for safety."""
        if not sql:
            return False, "No SQL generated"

        sql_upper = sql.upper()

        # Must be SELECT only
        if not sql_upper.strip().startswith("SELECT"):
            return False, "Only SELECT queries are allowed"

        # Check for dangerous patterns
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, sql_upper):
                return False, f"Query contains forbidden pattern"

        return True, "Valid"

    def _inject_project_filter(self, sql: str, project_id: str) -> str:
        """Inject project_id filter if not present."""
        if "project_id" not in sql.lower():
            # Add to WHERE clause
            if " WHERE " in sql.upper():
                sql = re.sub(
                    r'(\sWHERE\s)',
                    f" WHERE project_id = '{project_id}' AND ",
                    sql,
                    flags=re.IGNORECASE
                )
            else:
                # Add WHERE clause before ORDER BY, GROUP BY, or LIMIT
                for keyword in [" ORDER BY", " GROUP BY", " LIMIT", " HAVING"]:
                    if keyword in sql.upper():
                        sql = re.sub(
                            f'({keyword})',
                            f" WHERE project_id = '{project_id}' \\1",
                            sql,
                            flags=re.IGNORECASE
                        )
                        break
                else:
                    sql += f" WHERE project_id = '{project_id}'"

        # Ensure LIMIT exists
        if " LIMIT " not in sql.upper():
            sql += " LIMIT 1000"

        return sql

    def _calculate_confidence(self, sql: str, question: str) -> float:
        """Calculate confidence score for generated SQL."""
        confidence = 0.7  # Base confidence

        # Increase confidence for well-formed queries
        if sql and "SELECT" in sql.upper():
            confidence += 0.1
        if "FROM" in sql.upper():
            confidence += 0.05
        if "WHERE" in sql.upper():
            confidence += 0.05
        if "project_id" in sql.lower():
            confidence += 0.05

        # Decrease for very complex queries
        join_count = sql.upper().count("JOIN")
        if join_count > 3:
            confidence -= 0.1 * (join_count - 3)

        return min(max(confidence, 0.0), 1.0)


# Singleton instance
_text_to_sql_service: Optional[TextToSqlService] = None


def get_text_to_sql_service() -> TextToSqlService:
    """Get or create singleton TextToSqlService."""
    global _text_to_sql_service
    if _text_to_sql_service is None:
        _text_to_sql_service = TextToSqlService()
    return _text_to_sql_service
