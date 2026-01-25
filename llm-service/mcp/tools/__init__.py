"""
MCP Tools - Pre-built tools for common operations

Provides:
- Database tools (query, CRUD operations)
- LLM tools (generation, embedding)
- External tools (API calls, webhooks)
"""

from .database_tools import (
    get_project_tool,
    list_projects_tool,
    get_tasks_tool,
    get_sprints_tool,
    get_metrics_tool,
)

from .llm_tools import (
    generate_text_tool,
    generate_summary_tool,
    classify_intent_tool,
    embed_text_tool,
)

__all__ = [
    # Database tools
    "get_project_tool",
    "list_projects_tool",
    "get_tasks_tool",
    "get_sprints_tool",
    "get_metrics_tool",
    # LLM tools
    "generate_text_tool",
    "generate_summary_tool",
    "classify_intent_tool",
    "embed_text_tool",
]
