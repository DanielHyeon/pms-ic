#!/usr/bin/env python3
"""
OCR Engine Comparison Test

Compares VARCO-VISION vs PaddleOCR on sample PDF files.
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


def test_paddle_ocr(image_path: str) -> dict:
    """Test PaddleOCR on a single image."""
    try:
        from paddleocr import PaddleOCR

        start_time = time.time()

        ocr = PaddleOCR(
            use_angle_cls=True,
            lang="korean",
            use_gpu=False,  # Use CPU to avoid GPU memory conflicts with LLM
            show_log=False,
        )

        load_time = time.time() - start_time

        start_time = time.time()
        result = ocr.ocr(image_path, cls=True)
        ocr_time = time.time() - start_time

        # Extract text
        text_parts = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text, confidence = line[1]
                    text_parts.append(text)

        text = '\n'.join(text_parts)

        return {
            "engine": "PaddleOCR",
            "success": True,
            "text": text,
            "char_count": len(text),
            "line_count": len(text_parts),
            "load_time": load_time,
            "ocr_time": ocr_time,
            "total_time": load_time + ocr_time,
        }

    except Exception as e:
        logger.error(f"PaddleOCR error: {e}")
        return {
            "engine": "PaddleOCR",
            "success": False,
            "error": str(e),
        }


def test_varco_ocr(image_path: str) -> dict:
    """Test VARCO-VISION OCR on a single image."""
    try:
        import torch
        from transformers import AutoProcessor, LlavaOnevisionForConditionalGeneration
        from PIL import Image
        import re

        model_path = os.getenv("VARCO_MODEL_PATH", "./models/VARCO-VISION-2.0-1.7B-OCR")

        start_time = time.time()

        device = "cuda" if torch.cuda.is_available() else "cpu"

        model = LlavaOnevisionForConditionalGeneration.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
            local_files_only=os.path.exists(model_path),
        )

        processor = AutoProcessor.from_pretrained(
            model_path,
            local_files_only=os.path.exists(model_path),
        )

        load_time = time.time() - start_time

        # Load and process image
        image = Image.open(image_path).convert("RGB")

        # Resize if needed
        w, h = image.size
        target_size = 1536
        max_dim = max(w, h)
        if max_dim > target_size:
            scale = target_size / max_dim
            image = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        conversation = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": "<ocr>"},
                ],
            },
        ]

        start_time = time.time()

        inputs = processor.apply_chat_template(
            conversation,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt"
        ).to(model.device, model.dtype)

        with torch.inference_mode():
            generate_ids = model.generate(**inputs, max_new_tokens=4096)

        generate_ids_trimmed = [
            out_ids[len(in_ids):]
            for in_ids, out_ids in zip(inputs.input_ids, generate_ids)
        ]
        output = processor.decode(generate_ids_trimmed[0], skip_special_tokens=False)

        ocr_time = time.time() - start_time

        # Extract plain text
        text = re.sub(r'<bbox>[^<]*</bbox>', '', output)
        text = re.sub(r'<char>([^<]*)</char>', r'\1', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = text.strip()

        return {
            "engine": "VARCO-VISION",
            "success": True,
            "text": text,
            "char_count": len(text),
            "line_count": len(text.split('\n')),
            "load_time": load_time,
            "ocr_time": ocr_time,
            "total_time": load_time + ocr_time,
        }

    except Exception as e:
        logger.error(f"VARCO-VISION error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "engine": "VARCO-VISION",
            "success": False,
            "error": str(e),
        }


def convert_pdf_to_image(pdf_path: str, page_num: int = 0) -> str:
    """Convert PDF page to image for testing."""
    from pdf2image import convert_from_path
    import tempfile

    images = convert_from_path(pdf_path, dpi=300, first_page=page_num+1, last_page=page_num+1)

    if not images:
        raise ValueError(f"No images extracted from {pdf_path}")

    # Save to temp file
    temp_path = tempfile.mktemp(suffix=".png")
    images[0].save(temp_path, "PNG")

    return temp_path


def compare_ocr_engines(pdf_path: str):
    """Compare OCR engines on a PDF file."""
    logger.info("=" * 70)
    logger.info(f"OCR Comparison Test: {pdf_path}")
    logger.info("=" * 70)

    # Convert first page to image
    logger.info("\nConverting PDF to image...")
    image_path = convert_pdf_to_image(pdf_path)
    logger.info(f"Image saved to: {image_path}")

    results = []

    # Test PaddleOCR
    logger.info("\n" + "-" * 50)
    logger.info("Testing PaddleOCR...")
    logger.info("-" * 50)
    paddle_result = test_paddle_ocr(image_path)
    results.append(paddle_result)

    if paddle_result["success"]:
        logger.info(f"  Load time: {paddle_result['load_time']:.2f}s")
        logger.info(f"  OCR time: {paddle_result['ocr_time']:.2f}s")
        logger.info(f"  Total time: {paddle_result['total_time']:.2f}s")
        logger.info(f"  Characters: {paddle_result['char_count']}")
        logger.info(f"  Lines: {paddle_result['line_count']}")
        logger.info(f"\n  Sample text (first 500 chars):")
        logger.info(f"  {paddle_result['text'][:500]}...")
    else:
        logger.error(f"  Error: {paddle_result['error']}")

    # Test VARCO-VISION
    logger.info("\n" + "-" * 50)
    logger.info("Testing VARCO-VISION...")
    logger.info("-" * 50)
    varco_result = test_varco_ocr(image_path)
    results.append(varco_result)

    if varco_result["success"]:
        logger.info(f"  Load time: {varco_result['load_time']:.2f}s")
        logger.info(f"  OCR time: {varco_result['ocr_time']:.2f}s")
        logger.info(f"  Total time: {varco_result['total_time']:.2f}s")
        logger.info(f"  Characters: {varco_result['char_count']}")
        logger.info(f"  Lines: {varco_result['line_count']}")
        logger.info(f"\n  Sample text (first 500 chars):")
        logger.info(f"  {varco_result['text'][:500]}...")
    else:
        logger.error(f"  Error: {varco_result['error']}")

    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("SUMMARY")
    logger.info("=" * 70)

    for r in results:
        if r["success"]:
            logger.info(f"\n{r['engine']}:")
            logger.info(f"  Total time: {r['total_time']:.2f}s")
            logger.info(f"  Characters: {r['char_count']}")
        else:
            logger.info(f"\n{r['engine']}: FAILED - {r['error']}")

    # Cleanup
    if os.path.exists(image_path):
        os.remove(image_path)

    return results


def main():
    # Find a test PDF
    ragdata_dir = Path("./ragdata")
    pdf_files = list(ragdata_dir.glob("*.pdf")) if ragdata_dir.exists() else []

    if not pdf_files:
        logger.error("No PDF files found in ./ragdata/")
        logger.info("Please provide a PDF file path as argument:")
        logger.info("  python test_ocr_comparison.py /path/to/test.pdf")
        return 1

    # Use first PDF or command line argument
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = str(pdf_files[0])

    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        return 1

    compare_ocr_engines(pdf_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
