"""
Model API Routes.

Handles /api/model/* endpoints for model management.
"""

import os
import logging
import traceback
from datetime import datetime
from flask import request, jsonify

from . import model_bp
from service_state import get_state
from services.model_service import get_model_service

logger = logging.getLogger(__name__)


@model_bp.route("/api/model/current", methods=["GET"])
def get_current_model():
    """현재 사용 중인 모델 정보 조회"""
    try:
        state = get_state()
        model_path = state.current_model_path
        return jsonify({
            "currentModel": model_path,
            "status": "active" if state.is_model_loaded else "not_loaded",
            "timestamp": os.path.getmtime(model_path) if os.path.exists(model_path) else None
        })
    except Exception as e:
        logger.error(f"Error getting current model: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@model_bp.route("/api/model/change", methods=["PUT"])
def change_model():
    """모델 변경 API"""
    try:
        logger.info(f"Received model change request: {request.json}")

        data = request.json
        if not data:
            logger.error("Request body is empty or invalid")
            return jsonify({
                "status": "error",
                "error": "요청 데이터가 없거나 잘못되었습니다.",
                "message": "요청 데이터가 없거나 잘못되었습니다."
            }), 400

        new_model_path = data.get("modelPath", "")
        if not new_model_path:
            logger.error("modelPath is missing in request")
            return jsonify({
                "status": "error",
                "error": "모델 경로가 필요합니다.",
                "message": "모델 경로가 필요합니다."
            }), 400

        model_service = get_model_service()
        result = model_service.change_model(new_model_path)

        return jsonify(result)

    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "message": str(e)
        }), 400
    except FileNotFoundError as e:
        logger.error(f"Model file not found: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e),
            "message": str(e),
            "error_type": "FILE_NOT_FOUND"
        }), 404
    except RuntimeError as e:
        logger.error(f"Model load error: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e),
            "message": str(e),
            "error_type": "LOAD_ERROR"
        }), 500
    except Exception as e:
        logger.error(f"Error changing model: {e}", exc_info=True)
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "message": f"모델 변경 중 오류 발생: {str(e)}",
            "error_type": "UNKNOWN_ERROR",
            "traceback": error_trace if logger.level <= logging.DEBUG else None
        }), 500


@model_bp.route("/api/model/available", methods=["GET"])
def get_available_models():
    """사용 가능한 모델 목록 조회"""
    try:
        model_service = get_model_service()
        models = model_service.get_available_models()
        return jsonify({"models": models})

    except Exception as e:
        logger.error(f"Error listing models: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@model_bp.route("/api/model/lightweight", methods=["GET"])
def get_lightweight_model():
    """경량 모델 설정 조회"""
    try:
        state = get_state()
        model_path = state.lightweight_model_path
        model_name = os.path.basename(model_path) if model_path else ""
        model_exists = os.path.exists(model_path) if model_path else False

        return jsonify({
            "currentModel": model_path,
            "modelName": model_name,
            "exists": model_exists,
            "status": "active" if model_exists else "not_found",
            "category": "lightweight",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting lightweight model: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@model_bp.route("/api/model/lightweight", methods=["PUT"])
def change_lightweight_model():
    """경량 모델 변경"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "status": "error",
                "error": "Request body is required"
            }), 400

        model_path = data.get("modelPath", "").strip()
        if not model_path:
            return jsonify({
                "status": "error",
                "error": "modelPath is required"
            }), 400

        if not model_path.startswith("/"):
            model_path = os.path.join("./models", model_path)

        if not os.path.exists(model_path):
            return jsonify({
                "status": "error",
                "error": f"Model file not found: {model_path}"
            }), 404

        state = get_state()
        old_path = state.lightweight_model_path
        state.lightweight_model_path = model_path

        # Reset workflow via shared state to force reload with new model
        state.reset_two_track_workflow()

        logger.info(f"Lightweight model changed: {old_path} -> {model_path}")

        return jsonify({
            "status": "success",
            "currentModel": model_path,
            "previousModel": old_path,
            "category": "lightweight",
            "message": f"Lightweight model changed to {os.path.basename(model_path)}",
            "note": "Two-Track workflow will reload on next request",
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error changing lightweight model: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@model_bp.route("/api/model/medium", methods=["GET"])
def get_medium_model():
    """중형 모델 설정 조회"""
    try:
        state = get_state()
        model_path = state.medium_model_path
        model_name = os.path.basename(model_path) if model_path else ""
        model_exists = os.path.exists(model_path) if model_path else False

        return jsonify({
            "currentModel": model_path,
            "modelName": model_name,
            "exists": model_exists,
            "status": "active" if model_exists else "not_found",
            "category": "medium",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting medium model: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@model_bp.route("/api/model/medium", methods=["PUT"])
def change_medium_model():
    """중형 모델 변경"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "status": "error",
                "error": "Request body is required"
            }), 400

        model_path = data.get("modelPath", "").strip()
        if not model_path:
            return jsonify({
                "status": "error",
                "error": "modelPath is required"
            }), 400

        if not model_path.startswith("/"):
            model_path = os.path.join("./models", model_path)

        if not os.path.exists(model_path):
            return jsonify({
                "status": "error",
                "error": f"Model file not found: {model_path}"
            }), 404

        state = get_state()
        old_path = state.medium_model_path
        state.medium_model_path = model_path

        # Reset workflow via shared state to force reload with new model
        state.reset_two_track_workflow()

        logger.info(f"Medium model changed: {old_path} -> {model_path}")

        return jsonify({
            "status": "success",
            "currentModel": model_path,
            "previousModel": old_path,
            "category": "medium",
            "message": f"Medium model changed to {os.path.basename(model_path)}",
            "note": "Two-Track workflow will reload on next request",
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error changing medium model: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
