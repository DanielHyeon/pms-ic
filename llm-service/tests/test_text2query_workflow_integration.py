"""
Text2Query Workflow Integration Tests

Tests for the integrated LangGraph workflow connecting Phase 1-3 components.
Uses mocks to avoid external dependencies.
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime


# =============================================================================
# State Tests
# =============================================================================


class TestText2QueryState:
    """Test workflow state creation and manipulation."""

    def test_create_initial_state(self):
        """Test creating initial state."""
        from text2query.workflow.state import create_initial_state

        state = create_initial_state(
            question="Show blocked tasks",
            project_id=123,
            user_id="user-456",
            user_role="PM"
        )

        assert state["question"] == "Show blocked tasks"
        assert state["project_id"] == 123
        assert state["user_id"] == "user-456"
        assert state["user_role"] == "PM"
        assert state["trace_id"] is not None
        assert state["success"] is False
        assert state["correction_attempts"] == 0

    def test_initial_state_defaults(self):
        """Test default values in initial state."""
        from text2query.workflow.state import create_initial_state

        state = create_initial_state(
            question="Test",
            project_id=1
        )

        assert state["user_role"] == "USER"
        assert state["max_correction_attempts"] == 3
        assert state["relevant_models"] == []
        assert state["fewshot_examples"] == []
        assert state["node_timings"] == {}


class TestWorkflowConfig:
    """Test workflow configuration."""

    def test_default_config(self):
        """Test default configuration values."""
        from text2query.workflow.state import WorkflowConfig

        config = WorkflowConfig()

        assert config.enable_reasoning is True
        assert config.max_correction_attempts == 3
        assert config.max_fewshot_examples == 3
        assert config.enable_semantic_layer is True
        assert config.enable_tracing is True
        assert config.execute_queries is True

    def test_custom_config(self):
        """Test custom configuration."""
        from text2query.workflow.state import WorkflowConfig

        config = WorkflowConfig(
            enable_reasoning=False,
            max_correction_attempts=5,
            execute_queries=False
        )

        assert config.enable_reasoning is False
        assert config.max_correction_attempts == 5
        assert config.execute_queries is False

    def test_config_to_dict(self):
        """Test config serialization."""
        from text2query.workflow.state import WorkflowConfig

        config = WorkflowConfig()
        data = config.to_dict()

        assert "enable_reasoning" in data
        assert "max_correction_attempts" in data
        assert "enable_tracing" in data


# =============================================================================
# Node Tests (with mocks)
# =============================================================================


class TestIntentNode:
    """Test intent classification node."""

    def test_intent_node_sql(self):
        """Test intent classification for SQL query."""
        from text2query.workflow.nodes import intent_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(
            question="How many tasks are blocked?",
            project_id=1
        )
        config = WorkflowConfig()

        # Mock the intent classifier (imported from text2query.intent)
        with patch("text2query.intent.get_intent_classifier") as mock:
            mock_result = MagicMock()
            mock_result.intent.value = "TEXT_TO_SQL"
            mock_result.confidence = 0.95
            mock_result.reasoning = "Question asks about task count"
            mock_result.rephrased_question = None
            mock.return_value.classify.return_value = mock_result

            result = intent_node(state, config)

        assert result["intent_type"] == "TEXT_TO_SQL"
        assert result["intent_confidence"] == 0.95
        assert "intent" in result["node_timings"]

    def test_intent_node_cypher(self):
        """Test intent classification for Cypher query."""
        from text2query.workflow.nodes import intent_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(
            question="Find documents related to requirements",
            project_id=1
        )
        config = WorkflowConfig()

        with patch("text2query.intent.get_intent_classifier") as mock:
            mock_result = MagicMock()
            mock_result.intent.value = "TEXT_TO_CYPHER"
            mock_result.confidence = 0.88
            mock_result.reasoning = "Question about graph relationships"
            mock_result.rephrased_question = None
            mock.return_value.classify.return_value = mock_result

            result = intent_node(state, config)

        assert result["intent_type"] == "TEXT_TO_CYPHER"


class TestSemanticNode:
    """Test semantic layer node."""

    def test_semantic_node_finds_models(self):
        """Test semantic layer finds relevant models."""
        from text2query.workflow.nodes import semantic_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(
            question="Show task completion rate",
            project_id=1
        )
        config = WorkflowConfig()

        with patch("text2query.semantic.get_semantic_layer") as mock:
            mock_model = MagicMock()
            mock_model.name = "Task"
            mock.return_value.find_relevant_models.return_value = [mock_model]
            mock.return_value.generate_schema_context.return_value = "Schema context"
            mock.return_value.metrics = {}
            mock.return_value.find_join_path.return_value = None

            result = semantic_node(state, config)

        assert "Task" in result["relevant_models"]
        assert result["schema_context"] == "Schema context"

    def test_semantic_node_disabled(self):
        """Test semantic layer when disabled."""
        from text2query.workflow.nodes import semantic_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(
            question="Test",
            project_id=1
        )
        config = WorkflowConfig(enable_semantic_layer=False)

        result = semantic_node(state, config)

        # Should return state unchanged
        assert result == state


class TestGenerationNode:
    """Test query generation node."""

    def test_generation_node_sql(self):
        """Test SQL generation."""
        from text2query.workflow.nodes import generation_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state
        from text2query.response_models import SQLGenerationResponse

        state = create_initial_state(
            question="Count blocked tasks",
            project_id=1
        )
        state["intent_type"] = "TEXT_TO_SQL"
        state["schema_context"] = "task.tasks (id, status, project_id)"
        config = WorkflowConfig()

        mock_generator = MagicMock()
        mock_generator.generate.return_value = SQLGenerationResponse(
            sql="SELECT COUNT(*) FROM task.tasks WHERE status = 'BLOCKED' AND project_id = :project_id",
            confidence=0.9,
            tables_used=["task.tasks"],
            warnings=[]
        )

        result = generation_node(state, config, generator=mock_generator)

        assert result["query_type"] == "sql"
        assert "SELECT COUNT" in result["generated_query"]
        assert result["generation_confidence"] == 0.9


class TestValidationNode:
    """Test validation node."""

    def test_validation_node_valid(self):
        """Test validation of valid query."""
        from text2query.workflow.nodes import validation_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(question="Test", project_id=1)
        state["generated_query"] = "SELECT id FROM task.tasks WHERE project_id = :project_id LIMIT 10"
        state["query_type"] = "sql"
        config = WorkflowConfig()

        with patch("text2query.query_validator.get_query_validator") as mock:
            mock_result = MagicMock()
            mock_result.is_valid = True
            mock_result.errors = []
            mock_result.warnings = []
            mock_result.layer1_syntax_passed = True
            mock_result.layer2_schema_passed = True
            mock_result.layer3_security_passed = True
            mock_result.layer4_performance_passed = True
            mock.return_value.validate.return_value = mock_result

            result = validation_node(state, config)

        assert result["is_valid"] is True
        assert result["validation_passed_layers"]["syntax"] is True

    def test_validation_node_invalid(self):
        """Test validation of invalid query."""
        from text2query.workflow.nodes import validation_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(question="Test", project_id=1)
        state["generated_query"] = "SELECT * FROM tasks"
        state["query_type"] = "sql"
        config = WorkflowConfig()

        with patch("text2query.query_validator.get_query_validator") as mock:
            mock_error = MagicMock()
            mock_error.type.value = "schema"
            mock_error.message = "Table not found"
            mock_error.location = None
            mock_error.suggestion = "Use task.tasks"

            mock_result = MagicMock()
            mock_result.is_valid = False
            mock_result.errors = [mock_error]
            mock_result.warnings = []
            mock_result.layer1_syntax_passed = True
            mock_result.layer2_schema_passed = False
            mock_result.layer3_security_passed = True
            mock_result.layer4_performance_passed = True
            mock_result.get_error_summary.return_value = "[schema] Table not found"
            mock.return_value.validate.return_value = mock_result

            result = validation_node(state, config)

        assert result["is_valid"] is False
        assert result["validation_passed_layers"]["schema"] is False
        assert result["current_error"] is not None


class TestCorrectionNode:
    """Test correction node."""

    def test_correction_node_success(self):
        """Test successful correction."""
        from text2query.workflow.nodes import correction_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(question="Test", project_id=1)
        state["generated_query"] = "SELECT * FROM tasks"
        state["current_error"] = "Table not found"
        state["correction_attempts"] = 0
        config = WorkflowConfig()

        with patch("text2query.llm.get_structured_generator") as mock_gen:
            with patch("text2query.correction.get_enhanced_corrector") as mock:
                mock_result = MagicMock()
                mock_result.success = True
                mock_result.corrected_query = "SELECT id FROM task.tasks WHERE project_id = :project_id"
                mock.return_value.correct.return_value = mock_result

                with patch("text2query.correction.categorize_error") as mock_cat:
                    mock_cat.return_value.value = "table_not_found"

                    result = correction_node(state, config)

        assert result["correction_attempts"] == 1
        assert "task.tasks" in result["generated_query"]
        assert len(result["correction_history"]) == 1

    def test_correction_node_max_attempts(self):
        """Test correction respects max attempts."""
        from text2query.workflow.nodes import correction_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(question="Test", project_id=1)
        state["generated_query"] = "SELECT * FROM tasks"
        state["current_error"] = "Error"
        state["correction_attempts"] = 3
        state["max_correction_attempts"] = 3
        config = WorkflowConfig()

        result = correction_node(state, config)

        assert result["success"] is False
        assert "correction failed after" in result.get("error", "")


class TestExecutionNode:
    """Test execution node."""

    def test_execution_node_success(self):
        """Test successful execution."""
        from text2query.workflow.nodes import execution_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(question="Test", project_id=1)
        state["generated_query"] = "SELECT id FROM task.tasks WHERE project_id = :project_id LIMIT 10"
        state["query_type"] = "sql"
        state["is_valid"] = True
        config = WorkflowConfig()

        with patch("text2query.query_executor.get_query_executor") as mock:
            mock_result = MagicMock()
            mock_result.success = True
            mock_result.data = [{"id": 1}, {"id": 2}]
            mock_result.columns = ["id"]
            mock_result.row_count = 2
            mock.return_value.execute.return_value = mock_result

            result = execution_node(state, config)

        assert result["success"] is True
        assert result["executed"] is True
        assert result["row_count"] == 2

    def test_execution_node_disabled(self):
        """Test execution when disabled."""
        from text2query.workflow.nodes import execution_node
        from text2query.workflow.state import WorkflowConfig, create_initial_state

        state = create_initial_state(question="Test", project_id=1)
        state["generated_query"] = "SELECT 1"
        state["is_valid"] = True
        config = WorkflowConfig(execute_queries=False)

        result = execution_node(state, config)

        assert result["executed"] is False
        assert result["success"] is True
        assert result["response"]["execution_skipped"] is True


# =============================================================================
# Graph Tests
# =============================================================================


class TestWorkflowGraph:
    """Test workflow graph creation."""

    def test_create_graph(self):
        """Test graph creation."""
        from text2query.workflow.graph import create_text2query_graph
        from text2query.workflow.state import WorkflowConfig

        config = WorkflowConfig()
        graph = create_text2query_graph(config)

        assert graph is not None
        # Graph should have nodes
        assert "intent" in graph.nodes
        assert "semantic" in graph.nodes
        assert "generation" in graph.nodes
        assert "validation" in graph.nodes
        assert "correction" in graph.nodes
        assert "execution" in graph.nodes
        assert "finalize" in graph.nodes


class TestText2QueryWorkflow:
    """Test the workflow wrapper class."""

    def test_workflow_creation(self):
        """Test workflow instance creation."""
        from text2query.workflow.graph import Text2QueryWorkflow
        from text2query.workflow.state import WorkflowConfig

        config = WorkflowConfig(
            enable_tracing=False,
            enable_metrics=False,
            execute_queries=False
        )
        workflow = Text2QueryWorkflow(config)

        assert workflow.config == config
        assert workflow.graph is not None

    def test_workflow_singleton(self):
        """Test workflow singleton."""
        from text2query.workflow.graph import (
            get_text2query_workflow,
            reset_text2query_workflow
        )

        reset_text2query_workflow()
        w1 = get_text2query_workflow()
        w2 = get_text2query_workflow()

        assert w1 is w2

        reset_text2query_workflow()
        w3 = get_text2query_workflow()

        assert w1 is not w3


# =============================================================================
# Integration Tests (Full Flow with Mocks)
# =============================================================================


class TestWorkflowIntegration:
    """Integration tests for complete workflow execution."""

    @pytest.mark.skip(reason="Full flow test requires LLM service - run manually")
    def test_successful_sql_flow(self):
        """Test successful SQL generation and execution flow."""
        from text2query.workflow.graph import Text2QueryWorkflow
        from text2query.workflow.state import WorkflowConfig
        from text2query.workflow import nodes as n
        from text2query.response_models import SQLGenerationResponse

        # Configure mocks
        mock_intent = MagicMock()
        mock_intent.intent.value = "TEXT_TO_SQL"
        mock_intent.confidence = 0.95
        mock_intent.reasoning = "SQL query"
        mock_intent.rephrased_question = None
        n.get_intent_classifier.return_value.classify.return_value = mock_intent

        mock_model = MagicMock()
        mock_model.name = "Task"
        n.get_semantic_layer.return_value.find_relevant_models.return_value = [mock_model]
        n.get_semantic_layer.return_value.generate_schema_context.return_value = "Schema"
        n.get_semantic_layer.return_value.metrics = {}
        n.get_semantic_layer.return_value.find_join_path.return_value = None

        n.get_vector_fewshot_manager.return_value.get_similar_examples.return_value = []

        n.get_structured_generator.return_value.generate.return_value = SQLGenerationResponse(
            sql="SELECT COUNT(*) FROM task.tasks WHERE project_id = :project_id",
            confidence=0.9,
            tables_used=["task.tasks"]
        )

        mock_validation = MagicMock()
        mock_validation.is_valid = True
        mock_validation.errors = []
        mock_validation.warnings = []
        mock_validation.layer1_syntax_passed = True
        mock_validation.layer2_schema_passed = True
        mock_validation.layer3_security_passed = True
        mock_validation.layer4_performance_passed = True
        n.get_query_validator.return_value.validate.return_value = mock_validation

        mock_execution = MagicMock()
        mock_execution.success = True
        mock_execution.data = [{"count": 5}]
        mock_execution.columns = ["count"]
        mock_execution.row_count = 1
        n.get_query_executor.return_value.execute.return_value = mock_execution

        # Run workflow
        config = WorkflowConfig(
            enable_tracing=False,
            enable_metrics=False
        )
        workflow = Text2QueryWorkflow(config)
        result = workflow.run(
            question="How many tasks?",
            project_id=123
        )

        # Verify results
        assert result["success"] is True
        assert result["intent_type"] == "TEXT_TO_SQL"
        assert result["is_valid"] is True
        assert result["executed"] is True
        assert result["row_count"] == 1

    @pytest.mark.skip(reason="Full flow test requires LLM service - run manually")
    def test_correction_flow(self):
        """Test flow with correction."""
        from text2query.workflow.graph import Text2QueryWorkflow
        from text2query.workflow.state import WorkflowConfig
        from text2query.workflow import nodes as n
        from text2query.response_models import SQLGenerationResponse

        # Configure mocks
        mock_intent = MagicMock()
        mock_intent.intent.value = "TEXT_TO_SQL"
        mock_intent.confidence = 0.9
        mock_intent.reasoning = None
        mock_intent.rephrased_question = None
        n.get_intent_classifier.return_value.classify.return_value = mock_intent

        n.get_semantic_layer.return_value.find_relevant_models.return_value = []
        n.get_semantic_layer.return_value.generate_schema_context.return_value = ""
        n.get_semantic_layer.return_value.metrics = {}
        n.get_semantic_layer.return_value.find_join_path.return_value = None

        n.get_vector_fewshot_manager.return_value.get_similar_examples.return_value = []

        n.get_structured_generator.return_value.generate.return_value = SQLGenerationResponse(
            sql="SELECT * FROM tasks",  # Invalid - will need correction
            confidence=0.7,
            tables_used=["tasks"]
        )

        # First validation fails, second passes
        mock_error = MagicMock()
        mock_error.type.value = "schema"
        mock_error.message = "Table not found"
        mock_error.location = None
        mock_error.suggestion = None

        mock_fail = MagicMock()
        mock_fail.is_valid = False
        mock_fail.errors = [mock_error]
        mock_fail.warnings = []
        mock_fail.layer1_syntax_passed = True
        mock_fail.layer2_schema_passed = False
        mock_fail.layer3_security_passed = True
        mock_fail.layer4_performance_passed = True
        mock_fail.get_error_summary.return_value = "Error"

        mock_pass = MagicMock()
        mock_pass.is_valid = True
        mock_pass.errors = []
        mock_pass.warnings = []
        mock_pass.layer1_syntax_passed = True
        mock_pass.layer2_schema_passed = True
        mock_pass.layer3_security_passed = True
        mock_pass.layer4_performance_passed = True

        n.get_query_validator.return_value.validate.side_effect = [mock_fail, mock_pass]

        # Correction mock
        mock_correction = MagicMock()
        mock_correction.success = True
        mock_correction.corrected_query = "SELECT id FROM task.tasks WHERE project_id = :project_id"
        n.get_enhanced_corrector.return_value.correct.return_value = mock_correction

        n.categorize_error.return_value.value = "table_not_found"

        # Execution mock
        mock_execution = MagicMock()
        mock_execution.success = True
        mock_execution.data = []
        mock_execution.columns = ["id"]
        mock_execution.row_count = 0
        n.get_query_executor.return_value.execute.return_value = mock_execution

        # Run workflow
        config = WorkflowConfig(
            enable_tracing=False,
            enable_metrics=False
        )
        workflow = Text2QueryWorkflow(config)
        result = workflow.run(
            question="Show tasks",
            project_id=123
        )

        # Verify correction was applied
        assert result["success"] is True
        assert result["correction_attempts"] >= 1
        assert "task.tasks" in result["generated_query"]


class TestWorkflowRouting:
    """Test workflow routing logic."""

    def test_general_intent_routing(self):
        """Test routing for GENERAL intent."""
        from text2query.workflow.graph import create_text2query_graph
        from text2query.workflow.state import WorkflowConfig

        config = WorkflowConfig(allow_general=True)
        graph = create_text2query_graph(config)

        # Graph should handle GENERAL intent
        assert "intent" in graph.nodes
        assert "finalize" in graph.nodes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
