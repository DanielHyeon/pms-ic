"""
Normalization Admin API routes.

Provides endpoints for managing typo candidates, shadow dictionary,
and normalization cache statistics.

Security: These endpoints should be protected by RBAC in production.
"""

import logging
from flask import jsonify, request

from routes import Blueprint

logger = logging.getLogger(__name__)

normalization_admin_bp = Blueprint('normalization_admin', __name__)


@normalization_admin_bp.route("/api/normalization/stats", methods=["GET"])
def normalization_stats():
    """Get normalization cache and collector statistics."""
    from services.normalization_cache import get_normalization_cache
    from services.typo_candidate_collector import get_candidate_collector

    cache_stats = get_normalization_cache().stats()
    collector_stats = get_candidate_collector().stats()

    return jsonify({
        "cache": cache_stats,
        "collector": collector_stats,
    })


@normalization_admin_bp.route("/api/normalization/candidates", methods=["GET"])
def list_candidates():
    """Get filtered typo correction candidates."""
    from services.typo_candidate_collector import get_candidate_collector

    min_count = request.args.get("min_count", 10, type=int)
    min_stability = request.args.get("min_stability", 0.9, type=float)

    collector = get_candidate_collector()
    candidates = collector.get_candidates(min_count, min_stability)

    return jsonify({
        "count": len(candidates),
        "candidates": [
            {
                "original_fp": c.original_fp,
                "corrected_fp": c.corrected_fp,
                "masked_original": c.masked_original,
                "masked_corrected": c.masked_corrected,
                "total_count": c.total_count,
                "stability": round(c.stability, 3),
                "top_intent": c.top_intent,
                "intent_stability": round(c.intent_stability, 3),
            }
            for c in candidates
        ],
    })


@normalization_admin_bp.route("/api/normalization/shadow-dict", methods=["GET"])
def get_shadow_dict():
    """Get current shadow dictionary entries."""
    from services.typo_candidate_collector import get_candidate_collector

    collector = get_candidate_collector()
    shadow = collector.shadow_dict

    return jsonify({
        "count": len(shadow),
        "entries": [
            {"original_fp": k, "corrected": v}
            for k, v in shadow.items()
        ],
    })


@normalization_admin_bp.route(
    "/api/normalization/shadow-dict/promote", methods=["POST"]
)
def promote_to_shadow():
    """Promote a candidate to shadow dictionary.

    Request body: {"original_fp": "...", "corrected_text": "..."}
    """
    from services.typo_candidate_collector import get_candidate_collector

    data = request.get_json(silent=True) or {}
    original_fp = data.get("original_fp")
    corrected_text = data.get("corrected_text")

    if not original_fp or not corrected_text:
        return jsonify({"error": "original_fp and corrected_text required"}), 400

    collector = get_candidate_collector()
    collector.promote_to_shadow(original_fp, corrected_text)

    logger.info(f"Admin: promoted to shadow dict: {original_fp}")

    return jsonify({"status": "promoted", "original_fp": original_fp})


# =============================================================================
# Phase 3: Threshold Auto-Tuning Endpoints
# =============================================================================

@normalization_admin_bp.route("/api/normalization/thresholds", methods=["GET"])
def get_thresholds():
    """Get current threshold configuration and tuner statistics."""
    from services.threshold_tuner import get_threshold_tuner

    tuner = get_threshold_tuner()
    return jsonify({
        "current_thresholds": tuner.get_current_thresholds(),
        "stats": tuner.stats(),
    })


@normalization_admin_bp.route(
    "/api/normalization/thresholds/recommendations", methods=["GET"]
)
def get_threshold_recommendations():
    """Get threshold recommendations based on accumulated signals."""
    from services.threshold_tuner import get_threshold_tuner

    tuner = get_threshold_tuner()
    recommendations = tuner.get_all_recommendations()

    return jsonify({
        "count": len(recommendations),
        "recommendations": [
            {
                "keyword_group": r.keyword_group,
                "current_threshold": r.current_threshold,
                "recommended_threshold": r.recommended_threshold,
                "sample_count": r.sample_count,
                "fp_proxy_count": r.fp_proxy_count,
                "fn_proxy_count": r.fn_proxy_count,
                "l3_call_count": r.l3_call_count,
                "total_cost": r.total_cost,
                "confidence": r.confidence,
                "reason": r.reason,
            }
            for r in recommendations
        ],
    })


@normalization_admin_bp.route(
    "/api/normalization/thresholds/override", methods=["POST"]
)
def apply_threshold_override():
    """Apply admin threshold override.

    Request body: {"keyword_group": "...", "threshold": 0.85}
    """
    from services.threshold_tuner import get_threshold_tuner

    data = request.get_json(silent=True) or {}
    keyword_group = data.get("keyword_group")
    threshold = data.get("threshold")

    if not keyword_group or threshold is None:
        return jsonify({"error": "keyword_group and threshold required"}), 400

    try:
        threshold = float(threshold)
    except (TypeError, ValueError):
        return jsonify({"error": "threshold must be a number"}), 400

    tuner = get_threshold_tuner()
    try:
        tuner.apply_override(keyword_group, threshold)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    logger.info(f"Admin: threshold override: {keyword_group} = {threshold}")

    return jsonify({
        "status": "applied",
        "keyword_group": keyword_group,
        "threshold": threshold,
    })
