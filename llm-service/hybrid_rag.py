"""
Hybrid RAG Service - Document + Graph RAG

Combines vector-based document retrieval with graph-based relationship queries:
- Document RAG: Policy docs, meeting notes, general knowledge
- Graph RAG: Entity relationships, dependencies, blockers

Reference: docs/PMS 최적화 방안.md
"""

import os
import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

@dataclass
class HybridRAGConfig:
    """Hybrid RAG configuration"""
    # Neo4j
    neo4j_uri: str = field(default_factory=lambda: os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    neo4j_user: str = field(default_factory=lambda: os.getenv("NEO4J_USER", "neo4j"))
    neo4j_password: str = field(default_factory=lambda: os.getenv("NEO4J_PASSWORD", "pmspassword123"))

    # Strategy weights
    document_weight: float = 0.6
    graph_weight: float = 0.4

    # Thresholds
    min_relevance_score: float = 0.3
    max_results: int = 10

    # Fallback
    fallback_to_document_only: bool = True


# =============================================================================
# RAG Strategy Types
# =============================================================================

class RAGStrategy(Enum):
    """RAG retrieval strategy"""
    DOCUMENT_ONLY = "document_only"
    GRAPH_ONLY = "graph_only"
    HYBRID = "hybrid"
    DOCUMENT_FIRST = "document_first"  # Try document, then graph if insufficient
    GRAPH_FIRST = "graph_first"  # Try graph, then document if insufficient


@dataclass
class RAGResult:
    """Result from RAG retrieval"""
    content: str
    source: str  # "document" or "graph"
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class HybridRAGResult:
    """Combined result from hybrid RAG"""
    results: List[RAGResult]
    strategy_used: RAGStrategy
    document_results: List[RAGResult] = field(default_factory=list)
    graph_results: List[RAGResult] = field(default_factory=list)
    query: str = ""
    execution_time_ms: float = 0.0


# =============================================================================
# Strategy Selector
# =============================================================================

class StrategySelector:
    """Selects appropriate RAG strategy based on query analysis"""

    # Patterns indicating relationship/graph queries
    RELATIONSHIP_PATTERNS = [
        # Korean
        r"의존성|의존|depends",
        r"블로커|차단|blocks|blocked",
        r"연관|관련|관계|related",
        r"영향|impact|affects",
        r"선행|predecessor|전에",
        r"후행|successor|다음에",
        r"연결|connected|링크",
        r"경로|path|어떻게.*연결",
        # Task relationships
        r"태스크.*의존",
        r"스프린트.*태스크",
        r"프로젝트.*스프린트",
        r"담당자|assignee|할당",
    ]

    # Patterns indicating document queries
    DOCUMENT_PATTERNS = [
        # Korean
        r"정책|policy|규정|절차",
        r"가이드|guide|매뉴얼|manual",
        r"회의록|meeting|미팅",
        r"문서|document|자료",
        r"어떻게.*하는지|how to",
        r"왜.*하는지|why",
        r"설명|explain|설명해",
    ]

    # Patterns for specific entity queries (likely graph)
    ENTITY_PATTERNS = [
        r"PRJ-\d+",  # Project ID
        r"SPR-\d+",  # Sprint ID
        r"TSK-\d+",  # Task ID
        r"UST-\d+",  # User Story ID
        r"ISS-\d+",  # Issue ID
    ]

    def select_strategy(self, query: str) -> RAGStrategy:
        """Select appropriate strategy based on query"""
        query_lower = query.lower()

        # Count pattern matches
        relationship_score = sum(
            1 for pattern in self.RELATIONSHIP_PATTERNS
            if re.search(pattern, query_lower, re.IGNORECASE)
        )
        document_score = sum(
            1 for pattern in self.DOCUMENT_PATTERNS
            if re.search(pattern, query_lower, re.IGNORECASE)
        )
        entity_score = sum(
            1 for pattern in self.ENTITY_PATTERNS
            if re.search(pattern, query, re.IGNORECASE)  # Case-sensitive for IDs
        )

        # Decision logic
        if entity_score > 0 and relationship_score > 0:
            return RAGStrategy.GRAPH_FIRST
        elif relationship_score > document_score:
            return RAGStrategy.HYBRID if document_score > 0 else RAGStrategy.GRAPH_ONLY
        elif document_score > relationship_score:
            return RAGStrategy.HYBRID if relationship_score > 0 else RAGStrategy.DOCUMENT_ONLY
        elif entity_score > 0:
            return RAGStrategy.GRAPH_FIRST
        else:
            # Default to hybrid for best coverage
            return RAGStrategy.HYBRID


# =============================================================================
# RAG Providers (Abstract)
# =============================================================================

class RAGProvider(ABC):
    """Abstract base class for RAG providers"""

    @abstractmethod
    def search(self, query: str, **kwargs) -> List[RAGResult]:
        """Search for relevant content"""
        pass


# =============================================================================
# Document RAG Provider
# =============================================================================

class DocumentRAGProvider(RAGProvider):
    """
    Document-based RAG using vector search.
    Integrates with existing Neo4j vector index or separate vector store.
    """

    def __init__(self, config: HybridRAGConfig):
        self.config = config
        self._driver = None

    def _get_driver(self):
        """Get Neo4j driver"""
        if self._driver is None:
            try:
                from neo4j import GraphDatabase
                self._driver = GraphDatabase.driver(
                    self.config.neo4j_uri,
                    auth=(self.config.neo4j_user, self.config.neo4j_password),
                )
            except ImportError:
                logger.error("neo4j driver not installed")
                raise
        return self._driver

    def search(
        self,
        query: str,
        embedding: Optional[List[float]] = None,
        top_k: int = 5,
        **kwargs
    ) -> List[RAGResult]:
        """
        Search documents using vector similarity.

        Note: This integrates with the existing rag_service_neo4j.py
        In production, this would call the existing vector search.
        """
        results = []

        if embedding is None:
            # In production, generate embedding here or get from caller
            logger.warning("No embedding provided, using fallback search")
            return self._fallback_search(query, top_k)

        try:
            driver = self._get_driver()
            with driver.session() as session:
                # Vector similarity search
                cypher = """
                    CALL db.index.vector.queryNodes('document_embeddings', $top_k, $embedding)
                    YIELD node, score
                    WHERE score >= $min_score
                    RETURN node.content AS content,
                           node.source AS source,
                           node.metadata AS metadata,
                           score
                    ORDER BY score DESC
                """
                result = session.run(
                    cypher,
                    embedding=embedding,
                    top_k=top_k,
                    min_score=self.config.min_relevance_score,
                )

                for record in result:
                    results.append(RAGResult(
                        content=record["content"],
                        source="document",
                        score=record["score"],
                        metadata=record.get("metadata", {}),
                    ))

        except Exception as e:
            logger.error(f"Document RAG search failed: {e}")
            if self.config.fallback_to_document_only:
                return self._fallback_search(query, top_k)

        return results

    def _fallback_search(self, query: str, top_k: int) -> List[RAGResult]:
        """Fallback text-based search when vector search fails"""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                # Full-text search fallback
                cypher = """
                    CALL db.index.fulltext.queryNodes('document_fulltext', $query)
                    YIELD node, score
                    WHERE score >= $min_score
                    RETURN node.content AS content,
                           node.source AS source,
                           node.metadata AS metadata,
                           score
                    ORDER BY score DESC
                    LIMIT $top_k
                """
                result = session.run(
                    cypher,
                    query=query,
                    top_k=top_k,
                    min_score=self.config.min_relevance_score,
                )

                return [
                    RAGResult(
                        content=record["content"],
                        source="document",
                        score=record["score"],
                        metadata=record.get("metadata", {}),
                    )
                    for record in result
                ]

        except Exception as e:
            logger.error(f"Fallback search also failed: {e}")
            return []


# =============================================================================
# Graph RAG Provider
# =============================================================================

class GraphRAGProvider(RAGProvider):
    """
    Graph-based RAG using Cypher queries for relationship data.
    Queries synced PMS entities from Neo4j.
    """

    def __init__(self, config: HybridRAGConfig):
        self.config = config
        self._driver = None

    def _get_driver(self):
        """Get Neo4j driver"""
        if self._driver is None:
            try:
                from neo4j import GraphDatabase
                self._driver = GraphDatabase.driver(
                    self.config.neo4j_uri,
                    auth=(self.config.neo4j_user, self.config.neo4j_password),
                )
            except ImportError:
                logger.error("neo4j driver not installed")
                raise
        return self._driver

    def search(self, query: str, **kwargs) -> List[RAGResult]:
        """
        Search graph for relevant entities and relationships.
        Analyzes query to determine appropriate Cypher query.
        """
        results = []

        # Extract entity IDs from query
        entity_ids = self._extract_entity_ids(query)

        # Determine query type and execute appropriate search
        if entity_ids:
            results.extend(self._search_by_entity_ids(entity_ids))

        # Add relationship-based search
        relationship_results = self._search_relationships(query)
        results.extend(relationship_results)

        return results[:self.config.max_results]

    def _extract_entity_ids(self, query: str) -> Dict[str, List[str]]:
        """Extract entity IDs from query"""
        patterns = {
            "project": r"PRJ-(\d+)",
            "sprint": r"SPR-(\d+)",
            "task": r"TSK-(\d+)",
            "user_story": r"UST-(\d+)",
            "issue": r"ISS-(\d+)",
        }

        entity_ids = {}
        for entity_type, pattern in patterns.items():
            matches = re.findall(pattern, query, re.IGNORECASE)
            if matches:
                entity_ids[entity_type] = [f"{entity_type.upper()[:3]}-{m}" for m in matches]

        return entity_ids

    def _search_by_entity_ids(self, entity_ids: Dict[str, List[str]]) -> List[RAGResult]:
        """Search for specific entities and their relationships"""
        results = []

        try:
            driver = self._get_driver()
            with driver.session() as session:
                for entity_type, ids in entity_ids.items():
                    for entity_id in ids:
                        # Get entity and its relationships
                        cypher = self._get_entity_query(entity_type)
                        if cypher:
                            result = session.run(cypher, id=entity_id)
                            for record in result:
                                content = self._format_entity_result(record, entity_type)
                                results.append(RAGResult(
                                    content=content,
                                    source="graph",
                                    score=1.0,  # Direct match
                                    metadata={
                                        "entity_type": entity_type,
                                        "entity_id": entity_id,
                                    }
                                ))

        except Exception as e:
            logger.error(f"Entity ID search failed: {e}")

        return results

    def _get_entity_query(self, entity_type: str) -> Optional[str]:
        """Get Cypher query for entity type"""
        queries = {
            "task": """
                MATCH (t:Task {id: $id})
                OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:Task)
                OPTIONAL MATCH (t)-[:BLOCKED_BY]->(blocker:Task)
                OPTIONAL MATCH (t)-[:ASSIGNED_TO]->(assignee:User)
                OPTIONAL MATCH (s:Sprint)-[:HAS_TASK]->(t)
                RETURN t, collect(DISTINCT dep) as dependencies,
                       collect(DISTINCT blocker) as blockers,
                       assignee, s as sprint
            """,
            "sprint": """
                MATCH (s:Sprint {id: $id})
                OPTIONAL MATCH (p:Project)-[:HAS_SPRINT]->(s)
                OPTIONAL MATCH (s)-[:HAS_TASK]->(t:Task)
                OPTIONAL MATCH (s)-[:HAS_STORY]->(us:UserStory)
                RETURN s, p as project, collect(DISTINCT t) as tasks,
                       collect(DISTINCT us) as stories
            """,
            "project": """
                MATCH (p:Project {id: $id})
                OPTIONAL MATCH (p)-[:HAS_SPRINT]->(s:Sprint)
                OPTIONAL MATCH (p)-[:HAS_PHASE]->(ph:Phase)
                OPTIONAL MATCH (p)-[:HAS_ISSUE]->(i:Issue)
                RETURN p, collect(DISTINCT s) as sprints,
                       collect(DISTINCT ph) as phases,
                       collect(DISTINCT i) as issues
            """,
            "user_story": """
                MATCH (us:UserStory {id: $id})
                OPTIONAL MATCH (s:Sprint)-[:HAS_STORY]->(us)
                RETURN us, s as sprint
            """,
            "issue": """
                MATCH (i:Issue {id: $id})
                OPTIONAL MATCH (p:Project)-[:HAS_ISSUE]->(i)
                RETURN i, p as project
            """,
        }
        return queries.get(entity_type)

    def _format_entity_result(self, record: Any, entity_type: str) -> str:
        """Format entity result for LLM context"""
        parts = []

        if entity_type == "task":
            task = record["t"]
            parts.append(f"Task: {task.get('title', 'N/A')} (Status: {task.get('status', 'N/A')})")

            deps = record.get("dependencies", [])
            if deps:
                dep_titles = [d.get("title", "Unknown") for d in deps if d]
                parts.append(f"  Dependencies: {', '.join(dep_titles)}")

            blockers = record.get("blockers", [])
            if blockers:
                blocker_titles = [b.get("title", "Unknown") for b in blockers if b]
                parts.append(f"  Blocked by: {', '.join(blocker_titles)}")

            assignee = record.get("assignee")
            if assignee:
                parts.append(f"  Assignee: {assignee.get('full_name', assignee.get('username', 'N/A'))}")

            sprint = record.get("sprint")
            if sprint:
                parts.append(f"  Sprint: {sprint.get('name', 'N/A')}")

        elif entity_type == "sprint":
            sprint = record["s"]
            parts.append(f"Sprint: {sprint.get('name', 'N/A')} (Status: {sprint.get('status', 'N/A')})")

            project = record.get("project")
            if project:
                parts.append(f"  Project: {project.get('name', 'N/A')}")

            tasks = record.get("tasks", [])
            if tasks:
                parts.append(f"  Tasks: {len(tasks)} total")

            stories = record.get("stories", [])
            if stories:
                parts.append(f"  User Stories: {len(stories)} total")

        elif entity_type == "project":
            project = record["p"]
            parts.append(f"Project: {project.get('name', 'N/A')} (Status: {project.get('status', 'N/A')})")

            sprints = record.get("sprints", [])
            if sprints:
                parts.append(f"  Sprints: {len(sprints)} total")

            phases = record.get("phases", [])
            if phases:
                parts.append(f"  Phases: {len(phases)} total")

            issues = record.get("issues", [])
            if issues:
                parts.append(f"  Issues: {len(issues)} total")

        return "\n".join(parts)

    def _search_relationships(self, query: str) -> List[RAGResult]:
        """Search for relationships based on query patterns"""
        results = []
        query_lower = query.lower()

        try:
            driver = self._get_driver()
            with driver.session() as session:

                # Dependency queries
                if any(kw in query_lower for kw in ["의존", "dependency", "depends"]):
                    result = session.run("""
                        MATCH (t1:Task)-[:DEPENDS_ON]->(t2:Task)
                        RETURN t1.title as from_task, t2.title as to_task,
                               t1.status as from_status, t2.status as to_status
                        LIMIT 20
                    """)
                    for record in result:
                        content = f"Dependency: '{record['from_task']}' depends on '{record['to_task']}'"
                        results.append(RAGResult(
                            content=content,
                            source="graph",
                            score=0.8,
                            metadata={"relationship": "DEPENDS_ON"},
                        ))

                # Blocker queries
                if any(kw in query_lower for kw in ["블로커", "blocker", "blocked", "차단"]):
                    result = session.run("""
                        MATCH (t1:Task)-[:BLOCKED_BY]->(t2:Task)
                        RETURN t1.title as blocked_task, t2.title as blocker_task,
                               t1.status as blocked_status, t2.status as blocker_status
                        LIMIT 20
                    """)
                    for record in result:
                        content = f"Blocker: '{record['blocked_task']}' is blocked by '{record['blocker_task']}'"
                        results.append(RAGResult(
                            content=content,
                            source="graph",
                            score=0.8,
                            metadata={"relationship": "BLOCKED_BY"},
                        ))

                # Sprint task queries
                if any(kw in query_lower for kw in ["스프린트", "sprint"]):
                    result = session.run("""
                        MATCH (s:Sprint)-[:HAS_TASK]->(t:Task)
                        WHERE s.status = 'ACTIVE'
                        RETURN s.name as sprint, collect(t.title) as tasks,
                               count(t) as task_count
                        LIMIT 10
                    """)
                    for record in result:
                        content = f"Sprint '{record['sprint']}': {record['task_count']} tasks"
                        results.append(RAGResult(
                            content=content,
                            source="graph",
                            score=0.7,
                            metadata={"relationship": "HAS_TASK"},
                        ))

        except Exception as e:
            logger.error(f"Relationship search failed: {e}")

        return results

    def get_task_dependencies(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all dependencies for a specific task"""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                result = session.run("""
                    MATCH (t:Task {id: $task_id})-[:DEPENDS_ON*1..3]->(dep:Task)
                    RETURN dep.id as id, dep.title as title, dep.status as status,
                           length((t)-[:DEPENDS_ON*1..3]->(dep)) as depth
                    ORDER BY depth
                """, task_id=task_id)

                return [dict(record) for record in result]

        except Exception as e:
            logger.error(f"Failed to get task dependencies: {e}")
            return []

    def get_blockers_chain(self, task_id: str) -> List[Dict[str, Any]]:
        """Get blocker chain for a task"""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                result = session.run("""
                    MATCH path = (t:Task {id: $task_id})-[:BLOCKED_BY*1..5]->(blocker:Task)
                    RETURN [n IN nodes(path) | {id: n.id, title: n.title, status: n.status}] as chain
                """, task_id=task_id)

                chains = []
                for record in result:
                    chains.append(record["chain"])
                return chains

        except Exception as e:
            logger.error(f"Failed to get blocker chain: {e}")
            return []


# =============================================================================
# Hybrid RAG Service
# =============================================================================

class HybridRAGService:
    """
    Unified Hybrid RAG service combining Document and Graph RAG.

    Usage:
        service = HybridRAGService()

        # Search with automatic strategy selection
        result = service.search("TSK-123의 의존성은 무엇인가?")

        # Force specific strategy
        result = service.search("정책 문서에서 검색", strategy=RAGStrategy.DOCUMENT_ONLY)

        # With embedding for vector search
        result = service.search("검색어", embedding=embedding_vector)
    """

    def __init__(self, config: Optional[HybridRAGConfig] = None):
        self.config = config or HybridRAGConfig()
        self.strategy_selector = StrategySelector()
        self.document_provider = DocumentRAGProvider(self.config)
        self.graph_provider = GraphRAGProvider(self.config)

    def search(
        self,
        query: str,
        strategy: Optional[RAGStrategy] = None,
        embedding: Optional[List[float]] = None,
        top_k: int = 5,
        project_id: Optional[str] = None,
    ) -> HybridRAGResult:
        """
        Perform hybrid RAG search.

        Args:
            query: Search query
            strategy: Force specific strategy (auto-select if None)
            embedding: Query embedding for vector search
            top_k: Number of results per source
            project_id: Optional project scope filter

        Returns:
            HybridRAGResult with combined results
        """
        import time
        start_time = time.time()

        # Select strategy
        if strategy is None:
            strategy = self.strategy_selector.select_strategy(query)

        logger.info(f"Hybrid RAG search with strategy: {strategy.value}")

        document_results = []
        graph_results = []

        # Execute based on strategy
        if strategy == RAGStrategy.DOCUMENT_ONLY:
            document_results = self.document_provider.search(
                query, embedding=embedding, top_k=top_k
            )

        elif strategy == RAGStrategy.GRAPH_ONLY:
            graph_results = self.graph_provider.search(query)

        elif strategy == RAGStrategy.HYBRID:
            # Run both in parallel (conceptually - actual implementation is sequential)
            document_results = self.document_provider.search(
                query, embedding=embedding, top_k=top_k
            )
            graph_results = self.graph_provider.search(query)

        elif strategy == RAGStrategy.DOCUMENT_FIRST:
            document_results = self.document_provider.search(
                query, embedding=embedding, top_k=top_k
            )
            if len(document_results) < 3:  # Insufficient results
                graph_results = self.graph_provider.search(query)

        elif strategy == RAGStrategy.GRAPH_FIRST:
            graph_results = self.graph_provider.search(query)
            if len(graph_results) < 3:  # Insufficient results
                document_results = self.document_provider.search(
                    query, embedding=embedding, top_k=top_k
                )

        # Combine and rank results
        combined_results = self._combine_results(
            document_results, graph_results, strategy
        )

        execution_time = (time.time() - start_time) * 1000

        return HybridRAGResult(
            results=combined_results,
            strategy_used=strategy,
            document_results=document_results,
            graph_results=graph_results,
            query=query,
            execution_time_ms=execution_time,
        )

    def _combine_results(
        self,
        document_results: List[RAGResult],
        graph_results: List[RAGResult],
        strategy: RAGStrategy,
    ) -> List[RAGResult]:
        """Combine and rank results from both sources"""
        combined = []

        # Apply weights based on strategy
        if strategy == RAGStrategy.DOCUMENT_ONLY:
            combined = document_results
        elif strategy == RAGStrategy.GRAPH_ONLY:
            combined = graph_results
        else:
            # Weight scores based on configuration
            for result in document_results:
                result.score *= self.config.document_weight
                combined.append(result)

            for result in graph_results:
                result.score *= self.config.graph_weight
                combined.append(result)

        # Sort by score
        combined.sort(key=lambda x: x.score, reverse=True)

        # Limit results
        return combined[:self.config.max_results]

    def get_context_for_query(
        self,
        query: str,
        embedding: Optional[List[float]] = None,
        max_context_length: int = 2000,
    ) -> str:
        """
        Get formatted context string for LLM prompt.

        Args:
            query: User query
            embedding: Query embedding
            max_context_length: Maximum context length in characters

        Returns:
            Formatted context string
        """
        result = self.search(query, embedding=embedding)

        context_parts = []
        current_length = 0

        for rag_result in result.results:
            content = rag_result.content
            if current_length + len(content) > max_context_length:
                # Truncate if needed
                remaining = max_context_length - current_length
                if remaining > 100:  # Only add if meaningful
                    content = content[:remaining] + "..."
                    context_parts.append(f"[{rag_result.source}] {content}")
                break

            context_parts.append(f"[{rag_result.source}] {content}")
            current_length += len(content) + 20  # Account for prefix

        return "\n\n".join(context_parts)

    def get_task_context(self, task_id: str) -> Dict[str, Any]:
        """Get comprehensive context for a specific task"""
        dependencies = self.graph_provider.get_task_dependencies(task_id)
        blockers = self.graph_provider.get_blockers_chain(task_id)

        # Also search for related documents
        doc_results = self.document_provider.search(
            f"task {task_id}", top_k=3
        )

        return {
            "task_id": task_id,
            "dependencies": dependencies,
            "blocker_chains": blockers,
            "related_documents": [r.content for r in doc_results],
        }


# =============================================================================
# Singleton instance
# =============================================================================

_hybrid_rag_service: Optional[HybridRAGService] = None


def get_hybrid_rag_service() -> HybridRAGService:
    """Get singleton hybrid RAG service instance"""
    global _hybrid_rag_service
    if _hybrid_rag_service is None:
        _hybrid_rag_service = HybridRAGService()
    return _hybrid_rag_service
