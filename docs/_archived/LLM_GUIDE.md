# LLM Service Guide

> Comprehensive guide for GPU/CPU configuration and operation of the PMS LLM Service

**Last Updated**: 2026-01-24
**Model**: Gemma-3 12B (Q5_K_M quantization)

---

## Quick Start

### CPU Mode (No GPU Required)
```bash
./llm-setup.sh cpu
curl http://localhost:8000/health  # Verify it's running
```

### GPU Mode (NVIDIA GPU Required)
```bash
./llm-setup.sh gpu
curl http://localhost:8000/health  # Verify it's running
```

---

## Performance Comparison

| Feature | CPU Mode | GPU Mode (RTX 4090) |
|---------|----------|---------------------|
| Inference Speed | 80-200ms/token | 5-15ms/token |
| Memory | 8-16GB RAM | 6-8GB VRAM |
| Throughput | 0.5-2 req/sec | 10-50 req/sec |
| Setup Time | 2-3 minutes | 1-2 minutes |
| Best For | Development & Testing | Production & Real-time |

---

## Setup Script Commands

```bash
./llm-setup.sh help      # Show help
./llm-setup.sh cpu       # Setup CPU mode
./llm-setup.sh gpu       # Setup GPU mode
./llm-setup.sh status    # Show status
./llm-setup.sh logs      # View logs
./llm-setup.sh restart   # Restart service
./llm-setup.sh stop      # Stop service
```

---

## Environment Variables

### CPU Mode (.env)
```env
LLM_DOCKERFILE=Dockerfile.cpu
LLM_N_GPU_LAYERS=0
LLM_N_CTX=2048
LLM_N_THREADS=8
EMBEDDING_DEVICE=cpu
MINERU_DEVICE=cpu
```

### GPU Mode (.env)
```env
LLM_DOCKERFILE=Dockerfile.gpu
LLM_N_GPU_LAYERS=50
LLM_N_CTX=4096
LLM_N_THREADS=6
EMBEDDING_DEVICE=cuda
MINERU_DEVICE=cuda
```

### Key Variables Reference

| Variable | CPU Default | GPU Default | Purpose |
|----------|-------------|-------------|---------|
| `LLM_DOCKERFILE` | Dockerfile.cpu | Dockerfile.gpu | Dockerfile selection |
| `LLM_N_GPU_LAYERS` | 0 | 50 | GPU acceleration layers |
| `LLM_N_CTX` | 2048 | 4096 | Max context window |
| `LLM_N_THREADS` | 8 | 6 | CPU threads |
| `EMBEDDING_DEVICE` | cpu | cuda | Device for embeddings |
| `MINERU_DEVICE` | cpu | cuda | Device for doc parsing |

---

## GPU Prerequisites

Before using GPU mode, ensure you have:

### 1. NVIDIA Driver 535+
```bash
nvidia-smi
```

### 2. Docker 24.0+
```bash
docker --version
```

### 3. NVIDIA Container Toolkit
```bash
# Install
sudo apt-get install nvidia-docker2

# Configure
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
```

---

## Docker Compose Usage

### CPU Mode (default)
```bash
docker-compose --profile llm up -d
```

### GPU Mode
```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d
```

### View Logs
```bash
docker logs -f pms-llm-service
```

---

## Switching Between Modes

### CPU to GPU
```bash
./llm-setup.sh gpu
# Or manually:
sed -i 's/LLM_DOCKERFILE=Dockerfile.cpu/LLM_DOCKERFILE=Dockerfile.gpu/' .env
sed -i 's/LLM_N_GPU_LAYERS=0/LLM_N_GPU_LAYERS=50/' .env
sed -i 's/EMBEDDING_DEVICE=cpu/EMBEDDING_DEVICE=cuda/' .env
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d --build
```

### GPU to CPU
```bash
./llm-setup.sh cpu
# Or manually:
sed -i 's/LLM_DOCKERFILE=Dockerfile.gpu/LLM_DOCKERFILE=Dockerfile.cpu/' .env
sed -i 's/LLM_N_GPU_LAYERS=50/LLM_N_GPU_LAYERS=0/' .env
sed -i 's/EMBEDDING_DEVICE=cuda/EMBEDDING_DEVICE=cpu/' .env
docker-compose --profile llm up -d --build
```

---

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### View Logs
```bash
docker logs -f pms-llm-service
```

### Resource Usage
```bash
docker stats pms-llm-service
```

### GPU Usage (GPU mode only)
```bash
docker exec pms-llm-service nvidia-smi -l 1
```

---

## Troubleshooting

### Service won't start
```bash
# Check logs
docker logs pms-llm-service

# Rebuild
docker-compose --profile llm up -d --build

# Clean rebuild
docker-compose down
docker-compose --profile llm up -d --build
```

### Out of Memory (CPU mode)
```bash
# Reduce context window
sed -i 's/LLM_N_CTX=.*/LLM_N_CTX=1024/' .env

# Reduce threads
sed -i 's/LLM_N_THREADS=.*/LLM_N_THREADS=4/' .env

# Restart
docker-compose --profile llm restart
```

### GPU not detected
```bash
# Verify GPU access
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# Reinstall NVIDIA Container Toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Slow inference
- **CPU mode**: Increase `LLM_N_THREADS` in .env
- **GPU mode**: Increase `LLM_N_GPU_LAYERS` in .env

---

## Configuration Examples

### Small CPU (4GB RAM, 2 cores)
```bash
LLM_N_THREADS=2
LLM_N_CTX=1024
MAX_TOKENS=64
```

### Medium CPU (16GB RAM, 8 cores)
```bash
LLM_N_THREADS=8
LLM_N_CTX=2048
MAX_TOKENS=128
```

### GPU with RTX 4090
```bash
LLM_N_GPU_LAYERS=80
LLM_N_CTX=4096
MAX_TOKENS=512
```

### GPU with RTX 3080
```bash
LLM_N_GPU_LAYERS=50
LLM_N_CTX=2048
MAX_TOKENS=256
```

---

## File Structure

```
pms-ic/
├── docker-compose.yml           # Base config
├── docker-compose.cpu.yml       # CPU overrides
├── docker-compose.gpu.yml       # GPU overrides
├── llm-setup.sh                 # Setup script
├── .env.example                 # Environment template
│
├── llm-service/
│   ├── Dockerfile.cpu           # CPU-optimized build (~800MB)
│   ├── Dockerfile.gpu           # GPU-optimized build (~10GB)
│   ├── app.py                   # Flask application
│   └── requirements.txt
│
└── docs/
    ├── LLM_GUIDE.md             # This file
    ├── LLM_ARCHITECTURE.md      # System architecture diagrams
    └── GEMMA3_STABILITY_IMPROVEMENTS.md  # Stability guide
```

---

## Technical Specifications

### CPU Mode
| Aspect | Value |
|--------|-------|
| Base Image | python:3.11-slim-bullseye |
| Image Size | ~800MB |
| RAM Required | 8-16GB |
| Inference Speed | 80-200ms/token |
| Throughput | 0.5-2 req/sec |

### GPU Mode
| Aspect | Value |
|--------|-------|
| Base Image | nvidia/cuda:12.3.0-devel-ubuntu22.04 |
| Image Size | ~10GB |
| VRAM Required | 6-8GB |
| Inference Speed | 5-15ms/token (RTX 4090) |
| Throughput | 10-50+ req/sec |

---

## API Endpoints

### POST /api/chat
Chat request endpoint.

**Request:**
```json
{
  "message": "User message",
  "context": [
    {"role": "user", "content": "Previous user message"},
    {"role": "assistant", "content": "Previous AI response"}
  ]
}
```

**Response:**
```json
{
  "reply": "AI response",
  "confidence": 0.85,
  "suggestions": []
}
```

### GET /health
Service health check.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

## Related Documentation

- [LLM Architecture](./LLM_ARCHITECTURE.md) - System diagrams and data flow
- [Gemma3 Stability Guide](./GEMMA3_STABILITY_IMPROVEMENTS.md) - Response validation and retry logic

---

## FAQ

**Q: Do I need a GPU?**
A: No. CPU mode works without any GPU hardware.

**Q: How do I switch between modes?**
A: Use `./llm-setup.sh cpu` or `./llm-setup.sh gpu`.

**Q: What if the service won't start?**
A: Check logs with `./llm-setup.sh logs`.

**Q: How do I improve performance?**
A: For CPU, increase threads. For GPU, increase layers.

**Q: How much VRAM do I need for GPU mode?**
A: Minimum 8GB for Gemma-3 12B in Q5_K_M quantization.

**Q: Is CPU mode suitable for production?**
A: For <1 req/sec, CPU is acceptable. For higher throughput, use GPU.
