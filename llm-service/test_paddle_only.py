#!/usr/bin/env python3
"""
PaddleOCR Test Script

Tests PaddleOCR Korean OCR on a sample PDF.
Uses CPU to avoid GPU memory conflicts with LLM.
"""

import os
import sys
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_paddle_ocr(image_path: str, use_gpu: bool = True) -> dict:
    """Test PaddleOCR on a single image."""
    try:
        from paddleocr import PaddleOCR

        logger.info(f"Loading PaddleOCR (use_gpu={use_gpu})...")
        start_time = time.time()

        # PaddleOCR 2.x API
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang="korean",
            use_gpu=use_gpu,
            show_log=False,
        )

        load_time = time.time() - start_time
        logger.info(f"Model loaded in {load_time:.2f}s")

        logger.info("Running OCR...")
        start_time = time.time()
        # PaddleOCR 2.x uses ocr() method
        result = ocr.ocr(image_path, cls=True)
        ocr_time = time.time() - start_time
        logger.info(f"OCR completed in {ocr_time:.2f}s")

        # Extract text with confidence from PaddleOCR 2.x result format
        text_parts = []
        confidences = []

        # Result is list of pages, each page has list of lines
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text, confidence = line[1]
                    if text:
                        text_parts.append(text)
                        confidences.append(confidence)

        text = '\n'.join(text_parts)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0

        return {
            "engine": "PaddleOCR",
            "success": True,
            "text": text,
            "char_count": len(text),
            "line_count": len(text_parts),
            "avg_confidence": avg_conf,
            "load_time": load_time,
            "ocr_time": ocr_time,
            "total_time": load_time + ocr_time,
        }

    except Exception as e:
        logger.error(f"PaddleOCR error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "engine": "PaddleOCR",
            "success": False,
            "error": str(e),
        }


def convert_pdf_to_image(pdf_path: str, page_num: int = 0) -> str:
    """Convert PDF page to image for testing."""
    from pdf2image import convert_from_path
    import tempfile

    logger.info(f"Converting PDF page {page_num + 1} to image...")
    images = convert_from_path(pdf_path, dpi=300, first_page=page_num+1, last_page=page_num+1)

    if not images:
        raise ValueError(f"No images extracted from {pdf_path}")

    # Save to temp file
    temp_path = tempfile.mktemp(suffix=".png")
    images[0].save(temp_path, "PNG")
    logger.info(f"Image saved: {temp_path} ({images[0].size[0]}x{images[0].size[1]})")

    return temp_path


def main():
    # Find a test PDF
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        ragdata_dir = Path("./ragdata")
        pdf_files = list(ragdata_dir.glob("*.pdf")) if ragdata_dir.exists() else []
        if not pdf_files:
            logger.error("No PDF files found. Usage: python test_paddle_only.py <pdf_path>")
            return 1
        pdf_path = str(pdf_files[0])

    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        return 1

    logger.info("=" * 70)
    logger.info(f"PaddleOCR Test: {os.path.basename(pdf_path)}")
    logger.info("=" * 70)

    # Convert first page to image
    image_path = convert_pdf_to_image(pdf_path)

    # Test PaddleOCR with CPU (GPU has cuDNN issues with paddlepaddle-gpu 2.6.2)
    result = test_paddle_ocr(image_path, use_gpu=False)

    if result["success"]:
        logger.info("\n" + "=" * 70)
        logger.info("RESULTS")
        logger.info("=" * 70)
        logger.info(f"Load time: {result['load_time']:.2f}s")
        logger.info(f"OCR time: {result['ocr_time']:.2f}s")
        logger.info(f"Total time: {result['total_time']:.2f}s")
        logger.info(f"Characters: {result['char_count']}")
        logger.info(f"Lines: {result['line_count']}")
        logger.info(f"Avg Confidence: {result['avg_confidence']:.2%}")

        logger.info("\n" + "-" * 70)
        logger.info("EXTRACTED TEXT (first 2000 chars):")
        logger.info("-" * 70)
        print(result['text'][:2000])
        if len(result['text']) > 2000:
            print(f"\n... (truncated, total {result['char_count']} chars)")
    else:
        logger.error(f"OCR failed: {result['error']}")

    # Cleanup
    if os.path.exists(image_path):
        os.remove(image_path)

    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
