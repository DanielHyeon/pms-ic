"""
Retrieve Skills - Data retrieval from DB/Graph/Vector

Skills:
- RetrieveDocsSkill: RAG document retrieval
- RetrieveGraphSkill: Neo4j graph queries
- RetrieveMetricsSkill: Project metrics retrieval
"""

from typing import Dict, Any, List, Optional
import logging

from . import BaseSkill, SkillCategory, SkillInput, SkillOutput

logger = logging.getLogger(__name__)


class RetrieveDocsSkill(BaseSkill):
    """
    Retrieve documents using RAG search.

    Input:
        - query: Search query
        - project_id: Project filter
        - top_k: Number of results (default: 10)
        - filter_types: Document types to include

    Output:
        - result: List of documents with content and metadata
        - confidence: Search relevance score
    """

    name = "retrieve_docs"
    category = SkillCategory.RETRIEVE
    description = "Retrieve documents using vector search"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "query" in data and "project_id" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result=[],
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: query and project_id required"
            )

        query = input.data.get("query")
        project_id = input.data.get("project_id")
        top_k = input.options.get("top_k", 10)
        filter_types = input.options.get("filter_types", [])

        try:
            docs = self._search_documents(project_id, query, top_k, filter_types)

            # Calculate confidence from relevance scores
            if docs:
                avg_score = sum(d.get("score", 0.5) for d in docs) / len(docs)
                confidence = min(avg_score, 1.0)
            else:
                confidence = 0.0

            evidence = [
                {
                    "source_type": "document",
                    "source_id": d.get("id"),
                    "title": d.get("title"),
                    "relevance": d.get("score", 0.5),
                }
                for d in docs
            ]

            return SkillOutput(
                result=docs,
                confidence=confidence,
                evidence=evidence,
                metadata={
                    "query": query,
                    "top_k": top_k,
                    "total_results": len(docs),
                }
            )

        except Exception as e:
            logger.error(f"Document retrieval error: {e}")
            return SkillOutput(
                result=[],
                confidence=0.0,
                evidence=[],
                metadata={},
                error=str(e)
            )

    def _search_documents(
        self,
        project_id: str,
        query: str,
        top_k: int,
        filter_types: List[str]
    ) -> List[Dict]:
        """Execute RAG search."""
        try:
            from services.rag_service_neo4j import RAGServiceNeo4j
            rag = RAGServiceNeo4j()
            return rag.search(project_id, query, top_k=top_k)
        except ImportError:
            logger.warning("RAGServiceNeo4j not available")
            return []

    def _get_input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "data": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "project_id": {"type": "string"},
                    },
                    "required": ["query", "project_id"],
                },
                "options": {
                    "type": "object",
                    "properties": {
                        "top_k": {"type": "integer", "default": 10},
                        "filter_types": {"type": "array", "items": {"type": "string"}},
                    },
                },
            },
        }


class RetrieveGraphSkill(BaseSkill):
    """
    Retrieve data from Neo4j graph.

    Input:
        - cypher_query: Cypher query to execute
        - project_id: Project filter
        - params: Query parameters

    Output:
        - result: Query results
        - confidence: Based on result count
    """

    name = "retrieve_graph"
    category = SkillCategory.RETRIEVE
    description = "Execute Neo4j graph queries"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "project_id" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result=[],
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: project_id required"
            )

        project_id = input.data.get("project_id")
        cypher_query = input.data.get("cypher_query")
        params = input.data.get("params", {})

        try:
            results = self._execute_query(project_id, cypher_query, params)

            confidence = 1.0 if results else 0.5

            evidence = [
                {
                    "source_type": "graph",
                    "source_id": f"neo4j-{i}",
                    "title": "Graph query result",
                    "relevance": 1.0,
                }
                for i, _ in enumerate(results)
            ]

            return SkillOutput(
                result=results,
                confidence=confidence,
                evidence=evidence,
                metadata={
                    "query_type": "cypher",
                    "result_count": len(results),
                }
            )

        except Exception as e:
            logger.error(f"Graph query error: {e}")
            return SkillOutput(
                result=[],
                confidence=0.0,
                evidence=[],
                metadata={},
                error=str(e)
            )

    def _execute_query(
        self,
        project_id: str,
        cypher_query: Optional[str],
        params: Dict
    ) -> List[Dict]:
        """Execute Cypher query."""
        try:
            from services.rag_service_neo4j import graph_query
            return graph_query(project_id, cypher_query, params)
        except ImportError:
            logger.warning("graph_query not available")
            return []


class RetrieveMetricsSkill(BaseSkill):
    """
    Retrieve project metrics.

    Input:
        - project_id: Target project
        - metric_types: Types of metrics to retrieve
        - date_range: Optional date range

    Output:
        - result: Metrics data
        - confidence: Data completeness
    """

    name = "retrieve_metrics"
    category = SkillCategory.RETRIEVE
    description = "Retrieve project performance metrics"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "project_id" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: project_id required"
            )

        project_id = input.data.get("project_id")
        metric_types = input.data.get("metric_types", ["all"])
        date_range = input.data.get("date_range")

        try:
            metrics = self._fetch_metrics(project_id, metric_types, date_range)

            # Calculate confidence based on data completeness
            expected_metrics = ["velocity", "throughput", "cycle_time", "wip"]
            available = sum(1 for m in expected_metrics if metrics.get(m) is not None)
            confidence = available / len(expected_metrics)

            evidence = [
                {
                    "source_type": "metric",
                    "source_id": f"metric-{key}",
                    "title": key,
                    "relevance": 1.0,
                }
                for key in metrics.keys()
                if metrics[key] is not None
            ]

            return SkillOutput(
                result=metrics,
                confidence=confidence,
                evidence=evidence,
                metadata={
                    "metric_types": metric_types,
                    "date_range": date_range,
                }
            )

        except Exception as e:
            logger.error(f"Metrics retrieval error: {e}")
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error=str(e)
            )

    def _fetch_metrics(
        self,
        project_id: str,
        metric_types: List[str],
        date_range: Optional[Dict]
    ) -> Dict[str, Any]:
        """Fetch metrics from monitoring service."""
        try:
            from observability.pms_monitoring import PMSMonitoring
            monitoring = PMSMonitoring()
            return monitoring.get_project_metrics(project_id, date_range)
        except ImportError:
            logger.warning("PMSMonitoring not available")
            return {
                "velocity": None,
                "throughput": None,
                "cycle_time": None,
                "wip": None,
            }
