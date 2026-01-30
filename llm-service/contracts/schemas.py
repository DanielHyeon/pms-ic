"""
BMAD JSON Schemas - Phase 1: State & Contract Design

JSON Schema definitions for validating BMAD role outputs:
- ANALYST_OUTPUT_SCHEMA: Validates AnalystPlan
- ARCHITECT_OUTPUT_SCHEMA: Validates ArchitectSpec
- GUARDIAN_OUTPUT_SCHEMA: Validates GuardianReport
- EVIDENCE_ITEM_SCHEMA: Validates EvidenceItem

Reference: docs/llm-improvement/01-state-contract-design.md
"""

from typing import Dict, Any, List, Tuple
import re


# =============================================================================
# Schema Definitions
# =============================================================================

ANALYST_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["intent", "request_type", "track", "required_sources"],
    "properties": {
        "intent": {
            "type": "string",
            "minLength": 1,
            "description": "Intent label describing the request purpose"
        },
        "request_type": {
            "type": "string",
            "enum": [
                "STATUS_METRIC", "STATUS_SUMMARY", "STATUS_LIST",
                "HOWTO_POLICY", "DESIGN_ARCH", "DATA_DEFINITION",
                "TROUBLESHOOTING", "KNOWLEDGE_QA", "CASUAL"
            ],
            "description": "Classified request type"
        },
        "track": {
            "type": "string",
            "enum": ["FAST", "QUALITY"],
            "description": "Execution track"
        },
        "required_sources": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": ["db", "neo4j", "doc", "policy"]
            },
            "description": "Sources to query for evidence"
        },
        "missing_info_questions": {
            "type": "array",
            "items": {"type": "string"},
            "maxItems": 1,
            "description": "Clarifying questions (max 1, prefer 0)"
        },
        "expected_output_schema": {
            "type": "string",
            "description": "Expected output schema identifier"
        }
    },
    "additionalProperties": False
}

ARCHITECT_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["response_format", "domain_terms", "forbidden_content", "required_sections"],
    "properties": {
        "response_format": {
            "type": "string",
            "enum": ["markdown", "json", "hybrid"],
            "description": "Response format type"
        },
        "domain_terms": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Domain-specific terms to use in response"
        },
        "forbidden_content": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Content patterns to avoid"
        },
        "required_sections": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 8,
            "description": "Required sections in response (3-8 recommended)"
        }
    },
    "additionalProperties": False
}

GUARDIAN_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["verdict", "reasons", "required_actions", "risk_level"],
    "properties": {
        "verdict": {
            "type": "string",
            "enum": ["PASS", "RETRY", "FAIL"],
            "description": "Guardian judgment verdict"
        },
        "reasons": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Reasons for verdict (empty if PASS)"
        },
        "required_actions": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    # Evidence actions
                    "ADD_EVIDENCE", "RETRIEVE_MORE", "DIVERSIFY_SOURCES",
                    "REMOVE_DOC_EVIDENCE", "USE_DB_ONLY", "RETRIEVE_DB",
                    "RETRIEVE_DOC", "RETRIEVE_POLICY", "REFINE_QUERY",
                    # Contract actions
                    "ADD_REQUIRED_SECTIONS", "REMOVE_FORBIDDEN_CONTENT",
                    "USE_DOMAIN_TERMS", "FIX_JSON_FORMAT", "REGENERATE_DRAFT",
                    # Policy actions
                    "ADD_EVIDENCE_REFERENCES",
                    # Exit actions
                    "ASK_MINIMAL_QUESTION", "SAFE_REFUSAL"
                ]
            },
            "description": "Actions to take on RETRY"
        },
        "risk_level": {
            "type": "string",
            "enum": ["low", "med", "high"],
            "description": "Risk level assessment"
        }
    },
    "additionalProperties": False
}

EVIDENCE_ITEM_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["source", "ref", "snippet", "confidence"],
    "properties": {
        "source": {
            "type": "string",
            "enum": ["db", "neo4j", "doc", "policy"],
            "description": "Evidence source type"
        },
        "ref": {
            "type": "string",
            "minLength": 1,
            "description": "Unique reference identifier"
        },
        "snippet": {
            "type": "string",
            "description": "Relevant excerpt or value"
        },
        "confidence": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0,
            "description": "Confidence score (0.0-1.0)"
        }
    },
    "additionalProperties": False
}


# =============================================================================
# Role-Specific Rules
# =============================================================================

ROLE_RULES: Dict[str, Dict[str, Any]] = {
    "ANALYST": {
        "schema": ANALYST_OUTPUT_SCHEMA,
        "required_fields": ["intent", "request_type", "track", "required_sources"],
        "forbidden_fields": [],
        "constraints": {
            # STATUS types must not include doc in required_sources
            "status_no_doc": {
                "condition": lambda obj: obj.get("request_type", "").startswith("STATUS"),
                "check": lambda obj: "doc" not in obj.get("required_sources", []),
                "error": "STATUS request type must not include 'doc' in required_sources"
            },
            # STATUS types must include db in required_sources
            "status_requires_db": {
                "condition": lambda obj: obj.get("request_type", "").startswith("STATUS"),
                "check": lambda obj: "db" in obj.get("required_sources", []),
                "error": "STATUS request type must include 'db' in required_sources"
            },
            # Max 1 question
            "max_one_question": {
                "condition": lambda obj: True,
                "check": lambda obj: len(obj.get("missing_info_questions", [])) <= 1,
                "error": "missing_info_questions must have at most 1 item"
            },
            # FAST track should not have questions
            "fast_no_questions": {
                "condition": lambda obj: obj.get("track") == "FAST",
                "check": lambda obj: len(obj.get("missing_info_questions", [])) == 0,
                "error": "FAST track must not have missing_info_questions"
            }
        }
    },
    "ARCHITECT": {
        "schema": ARCHITECT_OUTPUT_SCHEMA,
        "required_fields": ["response_format", "domain_terms", "forbidden_content", "required_sections"],
        "forbidden_fields": [],
        "constraints": {
            # Must have some forbidden content defined
            "has_forbidden_content": {
                "condition": lambda obj: True,
                "check": lambda obj: len(obj.get("forbidden_content", [])) > 0,
                "error": "forbidden_content must not be empty"
            },
            # Sections should be 1-8
            "section_count": {
                "condition": lambda obj: True,
                "check": lambda obj: 1 <= len(obj.get("required_sections", [])) <= 8,
                "error": "required_sections must have 1-8 items"
            }
        }
    },
    "GUARDIAN": {
        "schema": GUARDIAN_OUTPUT_SCHEMA,
        "required_fields": ["verdict", "reasons", "required_actions", "risk_level"],
        "forbidden_fields": [],
        "constraints": {
            # PASS should have no reasons
            "pass_no_reasons": {
                "condition": lambda obj: obj.get("verdict") == "PASS",
                "check": lambda obj: len(obj.get("reasons", [])) == 0,
                "error": "PASS verdict should have empty reasons"
            },
            # FAIL/RETRY should have reasons
            "fail_has_reasons": {
                "condition": lambda obj: obj.get("verdict") in ["FAIL", "RETRY"],
                "check": lambda obj: len(obj.get("reasons", [])) > 0,
                "error": "FAIL/RETRY verdict must have reasons"
            },
            # RETRY should have required_actions
            "retry_has_actions": {
                "condition": lambda obj: obj.get("verdict") == "RETRY",
                "check": lambda obj: len(obj.get("required_actions", [])) > 0,
                "error": "RETRY verdict must have required_actions"
            }
        }
    }
}


# =============================================================================
# Validation Functions
# =============================================================================

def validate_json_schema(obj: Dict[str, Any], schema: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Simple JSON schema validation without external dependencies.

    Returns (is_valid, list_of_errors)
    """
    errors: List[str] = []

    if not isinstance(obj, dict):
        return False, ["Expected object, got " + type(obj).__name__]

    # Check required fields
    required = schema.get("required", [])
    for field in required:
        if field not in obj:
            errors.append(f"Missing required field: {field}")

    # Check properties
    properties = schema.get("properties", {})
    for field, value in obj.items():
        if field not in properties:
            if not schema.get("additionalProperties", True):
                errors.append(f"Unexpected field: {field}")
            continue

        prop_schema = properties[field]
        field_errors = _validate_property(field, value, prop_schema)
        errors.extend(field_errors)

    return len(errors) == 0, errors


def _validate_property(field: str, value: Any, schema: Dict[str, Any]) -> List[str]:
    """Validate a single property against its schema."""
    errors: List[str] = []
    expected_type = schema.get("type")

    # Type check
    if expected_type == "string":
        if not isinstance(value, str):
            errors.append(f"{field}: expected string, got {type(value).__name__}")
        else:
            # Check enum
            if "enum" in schema and value not in schema["enum"]:
                errors.append(f"{field}: value '{value}' not in enum {schema['enum']}")
            # Check minLength
            if "minLength" in schema and len(value) < schema["minLength"]:
                errors.append(f"{field}: length {len(value)} < minLength {schema['minLength']}")

    elif expected_type == "number":
        if not isinstance(value, (int, float)):
            errors.append(f"{field}: expected number, got {type(value).__name__}")
        else:
            # Check minimum/maximum
            if "minimum" in schema and value < schema["minimum"]:
                errors.append(f"{field}: value {value} < minimum {schema['minimum']}")
            if "maximum" in schema and value > schema["maximum"]:
                errors.append(f"{field}: value {value} > maximum {schema['maximum']}")

    elif expected_type == "array":
        if not isinstance(value, list):
            errors.append(f"{field}: expected array, got {type(value).__name__}")
        else:
            # Check minItems/maxItems
            if "minItems" in schema and len(value) < schema["minItems"]:
                errors.append(f"{field}: length {len(value)} < minItems {schema['minItems']}")
            if "maxItems" in schema and len(value) > schema["maxItems"]:
                errors.append(f"{field}: length {len(value)} > maxItems {schema['maxItems']}")
            # Validate items
            if "items" in schema:
                item_schema = schema["items"]
                for i, item in enumerate(value):
                    if item_schema.get("type") == "string":
                        if not isinstance(item, str):
                            errors.append(f"{field}[{i}]: expected string")
                        elif "enum" in item_schema and item not in item_schema["enum"]:
                            errors.append(f"{field}[{i}]: value '{item}' not in enum")

    elif expected_type == "object":
        if not isinstance(value, dict):
            errors.append(f"{field}: expected object, got {type(value).__name__}")

    return errors


def validate_role_constraints(role: str, obj: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate role-specific constraints beyond JSON schema.

    Returns (is_valid, list_of_errors)
    """
    if role not in ROLE_RULES:
        return True, []

    errors: List[str] = []
    rules = ROLE_RULES[role]
    constraints = rules.get("constraints", {})

    for constraint_name, constraint in constraints.items():
        condition_fn = constraint.get("condition", lambda obj: True)
        check_fn = constraint.get("check", lambda obj: True)
        error_msg = constraint.get("error", f"Constraint {constraint_name} failed")

        try:
            if condition_fn(obj) and not check_fn(obj):
                errors.append(error_msg)
        except Exception as e:
            errors.append(f"Constraint check error for {constraint_name}: {str(e)}")

    return len(errors) == 0, errors


def validate_role_output(role: str, obj: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Complete validation for a BMAD role output.

    Combines JSON schema validation and role-specific constraints.

    Returns (is_valid, list_of_errors)
    """
    if role not in ROLE_RULES:
        return False, [f"Unknown role: {role}"]

    rules = ROLE_RULES[role]
    all_errors: List[str] = []

    # 1. JSON schema validation
    schema_ok, schema_errors = validate_json_schema(obj, rules["schema"])
    all_errors.extend(schema_errors)

    # 2. Role-specific constraints (only if schema is valid enough)
    if schema_ok or len(schema_errors) < 3:  # Continue even with minor errors
        constraint_ok, constraint_errors = validate_role_constraints(role, obj)
        all_errors.extend(constraint_errors)

    return len(all_errors) == 0, all_errors


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "ANALYST_OUTPUT_SCHEMA",
    "ARCHITECT_OUTPUT_SCHEMA",
    "GUARDIAN_OUTPUT_SCHEMA",
    "EVIDENCE_ITEM_SCHEMA",
    "ROLE_RULES",
    "validate_json_schema",
    "validate_role_constraints",
    "validate_role_output",
]
