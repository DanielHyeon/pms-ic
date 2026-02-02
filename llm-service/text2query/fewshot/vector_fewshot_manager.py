"""
Vector-based Few-shot Manager

Stores and retrieves SQL/Cypher examples using vector similarity search.
Uses the same embedding model as the main RAG service (multilingual-e5-large).
"""
import logging
import os
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class FewshotExample:
    """Represents a few-shot example for query generation."""
    question: str
    query: str  # SQL or Cypher
    query_type: str  # "sql" or "cypher"
    keywords: List[str] = field(default_factory=list)
    target_tables: List[str] = field(default_factory=list)
    embedding: Optional[List[float]] = None
    verified: bool = False
    created_at: Optional[datetime] = None
    success_count: int = 0
    similarity_score: float = 0.0

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

    @property
    def id(self) -> str:
        """Generate unique ID from question hash."""
        return hashlib.md5(self.question.encode()).hexdigest()[:12]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "id": self.id,
            "question": self.question,
            "query": self.query,
            "query_type": self.query_type,
            "keywords": self.keywords,
            "target_tables": self.target_tables,
            "verified": self.verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "success_count": self.success_count,
        }


# Default SQL examples for initialization
DEFAULT_SQL_EXAMPLES = [
    FewshotExample(
        question="How many tasks are in progress?",
        query="""SELECT COUNT(*) as count
FROM task.tasks
WHERE project_id = :project_id AND status = 'IN_PROGRESS'
LIMIT 1""",
        query_type="sql",
        keywords=["tasks", "progress", "count", "in_progress"],
        target_tables=["task.tasks"],
        verified=True
    ),
    FewshotExample(
        question="Show me all user stories for the current sprint",
        query="""SELECT us.id, us.title, us.status, us.story_points
FROM task.user_stories us
JOIN task.sprints s ON us.sprint_id = s.id
WHERE us.project_id = :project_id
  AND s.status = 'ACTIVE'
ORDER BY us.story_points DESC
LIMIT 100""",
        query_type="sql",
        keywords=["user", "stories", "sprint", "current", "active"],
        target_tables=["task.user_stories", "task.sprints"],
        verified=True
    ),
    FewshotExample(
        question="What is the sprint velocity for last month?",
        query="""SELECT s.name as sprint_name,
       SUM(us.story_points) as velocity
FROM task.sprints s
JOIN task.user_stories us ON s.id = us.sprint_id
WHERE s.project_id = :project_id
  AND s.end_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  AND s.end_date < DATE_TRUNC('month', NOW())
  AND us.status = 'DONE'
GROUP BY s.id, s.name
LIMIT 100""",
        query_type="sql",
        keywords=["sprint", "velocity", "month", "story", "points"],
        target_tables=["task.sprints", "task.user_stories"],
        verified=True
    ),
    FewshotExample(
        question="List all high severity issues",
        query="""SELECT id, title, status, created_at
FROM project.issues
WHERE project_id = :project_id
  AND severity = 'HIGH'
ORDER BY created_at DESC
LIMIT 100""",
        query_type="sql",
        keywords=["issues", "high", "severity", "critical"],
        target_tables=["project.issues"],
        verified=True
    ),
    FewshotExample(
        question="Show tasks assigned to me",
        query="""SELECT t.id, t.title, t.status, t.estimated_hours
FROM task.tasks t
WHERE t.project_id = :project_id
  AND t.assignee_id = :user_id
ORDER BY t.created_at DESC
LIMIT 100""",
        query_type="sql",
        keywords=["tasks", "assigned", "me", "my"],
        target_tables=["task.tasks"],
        verified=True
    ),
    FewshotExample(
        question="What is the task completion rate?",
        query="""SELECT
  COUNT(*) FILTER (WHERE status = 'DONE') * 100.0 / NULLIF(COUNT(*), 0) as completion_rate,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'DONE') as completed_tasks
FROM task.tasks
WHERE project_id = :project_id
LIMIT 1""",
        query_type="sql",
        keywords=["task", "completion", "rate", "percentage", "done"],
        target_tables=["task.tasks"],
        verified=True
    ),
    FewshotExample(
        question="How many open issues by severity?",
        query="""SELECT severity, COUNT(*) as count
FROM project.issues
WHERE project_id = :project_id
  AND status IN ('OPEN', 'IN_PROGRESS')
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
  END
LIMIT 100""",
        query_type="sql",
        keywords=["issues", "open", "severity", "group"],
        target_tables=["project.issues"],
        verified=True
    ),
    FewshotExample(
        question="Show me blocked tasks",
        query="""SELECT t.id, t.title, t.assignee_id, t.updated_at
FROM task.tasks t
WHERE t.project_id = :project_id
  AND t.status = 'BLOCKED'
ORDER BY t.updated_at DESC
LIMIT 100""",
        query_type="sql",
        keywords=["tasks", "blocked", "blockers"],
        target_tables=["task.tasks"],
        verified=True
    ),
    FewshotExample(
        question="List all sprints with their status",
        query="""SELECT s.id, s.name, s.status, s.start_date, s.end_date
FROM task.sprints s
WHERE s.project_id = :project_id
ORDER BY s.start_date DESC
LIMIT 50""",
        query_type="sql",
        keywords=["sprints", "list", "status"],
        target_tables=["task.sprints"],
        verified=True
    ),
    FewshotExample(
        question="Show project phases with completion percentage",
        query="""SELECT p.id, p.name, p.status, p.progress_percentage
FROM project.phases p
WHERE p.project_id = :project_id
ORDER BY p.sequence_order
LIMIT 20""",
        query_type="sql",
        keywords=["phases", "completion", "progress", "percentage"],
        target_tables=["project.phases"],
        verified=True
    ),
    FewshotExample(
        question="Show story points by status",
        query="""SELECT status, SUM(story_points) as total_points, COUNT(*) as story_count
FROM task.user_stories
WHERE project_id = :project_id
GROUP BY status
LIMIT 100""",
        query_type="sql",
        keywords=["story", "points", "status", "group", "sum"],
        target_tables=["task.user_stories"],
        verified=True
    ),
    FewshotExample(
        question="List high impact risks",
        query="""SELECT id, title, probability, impact, status
FROM project.risks
WHERE project_id = :project_id
  AND impact IN ('HIGH', 'CRITICAL')
ORDER BY
  CASE impact WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 END,
  CASE probability WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END
LIMIT 100""",
        query_type="sql",
        keywords=["risks", "high", "impact", "critical"],
        target_tables=["project.risks"],
        verified=True
    ),
]

DEFAULT_CYPHER_EXAMPLES = [
    FewshotExample(
        question="What documents are related to this requirement?",
        query="""MATCH (r:Requirement {id: $requirement_id})-[:RELATED_TO|REFERENCES*1..2]-(d:Document)
WHERE r.project_id = $project_id
RETURN d.id, d.title, d.type
LIMIT 50""",
        query_type="cypher",
        keywords=["documents", "related", "requirement", "reference"],
        target_tables=["Document", "Requirement"],
        verified=True
    ),
    FewshotExample(
        question="Show the dependency chain for this task",
        query="""MATCH path = (t:Task {id: $task_id})-[:DEPENDS_ON*1..5]->(dep:Task)
WHERE t.project_id = $project_id
RETURN path
LIMIT 100""",
        query_type="cypher",
        keywords=["dependency", "chain", "task", "depends"],
        target_tables=["Task"],
        verified=True
    ),
    FewshotExample(
        question="Find all entities connected to this user story",
        query="""MATCH (us:UserStory {id: $user_story_id})-[r]-(connected)
WHERE us.project_id = $project_id
RETURN type(r) as relationship, labels(connected) as type, connected.id, connected.title
LIMIT 100""",
        query_type="cypher",
        keywords=["entities", "connected", "user", "story", "relationship"],
        target_tables=["UserStory"],
        verified=True
    ),
    FewshotExample(
        question="Find documents related to the project",
        query="""MATCH (d:Document)
WHERE d.project_id = $project_id
RETURN d.id, d.title, d.file_type
LIMIT 50""",
        query_type="cypher",
        keywords=["documents", "find", "project"],
        target_tables=["Document"],
        verified=True
    ),
    FewshotExample(
        question="Search for chunks containing specific keyword",
        query="""MATCH (c:Chunk)
WHERE c.project_id = $project_id
  AND toLower(c.content) CONTAINS toLower($keyword)
RETURN c.id, c.content, c.source_document_id
LIMIT 20""",
        query_type="cypher",
        keywords=["search", "chunks", "keyword", "content"],
        target_tables=["Chunk"],
        verified=True
    ),
]


class VectorFewshotManager:
    """
    Vector-based few-shot example management.

    Features:
    - Semantic similarity search using embeddings
    - In-memory storage with optional Neo4j persistence
    - Automatic learning from successful queries
    - Verification status tracking
    - Query type separation (SQL vs Cypher)
    """

    def __init__(self, use_neo4j: bool = False):
        self._sql_examples: Dict[str, FewshotExample] = {}
        self._cypher_examples: Dict[str, FewshotExample] = {}
        self._embedding_model = None
        self._embedding_dim = 1024
        self._initialized = False
        self._use_neo4j = use_neo4j
        self._neo4j_driver = None

    def _ensure_initialized(self) -> None:
        """Initialize examples and embedding model."""
        if self._initialized:
            return

        # Load default examples
        for example in DEFAULT_SQL_EXAMPLES:
            self._sql_examples[example.id] = example

        for example in DEFAULT_CYPHER_EXAMPLES:
            self._cypher_examples[example.id] = example

        self._initialized = True
        logger.info(
            f"Initialized VectorFewshotManager with {len(self._sql_examples)} SQL "
            f"and {len(self._cypher_examples)} Cypher examples"
        )

    def _ensure_embedding_model(self) -> None:
        """Lazy load embedding model."""
        if self._embedding_model is not None:
            return

        try:
            from sentence_transformers import SentenceTransformer

            embedding_device = os.getenv("EMBEDDING_DEVICE", "cpu")
            logger.info(f"Loading embedding model on device: {embedding_device}...")

            self._embedding_model = SentenceTransformer(
                'intfloat/multilingual-e5-large',
                device=embedding_device
            )
            logger.info("Embedding model loaded for fewshot manager")
        except Exception as e:
            logger.warning(f"Failed to load embedding model: {e}")
            self._embedding_model = None

    def _get_embedding(self, text: str) -> Optional[List[float]]:
        """Get embedding for text."""
        self._ensure_embedding_model()
        if self._embedding_model is None:
            return None

        try:
            # Add query prefix for e5 model
            prefixed_text = f"query: {text}"
            embedding = self._embedding_model.encode(prefixed_text).tolist()
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        a = np.array(vec1)
        b = np.array(vec2)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))

    def find_similar(
        self,
        question: str,
        query_type: str = "sql",
        limit: int = 3,
        verified_only: bool = True,
        score_threshold: float = 0.5
    ) -> List[FewshotExample]:
        """
        Find similar examples using vector similarity.

        Args:
            question: User's question
            query_type: "sql" or "cypher"
            limit: Maximum number of examples to return
            verified_only: Only return verified examples
            score_threshold: Minimum similarity score

        Returns:
            List of similar FewshotExamples sorted by similarity
        """
        self._ensure_initialized()

        # Get examples for query type
        examples = (
            self._sql_examples if query_type == "sql"
            else self._cypher_examples
        )

        # Try vector similarity first
        query_embedding = self._get_embedding(question)

        if query_embedding:
            return self._vector_search(
                query_embedding,
                examples,
                limit,
                verified_only,
                score_threshold
            )
        else:
            # Fallback to keyword matching
            return self._keyword_search(
                question,
                examples,
                limit,
                verified_only
            )

    def _vector_search(
        self,
        query_embedding: List[float],
        examples: Dict[str, FewshotExample],
        limit: int,
        verified_only: bool,
        score_threshold: float
    ) -> List[FewshotExample]:
        """Search using vector similarity."""
        scored_examples = []

        for example in examples.values():
            if verified_only and not example.verified:
                continue

            # Get or compute embedding
            if example.embedding is None:
                example.embedding = self._get_embedding(example.question)

            if example.embedding is None:
                continue

            similarity = self._cosine_similarity(query_embedding, example.embedding)

            if similarity >= score_threshold:
                result = FewshotExample(
                    question=example.question,
                    query=example.query,
                    query_type=example.query_type,
                    keywords=example.keywords,
                    target_tables=example.target_tables,
                    embedding=example.embedding,
                    verified=example.verified,
                    created_at=example.created_at,
                    success_count=example.success_count,
                    similarity_score=similarity
                )
                scored_examples.append(result)

        # Sort by similarity score
        scored_examples.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_examples[:limit]

    def _keyword_search(
        self,
        question: str,
        examples: Dict[str, FewshotExample],
        limit: int,
        verified_only: bool
    ) -> List[FewshotExample]:
        """Fallback keyword-based search."""
        question_lower = question.lower()
        question_words = set(question_lower.split())
        scored_examples = []

        for example in examples.values():
            if verified_only and not example.verified:
                continue

            score = 0.0

            # Keyword matching
            for keyword in example.keywords:
                if keyword.lower() in question_lower:
                    score += 0.2

            # Word overlap
            example_words = set(example.question.lower().split())
            overlap = len(question_words & example_words)
            score += overlap * 0.1

            if score > 0:
                result = FewshotExample(
                    question=example.question,
                    query=example.query,
                    query_type=example.query_type,
                    keywords=example.keywords,
                    target_tables=example.target_tables,
                    verified=example.verified,
                    created_at=example.created_at,
                    success_count=example.success_count,
                    similarity_score=min(score, 1.0)
                )
                scored_examples.append(result)

        scored_examples.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_examples[:limit]

    def add_example(
        self,
        question: str,
        query: str,
        query_type: str = "sql",
        keywords: Optional[List[str]] = None,
        target_tables: Optional[List[str]] = None,
        verified: bool = False
    ) -> FewshotExample:
        """
        Add a new few-shot example.

        Args:
            question: Natural language question
            query: Validated query (SQL or Cypher)
            query_type: "sql" or "cypher"
            keywords: Optional list of keywords
            target_tables: Tables/labels used
            verified: Whether the example is human-verified

        Returns:
            Created FewshotExample
        """
        self._ensure_initialized()

        # Extract keywords if not provided
        if keywords is None:
            keywords = self._extract_keywords(question)

        example = FewshotExample(
            question=question,
            query=query,
            query_type=query_type,
            keywords=keywords,
            target_tables=target_tables or [],
            verified=verified,
            success_count=1
        )

        # Generate embedding
        example.embedding = self._get_embedding(question)

        # Store
        if query_type == "sql":
            self._sql_examples[example.id] = example
        else:
            self._cypher_examples[example.id] = example

        logger.info(f"Added new few-shot example: {example.id} (verified={verified})")
        return example

    def learn_from_success(
        self,
        question: str,
        query: str,
        query_type: str = "sql",
        target_tables: Optional[List[str]] = None
    ) -> None:
        """
        Learn from a successful query execution.

        If a similar example exists, increment its success count.
        If not, add as a new unverified example.
        """
        self._ensure_initialized()

        # Find similar existing example
        similar = self.find_similar(
            question,
            query_type=query_type,
            limit=1,
            verified_only=False,
            score_threshold=0.85
        )

        if similar and similar[0].query.strip() == query.strip():
            # Update existing example
            example_id = similar[0].id
            examples = (
                self._sql_examples if query_type == "sql"
                else self._cypher_examples
            )

            if example_id in examples:
                examples[example_id].success_count += 1
                # Auto-verify after 3 successful uses
                if examples[example_id].success_count >= 3:
                    examples[example_id].verified = True
                logger.info(f"Updated success count for example {example_id}")
        else:
            # Add new unverified example
            self.add_example(
                question=question,
                query=query,
                query_type=query_type,
                target_tables=target_tables,
                verified=False
            )

    def mark_verified(self, example_id: str, query_type: str = "sql") -> bool:
        """Mark an example as verified (human-approved)."""
        examples = (
            self._sql_examples if query_type == "sql"
            else self._cypher_examples
        )

        if example_id in examples:
            examples[example_id].verified = True
            logger.info(f"Marked example {example_id} as verified")
            return True

        return False

    def _extract_keywords(self, question: str) -> List[str]:
        """Extract keywords from question."""
        stopwords = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
            'by', 'from', 'as', 'into', 'through', 'during', 'before',
            'after', 'above', 'below', 'between', 'under', 'again',
            'then', 'once', 'here', 'there', 'when', 'where', 'why',
            'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
            'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
            'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
            'because', 'until', 'while', 'what', 'which', 'who', 'this',
            'that', 'these', 'those', 'am', 'show', 'me', 'list', 'get',
            'find', 'give', 'tell', 'many', 'much',
        }

        words = question.lower().split()
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        return list(set(keywords))

    def get_all_examples(self, query_type: str = "sql") -> List[FewshotExample]:
        """Get all examples of a specific type."""
        self._ensure_initialized()
        examples = (
            self._sql_examples if query_type == "sql"
            else self._cypher_examples
        )
        return list(examples.values())

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about stored examples."""
        self._ensure_initialized()
        return {
            "sql_examples": len(self._sql_examples),
            "sql_verified": sum(1 for e in self._sql_examples.values() if e.verified),
            "cypher_examples": len(self._cypher_examples),
            "cypher_verified": sum(1 for e in self._cypher_examples.values() if e.verified),
            "embedding_model_loaded": self._embedding_model is not None,
        }


# Singleton instance
_vector_fewshot_manager: Optional[VectorFewshotManager] = None


def get_vector_fewshot_manager() -> VectorFewshotManager:
    """Get or create vector fewshot manager singleton."""
    global _vector_fewshot_manager
    if _vector_fewshot_manager is None:
        _vector_fewshot_manager = VectorFewshotManager()
    return _vector_fewshot_manager


def reset_vector_fewshot_manager() -> None:
    """Reset the fewshot manager singleton (for testing)."""
    global _vector_fewshot_manager
    _vector_fewshot_manager = None
