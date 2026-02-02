"""
Monitoring API Routes.

Handles /api/monitoring/* endpoints for metrics and monitoring.
"""

import logging
from flask import request, jsonify

from . import monitoring_bp
from response_monitoring import get_monitor, get_monitoring_logger

logger = logging.getLogger(__name__)


@monitoring_bp.route("/api/monitoring/metrics", methods=["GET"])
def get_metrics():
    """
    조회 시간 범위 내의 응답 메트릭 통계

    Query params:
    - failure_type: 특정 실패 유형 필터링 (선택)
    """
    try:
        failure_type = request.args.get("failure_type", None)
        monitor = get_monitor()
        stats = monitor.get_stats(failure_type=failure_type)
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting metrics: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@monitoring_bp.route("/api/monitoring/critical-patterns", methods=["GET"])
def get_critical_patterns():
    """
    위험한 응답 패턴 감지

    Query params:
    - threshold: 실패율 임계값 (기본: 0.1 = 10%)
    """
    try:
        threshold = float(request.args.get("threshold", 0.1))
        monitor = get_monitor()
        patterns = monitor.get_critical_patterns(threshold=threshold)
        return jsonify({
            "threshold": threshold,
            "critical_patterns": patterns,
            "pattern_count": len(patterns)
        })
    except Exception as e:
        logger.error(f"Error getting critical patterns: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@monitoring_bp.route("/api/monitoring/logs", methods=["GET"])
def get_monitoring_logs():
    """
    모니터링 로그 조회

    Query params:
    - lines: 조회할 로그 라인 수 (기본: 50)
    """
    try:
        lines = int(request.args.get("lines", 50))
        mon_logger = get_monitoring_logger()
        log_content = mon_logger.get_log_tail(lines=lines)
        return jsonify({
            "lines": lines,
            "log": log_content
        })
    except Exception as e:
        logger.error(f"Error getting monitoring logs: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@monitoring_bp.route("/api/monitoring/export", methods=["POST"])
def export_metrics():
    """
    메트릭을 JSON 파일로 내보내기
    """
    try:
        export_path = request.json.get("export_path", "/tmp/gemma3_metrics_export.json")
        monitor = get_monitor()
        monitor.export_metrics(export_path)
        return jsonify({
            "message": "Metrics exported successfully",
            "export_path": export_path
        })
    except Exception as e:
        logger.error(f"Error exporting metrics: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@monitoring_bp.route("/api/monitoring/reset", methods=["POST"])
def reset_monitoring():
    """
    모니터 초기화 (개발/테스트용)
    """
    try:
        monitor = get_monitor()
        monitor.reset()
        return jsonify({"message": "Monitoring reset successfully"})
    except Exception as e:
        logger.error(f"Error resetting monitoring: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
