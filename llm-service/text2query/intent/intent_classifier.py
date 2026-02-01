"""
Intent Classifier

Multi-level intent classification using LLM with structured output.
Supports both rule-based fast classification and LLM-based deep classification.
"""
import json
import logging
import re
from typing import Protocol, Optional, List, Dict, Any

from .intent_types import (
    IntentType,
    IntentClassificationResult,
    INTENT_CRITERIA,
    KOREAN_INTENT_KEYWORDS,
)

logger = logging.getLogger(__name__)


class LLMService(Protocol):
    """Protocol for LLM service dependency."""
    def generate(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0
    ) -> str:
        ...


CLASSIFICATION_PROMPT = """You are an intent classifier for a Project Management System (PMS).

Classify the user's question into one of these intents:
{intent_descriptions}

## Available Data Models:
{available_models}

## User Question:
{question}

## Previous Context (if any):
{context}

## Project ID Available: {has_project_id}

## Instructions:
1. Analyze the question carefully
2. Check if it references specific data models or metrics
3. Determine if all required parameters are present
4. If the question is too vague or missing critical info, use CLARIFICATION_NEEDED
5. Classify into the most appropriate intent

Respond ONLY with a JSON object (no markdown, no explanation):
{{
  "intent": "<intent_type>",
  "confidence": <0.0-1.0>,
  "rephrased_question": "<clearer version of the question>",
  "reasoning": "<why this intent was chosen>",
  "relevant_models": ["<model1>", "<model2>"],
  "missing_parameters": ["<param1>"],
  "suggested_clarification": "<question to ask user for clarity>"
}}
"""


class IntentClassifier:
    """
    Classifies user queries into intent types for routing.

    Uses a two-stage approach:
    1. Fast rule-based classification for obvious cases
    2. LLM-based classification for complex/ambiguous cases
    """

    def __init__(
        self,
        llm_service: Optional[LLMService] = None,
        use_llm: bool = True
    ):
        self.llm = llm_service
        self.use_llm = use_llm and llm_service is not None
        self._semantic_layer = None

    @property
    def semantic_layer(self):
        """Lazy load semantic layer."""
        if self._semantic_layer is None:
            try:
                from ..semantic import get_semantic_layer
                self._semantic_layer = get_semantic_layer()
            except ImportError:
                logger.warning("Semantic layer not available")
        return self._semantic_layer

    def classify(
        self,
        question: str,
        context: str = "",
        project_id: Optional[str] = None,
        use_llm_override: Optional[bool] = None
    ) -> IntentClassificationResult:
        """
        Classify a user question into an intent type.

        Args:
            question: User's natural language question
            context: Previous conversation context
            project_id: Current project ID (if available)
            use_llm_override: Override default LLM usage setting

        Returns:
            IntentClassificationResult with classification details
        """
        # First, try fast rule-based classification
        fast_result = self._fast_classify(question, project_id)
        if fast_result and fast_result.confidence >= 0.9:
            logger.info(
                f"Fast classification: {fast_result.intent.value} "
                f"(confidence={fast_result.confidence})"
            )
            return fast_result

        # Use LLM for complex cases
        use_llm = use_llm_override if use_llm_override is not None else self.use_llm
        if use_llm and self.llm:
            llm_result = self._llm_classify(question, context, project_id)
            if llm_result:
                logger.info(
                    f"LLM classification: {llm_result.intent.value} "
                    f"(confidence={llm_result.confidence})"
                )
                return llm_result

        # Fallback to fast result or default
        if fast_result:
            return fast_result

        return IntentClassificationResult(
            intent=IntentType.TEXT_TO_SQL,
            confidence=0.5,
            rephrased_question=question,
            reasoning="Default fallback to TEXT_TO_SQL"
        )

    def _fast_classify(
        self,
        question: str,
        project_id: Optional[str] = None
    ) -> Optional[IntentClassificationResult]:
        """
        Fast rule-based classification using keywords.

        Returns result only if confidence is high enough.
        """
        question_lower = question.lower()
        scores: Dict[IntentType, float] = {intent: 0.0 for intent in IntentType}

        # Check English keywords
        for intent, criteria in INTENT_CRITERIA.items():
            for keyword in criteria.get("keywords", []):
                if keyword in question_lower:
                    scores[intent] += 0.15

        # Check Korean keywords
        for intent, keywords in KOREAN_INTENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in question_lower:
                    scores[intent] += 0.15

        # Check for harmful patterns
        harmful_patterns = [
            r'\bdrop\s+table', r'\bdelete\s+from\s+\w+\s*$',
            r'\btruncate\b', r'\balter\s+table', r';\s*--',
            r'\bunion\s+select', r'\bexec\b', r'\bxp_',
        ]
        for pattern in harmful_patterns:
            if re.search(pattern, question_lower):
                return IntentClassificationResult(
                    intent=IntentType.MISLEADING_QUERY,
                    confidence=0.95,
                    reasoning="Detected potentially harmful SQL pattern"
                )

        # Check for off-topic patterns (English and Korean)
        off_topic_patterns = [
            r'\bweather\b', r'\bjoke\b', r'\bgame\b',
            r'\brecipe\b', r'\bmusic\b', r'\bmovie\b',
            r'날씨', r'농담', r'게임', r'요리', r'음악', r'영화',
        ]
        for pattern in off_topic_patterns:
            if re.search(pattern, question_lower):
                return IntentClassificationResult(
                    intent=IntentType.MISLEADING_QUERY,
                    confidence=0.9,
                    reasoning="Off-topic question detected"
                )

        # Check for "difference between" patterns - these are GENERAL knowledge questions
        difference_patterns = [
            r'difference\s+between', r'차이점', r'차이', r'\bvs\b', r'versus',
        ]
        for pattern in difference_patterns:
            if re.search(pattern, question_lower):
                return IntentClassificationResult(
                    intent=IntentType.GENERAL,
                    confidence=0.85,
                    rephrased_question=question,
                    reasoning="Asking about conceptual difference - GENERAL knowledge"
                )

        # Check for "what is X" definition patterns (but not data queries)
        # "What is the completion rate for sprint 5" is a DATA query, not a definition
        definition_patterns = [
            r'(what\s+is|뭐야|뭔가|란|이란)\s+(\w+\s+)?(\w+)\s*(차트|chart|번다운|burndown)?$',
        ]
        data_query_indicators = [
            'rate', 'count', 'total', 'average', 'percentage', 'number',
            'sprint', 'project', 'task', 'story', 'issue', 'risk',
            'for', 'in', 'of', 'by',  # These indicate specific data query
        ]
        for pattern in definition_patterns:
            match = re.search(pattern, question_lower)
            if match:
                # Only classify as GENERAL if NOT asking about specific data
                if not any(kw in question_lower for kw in data_query_indicators):
                    scores[IntentType.GENERAL] += 0.3

        # Check for overly vague patterns that need clarification
        vague_patterns = [
            r'^show\s+me\s+everything$',
            r'^get\s+all$',
            r'^list\s+all$',
            r'^show\s+all$',
        ]
        for pattern in vague_patterns:
            if re.search(pattern, question_lower):
                return IntentClassificationResult(
                    intent=IntentType.CLARIFICATION_NEEDED,
                    confidence=0.9,
                    reasoning="Question too vague - needs specific criteria",
                    missing_parameters=["specific entity", "filter criteria"],
                    suggested_clarification="What specific data would you like to see? (e.g., tasks, sprints, projects)"
                )

        # Check for too short/vague questions
        # But first, check if it matches GENERAL patterns (e.g., "스크럼이 뭐야?")
        words = question.split()
        if len(words) <= 2:
            # Check if it's a general knowledge question before classifying as CLARIFICATION_NEEDED
            if scores.get(IntentType.GENERAL, 0) > 0:
                return IntentClassificationResult(
                    intent=IntentType.GENERAL,
                    confidence=0.7,
                    rephrased_question=question,
                    reasoning="Short general knowledge question"
                )
            return IntentClassificationResult(
                intent=IntentType.CLARIFICATION_NEEDED,
                confidence=0.85,
                reasoning="Question too short/vague",
                missing_parameters=["specific entity", "criteria"],
                suggested_clarification="Could you provide more details about what you're looking for?"
            )

        # Check for missing project context in project-scoped queries
        project_keywords = ["tasks", "stories", "sprints", "issues", "태스크", "스토리"]
        needs_project = any(kw in question_lower for kw in project_keywords)
        if needs_project and not project_id:
            scores[IntentType.CLARIFICATION_NEEDED] += 0.3

        # Get the best scoring intent
        best_intent = max(scores.items(), key=lambda x: x[1])
        confidence = min(best_intent[1], 1.0)

        if confidence < 0.3:
            return None

        # Find relevant models
        relevant_models = []
        if self.semantic_layer:
            models = self.semantic_layer.find_relevant_models(question)
            relevant_models = [m.name for m in models[:3]]

        return IntentClassificationResult(
            intent=best_intent[0],
            confidence=confidence,
            rephrased_question=question,
            reasoning=f"Keyword matching (score={confidence:.2f})",
            relevant_models=relevant_models
        )

    def _llm_classify(
        self,
        question: str,
        context: str,
        project_id: Optional[str]
    ) -> Optional[IntentClassificationResult]:
        """Use LLM for complex classification."""
        try:
            # Build intent descriptions
            intent_descriptions = self._build_intent_descriptions()

            # Get available models from semantic layer
            available_models = "Not available"
            if self.semantic_layer:
                available_models = self.semantic_layer.get_model_summary()

            # Build prompt
            prompt = CLASSIFICATION_PROMPT.format(
                intent_descriptions=intent_descriptions,
                available_models=available_models,
                question=question,
                context=context or "None",
                has_project_id=bool(project_id)
            )

            # Get LLM response
            response = self.llm.generate(prompt, max_tokens=500, temperature=0)

            # Parse response
            return self._parse_llm_response(response, question)

        except Exception as e:
            logger.error(f"LLM classification failed: {e}")
            return None

    def _build_intent_descriptions(self) -> str:
        """Build formatted intent descriptions for prompt."""
        descriptions = []
        for intent_type, criteria in INTENT_CRITERIA.items():
            desc = f"""
### {intent_type.value}
{criteria['description']}

Examples:
{chr(10).join(f'- {ex}' for ex in criteria['examples'][:3])}

Requirements:
{chr(10).join(f'- {req}' for req in criteria['requirements'])}
"""
            descriptions.append(desc)
        return "\n".join(descriptions)

    def _parse_llm_response(
        self,
        response: str,
        original_question: str
    ) -> Optional[IntentClassificationResult]:
        """Parse LLM response into IntentClassificationResult."""
        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)

                intent_str = data.get("intent", "TEXT_TO_SQL")
                try:
                    intent = IntentType(intent_str)
                except ValueError:
                    intent = IntentType.TEXT_TO_SQL

                return IntentClassificationResult(
                    intent=intent,
                    confidence=float(data.get("confidence", 0.5)),
                    rephrased_question=data.get("rephrased_question"),
                    reasoning=data.get("reasoning"),
                    relevant_models=data.get("relevant_models", []),
                    missing_parameters=data.get("missing_parameters", []),
                    suggested_clarification=data.get("suggested_clarification")
                )
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"Failed to parse LLM response: {e}")

        return None


# Singleton instance
_intent_classifier: Optional[IntentClassifier] = None


def get_intent_classifier(llm_service: Optional[LLMService] = None) -> IntentClassifier:
    """Get or create intent classifier singleton."""
    global _intent_classifier
    if _intent_classifier is None:
        _intent_classifier = IntentClassifier(llm_service=llm_service)
    elif llm_service is not None and _intent_classifier.llm is None:
        _intent_classifier.llm = llm_service
        _intent_classifier.use_llm = True
    return _intent_classifier


def reset_intent_classifier() -> None:
    """Reset the intent classifier singleton (for testing)."""
    global _intent_classifier
    _intent_classifier = None
