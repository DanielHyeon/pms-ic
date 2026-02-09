"""
RFP Extraction Routes.

POST /api/rfp/extract - Extract structured requirements from RFP text via LLM.
POST /api/rfp/parse   - Parse raw RFP document text into structured chunks.

Called by Spring Boot RfpLlmClient for background extraction runs.
"""

import logging
import re
from flask import request, jsonify

from . import rfp_bp
from workflows.g7_rfp_extraction import run_rfp_extraction_workflow

logger = logging.getLogger(__name__)


@rfp_bp.route("/api/rfp/extract", methods=["POST"])
def extract_requirements():
    """
    Extract requirements from RFP text/chunks.

    Request body:
    {
        "project_id": "uuid",
        "rfp_id": "uuid",
        "run_id": "uuid",
        "text": "full RFP text or concatenated chunks",
        "origin_type": "EXTERNAL_RFP",
        "model_name": "gemma-3-12b",          // optional override
        "prompt_version": "v1.0",              // optional
        "generation_params": {                 // optional
            "temperature": 0.3,
            "top_p": 0.9,
            "max_tokens": 4000
        }
    }

    Response (success):
    {
        "success": true,
        "data": {
            "rfp_summary": { ... },
            "requirements": [ ... ],
            "stats": { ... }
        }
    }

    Response (error):
    {
        "success": false,
        "error": "..."
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON body provided"}), 400

        project_id = data.get("project_id")
        rfp_id = data.get("rfp_id")
        text = data.get("text")

        if not project_id:
            return jsonify({"success": False, "error": "project_id is required"}), 400
        if not rfp_id:
            return jsonify({"success": False, "error": "rfp_id is required"}), 400
        if not text or not text.strip():
            return jsonify({"success": False, "error": "text is required and must not be empty"}), 400

        logger.info(
            f"Extracting requirements: project={project_id}, rfp={rfp_id}, "
            f"text_len={len(text)}, origin={data.get('origin_type', 'EXTERNAL_RFP')}"
        )

        result = run_rfp_extraction_workflow(data)

        if result.get("error"):
            logger.warning(f"RFP extraction returned error: {result['error']}")
            return jsonify({
                "success": False,
                "error": result["error"],
                "data": {
                    "rfp_summary": result.get("rfp_summary", {}),
                    "requirements": result.get("requirements", []),
                    "stats": result.get("stats", {}),
                }
            }), 500

        return jsonify({
            "success": True,
            "data": {
                "rfp_summary": result.get("rfp_summary", {}),
                "requirements": result.get("requirements", []),
                "stats": result.get("stats", {}),
            }
        })

    except Exception as e:
        logger.error(f"RFP extraction endpoint error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@rfp_bp.route("/api/rfp/parse", methods=["POST"])
def parse_rfp_document():
    """
    Parse RFP document text into structured chunks.

    Splits raw text by section headings and paragraph boundaries
    for downstream processing (extraction, indexing, etc.).

    Request body:
    {
        "rfp_id": "uuid",
        "text": "full document text",
        "file_type": "pdf"        // pdf | docx | txt
    }

    Response:
    {
        "success": true,
        "data": {
            "chunks": [
                {
                    "chunk_id": "rfp-<rfp_id>-s1-p1",
                    "section": "1",
                    "heading": "...",
                    "text": "...",
                    "char_offset": 0,
                    "char_length": 512
                }
            ],
            "total_chunks": 15
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON body provided"}), 400

        rfp_id = data.get("rfp_id")
        text = data.get("text")
        file_type = data.get("file_type", "pdf")

        if not rfp_id:
            return jsonify({"success": False, "error": "rfp_id is required"}), 400
        if not text or not text.strip():
            return jsonify({"success": False, "error": "text is required and must not be empty"}), 400

        logger.info(f"Parsing RFP document: rfp={rfp_id}, file_type={file_type}, text_len={len(text)}")

        chunks = _split_into_chunks(rfp_id, text)

        return jsonify({
            "success": True,
            "data": {
                "chunks": chunks,
                "total_chunks": len(chunks),
            }
        })

    except Exception as e:
        logger.error(f"RFP parse endpoint error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# Chunking Helpers
# =============================================================================

# Pattern for Korean/English section headings:
#   "1. Introduction", "3.2.1 Requirements", "제1장", etc.
_SECTION_HEADING_RE = re.compile(
    r"^(\d+(?:\.\d+)*)\s*[.\s]\s*(.+)$",
    re.MULTILINE,
)

# Max characters per chunk (for downstream context-window safety)
_MAX_CHUNK_CHARS = 2000


def _split_into_chunks(rfp_id: str, text: str) -> list:
    """
    Split document text into structured chunks.

    Strategy:
    1. Detect section headings (numbered) and split at those boundaries.
    2. Within each section, split by double-newline paragraph boundaries.
    3. Oversized paragraphs are further split at sentence boundaries.
    """
    sections = _split_by_sections(text)
    chunks = []

    for sec_idx, (section_num, heading, section_text) in enumerate(sections):
        paragraphs = _split_by_paragraphs(section_text)

        for para_idx, (para_text, char_offset_in_section) in enumerate(paragraphs):
            if not para_text.strip():
                continue

            chunk_id = f"rfp-{rfp_id}-s{sec_idx + 1}-p{para_idx + 1}"

            # Further split oversized paragraphs
            if len(para_text) > _MAX_CHUNK_CHARS:
                sub_chunks = _split_oversized(para_text, _MAX_CHUNK_CHARS)
                for sub_idx, sub_text in enumerate(sub_chunks):
                    chunks.append({
                        "chunk_id": f"{chunk_id}-sub{sub_idx + 1}",
                        "section": section_num,
                        "heading": heading,
                        "text": sub_text.strip(),
                        "char_offset": char_offset_in_section,
                        "char_length": len(sub_text.strip()),
                    })
            else:
                chunks.append({
                    "chunk_id": chunk_id,
                    "section": section_num,
                    "heading": heading,
                    "text": para_text.strip(),
                    "char_offset": char_offset_in_section,
                    "char_length": len(para_text.strip()),
                })

    # Fallback: if no sections detected, treat entire text as one chunk
    if not chunks:
        chunks.append({
            "chunk_id": f"rfp-{rfp_id}-s1-p1",
            "section": "1",
            "heading": "",
            "text": text.strip()[:_MAX_CHUNK_CHARS],
            "char_offset": 0,
            "char_length": min(len(text.strip()), _MAX_CHUNK_CHARS),
        })

    return chunks


def _split_by_sections(text: str) -> list:
    """
    Split text at section headings.

    Returns list of (section_number, heading_text, section_body).
    If no headings found, returns entire text as section "1".
    """
    matches = list(_SECTION_HEADING_RE.finditer(text))

    if not matches:
        return [("1", "", text)]

    sections = []
    for i, match in enumerate(matches):
        section_num = match.group(1)
        heading = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_body = text[start:end]
        sections.append((section_num, heading, section_body))

    # Include any text before the first heading as section "0"
    if matches[0].start() > 0:
        preamble = text[:matches[0].start()]
        if preamble.strip():
            sections.insert(0, ("0", "", preamble))

    return sections


def _split_by_paragraphs(text: str) -> list:
    """
    Split section text by double-newline boundaries.

    Returns list of (paragraph_text, char_offset_within_section).
    """
    paragraphs = []
    current_offset = 0

    parts = re.split(r"\n\s*\n", text)
    pos = 0

    for part in parts:
        # Find actual position of this part in the original text
        idx = text.find(part, pos)
        if idx == -1:
            idx = pos
        paragraphs.append((part, idx))
        pos = idx + len(part)

    return paragraphs


def _split_oversized(text: str, max_chars: int) -> list:
    """
    Split oversized text at sentence boundaries (. or newline).

    Falls back to hard split at max_chars if no sentence boundaries found.
    """
    if len(text) <= max_chars:
        return [text]

    chunks = []
    remaining = text

    while len(remaining) > max_chars:
        # Find last sentence boundary within max_chars
        split_at = -1
        for delim in [". ", ".\n", "\n"]:
            idx = remaining[:max_chars].rfind(delim)
            if idx > 0:
                split_at = idx + len(delim)
                break

        if split_at <= 0:
            # Hard split at max_chars
            split_at = max_chars

        chunks.append(remaining[:split_at])
        remaining = remaining[split_at:]

    if remaining.strip():
        chunks.append(remaining)

    return chunks
