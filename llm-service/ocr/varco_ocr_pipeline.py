"""
PDF OCR Pipeline using VARCO-VISION-2.0-1.7B-OCR.
Extracts text from PDFs with bounding box visualization.

Supports offline/air-gapped environments with local model files.
"""

import os
import re
import base64
import requests
import shutil
import argparse
from pdf2image import convert_from_path
from PIL import Image, ImageDraw, ImageFont
import logging
import concurrent.futures

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def encode_image_to_base64(image_path: str) -> str:
    """Encode image file to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def pdf_to_images(pdf_path: str, dpi: int = 300) -> list:
    """Convert PDF to list of PIL images."""
    return convert_from_path(pdf_path, dpi=dpi)


def save_images_as_pdf(image_list: list, output_pdf_path: str) -> None:
    """Save list of images as PDF."""
    if not image_list:
        return
    image_list[0].save(output_pdf_path, save_all=True, append_images=image_list[1:])


def parse_ocr_result(text: str) -> list:
    """Parse OCR result to extract text and bounding boxes."""
    bboxes = []

    # Parse VARCO-VISION OCR format: <char>text</char><bbox>x1, y1, x2, y2</bbox>
    pattern = r'<char>([^<]*)</char><bbox>([^<]*)</bbox>'
    matches = re.findall(pattern, text)

    for char_text, bbox_str in matches:
        try:
            coords = [float(c.strip()) for c in bbox_str.split(',')]
            if len(coords) >= 4:
                bboxes.append((char_text, *coords[:4]))
        except:
            continue

    return bboxes


def draw_bboxes(img: Image.Image, bboxes: list) -> Image.Image:
    """Draw bounding boxes on image."""
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 24)
    except:
        try:
            font = ImageFont.truetype("NanumGothic.ttf", 24)
        except:
            font = ImageFont.load_default()

    w, h = img.size

    for item in bboxes:
        if len(item) < 5:
            continue
        text, x1, y1, x2, y2 = item[:5]

        # Convert normalized coordinates to pixels
        x0 = int(x1 * w)
        y0 = int(y1 * h)
        x1p = int(x2 * w)
        y1p = int(y2 * h)

        box = [x0, y0, x1p, y1p]
        try:
            draw.rectangle(box, outline='yellow', width=2)
            draw.text((x0, max(0, y0 - 25)), text, fill='blue', font=font)
        except Exception:
            continue

    return img


def vlm_ocr_single(image_path: str, model: str, base_url: str, page_num: int) -> str:
    """Call VLM OCR API for single image."""
    try:
        base64_image = encode_image_to_base64(image_path)
        url = f"{base_url}/v1/chat/completions"
        headers = {"Content-Type": "application/json"}

        data = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "<ocr>"
                        }
                    ]
                }
            ],
            "temperature": 0.0
        }

        response = requests.post(url, headers=headers, json=data, timeout=300)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]

        return content if content else f"*Page {page_num}: No text extracted*"

    except Exception as e:
        logger.error(f"[VLM ERROR page {page_num}] {e}")
        return f"*Page {page_num} - Error: {str(e)}*"


def process_page(args: tuple) -> tuple:
    """Process single page (for parallel execution)."""
    idx, img_path, model, base_url = args
    ocr_result = vlm_ocr_single(img_path, model, base_url, idx)
    return idx, ocr_result


def extract_text_only(ocr_result: str) -> str:
    """Extract plain text from OCR result (without bbox info)."""
    # Remove bbox tags and keep only text content
    text = re.sub(r'<bbox>[^<]*</bbox>', '', ocr_result)
    text = re.sub(r'<char>([^<]*)</char>', r'\1', text)
    text = re.sub(r'<[^>]+>', '', text)  # Remove any remaining tags
    return text.strip()


def run_ocr(
    pdf_path: str,
    output_dir: str,
    vlm_model: str = "VARCO-VISION-2.0-1.7B-OCR",
    base_url: str = "http://localhost:8001",
    page_list: list = None,
    save_bbox_images: bool = True,
    parallel: bool = True
) -> str:
    """
    Run OCR on PDF and return extracted text.

    Args:
        pdf_path: Path to input PDF
        output_dir: Output directory
        vlm_model: VLM model name
        base_url: VLM server URL
        page_list: List of pages to process (1-indexed), None for all
        save_bbox_images: Whether to save images with bounding boxes
        parallel: Whether to process pages in parallel

    Returns:
        Extracted text from all pages
    """
    os.makedirs(output_dir, exist_ok=True)

    # Create subdirectories
    page_dir = os.path.join(output_dir, "pages")
    bbox_dir = os.path.join(output_dir, "bbox_results")
    os.makedirs(page_dir, exist_ok=True)
    os.makedirs(bbox_dir, exist_ok=True)

    # Convert PDF to images
    logger.info(f"Converting PDF to images: {pdf_path}")
    images = pdf_to_images(pdf_path)
    logger.info(f"Found {len(images)} pages")

    # Determine pages to process
    if page_list is None:
        page_list = list(range(1, len(images) + 1))

    # Save page images
    img_paths = []
    for idx, img in enumerate(images, 1):
        if idx not in page_list:
            continue
        img_path = os.path.join(page_dir, f"page_{idx:04d}.jpg")
        img.save(img_path, "JPEG", quality=95)
        img_paths.append((idx, img_path, vlm_model, base_url))

    logger.info(f"Processing {len(img_paths)} pages...")

    # Process pages
    all_results = []
    bbox_images = []

    if parallel and len(img_paths) > 1:
        # Parallel processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(process_page, args): args[0] for args in img_paths}
            for future in concurrent.futures.as_completed(futures):
                idx, ocr_result = future.result()
                all_results.append((idx, ocr_result))
                logger.info(f"Page {idx} processed")
    else:
        # Sequential processing
        for args in img_paths:
            idx, ocr_result = process_page(args)
            all_results.append((idx, ocr_result))
            logger.info(f"Page {idx} processed")

    # Sort by page number
    all_results.sort(key=lambda x: x[0])

    # Process results
    full_text_parts = []

    for idx, ocr_result in all_results:
        # Save raw OCR result
        raw_path = os.path.join(bbox_dir, f"page_{idx:04d}_raw.txt")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(ocr_result)

        # Extract plain text
        plain_text = extract_text_only(ocr_result)
        full_text_parts.append(f"=== Page {idx} ===\n{plain_text}")

        # Draw bounding boxes if requested
        if save_bbox_images:
            bboxes = parse_ocr_result(ocr_result)
            if bboxes:
                img = Image.open(os.path.join(page_dir, f"page_{idx:04d}.jpg"))
                img_with_bbox = draw_bboxes(img.copy(), bboxes)
                bbox_img_path = os.path.join(bbox_dir, f"page_{idx:04d}_bbox.png")
                img_with_bbox.save(bbox_img_path)
                bbox_images.append(img_with_bbox.convert("RGB"))

    # Save combined text
    full_text = "\n\n".join(full_text_parts)
    text_output_path = os.path.join(output_dir, "extracted_text.txt")
    with open(text_output_path, "w", encoding="utf-8") as f:
        f.write(full_text)

    # Save bbox images as PDF
    if bbox_images:
        pdf_base = os.path.splitext(os.path.basename(pdf_path))[0]
        bbox_pdf_path = os.path.join(output_dir, f"{pdf_base}_ocr_bbox.pdf")
        save_images_as_pdf(bbox_images, bbox_pdf_path)
        logger.info(f"Bbox PDF saved: {bbox_pdf_path}")

    logger.info(f"OCR complete. Text saved to: {text_output_path}")
    logger.info(f"Extracted {len(full_text)} characters")

    return full_text


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="PDF OCR using VARCO-VISION")
    parser.add_argument("--data", required=True, help="Input PDF path")
    parser.add_argument("--dir", required=True, help="Output directory")
    parser.add_argument("--page", help="Pages to process (comma-separated, 1-indexed)")
    parser.add_argument("--url", default="http://localhost:8001", help="VLM server URL")
    parser.add_argument("--model", default="VARCO-VISION-2.0-1.7B-OCR", help="Model name")
    parser.add_argument("--no-bbox", action="store_true", help="Skip bbox visualization")
    parser.add_argument("--sequential", action="store_true", help="Process pages sequentially")

    args = parser.parse_args()

    page_list = None
    if args.page:
        page_list = [int(x.strip()) for x in args.page.split(",") if x.strip().isdigit()]

    run_ocr(
        pdf_path=args.data,
        output_dir=args.dir,
        vlm_model=args.model,
        base_url=args.url,
        page_list=page_list,
        save_bbox_images=not args.no_bbox,
        parallel=not args.sequential
    )


if __name__ == "__main__":
    main()
