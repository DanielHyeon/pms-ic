"""
LLM-based Query Generator for SQL and Cypher.

Features:
- Schema-aware generation with context scoping
- Few-shot example integration
- Support for both SQL and Cypher
"""

import logging
import re
import time
from typing import List, Optional, Protocol

from .models import QueryType, GenerationResult, SchemaContext, FewshotExample
from .schema_manager import get_schema_manager
from .fewshot_manager import get_fewshot_manager
from .prompts.sql_generation import SQL_GENERATION_PROMPT
from .prompts.cypher_generation import CYPHER_GENERATION_PROMPT

logger = logging.getLogger(__name__)


class LLMService(Protocol):
    """Protocol for LLM service interface."""

    def generate(
        self, prompt: str, max_tokens: int = 500, temperature: float = 0.1
    ) -> str:
        """Generate text from prompt."""
        ...


class QueryGenerator:
    """
    Generates SQL/Cypher queries from natural language using LLM.

    Features:
    - Schema-aware context injection
    - Few-shot example retrieval and integration
    - Configurable generation parameters
    """

    def __init__(self, llm_service: Optional[LLMService] = None):
        """
        Initialize generator.

        Args:
            llm_service: Optional LLM service for generation.
                         If None, uses default model_service.
        """
        self.llm_service = llm_service
        self.schema_manager = get_schema_manager()
        self.fewshot_manager = get_fewshot_manager()

    def generate(
        self,
        question: str,
        project_id: str,
        query_type: QueryType = QueryType.SQL,
        use_fewshot: bool = True,
        num_fewshot: int = 3,
        max_tokens: int = 500,
        temperature: float = 0.1,
    ) -> GenerationResult:
        """
        Generate SQL or Cypher query from natural language.

        Args:
            question: Natural language question
            project_id: Project ID for scope
            query_type: SQL or CYPHER
            use_fewshot: Whether to use few-shot examples
            num_fewshot: Number of few-shot examples
            max_tokens: Maximum tokens for generation
            temperature: LLM temperature (low for deterministic)

        Returns:
            GenerationResult with generated query
        """
        start_time = time.time()

        # 1. Get schema context
        schema_context = self.schema_manager.get_schema_context(
            question, query_type, max_tables=8
        )

        # 2. Get few-shot examples
        fewshot_examples: List[FewshotExample] = []
        fewshot_ids: List[str] = []
        if use_fewshot:
            fewshot_examples = self.fewshot_manager.get_similar_examples(
                question, query_type, k=num_fewshot
            )
            fewshot_ids = [ex.id for ex in fewshot_examples]

        # 3. Build prompt
        prompt = self._build_prompt(
            question, project_id, query_type, schema_context, fewshot_examples
        )

        # 4. Generate
        try:
            query = self._call_llm(prompt, max_tokens, temperature)
            query = self._clean_query(query, query_type)

            generation_time = (time.time() - start_time) * 1000

            return GenerationResult(
                query=query,
                query_type=query_type,
                is_valid=False,  # Will be set by validator
                fewshot_ids_used=fewshot_ids,
                generation_time_ms=generation_time,
                explanation=f"Generated from: {question[:50]}...",
            )

        except Exception as e:
            logger.error(f"Query generation failed: {e}")
            return GenerationResult(
                query="",
                query_type=query_type,
                is_valid=False,
                explanation=f"Generation error: {str(e)}",
            )

    def _build_prompt(
        self,
        question: str,
        project_id: str,
        query_type: QueryType,
        schema_context: SchemaContext,
        fewshot_examples: List[FewshotExample],
    ) -> str:
        """Build the generation prompt."""

        # Get base prompt template
        if query_type == QueryType.SQL:
            template = SQL_GENERATION_PROMPT
            schema_text = schema_context.to_sql_context()
        else:
            template = CYPHER_GENERATION_PROMPT
            schema_text = schema_context.to_cypher_context()

        # Format few-shot examples
        fewshot_text = ""
        if fewshot_examples:
            fewshot_parts = ["## Examples\n"]
            for i, ex in enumerate(fewshot_examples, 1):
                fewshot_parts.append(f"### Example {i}")
                fewshot_parts.append(f"Question: {ex.question}")
                fewshot_parts.append(f"Query:\n```\n{ex.query}\n```\n")
            fewshot_text = "\n".join(fewshot_parts)

        # Fill template
        prompt = template.format(
            schema=schema_text,
            fewshot_examples=fewshot_text,
            question=question,
            project_id=project_id,
            max_rows=100,
        )

        return prompt

    def _call_llm(self, prompt: str, max_tokens: int, temperature: float) -> str:
        """Call LLM for generation."""
        if self.llm_service:
            return self.llm_service.generate(
                prompt=prompt, max_tokens=max_tokens, temperature=temperature
            )

        # Use default model service
        try:
            from services.model_service import get_model_service

            model_service = get_model_service()

            return model_service.generate(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                stop=["```", "\n\n\n", "<end_of_turn>"],
            )
        except ImportError:
            logger.warning("model_service not available, using mock response")
            # Return a mock response for testing
            return "SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50"

    def _clean_query(self, response: str, query_type: QueryType) -> str:
        """Extract and clean query from LLM response."""
        response = response.strip()

        # Remove markdown code blocks
        if response.startswith("```sql"):
            response = response[6:]
        elif response.startswith("```cypher"):
            response = response[9:]
        elif response.startswith("```"):
            response = response[3:]

        if response.endswith("```"):
            response = response[:-3]

        response = response.strip()

        # Find the query start
        if query_type == QueryType.SQL:
            # Find SELECT statement
            match = re.search(
                r"(SELECT\s+.+?)(?:;|$)", response, re.IGNORECASE | re.DOTALL
            )
            if match:
                response = match.group(1).strip()
        else:
            # Find MATCH statement
            match = re.search(
                r"(MATCH\s+.+?)(?:;|$)", response, re.IGNORECASE | re.DOTALL
            )
            if match:
                response = match.group(1).strip()

        return response


# Singleton
_generator: Optional[QueryGenerator] = None


def get_query_generator() -> QueryGenerator:
    """Get singleton QueryGenerator instance."""
    global _generator
    if _generator is None:
        _generator = QueryGenerator()
    return _generator
