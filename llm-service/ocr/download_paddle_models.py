#!/usr/bin/env python3
"""
Download PaddleOCR models for offline use.

Downloads Korean OCR models and PP-Structure models to local directory.
Run this script before deploying to air-gapped environments.

Usage:
    python download_paddle_models.py [--output ./models/paddleocr] [--lang korean]

Model directory structure after download:
    models/paddleocr/
    ├── det/           # Detection model (korean_PP-OCRv5_det)
    ├── rec/           # Recognition model (korean_PP-OCRv5_rec)
    ├── cls/           # Classification model (ch_ppocr_mobile_v2.0_cls)
    ├── table/         # Table structure model
    └── layout/        # Layout analysis model
"""

import argparse
import logging
import os
import shutil
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def get_paddleocr_model_dir() -> Path:
    """Get PaddleOCR's default model cache directory."""
    # PaddleOCR stores models in ~/.paddleocr/
    home = Path.home()
    return home / ".paddleocr"


def download_paddle_models(output_dir: str, lang: str = "korean"):
    """
    Download PaddleOCR models by initializing PaddleOCR (which auto-downloads).
    Then copy models to specified output directory.

    Args:
        output_dir: Target directory for models
        lang: Language for OCR models (korean, en, ch, etc.)
    """
    try:
        from paddleocr import PaddleOCR, PPStructure
    except ImportError:
        logger.error("PaddleOCR not installed. Install with:")
        logger.error("  pip install paddleocr paddlepaddle-gpu")
        return False

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("Downloading PaddleOCR models for language: %s", lang)
    logger.info("Output directory: %s", output_path)
    logger.info("=" * 60)

    # Step 1: Initialize PaddleOCR to trigger model download
    logger.info("\n[1/2] Downloading OCR models (det, rec, cls)...")
    try:
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang=lang,
            use_gpu=False,  # Use CPU for download
            show_log=True,
        )
        logger.info("OCR models downloaded successfully")
    except Exception as e:
        logger.error("Failed to download OCR models: %s", e)
        return False

    # Step 2: Initialize PP-Structure to download table/layout models
    logger.info("\n[2/2] Downloading PP-Structure models (table, layout)...")
    try:
        structure = PPStructure(
            show_log=True,
            use_gpu=False,
            lang=lang,
            table=True,
            ocr=True,
            layout=True,
        )
        logger.info("PP-Structure models downloaded successfully")
    except Exception as e:
        logger.warning("PP-Structure models failed to download: %s", e)
        logger.warning("Table/layout features may not work offline")

    # Step 3: Copy models from PaddleOCR cache to output directory
    logger.info("\n[3/3] Copying models to output directory...")
    paddle_cache = get_paddleocr_model_dir()

    if not paddle_cache.exists():
        logger.error("PaddleOCR cache directory not found: %s", paddle_cache)
        return False

    # Find and copy model directories
    model_mappings = {
        "det": ["det", "ch_PP-OCR", "korean_PP-OCR", "PP-OCRv"],
        "rec": ["rec", "ch_PP-OCR", "korean_PP-OCR", "PP-OCRv"],
        "cls": ["cls", "ch_ppocr"],
        "table": ["table", "SLANet", "en_ppstructure"],
        "layout": ["layout", "picodet", "ppyolov2"],
    }

    copied_count = 0
    for target_name, search_patterns in model_mappings.items():
        target_path = output_path / target_name
        found = False

        # Search for model directory in cache
        for item in paddle_cache.rglob("*"):
            if not item.is_dir():
                continue

            item_name = item.name.lower()
            # Check if this directory matches any search pattern
            if any(pattern.lower() in item_name for pattern in search_patterns):
                # Check if it contains model files
                has_model_files = any(
                    f.suffix in [".pdmodel", ".pdiparams", ".pdparams", ".onnx"]
                    for f in item.iterdir()
                    if f.is_file()
                )

                if has_model_files:
                    logger.info("  Found %s model: %s", target_name, item.name)
                    if target_path.exists():
                        shutil.rmtree(target_path)
                    shutil.copytree(item, target_path)
                    copied_count += 1
                    found = True
                    break

        if not found:
            logger.warning("  Model not found for: %s", target_name)

    logger.info("\n" + "=" * 60)
    logger.info("Download complete!")
    logger.info("  Models copied: %d/5", copied_count)
    logger.info("  Output: %s", output_path)
    logger.info("=" * 60)

    # List final directory structure
    logger.info("\nDirectory structure:")
    for item in sorted(output_path.iterdir()):
        if item.is_dir():
            files = list(item.iterdir())
            logger.info("  %s/ (%d files)", item.name, len(files))

    return copied_count > 0


def main():
    parser = argparse.ArgumentParser(
        description="Download PaddleOCR models for offline use"
    )
    parser.add_argument(
        "--output", "-o",
        default="./models/paddleocr",
        help="Output directory for models (default: ./models/paddleocr)"
    )
    parser.add_argument(
        "--lang", "-l",
        default="korean",
        help="Language for OCR models (default: korean)"
    )
    args = parser.parse_args()

    success = download_paddle_models(args.output, args.lang)
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
