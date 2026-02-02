"""
Phase 1 Enhancement Tests - TextToSQL Improvement Roadmap

Tests for new Phase 1 components:
1. Semantic Layer (MDL) - Business term to schema mapping
2. Intent Classification - Multi-level query routing
3. Vector Few-shot Manager - Semantic similarity search

These tests can run WITHOUT external services (LLM, Neo4j, embedding model).
"""

import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
import json


# =============================================================================
# Semantic Layer Tests
# =============================================================================


class TestSemanticLayerMDL:
    """Test Semantic Layer MDL loading and parsing."""

    def test_mdl_schema_json_exists(self):
        """Test that MDL schema file exists."""
        mdl_path = Path(__file__).parent.parent / "text2query" / "semantic" / "mdl_schema.json"
        assert mdl_path.exists(), f"MDL schema file not found: {mdl_path}"

        # Validate JSON syntax
        with open(mdl_path) as f:
            schema = json.load(f)
        assert "$schema" in schema
        assert "definitions" in schema

    def test_pms_mdl_json_exists(self):
        """Test that PMS MDL file exists and is valid JSON."""
        mdl_path = Path(__file__).parent.parent / "text2query" / "semantic" / "pms_mdl.json"
        assert mdl_path.exists(), f"PMS MDL file not found: {mdl_path}"

        with open(mdl_path) as f:
            mdl = json.load(f)

        # Basic structure validation
        assert "models" in mdl
        assert "relationships" in mdl
        assert "metrics" in mdl
        assert len(mdl["models"]) > 0

    def test_pms_mdl_has_required_models(self):
        """Test that PMS MDL contains required models."""
        mdl_path = Path(__file__).parent.parent / "text2query" / "semantic" / "pms_mdl.json"
        with open(mdl_path) as f:
            mdl = json.load(f)

        model_names = {m["name"] for m in mdl["models"]}

        # Required models for PMS domain
        required_models = {"projects", "sprints", "user_stories", "tasks", "issues", "risks"}
        missing = required_models - model_names
        assert not missing, f"Missing required models: {missing}"


class TestSemanticLayer:
    """Test SemanticLayer class functionality."""

    @pytest.fixture
    def semantic_layer(self):
        """Create a SemanticLayer instance."""
        from text2query.semantic import SemanticLayer
        mdl_path = Path(__file__).parent.parent / "text2query" / "semantic" / "pms_mdl.json"
        return SemanticLayer(str(mdl_path))

    def test_load_mdl(self, semantic_layer):
        """Test MDL loading."""
        assert len(semantic_layer.models) > 0
        assert "projects" in semantic_layer.models
        assert "user_stories" in semantic_layer.models

    def test_resolve_model_by_name(self, semantic_layer):
        """Test model resolution by exact name."""
        model = semantic_layer.resolve_model("tasks")
        assert model is not None
        assert model.name == "tasks"

    def test_resolve_model_by_display_name(self, semantic_layer):
        """Test model resolution by display name."""
        model = semantic_layer.resolve_model("User Story")
        assert model is not None
        assert model.name == "user_stories"

    def test_resolve_model_not_found(self, semantic_layer):
        """Test model resolution returns None for unknown term."""
        model = semantic_layer.resolve_model("nonexistent_model")
        assert model is None

    def test_find_relevant_models(self, semantic_layer):
        """Test finding relevant models from query."""
        models = semantic_layer.find_relevant_models("sprint velocity user stories")
        model_names = [m.name for m in models]

        assert "sprints" in model_names or "user_stories" in model_names

    def test_find_join_path(self, semantic_layer):
        """Test finding relationship between two models."""
        rel = semantic_layer.find_join_path("sprints", "user_stories")
        assert rel is not None
        assert "sprint" in rel.name.lower() or "user_stories" in rel.name.lower()

    def test_get_project_scoped_models(self, semantic_layer):
        """Test getting project-scoped models."""
        scoped = semantic_layer.get_project_scoped_models()
        assert len(scoped) > 0
        assert all(m.project_scoped for m in scoped)

        # user_stories should be project-scoped
        scoped_names = [m.name for m in scoped]
        assert "user_stories" in scoped_names

    def test_get_metric(self, semantic_layer):
        """Test getting predefined metric."""
        metric = semantic_layer.get_metric("sprint_velocity")
        assert metric is not None
        assert metric.base_model == "user_stories"

    def test_generate_schema_context(self, semantic_layer):
        """Test schema context generation."""
        context = semantic_layer.generate_schema_context(["projects", "sprints"])
        assert "project.projects" in context
        assert "task.sprints" in context
        assert "CREATE TABLE" in context

    def test_model_full_table_name(self, semantic_layer):
        """Test model full table name property."""
        model = semantic_layer.models["tasks"]
        assert model.full_table_name == "task.tasks"


class TestSemanticLayerSingleton:
    """Test SemanticLayer singleton behavior."""

    def test_get_semantic_layer_returns_same_instance(self):
        """Test that get_semantic_layer returns singleton."""
        from text2query.semantic import get_semantic_layer, reset_semantic_layer

        reset_semantic_layer()
        layer1 = get_semantic_layer()
        layer2 = get_semantic_layer()

        assert layer1 is layer2

    def test_reset_semantic_layer(self):
        """Test resetting the singleton."""
        from text2query.semantic import get_semantic_layer, reset_semantic_layer

        layer1 = get_semantic_layer()
        reset_semantic_layer()
        layer2 = get_semantic_layer()

        assert layer1 is not layer2


# =============================================================================
# Intent Classification Tests
# =============================================================================


class TestIntentTypes:
    """Test Intent type definitions."""

    def test_intent_type_enum(self):
        """Test IntentType enum values."""
        from text2query.intent import IntentType

        assert IntentType.TEXT_TO_SQL.value == "TEXT_TO_SQL"
        assert IntentType.TEXT_TO_CYPHER.value == "TEXT_TO_CYPHER"
        assert IntentType.GENERAL.value == "GENERAL"
        assert IntentType.MISLEADING_QUERY.value == "MISLEADING_QUERY"
        assert IntentType.CLARIFICATION_NEEDED.value == "CLARIFICATION_NEEDED"

    def test_intent_classification_result(self):
        """Test IntentClassificationResult dataclass."""
        from text2query.intent import IntentType, IntentClassificationResult

        result = IntentClassificationResult(
            intent=IntentType.TEXT_TO_SQL,
            confidence=0.95,
            rephrased_question="How many tasks in progress?",
            reasoning="Query asks for count of tasks",
            relevant_models=["tasks"],
        )

        assert result.intent == IntentType.TEXT_TO_SQL
        assert result.confidence == 0.95
        assert "tasks" in result.relevant_models

    def test_intent_classification_result_to_dict(self):
        """Test IntentClassificationResult to_dict method."""
        from text2query.intent import IntentType, IntentClassificationResult

        result = IntentClassificationResult(
            intent=IntentType.TEXT_TO_SQL,
            confidence=0.9,
        )
        d = result.to_dict()

        assert d["intent"] == "TEXT_TO_SQL"
        assert d["confidence"] == 0.9


class TestIntentClassifierRuleBased:
    """Test IntentClassifier rule-based (fast) classification."""

    @pytest.fixture
    def classifier(self):
        """Create IntentClassifier without LLM."""
        from text2query.intent import IntentClassifier
        return IntentClassifier(llm_service=None, use_llm=False)

    def test_classify_sql_query_keywords(self, classifier):
        """Test SQL query classification by keywords."""
        from text2query.intent import IntentType

        result = classifier.classify("How many tasks are in progress?")
        # Should classify as TEXT_TO_SQL due to "tasks" and "in progress" keywords
        assert result.intent in [IntentType.TEXT_TO_SQL, IntentType.CLARIFICATION_NEEDED]

    def test_classify_cypher_query_keywords(self, classifier):
        """Test Cypher query classification by keywords."""
        from text2query.intent import IntentType

        result = classifier.classify("What documents are related to this requirement?")
        assert result.intent in [IntentType.TEXT_TO_CYPHER, IntentType.TEXT_TO_SQL]

    def test_classify_general_query(self, classifier):
        """Test general query classification."""
        from text2query.intent import IntentType

        result = classifier.classify("What does sprint velocity mean?")
        # "what is", "explain", "mean" are general keywords
        assert result.intent in [IntentType.GENERAL, IntentType.TEXT_TO_SQL]

    def test_classify_misleading_harmful(self, classifier):
        """Test harmful query detection."""
        from text2query.intent import IntentType

        result = classifier.classify("DROP TABLE users; --")
        assert result.intent == IntentType.MISLEADING_QUERY
        assert result.confidence >= 0.9

    def test_classify_misleading_offtopic(self, classifier):
        """Test off-topic query detection."""
        from text2query.intent import IntentType

        result = classifier.classify("What's the weather today?")
        assert result.intent == IntentType.MISLEADING_QUERY
        assert result.confidence >= 0.8

    def test_classify_clarification_too_short(self, classifier):
        """Test vague/short query triggers clarification."""
        from text2query.intent import IntentType

        result = classifier.classify("show")
        assert result.intent == IntentType.CLARIFICATION_NEEDED

    def test_classify_korean_sql_keywords(self, classifier):
        """Test Korean keyword recognition."""
        from text2query.intent import IntentType

        result = classifier.classify("진행중인 태스크 몇 개야?")
        # Should recognize Korean SQL keywords
        assert result.intent in [IntentType.TEXT_TO_SQL, IntentType.CLARIFICATION_NEEDED]


class TestIntentClassifierWithMockLLM:
    """Test IntentClassifier with mocked LLM."""

    def test_classify_with_llm(self):
        """Test classification using LLM."""
        from text2query.intent import IntentClassifier, IntentType

        # Create mock LLM that returns valid JSON
        mock_llm = MagicMock()
        mock_llm.generate.return_value = json.dumps({
            "intent": "TEXT_TO_SQL",
            "confidence": 0.95,
            "rephrased_question": "How many tasks are in progress?",
            "reasoning": "Query asks for count of tasks",
            "relevant_models": ["tasks"],
            "missing_parameters": [],
        })

        classifier = IntentClassifier(llm_service=mock_llm, use_llm=True)
        result = classifier.classify("Show me in-progress tasks")

        assert result.intent == IntentType.TEXT_TO_SQL
        assert result.confidence == 0.95
        mock_llm.generate.assert_called_once()

    def test_classify_fallback_on_llm_failure(self):
        """Test fallback when LLM fails."""
        from text2query.intent import IntentClassifier

        # Create mock LLM that raises exception
        mock_llm = MagicMock()
        mock_llm.generate.side_effect = Exception("LLM error")

        classifier = IntentClassifier(llm_service=mock_llm, use_llm=True)
        result = classifier.classify("How many tasks are done?")

        # Should fallback to rule-based classification
        assert result is not None
        assert result.confidence >= 0.0


# =============================================================================
# Vector Few-shot Manager Tests
# =============================================================================


class TestFewshotExample:
    """Test FewshotExample dataclass."""

    def test_fewshot_example_id_generation(self):
        """Test that ID is generated from question hash."""
        from text2query.fewshot import FewshotExample

        example = FewshotExample(
            question="How many tasks?",
            query="SELECT COUNT(*) FROM tasks",
            query_type="sql",
        )

        assert example.id is not None
        assert len(example.id) == 12  # MD5 hash truncated to 12 chars

    def test_fewshot_example_to_dict(self):
        """Test FewshotExample to_dict method."""
        from text2query.fewshot import FewshotExample

        example = FewshotExample(
            question="How many tasks?",
            query="SELECT COUNT(*) FROM tasks",
            query_type="sql",
            keywords=["tasks", "count"],
            verified=True,
        )

        d = example.to_dict()
        assert d["question"] == "How many tasks?"
        assert d["query_type"] == "sql"
        assert d["verified"] is True


class TestDefaultFewshotExamples:
    """Test default few-shot examples."""

    def test_default_sql_examples_exist(self):
        """Test that default SQL examples are defined."""
        from text2query.fewshot import DEFAULT_SQL_EXAMPLES

        assert len(DEFAULT_SQL_EXAMPLES) >= 8
        for ex in DEFAULT_SQL_EXAMPLES:
            assert ex.query_type == "sql"
            assert ":project_id" in ex.query or "project_id" in ex.query
            assert ex.verified is True

    def test_default_cypher_examples_exist(self):
        """Test that default Cypher examples are defined."""
        from text2query.fewshot import DEFAULT_CYPHER_EXAMPLES

        assert len(DEFAULT_CYPHER_EXAMPLES) >= 3
        for ex in DEFAULT_CYPHER_EXAMPLES:
            assert ex.query_type == "cypher"
            assert ex.verified is True


class TestVectorFewshotManager:
    """Test VectorFewshotManager functionality."""

    @pytest.fixture
    def manager(self):
        """Create VectorFewshotManager instance."""
        from text2query.fewshot import VectorFewshotManager
        return VectorFewshotManager(use_neo4j=False)

    def test_initialization(self, manager):
        """Test manager initialization."""
        manager._ensure_initialized()
        assert len(manager._sql_examples) > 0
        assert len(manager._cypher_examples) > 0

    def test_keyword_search_fallback(self, manager):
        """Test keyword-based search (fallback when no embedding model)."""
        # This test doesn't require embedding model
        manager._ensure_initialized()

        # Directly use keyword search
        results = manager._keyword_search(
            "tasks in progress",
            manager._sql_examples,
            limit=3,
            verified_only=True
        )

        assert len(results) > 0
        assert all(r.verified for r in results)

    def test_add_example(self, manager):
        """Test adding new example."""
        manager._ensure_initialized()
        initial_count = len(manager._sql_examples)

        example = manager.add_example(
            question="Test question for adding?",
            query="SELECT * FROM test LIMIT 10",
            query_type="sql",
            keywords=["test"],
            verified=False
        )

        assert example is not None
        assert len(manager._sql_examples) == initial_count + 1
        assert example.id in manager._sql_examples

    def test_get_all_examples(self, manager):
        """Test getting all examples."""
        examples = manager.get_all_examples("sql")
        assert len(examples) > 0
        assert all(e.query_type == "sql" for e in examples)

        cypher_examples = manager.get_all_examples("cypher")
        assert len(cypher_examples) > 0
        assert all(e.query_type == "cypher" for e in cypher_examples)

    def test_get_statistics(self, manager):
        """Test getting statistics."""
        stats = manager.get_statistics()

        assert "sql_examples" in stats
        assert "cypher_examples" in stats
        assert "sql_verified" in stats
        assert stats["sql_examples"] > 0

    def test_mark_verified(self, manager):
        """Test marking example as verified."""
        # Add unverified example
        example = manager.add_example(
            question="Unverified test question?",
            query="SELECT 1",
            query_type="sql",
            verified=False
        )

        assert not manager._sql_examples[example.id].verified

        # Mark as verified
        result = manager.mark_verified(example.id, "sql")
        assert result is True
        assert manager._sql_examples[example.id].verified


class TestVectorFewshotManagerSingleton:
    """Test VectorFewshotManager singleton behavior."""

    def test_get_vector_fewshot_manager_singleton(self):
        """Test singleton behavior."""
        from text2query.fewshot import get_vector_fewshot_manager, reset_vector_fewshot_manager

        reset_vector_fewshot_manager()
        m1 = get_vector_fewshot_manager()
        m2 = get_vector_fewshot_manager()

        assert m1 is m2

    def test_reset_vector_fewshot_manager(self):
        """Test resetting singleton."""
        from text2query.fewshot import get_vector_fewshot_manager, reset_vector_fewshot_manager

        m1 = get_vector_fewshot_manager()
        reset_vector_fewshot_manager()
        m2 = get_vector_fewshot_manager()

        assert m1 is not m2


# =============================================================================
# Integration Tests (without external services)
# =============================================================================


class TestPhase1Integration:
    """Integration tests for Phase 1 components working together."""

    def test_semantic_layer_with_intent_classifier(self):
        """Test semantic layer provides models to intent classifier."""
        from text2query.semantic import get_semantic_layer, reset_semantic_layer
        from text2query.intent import IntentClassifier

        reset_semantic_layer()
        layer = get_semantic_layer()

        # Intent classifier should use semantic layer
        classifier = IntentClassifier(llm_service=None, use_llm=False)

        result = classifier.classify("Show sprint velocity")
        # Should have relevant models populated
        assert result is not None

    def test_fewshot_with_semantic_layer(self):
        """Test fewshot examples align with semantic layer models."""
        from text2query.semantic import get_semantic_layer, reset_semantic_layer
        from text2query.fewshot import DEFAULT_SQL_EXAMPLES

        reset_semantic_layer()
        layer = get_semantic_layer()

        # Check that fewshot target_tables are valid models
        for example in DEFAULT_SQL_EXAMPLES[:5]:
            for table in example.target_tables:
                # Extract model name from schema.table format
                parts = table.split(".")
                table_name = parts[1] if len(parts) > 1 else parts[0]

                # Should be a valid model in semantic layer
                assert table_name in layer.models or any(
                    table_name in m.full_table_name for m in layer.models.values()
                ), f"Table {table} not in semantic layer"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
