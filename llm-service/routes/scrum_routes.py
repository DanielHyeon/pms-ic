"""
Scrum Workflow API Routes.

Handles /api/scrum/* endpoints for scrum workflow management.
"""

import logging
from dataclasses import asdict
from flask import request, jsonify

from . import scrum_bp

logger = logging.getLogger(__name__)

# Scrum workflow service (lazy loading)
_scrum_workflow_service = None


def get_scrum_service():
    """Get or initialize Scrum Workflow Service (lazy loading)"""
    global _scrum_workflow_service
    if _scrum_workflow_service is None:
        try:
            from scrum_workflow_service import ScrumWorkflowService
            _scrum_workflow_service = ScrumWorkflowService()
            logger.info("Scrum Workflow Service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Scrum Workflow Service: {e}")
            raise
    return _scrum_workflow_service


@scrum_bp.route("/api/scrum/lineage/<requirement_id>", methods=["GET"])
def get_requirement_lineage(requirement_id):
    """
    Get complete lineage for a requirement.

    Returns: Requirement -> Stories -> Tasks hierarchy
    """
    try:
        service = get_scrum_service()
        lineage = service.get_requirement_lineage(requirement_id)

        if lineage is None:
            return jsonify({"error": "Requirement not found"}), 404

        return jsonify(asdict(lineage))

    except Exception as e:
        logger.error(f"Error getting lineage: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@scrum_bp.route("/api/scrum/impact/<requirement_id>", methods=["GET"])
def get_requirement_impact(requirement_id):
    """
    Get impact analysis for a requirement change.

    Returns: Affected stories, tasks, sprints, and risk level
    """
    try:
        service = get_scrum_service()
        impact = service.get_requirement_impact_analysis(requirement_id)

        if "error" in impact:
            return jsonify(impact), 404

        return jsonify(impact)

    except Exception as e:
        logger.error(f"Error getting impact analysis: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@scrum_bp.route("/api/scrum/sprint/<sprint_id>/workflow", methods=["GET"])
def get_sprint_workflow(sprint_id):
    """
    Get complete sprint workflow state.

    Returns: Sprint with stories, requirements covered, and progress
    """
    try:
        service = get_scrum_service()
        workflow = service.get_sprint_workflow(sprint_id)

        if workflow is None:
            return jsonify({"error": "Sprint not found"}), 404

        return jsonify(asdict(workflow))

    except Exception as e:
        logger.error(f"Error getting sprint workflow: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@scrum_bp.route("/api/scrum/link/requirement-story", methods=["POST"])
def link_requirement_to_story():
    """
    Link a requirement to a user story.

    Body: {"requirement_id": "...", "story_id": "..."}
    """
    try:
        data = request.json
        requirement_id = data.get("requirement_id")
        story_id = data.get("story_id")

        if not requirement_id or not story_id:
            return jsonify({"error": "requirement_id and story_id are required"}), 400

        service = get_scrum_service()
        success = service.link_requirement_to_story(requirement_id, story_id)

        if success:
            return jsonify({
                "message": "Requirement linked to story successfully",
                "requirement_id": requirement_id,
                "story_id": story_id
            })
        else:
            return jsonify({"error": "Failed to link requirement to story"}), 500

    except Exception as e:
        logger.error(f"Error linking requirement to story: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@scrum_bp.route("/api/scrum/link/story-task", methods=["POST"])
def link_story_to_task():
    """
    Link a user story to a task.

    Body: {"story_id": "...", "task_id": "..."}
    """
    try:
        data = request.json
        story_id = data.get("story_id")
        task_id = data.get("task_id")

        if not story_id or not task_id:
            return jsonify({"error": "story_id and task_id are required"}), 400

        service = get_scrum_service()
        success = service.link_story_to_task(story_id, task_id)

        if success:
            return jsonify({
                "message": "Story linked to task successfully",
                "story_id": story_id,
                "task_id": task_id
            })
        else:
            return jsonify({"error": "Failed to link story to task"}), 500

    except Exception as e:
        logger.error(f"Error linking story to task: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@scrum_bp.route("/api/scrum/sync", methods=["POST"])
def sync_scrum_metadata():
    """
    Sync project scrum metadata to OpenMetadata.

    Body: {"project_id": "..."}
    """
    try:
        data = request.json
        project_id = data.get("project_id")

        if not project_id:
            return jsonify({"error": "project_id is required"}), 400

        service = get_scrum_service()
        service.full_sync(project_id)

        return jsonify({
            "message": f"Scrum metadata synced successfully for project {project_id}",
            "project_id": project_id
        })

    except Exception as e:
        logger.error(f"Error syncing scrum metadata: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@scrum_bp.route("/api/scrum/glossary/sync", methods=["POST"])
def sync_business_glossary():
    """
    Sync PMS business glossary to OpenMetadata.
    """
    try:
        service = get_scrum_service()
        success = service.sync_business_glossary()

        if success:
            return jsonify({"message": "Business glossary synced successfully"})
        else:
            return jsonify({"error": "Failed to sync business glossary"}), 500

    except Exception as e:
        logger.error(f"Error syncing glossary: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
