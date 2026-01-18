# LLM Service Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   PMS Backend (Spring Boot)                 │
│  Port 8083                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AIChatClient                                        │  │
│  │  - Calls llm-service at http://llm-service:8000     │  │
│  │  - Falls back to mock on failure                    │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ TCP 8000
        ┌──────────────┴──────────────┐
        │                             │
        ▼ Primary                     ▼ Fallback
   ┌──────────────┐          ┌──────────────────┐
   │  LLM Service │          │  Mock Server     │
   │  Port 8000   │          │  Port 1080       │
   │              │          │                  │
   │ CPU or GPU   │          │  (MockServer)    │
   └──────────────┘          └──────────────────┘
```

## Docker Compose Configuration

```
docker-compose.yml (Base Configuration)
    ├── services: db, redis, backend, frontend, ai-service
    ├── llm-service: (configurable via env)
    │   └── dockerfile: ${LLM_DOCKERFILE:-Dockerfile.cpu}
    │
    ├── docker-compose.cpu.yml (Override)
    │   └── llm-service: Dockerfile.cpu, cpu optimized env vars
    │
    └── docker-compose.gpu.yml (Override)
        └── llm-service: Dockerfile.gpu, gpu optimized env vars + deploy resources
```

## CPU Mode Architecture

```
┌─────────────────────────────────────────────────┐
│  LLM Service Container (CPU Mode)               │
│  Base: python:3.11-slim-bullseye                │
│  ~800MB image size                              │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Flask Application                        │  │
│  │ Port 8000                                │  │
│  │ - /api/chat endpoint                     │  │
│  │ - /health endpoint                       │  │
│  └──────────────────────────────────────────┘  │
│                  ▲                              │
│                  │                              │
│  ┌──────────────────────────────────────────┐  │
│  │ LLaMA.cpp Python Binding                 │  │
│  │ CPU Inference                            │  │
│  │ - LLM_N_GPU_LAYERS: 0 (disabled)         │  │
│  │ - LLM_N_THREADS: 8 (configurable)        │  │
│  │ - LLM_N_CTX: 2048 (context window)       │  │
│  │ - EMBEDDING_DEVICE: cpu                  │  │
│  └──────────────────────────────────────────┘  │
│                  ▲                              │
│                  │                              │
│  ┌──────────────────────────────────────────┐  │
│  │ Gemma-3 12B Quantized Model (Q5_K_M)    │  │
│  │ ~7.5GB                                   │  │
│  │ Located: /app/models/                    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

CPU Resources Required:
├─ RAM: 8-16GB (7.5GB model + buffers)
├─ CPU: 8+ cores recommended (adjustable via LLM_N_THREADS)
├─ Disk: 15-20GB (OS + model)
└─ Inference: 80-200ms per token
```

## GPU Mode Architecture

```
┌──────────────────────────────────────────────────────┐
│  LLM Service Container (GPU Mode)                    │
│  Base: nvidia/cuda:12.3.0-devel-ubuntu22.04          │
│  ~10GB image size                                    │
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Flask Application                             │  │
│  │ Port 8000                                     │  │
│  │ - /api/chat endpoint                          │  │
│  │ - /health endpoint                            │  │
│  └───────────────────────────────────────────────┘  │
│                  ▲                                   │
│                  │                                   │
│  ┌───────────────────────────────────────────────┐  │
│  │ LLaMA.cpp Python Binding (CUDA-enabled)      │  │
│  │ Mixed GPU/CPU Inference                      │  │
│  │ - LLM_N_GPU_LAYERS: 50 (configurable)        │  │
│  │ - LLM_N_THREADS: 6                           │  │
│  │ - LLM_N_CTX: 4096 (full context)             │  │
│  │ - EMBEDDING_DEVICE: cuda                     │  │
│  │ - MINERU_DEVICE: cuda                        │  │
│  └───────────────────────────────────────────────┘  │
│                  ▲                                   │
│         ┌────────┴──────────┐                       │
│         │                   │                       │
│    GPU Layers          CPU Fallback                │
│ (Layer 0-50)           (Layers 51+)                │
│         │                   │                       │
│    ┌────▼─┐            ┌────▼─┐                    │
│    │ VRAM │            │ RAM  │                    │
│    │ 6-8GB│            │ 2-4GB│                    │
│    └──────┘            └──────┘                    │
│         │                   │                       │
│         └────────┬──────────┘                       │
│                  ▼                                   │
│  ┌───────────────────────────────────────────────┐  │
│  │ Gemma-3 12B Quantized Model (Q5_K_M)        │  │
│  │ ~7.5GB                                       │  │
│  │ Located: /app/models/ (mounted volume)       │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

       │
       │ Docker GPU Device Mapping
       │ driver: nvidia
       │ capabilities: [gpu]
       │
       ▼

┌──────────────────────────────────────┐
│  Host NVIDIA GPU(s)                  │
│  - NVIDIA RTX 4090 / A100 / RTX 3080 │
│  - NVIDIA Driver 535+                │
│  - CUDA Toolkit 12.3                 │
│  - NVIDIA Container Toolkit          │
└──────────────────────────────────────┘

GPU Resources Required:
├─ VRAM: 6-8GB minimum (RTX 4090, RTX 3080, A100)
├─ RAM: 2-4GB (buffer + system)
├─ Disk: 15-20GB (OS + model)
├─ Shared Memory: 16GB (for GPU operations)
└─ Inference: 5-15ms per token
```

## Data Flow

### CPU Mode
```
Frontend Request
       │
       ▼
Backend (/api/chat endpoint)
       │
       ▼
AIChatClient.chat()
       │
       ├─── Try: callOllama()
       │         ├─ Build request with context
       │         ├─ HTTP POST to http://llm-service:8000/api/chat
       │         │   (LLaMA.cpp CPU inference)
       │         └─ Parse response
       │              ├─ reply
       │              ├─ confidence
       │              └─ suggestions
       │
       ├─── Catch: Fallback to callMock()
       │         ├─ HTTP POST to http://mockserver:1080/api/chat
       │         └─ Return mock response
       │
       └─ Return ChatResponse to Frontend
```

### GPU Mode
```
Frontend Request
       │
       ▼
Backend (/api/chat endpoint)
       │
       ▼
AIChatClient.chat()
       │
       ├─── Try: callOllama()
       │         ├─ Build request with context
       │         ├─ HTTP POST to http://llm-service:8000/api/chat
       │         │   (LLaMA.cpp CUDA inference)
       │         │   ├─ Layers 0-50: GPU (VRAM)
       │         │   └─ Layers 51-80: CPU (RAM) if needed
       │         └─ Parse response (faster)
       │              ├─ reply
       │              ├─ confidence
       │              └─ suggestions
       │
       ├─── Catch: Fallback to callMock()
       │         ├─ HTTP POST to http://mockserver:1080/api/chat
       │         └─ Return mock response
       │
       └─ Return ChatResponse to Frontend (much faster)
```

## Environment Variable Flow

### Configuration Resolution
```
.env (highest priority)
  ↓
LLM_DOCKERFILE (selects Dockerfile to build from)
  ├─ Dockerfile.cpu
  └─ Dockerfile.gpu
  ↓
docker-compose.yml (uses selected Dockerfile)
  ├─ LLM_N_GPU_LAYERS
  ├─ LLM_N_CTX
  ├─ LLM_N_THREADS
  ├─ EMBEDDING_DEVICE
  └─ MINERU_DEVICE
  ↓
Container Environment
  ↓
LLaMA.cpp Configuration
  ├─ If LLM_N_GPU_LAYERS > 0: Enable GPU acceleration
  ├─ Thread count = LLM_N_THREADS
  ├─ Context window = LLM_N_CTX
  └─ Device = EMBEDDING_DEVICE
```

## File Structure

```
pms-ic/
├─ docker-compose.yml              (Base config, references LLM_DOCKERFILE)
├─ docker-compose.cpu.yml          (CPU overrides)
├─ docker-compose.gpu.yml          (GPU overrides + deploy resources)
│
├─ llm-service/
│  ├─ Dockerfile                   (Legacy, deprecated)
│  ├─ Dockerfile.cpu               (New: Python 3.11 slim, CPU optimized)
│  ├─ Dockerfile.gpu               (New: CUDA 12.3, GPU optimized)
│  ├─ app.py                       (Flask application)
│  ├─ requirements.txt             (Python dependencies)
│  └─ ... (other service files)
│
├─ .env                            (Environment variables, git ignored)
├─ .env.example                    (Template with LLM config examples)
│
├─ llm-setup.sh                    (Setup script: cpu|gpu|status|logs)
├─ QUICKSTART_LLM.md               (30-second quick start)
├─ LLM_CONFIG_README.md            (Configuration reference)
├─ LLM_SETUP_GUIDE.md              (Comprehensive guide)
└─ docs/
   └─ LLM_ARCHITECTURE.md          (This file)
```

## Key Environment Variables

```yaml
# Dockerfile Selection
LLM_DOCKERFILE: "Dockerfile.cpu"  or  "Dockerfile.gpu"

# Model Configuration
MODEL_PATH: "/app/models/google.gemma-3-12b-pt.Q5_K_M.gguf"

# Inference Settings
LLM_N_GPU_LAYERS: 0              # CPU: 0, GPU: 50
LLM_N_CTX: 2048                  # CPU: 2048, GPU: 4096
LLM_N_THREADS: 8                 # CPU: 8, GPU: 6

# Device Selection
EMBEDDING_DEVICE: "cpu"          # CPU: cpu, GPU: cuda
MINERU_DEVICE: "cpu"             # CPU: cpu, GPU: cuda

# Performance
MAX_TOKENS: 128                  # Output max tokens
TEMPERATURE: 0.7                 # Sampling temperature
TOP_P: 0.9                       # Nucleus sampling

# RAG Configuration
VECTOR_DB: "neo4j"               # Vector database backend
NEO4J_URI: "bolt://neo4j:7687"
EMBEDDING_MODEL: ...
```

## Deployment Scenarios

### Scenario 1: Development (CPU)
```
docker-compose --profile llm up -d
# Runs with Dockerfile.cpu, no GPU required
# Good for testing and development
```

### Scenario 2: Production (GPU)
```
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d
# Runs with Dockerfile.gpu, requires NVIDIA setup
# High performance, optimized for throughput
```

### Scenario 3: Hybrid (Switch Modes)
```
# Start with CPU for development
./llm-setup.sh cpu

# Switch to GPU for performance testing
./llm-setup.sh gpu

# Switch back to CPU
./llm-setup.sh cpu
```

## Performance Characteristics

### CPU Mode (Intel i9-13900K)
- **Inference Speed**: 120-150ms/token
- **Throughput**: 0.5-2 req/sec
- **Memory**: 12-15GB peak RAM
- **Cost**: Free (CPU only)

### GPU Mode (RTX 4090)
- **Inference Speed**: 5-10ms/token
- **Throughput**: 15-30 req/sec
- **Memory**: 7GB VRAM, 2GB RAM
- **Cost**: GPU hardware cost

### GPU Mode (A100)
- **Inference Speed**: 2-5ms/token
- **Throughput**: 30-60 req/sec
- **Memory**: 6GB VRAM, 2GB RAM
- **Cost**: Highest (cloud GPU cost)

## Troubleshooting Tree

```
Service not starting?
├─ Check logs: docker logs pms-llm-service
├─ Rebuild: docker-compose --profile llm up -d --build
└─ Clean rebuild: docker system prune && rebuild

GPU not detected?
├─ Check driver: nvidia-smi
├─ Check Docker: docker run --rm --gpus all nvidia/cuda:... nvidia-smi
└─ Install toolkit: sudo nvidia-ctk runtime configure

Slow inference?
├─ CPU mode: Increase LLM_N_THREADS
├─ GPU mode: Increase LLM_N_GPU_LAYERS
└─ Monitor: docker stats pms-llm-service

Out of memory?
├─ CPU mode: Reduce LLM_N_CTX or LLM_N_THREADS
├─ GPU mode: Reduce LLM_N_GPU_LAYERS
└─ Check usage: docker stats or nvidia-smi
```
