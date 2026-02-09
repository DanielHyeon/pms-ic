"""
AI Briefing Routes.

POST /api/ai/briefing/generate - Generate LLM-enriched briefing from rule findings + metrics.
Called by Spring Boot AiLlmClient for background enrichment.
"""

import logging
from flask import request, jsonify

from . import briefing_bp
from workflows.g6_ai_briefing import run_briefing_workflow

logger = logging.getLogger(__name__)


@briefing_bp.route("/api/ai/briefing/generate", methods=["POST"])
def generate_briefing():
    """
    Generate AI-enriched briefing from rule findings + metrics.

    Request body:
    {
        "projectId": "...",
        "role": "PM",
        "scope": "current_sprint",
        "asOf": "2026-02-10T09:00:00+09:00",
        "rawMetrics": {"signals": [...], "healthStatus": "YELLOW", "insightCount": 3},
        "ruleFindings": [{"type": "DELAY", "severity": "HIGH", "title": "...", "confidence": 0.95}],
        "completeness": "FULL",
        "missingSignals": []
    }

    Response:
    {
        "success": true,
        "data": {
            "headline": "...",
            "body": "...",
            "generationMethod": "HYBRID"
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON body provided"}), 400

        project_id = data.get("projectId")
        role = data.get("role")

        if not project_id or not role:
            return jsonify({"success": False, "error": "projectId and role are required"}), 400

        logger.info(f"Generating briefing for project={project_id} role={role}")

        result = run_briefing_workflow(data)

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Briefing generation error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
