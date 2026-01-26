"""
WBS Routes - Critical Path and WBS Analysis endpoints.
"""

from flask import request, jsonify
import logging

from . import wbs_bp
from skills import CriticalPathAnalyzer

logger = logging.getLogger(__name__)


@wbs_bp.route("/api/wbs/critical-path", methods=["POST"])
def calculate_critical_path():
    """
    Calculate Critical Path for WBS items.

    Request Body:
    {
        "items": [
            {
                "id": "wbs-001",
                "name": "Task 1",
                "startDate": "2026-01-01",
                "endDate": "2026-01-05"
            }
        ],
        "dependencies": [
            {
                "predecessorId": "wbs-001",
                "successorId": "wbs-002"
            }
        ],
        "projectStartDate": "2026-01-01"  // optional
    }

    Response:
    {
        "success": true,
        "data": {
            "criticalPath": ["wbs-001", "wbs-003", "wbs-005"],
            "itemsWithFloat": {
                "wbs-001": {
                    "name": "Task 1",
                    "duration": 5,
                    "earlyStart": 0,
                    "earlyFinish": 5,
                    "lateStart": 0,
                    "lateFinish": 5,
                    "totalFloat": 0,
                    "freeFloat": 0,
                    "isCritical": true
                }
            },
            "projectDuration": 45
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body is required",
                "data": None,
            }), 400

        items = data.get("items", [])
        dependencies = data.get("dependencies", [])
        project_start_date = data.get("projectStartDate")

        if not items:
            return jsonify({
                "success": False,
                "error": "Items list is required",
                "data": None,
            }), 400

        analyzer = CriticalPathAnalyzer()
        result = analyzer.analyze(items, dependencies, project_start_date)

        if not result.get("success"):
            return jsonify(result), 400

        return jsonify(result)

    except Exception as e:
        logger.error(f"Critical path calculation error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e),
            "data": None,
        }), 500


@wbs_bp.route("/api/wbs/analyze-dependencies", methods=["POST"])
def analyze_dependencies():
    """
    Analyze WBS dependencies for issues (cycles, orphans, etc.).

    Request Body:
    {
        "items": [...],
        "dependencies": [...]
    }

    Response:
    {
        "success": true,
        "data": {
            "hasCycle": false,
            "cycle": null,
            "orphanItems": ["wbs-010"],
            "isolatedItems": ["wbs-015"],
            "dependencyStats": {
                "totalItems": 20,
                "itemsWithPredecessors": 15,
                "itemsWithSuccessors": 18,
                "maxDependencyDepth": 5
            }
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body is required",
                "data": None,
            }), 400

        items = data.get("items", [])
        dependencies = data.get("dependencies", [])

        # Build dependency maps
        predecessors = {}
        successors = {}
        item_ids = {item.get("id") for item in items if item.get("id")}

        for dep in dependencies:
            pred_id = dep.get("predecessorId")
            succ_id = dep.get("successorId")

            if pred_id and succ_id:
                if succ_id not in predecessors:
                    predecessors[succ_id] = []
                predecessors[succ_id].append(pred_id)

                if pred_id not in successors:
                    successors[pred_id] = []
                successors[pred_id].append(succ_id)

        # Find orphan items (items referenced in dependencies but not in items list)
        referenced_ids = set()
        for dep in dependencies:
            referenced_ids.add(dep.get("predecessorId"))
            referenced_ids.add(dep.get("successorId"))
        orphan_items = [id for id in referenced_ids if id and id not in item_ids]

        # Find isolated items (items with no dependencies)
        items_with_deps = set(predecessors.keys()) | set(successors.keys())
        isolated_items = [id for id in item_ids if id not in items_with_deps]

        # Check for cycle using critical path analyzer
        analyzer = CriticalPathAnalyzer()
        result = analyzer.analyze(items, dependencies)

        has_cycle = "cycle" in str(result.get("error", "")).lower()
        cycle = None
        if has_cycle and result.get("error"):
            # Extract cycle from error message
            error_msg = result.get("error", "")
            if "Cycle detected" in error_msg:
                cycle_part = error_msg.split(": ")[-1] if ": " in error_msg else None
                if cycle_part:
                    cycle = cycle_part.split(" -> ")

        return jsonify({
            "success": True,
            "data": {
                "hasCycle": has_cycle,
                "cycle": cycle,
                "orphanItems": orphan_items,
                "isolatedItems": isolated_items,
                "dependencyStats": {
                    "totalItems": len(item_ids),
                    "itemsWithPredecessors": len(predecessors),
                    "itemsWithSuccessors": len(successors),
                    "totalDependencies": len(dependencies),
                },
            },
        })

    except Exception as e:
        logger.error(f"Dependency analysis error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e),
            "data": None,
        }), 500
