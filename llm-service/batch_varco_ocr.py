#!/usr/bin/env python3
"""
Batch VARCO-VISION OCR script.

Supports offline/air-gapped environments with local model files.

Run this script with LLM service STOPPED to use GPU for faster OCR.
Usage:
  1. docker stop pms-llm-service
  2. docker exec pms-llm-service python3 /app/batch_varco_ocr.py --help
  3. docker start pms-llm-service
"""

import argparse
import logging
import os
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def run_batch_ocr(
    input_dir: str,
    output_dir: str,
    file_pattern: str = "*.pdf",
    device: str = "cuda",
    reindex: bool = False,
):
    """Run VARCO OCR on all PDFs in directory."""
    from pdf_ocr_pipeline import _run_varco_ocr, classify_pdf, PDFType

    # Set environment for VARCO
    os.environ["VARCO_DEVICE"] = device
    os.environ["VARCO_MODEL_PATH"] = "./models/VARCO-VISION-2.0-1.7B-OCR"
    os.environ["VARCO_IMAGE_SIZE"] = "2304"  # Full quality for batch
    os.environ["OCR_DPI"] = "300"

    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    pdf_files = list(input_path.glob(file_pattern))
    logger.info("Found %d PDF files", len(pdf_files))

    results = []

    for i, pdf_file in enumerate(pdf_files, 1):
        logger.info("\n[%d/%d] Processing: %s", i, len(pdf_files), pdf_file.name)

        # Check PDF type
        pdf_type = classify_pdf(str(pdf_file))
        logger.info("  PDF type: %s", pdf_type.value)

        # Determine if OCR is needed
        if pdf_type == PDFType.NATIVE:
            logger.info("  Skipping native PDF (no OCR needed)")
            continue

        try:
            # Run OCR
            text = _run_varco_ocr(str(pdf_file))

            # Save output
            output_file = output_path / f"{pdf_file.stem}_ocr.txt"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(text)

            logger.info("  ✅ Saved to: %s (%d chars)", output_file.name, len(text))
            results.append({
                "file": pdf_file.name,
                "status": "success",
                "chars": len(text),
                "output": str(output_file),
            })

        except Exception as e:
            logger.error("  ❌ Error: %s", e)
            results.append({
                "file": pdf_file.name,
                "status": "error",
                "error": str(e),
            })

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("OCR Summary")
    logger.info("=" * 60)
    success = sum(1 for r in results if r["status"] == "success")
    logger.info("Success: %d/%d files", success, len(results))

    # Re-index if requested
    if reindex and success > 0:
        logger.info("\nRe-indexing documents in Neo4j...")
        try:
            from load_ragdata_pdfs_neo4j import load_pdf_files
            load_pdf_files(input_dir, clear_db=True)
        except Exception as e:
            logger.error("Re-indexing failed: %s", e)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Batch VARCO-VISION OCR for PDF files"
    )
    parser.add_argument(
        "--input",
        default="/app/ragdata",
        help="Input directory containing PDFs",
    )
    parser.add_argument(
        "--output",
        default="/app/ragdata/ocr_output",
        help="Output directory for OCR text files",
    )
    parser.add_argument(
        "--pattern",
        default="*.pdf",
        help="File pattern to match (default: *.pdf)",
    )
    parser.add_argument(
        "--device",
        default="cuda",
        choices=["cuda", "cpu"],
        help="Device for OCR (default: cuda)",
    )
    parser.add_argument(
        "--reindex",
        action="store_true",
        help="Re-index documents in Neo4j after OCR",
    )

    args = parser.parse_args()

    logger.info("VARCO-VISION Batch OCR (offline-capable)")
    logger.info("  Input: %s", args.input)
    logger.info("  Output: %s", args.output)
    logger.info("  Device: %s", args.device)
    logger.info("  Model: %s (local)", os.environ.get("VARCO_MODEL_PATH", "./models/VARCO-VISION-2.0-1.7B-OCR"))

    results = run_batch_ocr(
        args.input,
        args.output,
        args.pattern,
        args.device,
        args.reindex,
    )

    sys.exit(0 if all(r["status"] == "success" for r in results) else 1)


if __name__ == "__main__":
    main()
