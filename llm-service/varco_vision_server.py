"""
Simple VARCO-VISION OCR server with OpenAI-compatible API.
Serves VARCO-VISION-2.0-1.7B-OCR for document OCR.

Supports offline/air-gapped environments with local model files.
"""

import base64
import io
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global model and processor
model = None
processor = None

# Model configuration
MODEL_NAME = "VARCO-VISION-2.0-1.7B-OCR"
DEFAULT_MODEL_PATH = "./models/VARCO-VISION-2.0-1.7B-OCR"


def load_model():
    """Load VARCO-VISION model from local path (supports air-gapped environments)."""
    global model, processor

    from transformers import AutoProcessor, LlavaOnevisionForConditionalGeneration

    # Use environment variable or default local path
    model_path = os.getenv("VARCO_MODEL_PATH", DEFAULT_MODEL_PATH)

    # Check if local path exists
    if not os.path.exists(model_path):
        logger.warning(f"Local model path not found: {model_path}")
        logger.warning("Falling back to HuggingFace Hub (requires internet)")
        model_path = "NCSOFT/VARCO-VISION-2.0-1.7B-OCR"
        local_files_only = False
    else:
        logger.info(f"Using local model: {model_path}")
        local_files_only = True

    logger.info(f"Loading model: {model_path} (local_files_only={local_files_only})")

    model = LlavaOnevisionForConditionalGeneration.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        attn_implementation="sdpa",
        device_map="auto",
        local_files_only=local_files_only,
    )
    processor = AutoProcessor.from_pretrained(model_path, local_files_only=local_files_only)

    logger.info(f"Model {MODEL_NAME} loaded successfully")


def process_image(image: Image.Image, prompt: str = "<ocr>", max_tokens: int = 4096) -> str:
    """Process image with VARCO-VISION OCR."""
    global model, processor

    # Upscale image for better OCR (recommended: 2304px minimum)
    w, h = image.size
    target_size = 2304
    if max(w, h) < target_size:
        scaling_factor = target_size / max(w, h)
        new_w, new_h = int(w * scaling_factor), int(h * scaling_factor)
        image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        },
    ]

    inputs = processor.apply_chat_template(
        conversation,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt"
    ).to(model.device, torch.float16)

    generate_ids = model.generate(**inputs, max_new_tokens=max_tokens)
    generate_ids_trimmed = [
        out_ids[len(in_ids):]
        for in_ids, out_ids in zip(inputs.input_ids, generate_ids)
    ]
    output = processor.decode(generate_ids_trimmed[0], skip_special_tokens=False)

    return output


@app.route("/v1/chat/completions", methods=["POST"])
def chat_completions():
    """OpenAI-compatible chat completions endpoint."""
    try:
        data = request.json
        messages = data.get("messages", [])
        max_tokens = data.get("max_tokens", 4096)

        # Extract image and text from messages
        image = None
        prompt = "<ocr>"

        for message in messages:
            if message.get("role") == "user":
                content = message.get("content", [])
                if isinstance(content, list):
                    for item in content:
                        if item.get("type") == "image_url":
                            image_url = item.get("image_url", {}).get("url", "")
                            if image_url.startswith("data:image"):
                                # Base64 encoded image
                                base64_data = image_url.split(",")[1]
                                image_bytes = base64.b64decode(base64_data)
                                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                        elif item.get("type") == "text":
                            prompt = item.get("text", "<ocr>")

        if image is None:
            return jsonify({"error": "No image provided"}), 400

        # Process image
        result = process_image(image, prompt, max_tokens)

        return jsonify({
            "id": "chatcmpl-varco",
            "object": "chat.completion",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": result
                    },
                    "finish_reason": "stop"
                }
            ]
        })

    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "model": MODEL_NAME})


if __name__ == "__main__":
    load_model()
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting VARCO-VISION server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
