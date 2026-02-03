"""
Report API Routes.

Handles report generation and text-to-SQL endpoints.
"""

import logging
from flask import request, jsonify

from . import report_bp
from services.model_service import get_model_service
from services.report_service import get_report_service
from services.text_to_sql_service import get_text_to_sql_service

logger = logging.getLogger(__name__)


def _ensure_services_initialized():
    """Ensure report and text-to-sql services have the model loaded."""
    model_service = get_model_service()
    model, _, _ = model_service.load_model()

    if model is None:
        return None, {"error": "Model not loaded", "message": "LLM model is not available"}

    # Initialize services with model
    report_service = get_report_service()
    text_to_sql_service = get_text_to_sql_service()

    report_service.set_model(model)
    text_to_sql_service.set_model(model)

    return model, None


@report_bp.route("/api/report/generate-section", methods=["POST"])
def generate_report_section():
    """
    Generate content for a report section.

    Request body:
    {
        "prompt": "Generate summary...",
        "context": {...},
        "user_role": "pm",
        "max_tokens": 500,
        "temperature": 0.7
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        prompt = data.get("prompt")
        context = data.get("context", {})
        user_role = data.get("user_role", "developer")
        section_type = data.get("section_type", "general")

        if not prompt:
            return jsonify({"error": "prompt is required"}), 400

        # Ensure services are initialized
        model, error = _ensure_services_initialized()
        if error:
            return jsonify(error), 503

        # Generate section
        report_service = get_report_service()
        result = report_service.generate_section(prompt, context, user_role, section_type)

        if result.get("success"):
            return jsonify({
                "success": True,
                "data": {
                    "content": result["content"]
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Generation failed")
            }), 500

    except Exception as e:
        logger.error(f"Section generation error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@report_bp.route("/api/report/executive-summary", methods=["POST"])
def generate_executive_summary():
    """
    Generate executive summary for a report.

    Request body:
    {
        "report_data": {...},
        "user_role": "pm"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        report_data = data.get("report_data", {})
        user_role = data.get("user_role", "developer")

        # Ensure services are initialized
        model, error = _ensure_services_initialized()
        if error:
            return jsonify(error), 503

        # Generate summary
        report_service = get_report_service()
        result = report_service.generate_executive_summary(report_data, user_role)

        if result.get("success"):
            return jsonify({
                "success": True,
                "data": {
                    "content": result["content"]
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Generation failed")
            }), 500

    except Exception as e:
        logger.error(f"Executive summary generation error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@report_bp.route("/api/report/weekly-summary", methods=["POST"])
def generate_weekly_summary():
    """
    Generate weekly summary section.

    Request body:
    {
        "tasks_completed": [...],
        "tasks_in_progress": [...],
        "blockers": [...],
        "user_role": "developer"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        tasks_completed = data.get("tasks_completed", [])
        tasks_in_progress = data.get("tasks_in_progress", [])
        blockers = data.get("blockers", [])
        user_role = data.get("user_role", "developer")

        # Ensure services are initialized
        model, error = _ensure_services_initialized()
        if error:
            return jsonify(error), 503

        # Generate summary
        report_service = get_report_service()
        result = report_service.generate_weekly_summary(
            tasks_completed, tasks_in_progress, blockers, user_role
        )

        if result.get("success"):
            return jsonify({
                "success": True,
                "data": {
                    "content": result["content"]
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Generation failed")
            }), 500

    except Exception as e:
        logger.error(f"Weekly summary generation error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@report_bp.route("/api/report/text-to-sql", methods=["POST"])
def text_to_sql():
    """
    Convert natural language question to SQL.

    Request body:
    {
        "question": "How many tasks are completed?",
        "project_id": "123",
        "user_role": "pm",
        "user_id": "user123",
        "additional_context": "optional context"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        question = data.get("question")
        project_id = data.get("project_id")
        user_role = data.get("user_role", "developer")
        user_id = data.get("user_id", "unknown")
        additional_context = data.get("additional_context")

        if not question:
            return jsonify({"error": "question is required"}), 400
        if not project_id:
            return jsonify({"error": "project_id is required"}), 400

        # Ensure services are initialized
        model, error = _ensure_services_initialized()
        if error:
            return jsonify(error), 503

        # Generate SQL
        text_to_sql_service = get_text_to_sql_service()
        result = text_to_sql_service.generate_sql(
            question, project_id, user_role, user_id, additional_context
        )

        return jsonify(result)

    except Exception as e:
        logger.error(f"Text-to-SQL error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e),
            "sql": None,
            "explanation": None,
            "confidence": 0.0
        }), 500
