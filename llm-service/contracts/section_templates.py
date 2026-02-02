"""
BMAD Section Templates - Phase 4: Architect Spec

Standard section templates and domain terms by request type.
Used by Architect node to create response specifications.

Reference: docs/llm-improvement/04-architect-spec.md
"""

from typing import Dict, Any, List


# =============================================================================
# Section Templates by Request Type
# =============================================================================

SECTION_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "STATUS_METRIC": {
        "response_format": "hybrid",
        "required_sections": [
            "Metric Overview",
            "Current Value",
            "Trend Analysis",
            "Data Source"
        ],
        "forbidden_content": [
            "estimated values without DB query",
            "document-based numbers",
            "speculation about future values"
        ]
    },

    "STATUS_SUMMARY": {
        "response_format": "markdown",
        "required_sections": [
            "Summary",
            "Completed Items",
            "In Progress",
            "Blockers/Risks",
            "Next Steps"
        ],
        "forbidden_content": [
            "numbers without DB verification",
            "assumed completion dates"
        ]
    },

    "STATUS_LIST": {
        "response_format": "hybrid",
        "required_sections": [
            "Overview",
            "List",
            "Count Summary",
            "Data Source"
        ],
        "forbidden_content": [
            "incomplete list without indication",
            "fabricated items"
        ]
    },

    "DESIGN_ARCH": {
        "response_format": "markdown",
        "required_sections": [
            "Overview",
            "Architecture",
            "Components",
            "Data Flow",
            "Contracts/Interfaces",
            "Error Handling",
            "Considerations"
        ],
        "forbidden_content": [
            "implementation code",
            "unverified performance claims"
        ]
    },

    "HOWTO_POLICY": {
        "response_format": "markdown",
        "required_sections": [
            "Overview",
            "Prerequisites",
            "Steps",
            "Verification",
            "Related Policies"
        ],
        "forbidden_content": [
            "unauthorized workarounds",
            "policy exceptions without approval"
        ]
    },

    "DATA_DEFINITION": {
        "response_format": "markdown",
        "required_sections": [
            "Definition",
            "Schema/Structure",
            "Constraints",
            "Examples",
            "Related Entities"
        ],
        "forbidden_content": [
            "arbitrary schema changes",
            "unvalidated constraints"
        ]
    },

    "TROUBLESHOOTING": {
        "response_format": "markdown",
        "required_sections": [
            "Problem Summary",
            "Root Cause Analysis",
            "Solution Steps",
            "Verification",
            "Prevention"
        ],
        "forbidden_content": [
            "guessed root causes",
            "untested solutions"
        ]
    },

    "KNOWLEDGE_QA": {
        "response_format": "markdown",
        "required_sections": [
            "Answer",
            "Evidence",
            "Related Information"
        ],
        "forbidden_content": [
            "definitive claims without sources",
            "speculation presented as fact"
        ]
    },

    "CASUAL": {
        "response_format": "markdown",
        "required_sections": [
            "Response"
        ],
        "forbidden_content": [
            "offensive content",
            "unauthorized disclosures"
        ]
    }
}


# =============================================================================
# Domain Terms by Request Type
# =============================================================================

DOMAIN_TERMS: Dict[str, List[str]] = {
    "STATUS_METRIC": [
        "Sprint", "Velocity", "Burndown", "StoryPoint",
        "Completion Rate", "WIP", "Lead Time"
    ],

    "STATUS_SUMMARY": [
        "Sprint", "Backlog", "UserStory", "Task",
        "Blocker", "Risk", "Milestone"
    ],

    "STATUS_LIST": [
        "Backlog", "Sprint", "Task", "Item",
        "Status", "Priority", "Assignee"
    ],

    "DESIGN_ARCH": [
        "Component", "Interface", "Contract", "Module",
        "Dependency", "Flow", "State"
    ],

    "HOWTO_POLICY": [
        "Permission", "Role", "Access Level", "Policy",
        "Approval", "Workflow", "Compliance"
    ],

    "DATA_DEFINITION": [
        "Entity", "Schema", "Field", "Constraint",
        "Relationship", "Index", "Type"
    ],

    "TROUBLESHOOTING": [
        "Error", "Log", "Stack Trace", "Root Cause",
        "Fix", "Workaround", "Regression"
    ],

    "KNOWLEDGE_QA": [
        "Project", "Sprint", "Team", "Process",
        "Documentation", "Policy"
    ],

    "CASUAL": [
        "PMS", "Insurance", "Claims"
    ]
}


# =============================================================================
# Default Template
# =============================================================================

DEFAULT_TEMPLATE: Dict[str, Any] = {
    "response_format": "markdown",
    "required_sections": ["Summary", "Evidence", "Answer"],
    "forbidden_content": [
        "inventing facts",
        "unauthorized access",
        "policy violation"
    ]
}

DEFAULT_DOMAIN_TERMS: List[str] = ["Backlog", "Sprint", "UserStory"]


# =============================================================================
# Helper Functions
# =============================================================================

def get_section_template(request_type: str) -> Dict[str, Any]:
    """
    Get section template for a request type.

    Args:
        request_type: Request type string

    Returns:
        Section template dictionary
    """
    return SECTION_TEMPLATES.get(request_type, DEFAULT_TEMPLATE).copy()


def get_domain_terms(request_type: str) -> List[str]:
    """
    Get domain terms for a request type.

    Args:
        request_type: Request type string

    Returns:
        List of domain terms
    """
    return DOMAIN_TERMS.get(request_type, DEFAULT_DOMAIN_TERMS).copy()


def get_response_format(request_type: str) -> str:
    """
    Get response format for a request type.

    Args:
        request_type: Request type string

    Returns:
        Response format string
    """
    template = SECTION_TEMPLATES.get(request_type, DEFAULT_TEMPLATE)
    return template.get("response_format", "markdown")


def get_required_sections(request_type: str) -> List[str]:
    """
    Get required sections for a request type.

    Args:
        request_type: Request type string

    Returns:
        List of required section names
    """
    template = SECTION_TEMPLATES.get(request_type, DEFAULT_TEMPLATE)
    return template.get("required_sections", ["Summary", "Evidence", "Answer"]).copy()


def get_forbidden_content(request_type: str) -> List[str]:
    """
    Get forbidden content patterns for a request type.

    Args:
        request_type: Request type string

    Returns:
        List of forbidden content patterns
    """
    template = SECTION_TEMPLATES.get(request_type, DEFAULT_TEMPLATE)
    return template.get("forbidden_content", ["inventing facts"]).copy()


def build_spec_from_template(request_type: str) -> Dict[str, Any]:
    """
    Build a complete ArchitectSpec from template.

    Args:
        request_type: Request type string

    Returns:
        Complete ArchitectSpec dictionary
    """
    template = get_section_template(request_type)
    return {
        "response_format": template.get("response_format", "markdown"),
        "domain_terms": get_domain_terms(request_type),
        "forbidden_content": template.get("forbidden_content", ["inventing facts"]),
        "required_sections": template.get("required_sections", ["Summary", "Evidence", "Answer"])
    }


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Templates
    "SECTION_TEMPLATES",
    "DOMAIN_TERMS",
    "DEFAULT_TEMPLATE",
    "DEFAULT_DOMAIN_TERMS",
    # Helper functions
    "get_section_template",
    "get_domain_terms",
    "get_response_format",
    "get_required_sections",
    "get_forbidden_content",
    "build_spec_from_template",
]
