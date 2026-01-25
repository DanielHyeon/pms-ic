"""
Evidence Linking Service - Phase 1 Trust & Gates

Manages evidence/source linking for AI responses.
- Extracts evidence from RAG results
- Stores evidence relationships in Neo4j
- Validates evidence sources exist
- Tracks source relevance and trust

Reference: docs/ai-architecture/phase1-gates-and-foundation.md
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import uuid
import logging
import time

logger = logging.getLogger(__name__)


@dataclass
class EvidenceItem:
    """Represents a piece of evidence supporting an AI response."""
    id: str
    source_type: str       # document | issue | task | meeting | decision | user_story | sprint
    source_id: str         # ID in the source system
    title: str
    excerpt: str           # Relevant excerpt (max 500 chars)
    relevance_score: float # 0-1, how relevant to the query
    url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceResult:
    """Result of evidence extraction/validation."""
    items: List[EvidenceItem]
    total_score: float           # Aggregate relevance
    has_sufficient_evidence: bool
    warnings: List[str] = field(default_factory=list)


class EvidenceService:
    """
    Manages evidence linking for AI responses.

    Responsibilities:
    1. Extract evidence from RAG search results
    2. Store evidence relationships (optionally in Neo4j)
    3. Validate that evidence sources exist
    4. Calculate aggregate evidence scores
    """

    def __init__(
        self,
        neo4j_driver=None,
        min_relevance: float = 0.5,
        min_evidence_count: int = 1,
    ):
        """
        Initialize evidence service.

        Args:
            neo4j_driver: Optional Neo4j driver for storing evidence links
            min_relevance: Minimum relevance score to include evidence
            min_evidence_count: Minimum number of evidence items for "sufficient"
        """
        self.driver = neo4j_driver
        self.min_relevance = min_relevance
        self.min_evidence_count = min_evidence_count

    def extract_from_rag(
        self,
        rag_results: List[Dict[str, Any]],
        query: Optional[str] = None,
    ) -> EvidenceResult:
        """
        Convert RAG search results to evidence items.

        Args:
            rag_results: List of RAG search results
            query: Original query (for context)

        Returns:
            EvidenceResult with extracted evidence items
        """
        items = []
        warnings = []

        for result in rag_results:
            score = result.get("score", result.get("relevance", 0))

            # Skip low-relevance results
            if score < self.min_relevance:
                continue

            source_type = self._detect_source_type(result)
            source_id = self._extract_source_id(result)

            # Extract content/excerpt
            content = result.get("content", result.get("text", ""))
            excerpt = content[:500] if content else ""

            # Extract title
            title = result.get("title", "")
            if not title:
                metadata = result.get("metadata", {})
                title = metadata.get("title", metadata.get("name", "Unknown"))

            # Extract URL if available
            url = result.get("url")
            if not url:
                metadata = result.get("metadata", {})
                url = metadata.get("url", metadata.get("link"))

            item = EvidenceItem(
                id=str(uuid.uuid4()),
                source_type=source_type,
                source_id=source_id,
                title=title,
                excerpt=excerpt,
                relevance_score=score,
                url=url,
                metadata=result.get("metadata", {}),
            )
            items.append(item)

        # Sort by relevance
        items.sort(key=lambda x: x.relevance_score, reverse=True)

        # Calculate aggregate score
        total_score = 0.0
        if items:
            # Weighted average with decay for lower-ranked items
            weights = [1.0 / (i + 1) for i in range(len(items))]
            total_weight = sum(weights)
            total_score = sum(
                item.relevance_score * weight
                for item, weight in zip(items, weights)
            ) / total_weight

        has_sufficient = len(items) >= self.min_evidence_count

        if not has_sufficient:
            warnings.append(
                f"Insufficient evidence: found {len(items)}, need {self.min_evidence_count}"
            )

        logger.info(
            f"Extracted {len(items)} evidence items "
            f"(total_score={total_score:.2f}, sufficient={has_sufficient})"
        )

        return EvidenceResult(
            items=items,
            total_score=total_score,
            has_sufficient_evidence=has_sufficient,
            warnings=warnings,
        )

    def _detect_source_type(self, result: Dict[str, Any]) -> str:
        """Detect the type of evidence source from RAG result."""
        metadata = result.get("metadata", {})

        # Check explicit type field
        if "type" in metadata:
            return metadata["type"]

        # Check for known ID patterns
        if "document_id" in metadata:
            return "document"
        if "issue_id" in metadata:
            return "issue"
        if "task_id" in metadata:
            return "task"
        if "meeting_id" in metadata:
            return "meeting"
        if "story_id" in metadata:
            return "user_story"
        if "sprint_id" in metadata:
            return "sprint"
        if "decision_id" in metadata:
            return "decision"

        # Check labels (Neo4j)
        labels = result.get("labels", [])
        if labels:
            label = labels[0].lower()
            if label in ["document", "issue", "task", "meeting", "userstory", "sprint"]:
                return label

        # Default
        return "document"

    def _extract_source_id(self, result: Dict[str, Any]) -> str:
        """Extract the source ID from RAG result."""
        # Direct ID field
        if "id" in result:
            return str(result["id"])

        metadata = result.get("metadata", {})

        # Check various ID field names
        for field in ["document_id", "issue_id", "task_id", "meeting_id",
                      "story_id", "sprint_id", "decision_id", "source_id", "node_id"]:
            if field in metadata:
                return str(metadata[field])

        # Fall back to hash of content
        content = result.get("content", result.get("text", ""))
        return str(hash(content))[:16]

    def save_response_evidence(
        self,
        response_id: str,
        evidence_items: List[EvidenceItem],
        trace_id: Optional[str] = None,
    ) -> bool:
        """
        Save evidence links to Neo4j.

        Args:
            response_id: ID of the AI response
            evidence_items: List of evidence items to link
            trace_id: Request trace ID for logging

        Returns:
            True if successful, False otherwise
        """
        if not self.driver:
            logger.debug("No Neo4j driver configured, skipping evidence save")
            return True

        try:
            with self.driver.session() as session:
                for item in evidence_items:
                    session.run("""
                        MERGE (r:AIResponse {id: $response_id})
                        ON CREATE SET r.created_at = datetime()
                        MERGE (e:Evidence {id: $evidence_id})
                        SET e.source_type = $source_type,
                            e.source_id = $source_id,
                            e.title = $title,
                            e.excerpt = $excerpt,
                            e.updated_at = datetime()
                        MERGE (r)-[rel:SUPPORTED_BY]->(e)
                        SET rel.relevance = $relevance,
                            rel.linked_at = datetime()
                    """, {
                        "response_id": response_id,
                        "evidence_id": item.id,
                        "source_type": item.source_type,
                        "source_id": item.source_id,
                        "title": item.title,
                        "excerpt": item.excerpt,
                        "relevance": item.relevance_score,
                    })

            logger.info(f"Saved {len(evidence_items)} evidence links for response {response_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save evidence: {e}")
            return False

    def get_response_evidence(self, response_id: str) -> List[EvidenceItem]:
        """
        Retrieve evidence for a specific response from Neo4j.

        Args:
            response_id: ID of the AI response

        Returns:
            List of evidence items
        """
        if not self.driver:
            return []

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (r:AIResponse {id: $response_id})-[rel:SUPPORTED_BY]->(e:Evidence)
                    RETURN e, rel.relevance as relevance
                    ORDER BY rel.relevance DESC
                """, {"response_id": response_id})

                items = []
                for record in result:
                    e = record["e"]
                    items.append(EvidenceItem(
                        id=e["id"],
                        source_type=e.get("source_type", "unknown"),
                        source_id=e.get("source_id", ""),
                        title=e.get("title", "Unknown"),
                        excerpt=e.get("excerpt", ""),
                        relevance_score=record["relevance"],
                    ))

                return items

        except Exception as e:
            logger.error(f"Failed to retrieve evidence: {e}")
            return []

    def validate_evidence(self, items: List[EvidenceItem]) -> Dict[str, Any]:
        """
        Validate that evidence sources exist.

        Args:
            items: List of evidence items to validate

        Returns:
            Validation result with valid/invalid counts
        """
        if not self.driver:
            # Cannot validate without Neo4j
            return {
                "validated": False,
                "reason": "No database connection",
                "valid_count": 0,
                "invalid_count": 0,
            }

        valid = []
        invalid = []

        for item in items:
            if self._source_exists(item.source_type, item.source_id):
                valid.append(item.id)
            else:
                invalid.append(item.id)
                logger.warning(f"Evidence source not found: {item.source_type}/{item.source_id}")

        return {
            "validated": True,
            "valid_count": len(valid),
            "invalid_count": len(invalid),
            "valid_ids": valid,
            "invalid_ids": invalid,
            "all_valid": len(invalid) == 0,
        }

    def _source_exists(self, source_type: str, source_id: str) -> bool:
        """Check if the original source exists in Neo4j."""
        if not self.driver:
            return True  # Assume exists if no driver

        # Map source types to Neo4j labels
        label_map = {
            "document": "Document",
            "issue": "Issue",
            "task": "Task",
            "meeting": "Meeting",
            "user_story": "UserStory",
            "sprint": "Sprint",
            "decision": "Decision",
            "project": "Project",
            "phase": "Phase",
            "deliverable": "Deliverable",
        }

        label = label_map.get(source_type.lower(), source_type.title())

        try:
            with self.driver.session() as session:
                result = session.run(f"""
                    MATCH (n:{label})
                    WHERE n.id = $source_id OR toString(n.id) = $source_id
                    RETURN count(n) > 0 as exists
                """, {"source_id": source_id})

                record = result.single()
                return record["exists"] if record else False

        except Exception as e:
            logger.error(f"Failed to check source existence: {e}")
            return False

    def to_dict_list(self, items: List[EvidenceItem]) -> List[Dict[str, Any]]:
        """Convert evidence items to dictionaries for JSON serialization."""
        return [
            {
                "id": item.id,
                "source_type": item.source_type,
                "source_id": item.source_id,
                "title": item.title,
                "excerpt": item.excerpt,
                "relevance_score": item.relevance_score,
                "url": item.url,
            }
            for item in items
        ]


# Singleton instance
_evidence_service: Optional[EvidenceService] = None


def get_evidence_service(neo4j_driver=None) -> EvidenceService:
    """Get singleton evidence service instance."""
    global _evidence_service
    if _evidence_service is None:
        _evidence_service = EvidenceService(neo4j_driver=neo4j_driver)
    return _evidence_service
