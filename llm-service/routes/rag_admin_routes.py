"""
RAG Admin API Routes.

Handles /api/admin/rag/* endpoints for RAG knowledge base management.
Allows administrators to load, list, and delete RAG documents.
"""

import logging
import os
import threading
from datetime import datetime
from pathlib import Path
from flask import request, jsonify

from . import rag_admin_bp
from services.model_service import get_model_service

logger = logging.getLogger(__name__)

# Track loading status
_loading_status = {
    "is_loading": False,
    "progress": 0,
    "total_files": 0,
    "current_file": None,
    "completed_files": [],
    "errors": [],
    "started_at": None,
    "completed_at": None,
}
_loading_lock = threading.Lock()


def _get_rag_service():
    """Get RAG service instance."""
    model_service = get_model_service()
    _, rag, _ = model_service.load_model()
    return rag


@rag_admin_bp.route("/api/admin/rag/documents", methods=["GET"])
def list_documents():
    """
    List all documents in the RAG knowledge base.

    Returns:
        List of documents with metadata (id, title, chunk_count, created_at)
    """
    try:
        rag = _get_rag_service()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        # Query Neo4j for all documents
        with rag.driver.session() as session:
            result = session.run("""
                MATCH (d:Document)
                OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
                WITH d, count(c) AS chunk_count
                RETURN
                    d.doc_id AS doc_id,
                    d.title AS title,
                    d.file_name AS file_name,
                    d.source AS source,
                    d.category AS category,
                    d.project_id AS project_id,
                    d.access_level AS access_level,
                    d.created_at AS created_at,
                    chunk_count
                ORDER BY d.created_at DESC
            """)

            documents = []
            for record in result:
                documents.append({
                    "doc_id": record["doc_id"],
                    "title": record["title"] or record["file_name"] or record["doc_id"],
                    "file_name": record["file_name"],
                    "source": record["source"],
                    "category": record["category"],
                    "project_id": record["project_id"],
                    "access_level": record["access_level"],
                    "created_at": record["created_at"],
                    "chunk_count": record["chunk_count"],
                })

        return jsonify({
            "documents": documents,
            "total": len(documents)
        })

    except Exception as e:
        logger.error(f"Error listing documents: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@rag_admin_bp.route("/api/admin/rag/stats", methods=["GET"])
def get_rag_stats():
    """
    Get RAG knowledge base statistics.
    """
    try:
        rag = _get_rag_service()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        with rag.driver.session() as session:
            # Get counts
            result = session.run("""
                MATCH (d:Document)
                OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
                WITH count(DISTINCT d) AS doc_count, count(c) AS chunk_count
                RETURN doc_count, chunk_count
            """)
            record = result.single()

            doc_count = record["doc_count"] if record else 0
            chunk_count = record["chunk_count"] if record else 0

            # Get categories
            cat_result = session.run("""
                MATCH (d:Document)
                RETURN d.category AS category, count(d) AS count
                ORDER BY count DESC
            """)
            categories = {r["category"]: r["count"] for r in cat_result}

        return jsonify({
            "document_count": doc_count,
            "chunk_count": chunk_count,
            "categories": categories,
            "loading_status": _loading_status
        })

    except Exception as e:
        logger.error(f"Error getting RAG stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@rag_admin_bp.route("/api/admin/rag/files", methods=["GET"])
def list_available_files():
    """
    List available PDF files in ragdata directory that can be loaded.
    """
    try:
        ragdata_dir = os.getenv("RAGDATA_DIR", "/app/ragdata")
        ragdata_path = Path(ragdata_dir)

        if not ragdata_path.exists():
            return jsonify({
                "files": [],
                "ragdata_dir": ragdata_dir,
                "error": "ragdata directory not found"
            })

        pdf_files = list(ragdata_path.glob("*.pdf"))

        files = []
        for pdf_file in pdf_files:
            file_size = pdf_file.stat().st_size
            files.append({
                "name": pdf_file.name,
                "size": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "path": str(pdf_file)
            })

        return jsonify({
            "files": files,
            "total": len(files),
            "ragdata_dir": ragdata_dir
        })

    except Exception as e:
        logger.error(f"Error listing files: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@rag_admin_bp.route("/api/admin/rag/load", methods=["POST"])
def load_documents():
    """
    Trigger loading of PDF files from ragdata directory.

    Request body (optional):
    {
        "files": ["file1.pdf", "file2.pdf"],  // specific files to load
        "clear_existing": false  // whether to clear existing data first
    }
    """
    global _loading_status

    try:
        with _loading_lock:
            if _loading_status["is_loading"]:
                return jsonify({
                    "error": "Loading already in progress",
                    "status": _loading_status
                }), 409

        data = request.json or {}
        specific_files = data.get("files", [])
        clear_existing = data.get("clear_existing", False)

        # Start loading in background thread
        thread = threading.Thread(
            target=_load_documents_async,
            args=(specific_files, clear_existing)
        )
        thread.daemon = True
        thread.start()

        return jsonify({
            "message": "Loading started",
            "clear_existing": clear_existing,
            "specific_files": specific_files if specific_files else "all"
        })

    except Exception as e:
        logger.error(f"Error starting document load: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


def _load_documents_async(specific_files, clear_existing):
    """Background task to load documents."""
    global _loading_status

    try:
        with _loading_lock:
            _loading_status = {
                "is_loading": True,
                "progress": 0,
                "total_files": 0,
                "current_file": None,
                "completed_files": [],
                "errors": [],
                "started_at": datetime.utcnow().isoformat(),
                "completed_at": None,
            }

        rag = _get_rag_service()
        if not rag:
            _loading_status["errors"].append("RAG service not available")
            _loading_status["is_loading"] = False
            return

        ragdata_dir = os.getenv("RAGDATA_DIR", "/app/ragdata")
        ragdata_path = Path(ragdata_dir)

        if not ragdata_path.exists():
            _loading_status["errors"].append(f"ragdata directory not found: {ragdata_dir}")
            _loading_status["is_loading"] = False
            return

        # Get files to process
        if specific_files:
            pdf_files = [ragdata_path / f for f in specific_files if (ragdata_path / f).exists()]
        else:
            pdf_files = list(ragdata_path.glob("*.pdf"))

        _loading_status["total_files"] = len(pdf_files)

        if not pdf_files:
            _loading_status["errors"].append("No PDF files found")
            _loading_status["is_loading"] = False
            return

        # Clear existing if requested
        if clear_existing:
            logger.info("Clearing existing RAG data...")
            with rag.driver.session() as session:
                session.run("MATCH (n) DETACH DELETE n")
            rag._ensure_indexes()

        # Import PDF processing
        from pdf_ocr_pipeline import extract_text_from_pdf

        # Process each file
        for i, pdf_file in enumerate(pdf_files, 1):
            try:
                _loading_status["current_file"] = pdf_file.name
                _loading_status["progress"] = int((i - 1) / len(pdf_files) * 100)

                logger.info(f"[{i}/{len(pdf_files)}] Processing: {pdf_file.name}")

                # Extract text
                text = extract_text_from_pdf(str(pdf_file))

                if not text or len(text.strip()) < 100:
                    _loading_status["errors"].append(f"{pdf_file.name}: Text too short or empty")
                    continue

                # Create document
                doc_id = f"ragdata_{pdf_file.stem}"
                created_at = datetime.utcnow().isoformat() + "Z"

                document = {
                    "id": doc_id,
                    "content": text,
                    "metadata": {
                        "file_name": pdf_file.name,
                        "file_path": str(pdf_file),
                        "file_type": "pdf",
                        "source": "ragdata",
                        "category": "reference_document",
                        "created_at": created_at,
                    },
                }

                # Add to RAG
                rag.add_documents([document])
                _loading_status["completed_files"].append(pdf_file.name)

            except Exception as e:
                error_msg = f"{pdf_file.name}: {str(e)}"
                logger.error(f"Error processing {pdf_file.name}: {e}", exc_info=True)
                _loading_status["errors"].append(error_msg)

        _loading_status["progress"] = 100
        _loading_status["current_file"] = None
        _loading_status["completed_at"] = datetime.utcnow().isoformat()
        _loading_status["is_loading"] = False

        logger.info(f"Loading completed: {len(_loading_status['completed_files'])}/{len(pdf_files)} files")

    except Exception as e:
        logger.error(f"Error in async document loading: {e}", exc_info=True)
        _loading_status["errors"].append(str(e))
        _loading_status["is_loading"] = False


@rag_admin_bp.route("/api/admin/rag/load/status", methods=["GET"])
def get_loading_status():
    """Get current loading status."""
    return jsonify(_loading_status)


@rag_admin_bp.route("/api/admin/rag/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """
    Delete a specific document from RAG knowledge base.
    """
    try:
        rag = _get_rag_service()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        # Delete document and its chunks
        with rag.driver.session() as session:
            result = session.run("""
                MATCH (d:Document {doc_id: $doc_id})
                OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
                WITH d, collect(c) AS chunks, d.doc_id AS deleted_id
                DETACH DELETE d
                FOREACH (c IN chunks | DELETE c)
                RETURN deleted_id
            """, doc_id=doc_id)

            record = result.single()
            if record and record["deleted_id"]:
                return jsonify({
                    "message": f"Document '{doc_id}' deleted successfully",
                    "doc_id": doc_id
                })
            else:
                return jsonify({"error": f"Document '{doc_id}' not found"}), 404

    except Exception as e:
        logger.error(f"Error deleting document: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@rag_admin_bp.route("/api/admin/rag/documents", methods=["DELETE"])
def clear_all_documents():
    """
    Clear all documents from RAG knowledge base.
    """
    try:
        data = request.json or {}
        confirm = data.get("confirm", False)

        if not confirm:
            return jsonify({
                "error": "Confirmation required. Send {\"confirm\": true} to proceed."
            }), 400

        rag = _get_rag_service()
        if not rag:
            return jsonify({"error": "RAG service not available"}), 503

        # Get count before deletion
        with rag.driver.session() as session:
            result = session.run("MATCH (d:Document) RETURN count(d) AS count")
            doc_count = result.single()["count"]

            # Delete all
            session.run("MATCH (n) DETACH DELETE n")

        # Recreate indexes
        rag._ensure_indexes()

        return jsonify({
            "message": f"Cleared {doc_count} documents from RAG knowledge base",
            "deleted_count": doc_count
        })

    except Exception as e:
        logger.error(f"Error clearing documents: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
