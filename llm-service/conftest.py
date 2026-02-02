"""
Pytest configuration and shared fixtures for LLM service tests.

This module provides:
- Common test fixtures for database connections
- Mock objects for external services
- Test data factories
- Configuration for test environment
"""

import os
from typing import Any, Generator
from unittest.mock import MagicMock, patch

import pytest


# =============================================================================
# Environment Setup
# =============================================================================

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment() -> Generator[None, None, None]:
    """Set up test environment variables before any tests run."""
    test_env = {
        "FLASK_ENV": "testing",
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "test_password",
        "POSTGRES_URI": "postgresql://test:test@localhost:5432/test_db",
        "MODEL_PATH": "./models/test_model.gguf",
        "GGUF_N_CTX": "2048",
        "GGUF_N_GPU_LAYERS": "0",
    }

    original_env = {key: os.environ.get(key) for key in test_env}
    os.environ.update(test_env)

    yield

    # Restore original environment
    for key, value in original_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


# =============================================================================
# Database Fixtures
# =============================================================================

@pytest.fixture
def mock_neo4j_driver() -> Generator[MagicMock, None, None]:
    """Provide a mock Neo4j driver for tests."""
    mock_driver = MagicMock()
    mock_session = MagicMock()
    mock_driver.session.return_value.__enter__ = MagicMock(return_value=mock_session)
    mock_driver.session.return_value.__exit__ = MagicMock(return_value=None)

    with patch("neo4j.GraphDatabase.driver", return_value=mock_driver):
        yield mock_driver


@pytest.fixture
def mock_postgres_connection() -> Generator[MagicMock, None, None]:
    """Provide a mock PostgreSQL connection for tests."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=None)

    with patch("psycopg2.connect", return_value=mock_conn):
        yield mock_conn


# =============================================================================
# LLM Service Fixtures
# =============================================================================

@pytest.fixture
def mock_llm_model() -> Generator[MagicMock, None, None]:
    """Provide a mock LLM model for tests."""
    mock_model = MagicMock()
    mock_model.create_completion.return_value = {
        "choices": [{"text": "Test response from mock LLM"}]
    }

    with patch("llama_cpp.Llama", return_value=mock_model):
        yield mock_model


@pytest.fixture
def mock_embedding_model() -> Generator[MagicMock, None, None]:
    """Provide a mock embedding model for tests."""
    import numpy as np

    mock_model = MagicMock()
    mock_model.encode.return_value = np.random.rand(10, 768).astype(np.float32)

    with patch("sentence_transformers.SentenceTransformer", return_value=mock_model):
        yield mock_model


# =============================================================================
# Flask App Fixtures
# =============================================================================

@pytest.fixture
def app() -> Generator[Any, None, None]:
    """Create application for testing."""
    # Import here to avoid circular imports
    from app import create_app

    app = create_app()
    app.config.update({
        "TESTING": True,
    })

    yield app


@pytest.fixture
def client(app: Any) -> Any:
    """Create test client for Flask application."""
    return app.test_client()


@pytest.fixture
def runner(app: Any) -> Any:
    """Create test CLI runner."""
    return app.test_cli_runner()


# =============================================================================
# Test Data Factories
# =============================================================================

@pytest.fixture
def sample_chat_request() -> dict[str, Any]:
    """Provide sample chat request data."""
    return {
        "session_id": "test-session-123",
        "project_id": "project-456",
        "message": "What is the project status?",
        "user_id": "user-789",
        "engine": "gguf",
    }


@pytest.fixture
def sample_rag_context() -> list[dict[str, Any]]:
    """Provide sample RAG context data."""
    return [
        {
            "content": "Project Alpha is currently in development phase.",
            "source": "project_document.pdf",
            "score": 0.95,
        },
        {
            "content": "Sprint 5 is scheduled to end next week.",
            "source": "sprint_plan.docx",
            "score": 0.87,
        },
    ]


@pytest.fixture
def sample_workflow_state() -> dict[str, Any]:
    """Provide sample workflow state data."""
    return {
        "query": "Generate weekly report",
        "intent": "report_generation",
        "context": [],
        "response": None,
        "metadata": {
            "project_id": "project-456",
            "user_id": "user-789",
        },
    }


# =============================================================================
# Utility Fixtures
# =============================================================================

@pytest.fixture
def capture_logs(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    """Capture log output for assertions."""
    import logging
    caplog.set_level(logging.DEBUG)
    return caplog


@pytest.fixture
def temp_model_path(tmp_path: Any) -> str:
    """Create temporary path for model files in tests."""
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    return str(model_dir)
