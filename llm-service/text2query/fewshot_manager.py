"""
Few-shot Example Manager for Text2Query.

Manages storage, retrieval, and similarity-based lookup of few-shot examples
for query generation. Examples are stored in PostgreSQL with vector embeddings
for semantic similarity search.
"""

import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from .models import QueryType, FewshotExample

logger = logging.getLogger(__name__)


# Default few-shot examples for SQL
DEFAULT_SQL_EXAMPLES: List[Dict[str, Any]] = [
    {
        "id": "sql-001",
        "question": "How many user stories are in progress?",
        "query": """SELECT COUNT(*) as count
FROM task.user_stories us
WHERE us.project_id = :project_id
  AND us.status = 'IN_PROGRESS'
LIMIT 1""",
        "query_type": QueryType.SQL,
        "target_tables": ["task.user_stories"],
        "keywords": ["user stories", "in progress", "count"],
    },
    {
        "id": "sql-002",
        "question": "List all sprints with their status",
        "query": """SELECT s.id, s.name, s.status, s.start_date, s.end_date
FROM task.sprints s
WHERE s.project_id = :project_id
ORDER BY s.start_date DESC
LIMIT 50""",
        "query_type": QueryType.SQL,
        "target_tables": ["task.sprints"],
        "keywords": ["sprints", "list", "status"],
    },
    {
        "id": "sql-003",
        "question": "Show completed tasks in the current sprint",
        "query": """SELECT t.id, t.title, t.status, t.completed_at
FROM task.tasks t
JOIN task.user_stories us ON t.user_story_id = us.id
JOIN task.sprints s ON us.sprint_id = s.id
WHERE s.project_id = :project_id
  AND s.status = 'ACTIVE'
  AND t.status = 'DONE'
ORDER BY t.completed_at DESC
LIMIT 50""",
        "query_type": QueryType.SQL,
        "target_tables": ["task.tasks", "task.user_stories", "task.sprints"],
        "keywords": ["tasks", "completed", "current sprint"],
    },
    {
        "id": "sql-004",
        "question": "What are the open issues?",
        "query": """SELECT i.id, i.title, i.priority, i.status, i.created_at
FROM project.issues i
WHERE i.project_id = :project_id
  AND i.status != 'CLOSED'
ORDER BY i.priority, i.created_at DESC
LIMIT 50""",
        "query_type": QueryType.SQL,
        "target_tables": ["project.issues"],
        "keywords": ["issues", "open", "list"],
    },
    {
        "id": "sql-005",
        "question": "Show project phases with completion percentage",
        "query": """SELECT p.id, p.name, p.status, p.progress_percentage
FROM project.phases p
WHERE p.project_id = :project_id
ORDER BY p.sequence_order
LIMIT 20""",
        "query_type": QueryType.SQL,
        "target_tables": ["project.phases"],
        "keywords": ["phases", "completion", "progress"],
    },
]

# Default few-shot examples for Cypher
DEFAULT_CYPHER_EXAMPLES: List[Dict[str, Any]] = [
    {
        "id": "cypher-001",
        "question": "Find documents related to the project",
        "query": """MATCH (d:Document)
WHERE d.project_id = $project_id
RETURN d.id, d.title, d.file_type
LIMIT 50""",
        "query_type": QueryType.CYPHER,
        "target_tables": ["Document"],
        "keywords": ["documents", "find", "project"],
    },
    {
        "id": "cypher-002",
        "question": "Search for chunks containing specific keyword",
        "query": """MATCH (c:Chunk)
WHERE c.project_id = $project_id
  AND toLower(c.content) CONTAINS toLower($keyword)
RETURN c.id, c.content, c.source_document_id
LIMIT 20""",
        "query_type": QueryType.CYPHER,
        "target_tables": ["Chunk"],
        "keywords": ["search", "chunks", "keyword"],
    },
    {
        "id": "cypher-003",
        "question": "Get document with its chunks",
        "query": """MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
WHERE d.project_id = $project_id
  AND d.id = $document_id
RETURN d.title, c.id, c.content
LIMIT 100""",
        "query_type": QueryType.CYPHER,
        "target_tables": ["Document", "Chunk"],
        "keywords": ["document", "chunks", "relationship"],
    },
]


class FewshotManager:
    """
    Manages few-shot examples for query generation.

    Features:
    - In-memory cache of examples with fallback defaults
    - Keyword-based similarity matching (basic)
    - Support for PostgreSQL vector search (when available)
    """

    def __init__(self):
        self._sql_examples: List[FewshotExample] = []
        self._cypher_examples: List[FewshotExample] = []
        self._initialized = False

    def _ensure_initialized(self) -> None:
        """Initialize examples from defaults if not done."""
        if self._initialized:
            return

        # Load default SQL examples
        for ex_data in DEFAULT_SQL_EXAMPLES:
            self._sql_examples.append(
                FewshotExample(
                    id=ex_data["id"],
                    question=ex_data["question"],
                    query=ex_data["query"],
                    query_type=ex_data["query_type"],
                    target_tables=ex_data["target_tables"],
                    keywords=ex_data.get("keywords", []),
                )
            )

        # Load default Cypher examples
        for ex_data in DEFAULT_CYPHER_EXAMPLES:
            self._cypher_examples.append(
                FewshotExample(
                    id=ex_data["id"],
                    question=ex_data["question"],
                    query=ex_data["query"],
                    query_type=ex_data["query_type"],
                    target_tables=ex_data["target_tables"],
                    keywords=ex_data.get("keywords", []),
                )
            )

        self._initialized = True
        logger.info(
            f"Initialized FewshotManager with {len(self._sql_examples)} SQL "
            f"and {len(self._cypher_examples)} Cypher examples"
        )

    def get_similar_examples(
        self,
        question: str,
        query_type: QueryType,
        k: int = 3,
    ) -> List[FewshotExample]:
        """
        Get similar few-shot examples for a question.

        Uses keyword matching to find relevant examples.
        Future: Use vector embeddings for semantic similarity.

        Args:
            question: User's natural language question
            query_type: SQL or CYPHER
            k: Number of examples to return

        Returns:
            List of FewshotExample sorted by relevance
        """
        self._ensure_initialized()

        examples = (
            self._sql_examples
            if query_type == QueryType.SQL
            else self._cypher_examples
        )

        # Calculate similarity scores based on keyword overlap
        question_lower = question.lower()
        scored_examples = []

        for ex in examples:
            score = self._calculate_similarity(question_lower, ex)
            ex_copy = FewshotExample(
                id=ex.id,
                question=ex.question,
                query=ex.query,
                query_type=ex.query_type,
                target_tables=ex.target_tables,
                keywords=ex.keywords,
                similarity_score=score,
            )
            scored_examples.append(ex_copy)

        # Sort by score descending and return top k
        scored_examples.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_examples[:k]

    def _calculate_similarity(self, question: str, example: FewshotExample) -> float:
        """
        Calculate similarity score between question and example.

        Uses keyword overlap and question matching.
        """
        score = 0.0

        # Check keyword matches
        for keyword in example.keywords:
            if keyword.lower() in question:
                score += 0.3

        # Check question word overlap
        question_words = set(question.split())
        example_words = set(example.question.lower().split())
        overlap = len(question_words & example_words)
        if overlap > 0:
            score += overlap * 0.1

        return min(score, 1.0)  # Cap at 1.0

    def add_example(
        self,
        question: str,
        query: str,
        query_type: QueryType,
        target_tables: List[str],
        keywords: Optional[List[str]] = None,
    ) -> FewshotExample:
        """
        Add a new few-shot example.

        Args:
            question: Natural language question
            query: Validated query
            query_type: SQL or CYPHER
            target_tables: Tables/labels used
            keywords: Optional keyword list

        Returns:
            Created FewshotExample
        """
        self._ensure_initialized()

        example = FewshotExample(
            id=f"{query_type.value}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            question=question,
            query=query,
            query_type=query_type,
            target_tables=target_tables,
            keywords=keywords or [],
        )

        if query_type == QueryType.SQL:
            self._sql_examples.append(example)
        else:
            self._cypher_examples.append(example)

        logger.info(f"Added new few-shot example: {example.id}")
        return example

    def get_all_examples(self, query_type: QueryType) -> List[FewshotExample]:
        """Get all examples of a specific type."""
        self._ensure_initialized()
        return (
            self._sql_examples.copy()
            if query_type == QueryType.SQL
            else self._cypher_examples.copy()
        )


# Singleton instance
_fewshot_manager: Optional[FewshotManager] = None


def get_fewshot_manager() -> FewshotManager:
    """Get singleton FewshotManager instance."""
    global _fewshot_manager
    if _fewshot_manager is None:
        _fewshot_manager = FewshotManager()
    return _fewshot_manager
