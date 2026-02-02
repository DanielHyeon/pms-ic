"""
OCR API Routes.

Handles /api/ocr/* endpoints for OCR engine management.
"""

import logging
from datetime import datetime
from flask import request, jsonify

from . import ocr_bp
from service_state import get_state

logger = logging.getLogger(__name__)

VALID_OCR_ENGINES = {"varco", "paddle", "tesseract", "pypdf"}

OCR_ENGINE_INFO = {
    "varco": {
        "name": "VARCO-VISION (고정밀)",
        "license": "CC-BY-NC-4.0",
        "commercial_use": False,
        "accuracy": "97%",
        "description": "Korean OCR with highest accuracy, non-commercial use only"
    },
    "paddle": {
        "name": "PaddleOCR (상업용)",
        "license": "Apache 2.0",
        "commercial_use": True,
        "accuracy": "88%",
        "description": "Korean OCR with good accuracy, commercial use allowed"
    },
    "tesseract": {
        "name": "Tesseract (경량)",
        "license": "Apache 2.0",
        "commercial_use": True,
        "accuracy": "75%",
        "description": "Lightweight OCR, good for simple documents"
    },
    "pypdf": {
        "name": "직접 추출 (OCR 없음)",
        "license": "MIT",
        "commercial_use": True,
        "accuracy": "-",
        "description": "Direct text extraction from native PDFs, no OCR processing"
    }
}


@ocr_bp.route("/api/ocr", methods=["GET"])
@ocr_bp.route("/api/ocr/current", methods=["GET"])
def get_current_ocr_engine():
    """현재 OCR 엔진 설정 조회"""
    try:
        state = get_state()
        current_engine = state.ocr_engine
        engine_info = OCR_ENGINE_INFO.get(current_engine, {})

        return jsonify({
            "ocrEngine": current_engine,
            "status": "active",
            "info": engine_info,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting current OCR engine: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@ocr_bp.route("/api/ocr", methods=["PUT"])
@ocr_bp.route("/api/ocr/change", methods=["PUT"])
def change_ocr_engine():
    """OCR 엔진 변경 API"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "status": "error",
                "error": "Request body is required"
            }), 400

        new_engine = data.get("ocrEngine", "").lower()

        if not new_engine:
            return jsonify({
                "status": "error",
                "error": "ocrEngine field is required"
            }), 400

        if new_engine not in VALID_OCR_ENGINES:
            return jsonify({
                "status": "error",
                "error": f"Invalid OCR engine: {new_engine}. Valid options: {list(VALID_OCR_ENGINES)}"
            }), 400

        state = get_state()
        old_engine = state.ocr_engine
        logger.info(f"Changing OCR engine from {old_engine} to {new_engine}")

        state.ocr_engine = new_engine

        engine_info = OCR_ENGINE_INFO.get(new_engine, {})

        return jsonify({
            "status": "success",
            "ocrEngine": new_engine,
            "previousEngine": old_engine,
            "info": engine_info,
            "message": f"OCR engine successfully changed to {new_engine}",
            "timestamp": datetime.now().isoformat()
        })

    except ValueError as e:
        logger.error(f"Invalid OCR engine: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error changing OCR engine: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@ocr_bp.route("/api/ocr/available", methods=["GET"])
def get_available_ocr_engines():
    """사용 가능한 OCR 엔진 목록 조회"""
    try:
        state = get_state()
        engines = []
        current_engine = state.ocr_engine

        for engine_id, info in OCR_ENGINE_INFO.items():
            engines.append({
                "id": engine_id,
                "name": info["name"],
                "license": info["license"],
                "commercial_use": info["commercial_use"],
                "accuracy": info["accuracy"],
                "description": info["description"],
                "is_current": engine_id == current_engine
            })

        return jsonify({
            "engines": engines,
            "current": current_engine
        })
    except Exception as e:
        logger.error(f"Error listing OCR engines: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
