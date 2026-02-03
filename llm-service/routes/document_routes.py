"""
Document API Routes.

Handles /api/documents/* endpoints for RAG document management.
"""

import logging
from flask import request, jsonify

from . import document_bp
from services.model_service import get_model_service

logger = logging.getLogger(__name__)


@document_bp.route("/api/documents", methods=["POST"])
def add_documents():
    """문서 추가 API (RAG 인덱싱)"""
    try:
        data = request.json
        documents = data.get("documents", [])

        if not documents:
            return jsonify({"error": "Documents are required"}), 400

        model_service = get_model_service()
        _, rag, _ = model_service.load_model()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        success_count = rag.add_documents(documents)

        return jsonify({
            "message": f"Successfully added {success_count}/{len(documents)} documents",
            "success_count": success_count,
            "total": len(documents)
        })

    except Exception as e:
        logger.error(f"Error adding documents: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@document_bp.route("/api/documents/<doc_id>", methods=["GET"])
def get_document(doc_id):
    """
    Get document by ID.

    Returns document metadata including:
    - doc_id, title, file_type, file_path
    - project_id, access_level
    - status, approver, approved_at
    - chunk_count, category
    - exists: true

    Returns 404 if document not found.
    """
    try:
        model_service = get_model_service()
        _, rag, _ = model_service.load_model()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        doc = rag.get_document(doc_id)

        if doc:
            return jsonify(doc)
        else:
            return jsonify({
                "error": f"Document {doc_id} not found",
                "exists": False
            }), 404

    except Exception as e:
        logger.error(f"Error getting document: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@document_bp.route("/api/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """문서 삭제 API"""
    try:
        model_service = get_model_service()
        _, rag, _ = model_service.load_model()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        success = rag.delete_document(doc_id)

        if success:
            return jsonify({"message": f"Document {doc_id} deleted successfully"})
        else:
            return jsonify({"error": f"Failed to delete document {doc_id}"}), 404

    except Exception as e:
        logger.error(f"Error deleting document: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@document_bp.route("/api/documents/<doc_id>/metadata", methods=["PATCH"])
def update_document_metadata(doc_id):
    """
    Update document metadata without re-indexing.

    Request body (all fields optional):
    {
        "status": "APPROVED",
        "approver": "user-123",
        "approved_at": "2026-01-31T10:00:00",
        "access_level": 3,
        "title": "Updated Title"
    }

    Allowed fields:
    - status, approver, approved_at, access_level
    - title, file_path, file_type, project_id
    - uploaded_by_user_id, uploaded_by_role, category
    """
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        model_service = get_model_service()
        _, rag, _ = model_service.load_model()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        success = rag.update_document_metadata(doc_id, data)

        if success:
            return jsonify({
                "message": f"Document {doc_id} metadata updated successfully",
                "updated_fields": list(data.keys())
            })
        else:
            return jsonify({"error": f"Failed to update document {doc_id}"}), 404

    except Exception as e:
        logger.error(f"Error updating document metadata: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@document_bp.route("/api/documents/stats", methods=["GET"])
def get_stats():
    """컬렉션 통계 조회"""
    try:
        model_service = get_model_service()
        _, rag, _ = model_service.load_model()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        stats = rag.get_collection_stats()
        return jsonify(stats)

    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@document_bp.route("/api/documents/search", methods=["POST"])
def search_documents():
    """
    문서 검색 API with access control.

    Request body:
    {
        "query": "search query",
        "top_k": 3,
        "project_id": "project-123",
        "user_role": "DEVELOPER",
        "user_access_level": 1
    }
    """
    try:
        data = request.json
        query = data.get("query", "")
        top_k = data.get("top_k", 3)

        project_id = data.get("project_id")
        user_role = data.get("user_role", "MEMBER")
        user_access_level = data.get("user_access_level")

        if user_access_level is None:
            from services.rag_service_neo4j import get_access_level
            user_access_level = get_access_level(user_role)

        if not query:
            return jsonify({"error": "Query is required"}), 400

        model_service = get_model_service()
        _, rag, _ = model_service.load_model()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        filter_metadata = {
            "project_id": project_id,
            "user_access_level": user_access_level,
        }

        results = rag.search(query, top_k=top_k, filter_metadata=filter_metadata)

        return jsonify({
            "query": query,
            "results": results,
            "count": len(results),
            "access_control": {
                "project_id": project_id,
                "user_role": user_role,
                "user_access_level": user_access_level
            }
        })

    except Exception as e:
        logger.error(f"Error searching documents: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
