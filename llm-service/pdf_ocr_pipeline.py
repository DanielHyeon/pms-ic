"""
PDF OCR pipeline with multiple OCR engine support.

Includes:
- PDF type classification (Native vs Scanned vs Mixed)
- Smart Model Routing based on document complexity
- VARCO-VISION OCR (primary, high quality Korean OCR)
- PaddleOCR integration (fallback)
- Tesseract OCR (fallback)
"""

import base64
import io
import logging
import os
import re
import shlex
import subprocess
import tempfile
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional

from pdf2image import convert_from_path
from pypdf import PdfReader
from PIL import Image

try:
    import fitz  # PyMuPDF for advanced PDF analysis
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

# VARCO-VISION model singleton
_varco_model = None
_varco_processor = None

# PaddleOCR model singleton
_paddle_ocr = None
_paddle_structure = None

logger = logging.getLogger(__name__)


# =============================================================================
# PDF Type Classification (Section 4.3 of optimization document)
# =============================================================================

class PDFType(Enum):
    """PDF document type classification."""
    NATIVE = "native"    # Text-based PDF (no OCR needed)
    SCANNED = "scanned"  # Image-based PDF (OCR required)
    MIXED = "mixed"      # Hybrid document


def classify_pdf(pdf_path: str) -> PDFType:
    """
    Classify PDF type: Native vs Scanned vs Mixed.

    This helps optimize processing by:
    - Native: Use direct text extraction (faster, no OCR)
    - Scanned: Use OCR pipeline
    - Mixed: Use hybrid approach

    Args:
        pdf_path: Path to PDF file

    Returns:
        PDFType enum value
    """
    if HAS_PYMUPDF:
        return _classify_pdf_pymupdf(pdf_path)
    else:
        return _classify_pdf_pypdf(pdf_path)


def _classify_pdf_pymupdf(pdf_path: str) -> PDFType:
    """Classify PDF using PyMuPDF (more accurate)."""
    try:
        doc = fitz.open(pdf_path)
        text_pages = 0

        for page in doc:
            text = page.get_text()
            if len(text.strip()) > 100:
                text_pages += 1

        text_ratio = text_pages / len(doc) if len(doc) > 0 else 0
        doc.close()

        if text_ratio > 0.8:
            return PDFType.NATIVE
        elif text_ratio < 0.2:
            return PDFType.SCANNED
        else:
            return PDFType.MIXED

    except Exception as e:
        logger.warning("PyMuPDF classification failed: %s", e)
        return PDFType.MIXED


def _classify_pdf_pypdf(pdf_path: str) -> PDFType:
    """Fallback classification using pypdf."""
    try:
        reader = PdfReader(pdf_path)
        text_pages = 0

        for page in reader.pages:
            text = page.extract_text()
            if text and len(text.strip()) > 100:
                text_pages += 1

        text_ratio = text_pages / len(reader.pages) if len(reader.pages) > 0 else 0

        if text_ratio > 0.8:
            return PDFType.NATIVE
        elif text_ratio < 0.2:
            return PDFType.SCANNED
        else:
            return PDFType.MIXED

    except Exception as e:
        logger.warning("pypdf classification failed: %s", e)
        return PDFType.MIXED


# =============================================================================
# Smart Model Routing (Section 5.3 of optimization document)
# =============================================================================

class DocumentComplexity(Enum):
    """Document complexity level for model selection."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class DocumentAnalysis:
    """Analysis result for smart model routing."""
    complexity: DocumentComplexity
    has_tables: bool
    has_formulas: bool
    has_images: bool
    page_count: int
    pdf_type: PDFType
    recommended_backend: str
    recommended_config: Dict


class SmartModelRouter:
    """
    Document complexity analysis for optimal OCR configuration.

    Analyzes PDF structure and recommends:
    - OCR method selection based on document type
    - Configuration optimizations
    """

    def __init__(self, sample_pages: int = 2):
        self.sample_pages = sample_pages

    def analyze_document(self, pdf_path: str) -> DocumentAnalysis:
        """
        Analyze document and recommend optimal OCR configuration.

        Args:
            pdf_path: Path to PDF file

        Returns:
            DocumentAnalysis with recommendations
        """
        pdf_type = classify_pdf(pdf_path)

        if HAS_PYMUPDF:
            metrics = self._analyze_with_pymupdf(pdf_path)
        else:
            metrics = self._analyze_basic(pdf_path)

        complexity = self._calculate_complexity(metrics)
        recommendation = self._get_recommendation(complexity, metrics, pdf_type)

        return DocumentAnalysis(
            complexity=complexity,
            has_tables=metrics.get('table_indicators', 0) > 5,
            has_formulas=metrics.get('formula_indicators', 0) > 3,
            has_images=metrics.get('image_count', 0) > 2,
            page_count=metrics.get('page_count', 0),
            pdf_type=pdf_type,
            recommended_backend=recommendation['backend'],
            recommended_config=recommendation['config']
        )

    def _analyze_with_pymupdf(self, pdf_path: str) -> Dict:
        """Analyze PDF using PyMuPDF for detailed metrics."""
        try:
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            sample_indices = self._get_sample_indices(page_count)

            metrics = {
                'page_count': page_count,
                'text_density': 0,
                'image_count': 0,
                'table_indicators': 0,
                'formula_indicators': 0,
                'sample_count': len(sample_indices)
            }

            for idx in sample_indices:
                page = doc[idx]

                # Text density
                text = page.get_text()
                metrics['text_density'] += len(text)

                # Image count
                images = page.get_images()
                metrics['image_count'] += len(images)

                # Table indicators (horizontal lines, grid patterns)
                drawings = page.get_drawings()
                horizontal_lines = sum(1 for d in drawings
                                      if self._is_horizontal_line(d))
                metrics['table_indicators'] += horizontal_lines

                # Formula indicators (special fonts, symbols)
                blocks = page.get_text("dict").get("blocks", [])
                for block in blocks:
                    if "lines" in block:
                        for line in block["lines"]:
                            for span in line.get("spans", []):
                                if self._has_math_font(span):
                                    metrics['formula_indicators'] += 1

            doc.close()
            return metrics

        except Exception as e:
            logger.warning("PyMuPDF analysis failed: %s", e)
            return self._analyze_basic(pdf_path)

    def _analyze_basic(self, pdf_path: str) -> Dict:
        """Basic analysis fallback using pypdf."""
        try:
            reader = PdfReader(pdf_path)
            page_count = len(reader.pages)

            return {
                'page_count': page_count,
                'text_density': sum(
                    len(p.extract_text() or '')
                    for p in reader.pages[:min(3, page_count)]
                ),
                'image_count': 0,
                'table_indicators': 0,
                'formula_indicators': 0,
                'sample_count': min(3, page_count)
            }
        except Exception as e:
            logger.warning("Basic analysis failed: %s", e)
            return {
                'page_count': 0,
                'text_density': 0,
                'image_count': 0,
                'table_indicators': 0,
                'formula_indicators': 0,
                'sample_count': 0
            }

    def _get_sample_indices(self, page_count: int) -> List[int]:
        """Determine sample page indices for analysis."""
        if page_count <= 2:
            return list(range(page_count))
        mid = page_count // 2
        return [mid - 1, mid] if page_count > 2 else [mid]

    def _is_horizontal_line(self, drawing: Dict) -> bool:
        """Check if drawing is a horizontal line (table indicator)."""
        return drawing.get('type') == 'l'

    def _has_math_font(self, span: Dict) -> bool:
        """Check if span uses mathematical font."""
        math_fonts = ['Symbol', 'MT Extra', 'Cambria Math', 'CMSY', 'CMMI']
        font = span.get('font', '')
        return any(mf.lower() in font.lower() for mf in math_fonts)

    def _calculate_complexity(self, metrics: Dict) -> DocumentComplexity:
        """Calculate document complexity from metrics."""
        sample_count = max(metrics.get('sample_count', 1), 1)

        avg_tables = metrics.get('table_indicators', 0) / sample_count
        avg_formulas = metrics.get('formula_indicators', 0) / sample_count
        avg_images = metrics.get('image_count', 0) / sample_count

        score = avg_tables * 2 + avg_formulas * 3 + avg_images * 1.5

        if score > 15:
            return DocumentComplexity.HIGH
        elif score > 5:
            return DocumentComplexity.MEDIUM
        else:
            return DocumentComplexity.LOW

    def _get_recommendation(
        self,
        complexity: DocumentComplexity,
        metrics: Dict,
        pdf_type: PDFType
    ) -> Dict:
        """Get recommended OCR configuration based on analysis."""

        has_formulas = metrics.get('formula_indicators', 0) > 0
        has_tables = metrics.get('table_indicators', 0) > 0

        if complexity == DocumentComplexity.LOW:
            return {
                'backend': 'pipeline',
                'config': {
                    'layout-config': {'model': 'doclayout_yolo'},
                    'formula-config': {'enable': has_formulas},
                    'table-config': {
                        'model': 'rapid_table',
                        'enable': has_tables,
                        'max_time': 100
                    }
                }
            }

        elif complexity == DocumentComplexity.MEDIUM:
            return {
                'backend': 'hybrid-auto-engine',
                'config': {
                    'layout-config': {'model': 'doclayout_yolo'},
                    'formula-config': {'enable': True},
                    'table-config': {
                        'model': 'rapid_table',
                        'enable': True,
                        'max_time': 200
                    }
                }
            }

        else:  # HIGH complexity
            return {
                'backend': 'vlm-vllm' if pdf_type == PDFType.SCANNED else 'hybrid-auto-engine',
                'config': {
                    'layout-config': {'model': 'doclayout_yolo'},
                    'formula-config': {
                        'enable': True,
                        'mfr_model': 'unimernet_small'
                    },
                    'table-config': {
                        'model': 'rapid_table',
                        'sub_model': 'slanet_plus',
                        'enable': True,
                        'max_time': 400
                    }
                }
            }


# Global router instance
_smart_router: Optional[SmartModelRouter] = None


def get_smart_router() -> SmartModelRouter:
    """Get or create the smart model router singleton."""
    global _smart_router
    if _smart_router is None:
        _smart_router = SmartModelRouter()
    return _smart_router


# =============================================================================
# Original PDF extraction functions (updated)
# =============================================================================


def _extract_text_pypdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    parts: List[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def _run_tesseract_ocr(image_path: str, lang: str) -> str:
    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("pytesseract is not installed") from exc

    return pytesseract.image_to_string(image_path, lang=lang).strip()


# =============================================================================
# VARCO-VISION OCR Engine
# =============================================================================

def _load_varco_model():
    """Load VARCO-VISION model (singleton pattern)."""
    global _varco_model, _varco_processor

    if _varco_model is not None:
        return _varco_model, _varco_processor

    try:
        import torch
        from transformers import AutoProcessor, LlavaOnevisionForConditionalGeneration

        model_path = os.getenv(
            "VARCO_MODEL_PATH",
            "./models/VARCO-VISION-2.0-1.7B-OCR"
        )

        # Check for local model first
        if not os.path.exists(model_path):
            model_path = "NCSOFT/VARCO-VISION-2.0-1.7B-OCR"
            logger.info("Using HuggingFace model: %s", model_path)
        else:
            logger.info("Using local model: %s", model_path)

        device = os.getenv("VARCO_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
        logger.info("Loading VARCO-VISION model on device: %s", device)

        _varco_model = LlavaOnevisionForConditionalGeneration.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            attn_implementation="sdpa" if device == "cuda" else None,
            device_map="auto" if device == "cuda" else None,
            local_files_only=os.path.exists(model_path),
        )

        if device == "cpu":
            _varco_model = _varco_model.to(device)

        _varco_processor = AutoProcessor.from_pretrained(
            model_path,
            local_files_only=os.path.exists(model_path),
        )

        logger.info("VARCO-VISION model loaded successfully")
        return _varco_model, _varco_processor

    except Exception as e:
        logger.error("Failed to load VARCO-VISION model: %s", e)
        raise


def _varco_ocr_single_image(image: Image.Image, max_tokens: int = 4096) -> str:
    """Process single image with VARCO-VISION OCR."""
    import torch
    import gc

    model, processor = _load_varco_model()

    # Resize image - use smaller size if memory constrained
    w, h = image.size
    target_size = int(os.getenv("VARCO_IMAGE_SIZE", "1536"))  # Reduced from 2304

    # Downscale large images to fit in memory
    max_dim = max(w, h)
    if max_dim > target_size:
        scaling_factor = target_size / max_dim
        new_w, new_h = int(w * scaling_factor), int(h * scaling_factor)
        image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        logger.debug("Downscaled image from %dx%d to %dx%d", w, h, new_w, new_h)
    elif max_dim < target_size * 0.7:
        # Only upscale if significantly smaller
        scaling_factor = target_size / max_dim
        new_w, new_h = int(w * scaling_factor), int(h * scaling_factor)
        image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": "<ocr>"},
            ],
        },
    ]

    try:
        inputs = processor.apply_chat_template(
            conversation,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt"
        ).to(model.device, model.dtype)

        with torch.inference_mode():
            generate_ids = model.generate(**inputs, max_new_tokens=max_tokens)

        generate_ids_trimmed = [
            out_ids[len(in_ids):]
            for in_ids, out_ids in zip(inputs.input_ids, generate_ids)
        ]
        output = processor.decode(generate_ids_trimmed[0], skip_special_tokens=False)

        # Extract plain text from VARCO output (remove bbox tags)
        text = re.sub(r'<bbox>[^<]*</bbox>', '', output)
        text = re.sub(r'<char>([^<]*)</char>', r'\1', text)
        text = re.sub(r'<[^>]+>', '', text)  # Remove any remaining tags

        return text.strip()

    finally:
        # Clean up GPU memory
        del inputs
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()


def _run_varco_ocr(file_path: str) -> str:
    """
    Extract text from PDF using VARCO-VISION OCR.

    Environment variables:
    - VARCO_MODEL_PATH: Path to local model or HuggingFace model ID
    - VARCO_DEVICE: cuda or cpu (default: auto-detect)
    - VARCO_IMAGE_SIZE: Target image size for OCR (default: 2304)
    - VARCO_MAX_TOKENS: Max tokens per page (default: 4096)
    - OCR_DPI: DPI for PDF to image conversion (default: 300)
    """
    ocr_dpi = int(os.getenv("OCR_DPI", "300"))
    max_tokens = int(os.getenv("VARCO_MAX_TOKENS", "4096"))

    logger.info("Converting PDF to images: %s", file_path)
    images = convert_from_path(file_path, dpi=ocr_dpi)

    if not images:
        logger.warning("No images extracted from PDF")
        return ""

    logger.info("Processing %d pages with VARCO-VISION OCR...", len(images))
    parts: List[str] = []

    for idx, image in enumerate(images, start=1):
        try:
            logger.info("  Processing page %d/%d", idx, len(images))
            page_text = _varco_ocr_single_image(image.convert("RGB"), max_tokens)
            if page_text:
                parts.append(f"=== Page {idx} ===\n{page_text}")
        except Exception as e:
            logger.error("  Error on page %d: %s", idx, e)
            parts.append(f"=== Page {idx} ===\n[OCR Error: {str(e)}]")

    return "\n\n".join(parts)


# =============================================================================
# PaddleOCR Engine (Apache 2.0 - Commercial Use Allowed)
# =============================================================================

def _get_paddle_model_paths() -> dict:
    """
    Get PaddleOCR model paths, checking for local models first.

    Local model directory structure (./models/paddleocr/):
        - det/          # Detection model (e.g., korean_PP-OCRv5_det)
        - rec/          # Recognition model (e.g., korean_PP-OCRv5_rec)
        - cls/          # Classification model (e.g., ch_ppocr_mobile_v2.0_cls)
        - table/        # Table recognition model
        - layout/       # Layout analysis model

    Returns dict with model directories or None for auto-download.
    """
    base_path = os.getenv("PADDLE_MODEL_PATH", "./models/paddleocr")

    # Check for local models
    det_path = os.getenv("PADDLE_DET_MODEL") or os.path.join(base_path, "det")
    rec_path = os.getenv("PADDLE_REC_MODEL") or os.path.join(base_path, "rec")
    cls_path = os.getenv("PADDLE_CLS_MODEL") or os.path.join(base_path, "cls")
    table_path = os.getenv("PADDLE_TABLE_MODEL") or os.path.join(base_path, "table")
    layout_path = os.getenv("PADDLE_LAYOUT_MODEL") or os.path.join(base_path, "layout")

    paths = {
        "det": det_path if os.path.exists(det_path) else None,
        "rec": rec_path if os.path.exists(rec_path) else None,
        "cls": cls_path if os.path.exists(cls_path) else None,
        "table": table_path if os.path.exists(table_path) else None,
        "layout": layout_path if os.path.exists(layout_path) else None,
    }

    # Log which models are local vs auto-download
    local_models = [k for k, v in paths.items() if v is not None]
    if local_models:
        logger.info("Using local PaddleOCR models: %s", local_models)
    else:
        logger.info("No local PaddleOCR models found, will auto-download")

    return paths


def _load_paddle_ocr():
    """Load PaddleOCR model (singleton pattern) with local model support."""
    global _paddle_ocr, _paddle_structure

    if _paddle_ocr is not None:
        return _paddle_ocr, _paddle_structure

    try:
        from paddleocr import PaddleOCR, PPStructure

        use_gpu = os.getenv("PADDLE_USE_GPU", "true").lower() == "true"
        lang = os.getenv("PADDLE_LANG", "korean")  # korean, en, ch, etc.
        use_structure = os.getenv("PADDLE_USE_STRUCTURE", "true").lower() == "true"

        # Get local model paths (if available)
        model_paths = _get_paddle_model_paths()
        has_local_models = any(v is not None for v in model_paths.values())

        logger.info("Loading PaddleOCR (lang=%s, gpu=%s, structure=%s, local=%s)",
                   lang, use_gpu, use_structure, has_local_models)

        # Initialize PaddleOCR with Korean model
        # Use local models if available, otherwise auto-download
        _paddle_ocr = PaddleOCR(
            use_angle_cls=True,  # Detect text orientation
            lang=lang,
            use_gpu=use_gpu,
            show_log=False,
            # Local model directories (None = auto-download)
            det_model_dir=model_paths["det"],
            rec_model_dir=model_paths["rec"],
            cls_model_dir=model_paths["cls"],
        )

        # Initialize PP-Structure for table/layout analysis (optional)
        if use_structure:
            try:
                _paddle_structure = PPStructure(
                    show_log=False,
                    use_gpu=use_gpu,
                    lang=lang,
                    table=True,  # Enable table recognition
                    ocr=True,
                    layout=True,  # Enable layout analysis
                    # Local model directories for structure
                    table_model_dir=model_paths["table"],
                    layout_model_dir=model_paths["layout"],
                )
                logger.info("PP-Structure loaded successfully")
            except Exception as e:
                logger.warning("PP-Structure failed to load: %s", e)
                _paddle_structure = None

        logger.info("PaddleOCR loaded successfully (local_models=%s)", has_local_models)
        return _paddle_ocr, _paddle_structure

    except ImportError as e:
        logger.error("PaddleOCR not installed. Install with: pip install paddleocr paddlepaddle")
        raise RuntimeError("PaddleOCR not installed") from e
    except Exception as e:
        logger.error("Failed to load PaddleOCR: %s", e)
        raise


def _paddle_ocr_single_image(image_path: str) -> str:
    """Process single image with PaddleOCR."""
    ocr, structure = _load_paddle_ocr()

    use_structure = os.getenv("PADDLE_USE_STRUCTURE", "true").lower() == "true"

    try:
        # If PP-Structure is enabled, use it for better table/layout handling
        if use_structure and structure is not None:
            result = structure(image_path)
            text_parts = []

            for item in result:
                item_type = item.get('type', 'text')

                if item_type == 'table':
                    # Extract table as text
                    table_html = item.get('res', {}).get('html', '')
                    if table_html:
                        # Convert HTML table to text representation
                        table_text = _html_table_to_text(table_html)
                        text_parts.append(f"[TABLE]\n{table_text}\n[/TABLE]")
                elif item_type == 'figure':
                    text_parts.append("[FIGURE]")
                else:
                    # Regular text region
                    res = item.get('res', [])
                    if isinstance(res, list):
                        for line in res:
                            if isinstance(line, dict) and 'text' in line:
                                text_parts.append(line['text'])
                            elif isinstance(line, (list, tuple)) and len(line) >= 2:
                                text_parts.append(str(line[1][0]) if isinstance(line[1], tuple) else str(line[1]))

            return '\n'.join(text_parts)

        else:
            # Simple OCR without structure analysis
            result = ocr.ocr(image_path, cls=True)

            if not result or not result[0]:
                return ""

            text_parts = []
            for line in result[0]:
                if line and len(line) >= 2:
                    text, confidence = line[1]
                    text_parts.append(text)

            return '\n'.join(text_parts)

    except Exception as e:
        logger.error("PaddleOCR error: %s", e)
        return ""


def _html_table_to_text(html: str) -> str:
    """Convert HTML table to plain text representation."""
    import re

    # Remove HTML tags but preserve structure
    text = re.sub(r'<tr[^>]*>', '', html)
    text = re.sub(r'</tr>', '\n', text)
    text = re.sub(r'<td[^>]*>', '', text)
    text = re.sub(r'</td>', '\t', text)
    text = re.sub(r'<th[^>]*>', '', text)
    text = re.sub(r'</th>', '\t', text)
    text = re.sub(r'<[^>]+>', '', text)  # Remove remaining tags
    text = re.sub(r'\t+', '\t', text)  # Collapse multiple tabs
    text = re.sub(r'\n+', '\n', text)  # Collapse multiple newlines

    return text.strip()


def _run_paddle_ocr(file_path: str) -> str:
    """
    Extract text from PDF using PaddleOCR.

    Environment variables:
    - PADDLE_USE_GPU: Enable GPU (default: true)
    - PADDLE_LANG: Language (default: korean)
    - PADDLE_USE_STRUCTURE: Use PP-Structure for table/layout (default: true)
    - PADDLE_DET_MODEL: Custom detection model path
    - PADDLE_REC_MODEL: Custom recognition model path
    - PADDLE_CLS_MODEL: Custom classification model path
    - OCR_DPI: DPI for PDF to image conversion (default: 300)
    """
    ocr_dpi = int(os.getenv("OCR_DPI", "300"))

    logger.info("Converting PDF to images: %s", file_path)
    images = convert_from_path(file_path, dpi=ocr_dpi)

    if not images:
        logger.warning("No images extracted from PDF")
        return ""

    logger.info("Processing %d pages with PaddleOCR...", len(images))
    parts: List[str] = []

    with tempfile.TemporaryDirectory() as tmpdir:
        for idx, image in enumerate(images, start=1):
            try:
                logger.info("  Processing page %d/%d", idx, len(images))

                # Save image temporarily
                image_path = os.path.join(tmpdir, f"page_{idx}.png")
                image.save(image_path, "PNG")

                page_text = _paddle_ocr_single_image(image_path)
                if page_text:
                    parts.append(f"=== Page {idx} ===\n{page_text}")

            except Exception as e:
                logger.error("  Error on page %d: %s", idx, e)
                parts.append(f"=== Page {idx} ===\n[OCR Error: {str(e)}]")

    return "\n\n".join(parts)


def extract_text_from_pdf_ocr(file_path: str) -> str:
    """
    Extract PDF text via image-based OCR pipeline.

    Environment variables:
      OCR_ENGINE: varco|paddle|tesseract|pypdf (default: varco)
        - varco: VARCO-VISION-2.0-1.7B-OCR (best Korean, CC-BY-NC-4.0 license)
        - paddle: PaddleOCR Korean + PP-Structure (Apache 2.0, commercial OK)
        - tesseract: Tesseract OCR
        - pypdf: Direct text extraction (no OCR)
      USE_OCR: true enables OCR pipeline
      OCR_DPI: DPI for image conversion (default: 300)
      OCR_LANG: Language for tesseract (default: kor+eng)

      VARCO settings:
        VARCO_MODEL_PATH: Path to VARCO model
        VARCO_DEVICE: cuda or cpu

      PaddleOCR settings:
        PADDLE_USE_GPU: Enable GPU (default: true)
        PADDLE_LANG: Language (default: korean)
        PADDLE_USE_STRUCTURE: Use PP-Structure for table/layout (default: true)
    """
    ocr_engine = os.getenv("OCR_ENGINE", "varco").lower()
    ocr_dpi = int(os.getenv("OCR_DPI", "300"))
    ocr_lang = os.getenv("OCR_LANG", "kor+eng")

    logger.info("Using OCR engine: %s", ocr_engine)

    # pypdf - direct text extraction (no OCR)
    if ocr_engine == "pypdf":
        return _extract_text_pypdf(file_path)

    # VARCO-VISION OCR (best Korean accuracy, non-commercial only)
    if ocr_engine == "varco":
        try:
            return _run_varco_ocr(file_path)
        except Exception as e:
            logger.error("VARCO OCR failed: %s, falling back to paddle", e)
            # Fallback to PaddleOCR
            try:
                return _run_paddle_ocr(file_path)
            except Exception as e2:
                logger.error("PaddleOCR fallback failed: %s", e2)
                return _extract_text_pypdf(file_path)

    # PaddleOCR Korean + PP-Structure (Apache 2.0, commercial use allowed)
    if ocr_engine == "paddle":
        try:
            return _run_paddle_ocr(file_path)
        except Exception as e:
            logger.error("PaddleOCR failed: %s, falling back to pypdf", e)
            return _extract_text_pypdf(file_path)

    # Tesseract OCR (per-image)
    if ocr_engine == "tesseract":
        images = convert_from_path(file_path, dpi=ocr_dpi)
        if not images:
            return ""

        parts: List[str] = []
        with tempfile.TemporaryDirectory() as tmpdir:
            for idx, image in enumerate(images, start=1):
                image_path = os.path.join(tmpdir, f"page_{idx}.png")
                image.save(image_path, "PNG")
                page_text = _run_tesseract_ocr(image_path, ocr_lang)
                if page_text:
                    parts.append(page_text)

        return "\n\n".join(parts)

    # Unknown engine - fallback to pypdf
    logger.warning(f"Unknown OCR engine: {ocr_engine}, falling back to pypdf")
    return _extract_text_pypdf(file_path)


def extract_text_from_pdf(file_path: str, auto_detect: bool = True) -> str:
    """
    Extract text from PDF with intelligent mode selection.

    Args:
        file_path: Path to PDF file
        auto_detect: If True, automatically detect PDF type and choose
                     optimal extraction method

    Behavior:
    - USE_OCR=true: Always use OCR pipeline
    - USE_OCR=false + auto_detect=True: Classify PDF and decide
    - USE_OCR=false + auto_detect=False: Use pypdf only

    Environment variables:
    - USE_OCR: Force OCR pipeline (true/false)
    - AUTO_DETECT_PDF_TYPE: Enable auto PDF type detection (true/false, default: true)
    """
    use_ocr = os.getenv("USE_OCR", "false").lower() == "true"
    enable_auto_detect = os.getenv("AUTO_DETECT_PDF_TYPE", "true").lower() == "true"

    # If OCR is explicitly enabled, use it
    if use_ocr:
        try:
            return extract_text_from_pdf_ocr(file_path)
        except Exception as exc:
            logger.error("OCR extraction failed: %s", exc, exc_info=True)
            return _extract_text_pypdf(file_path)

    # Auto-detect PDF type and decide extraction method
    if auto_detect and enable_auto_detect:
        try:
            pdf_type = classify_pdf(file_path)
            logger.info("PDF type detected: %s for %s", pdf_type.value, file_path)

            if pdf_type == PDFType.NATIVE:
                # Native PDF - direct text extraction is sufficient
                text = _extract_text_pypdf(file_path)
                if text and len(text.strip()) > 100:
                    return text
                # Fallback to OCR if text extraction yields poor results
                logger.info("Native PDF text too short, trying OCR...")

            elif pdf_type == PDFType.SCANNED:
                # Scanned PDF - OCR is required
                logger.info("Scanned PDF detected, using OCR pipeline...")
                try:
                    return extract_text_from_pdf_ocr(file_path)
                except Exception as exc:
                    logger.warning("OCR failed for scanned PDF: %s", exc)

            else:  # MIXED
                # Try text extraction first, then OCR if needed
                text = _extract_text_pypdf(file_path)
                if text and len(text.strip()) > 500:
                    return text
                logger.info("Mixed PDF: text extraction insufficient, trying OCR...")
                try:
                    return extract_text_from_pdf_ocr(file_path)
                except Exception as exc:
                    logger.warning("OCR failed for mixed PDF: %s", exc)
                    return text  # Return whatever we got from pypdf

        except Exception as exc:
            logger.warning("Auto-detection failed: %s, falling back to pypdf", exc)

    # Default: simple pypdf extraction
    return _extract_text_pypdf(file_path)


def analyze_pdf(file_path: str) -> Dict:
    """
    Analyze PDF and return comprehensive document analysis.

    Useful for debugging and understanding document characteristics.

    Args:
        file_path: Path to PDF file

    Returns:
        Dict with analysis results including:
        - pdf_type: native/scanned/mixed
        - complexity: low/medium/high
        - has_tables, has_formulas, has_images
        - recommended_backend, recommended_config
    """
    router = get_smart_router()
    analysis = router.analyze_document(file_path)

    return {
        'file_path': file_path,
        'pdf_type': analysis.pdf_type.value,
        'complexity': analysis.complexity.value,
        'page_count': analysis.page_count,
        'has_tables': analysis.has_tables,
        'has_formulas': analysis.has_formulas,
        'has_images': analysis.has_images,
        'recommended_backend': analysis.recommended_backend,
        'recommended_config': analysis.recommended_config
    }
