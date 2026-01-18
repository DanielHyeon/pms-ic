# LLM Service Configuration

> Quick setup for CPU and GPU modes of the PMS LLM Service

## 🚀 Quick Start

### CPU Mode (No GPU Required)
```bash
./llm-setup.sh cpu
# Or manually:
docker-compose --profile llm up -d
```

### GPU Mode (NVIDIA GPU Required)
```bash
./llm-setup.sh gpu
# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d
```

## 📋 Modes Comparison

| Feature | CPU | GPU |
|---------|-----|-----|
| **Inference Speed** | 80-200ms/token | 5-15ms/token |
| **Memory** | 8-16GB RAM | 6-8GB VRAM |
| **Setup Time** | 2-3 minutes | 1-2 minutes |
| **Cost** | Free (uses host CPU) | GPU cost |
| **Best For** | Development & Testing | Production & Real-time |

## 🛠️ Setup Scripts

We provide scripts to simplify mode switching:

### Using the Setup Script
```bash
# View help
./llm-setup.sh help

# Switch to CPU mode
./llm-setup.sh cpu

# Switch to GPU mode
./llm-setup.sh gpu

# Check status
./llm-setup.sh status

# View logs
./llm-setup.sh logs
```

### Manual Setup

**CPU Mode:**
```bash
# Update .env
echo "LLM_DOCKERFILE=Dockerfile.cpu" >> .env
echo "EMBEDDING_DEVICE=cpu" >> .env

# Start service
docker-compose --profile llm up -d
```

**GPU Mode:**
```bash
# Update .env
echo "LLM_DOCKERFILE=Dockerfile.gpu" >> .env
echo "EMBEDDING_DEVICE=cuda" >> .env

# Start service
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d
```

## 📁 Files Structure

```
.
├── docker-compose.yml           # Main config (uses CPU by default)
├── docker-compose.cpu.yml       # CPU-specific overrides
├── docker-compose.gpu.yml       # GPU-specific overrides
├── llm-service/
│   ├── Dockerfile               # Legacy (use Dockerfile.cpu or .gpu)
│   ├── Dockerfile.cpu           # CPU-optimized build
│   ├── Dockerfile.gpu           # GPU-optimized build (CUDA)
│   └── ... (app code)
├── .env.example                 # Template (copy to .env)
├── .env                         # Your configuration (git ignored)
├── llm-setup.sh                 # Setup helper script
├── LLM_SETUP_GUIDE.md           # Detailed setup guide
└── LLM_CONFIG_README.md         # This file
```

## 🔧 Environment Variables

### Key Variables

| Variable | CPU Default | GPU Default | Purpose |
|----------|-------------|-------------|---------|
| `LLM_DOCKERFILE` | Dockerfile.cpu | Dockerfile.gpu | Which Dockerfile to use |
| `LLM_N_GPU_LAYERS` | 0 | 50 | GPU acceleration layers |
| `LLM_N_CTX` | 2048 | 4096 | Max context window |
| `LLM_N_THREADS` | 8 | 6 | CPU threads to use |
| `EMBEDDING_DEVICE` | cpu | cuda | Device for embeddings |
| `MINERU_DEVICE` | cpu | cuda | Device for doc parsing |

### Modifying Variables

Edit `.env` and restart:
```bash
# Edit .env
nano .env

# Restart service
docker-compose --profile llm restart
```

## 🐳 Docker Compose Overlays

The setup uses Docker Compose's multi-file support:

```bash
# Base + CPU (default)
docker-compose up -d

# Base + GPU
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up -d

# Base + CPU (explicit)
docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up -d
```

## ⚙️ GPU Prerequisites

Before using GPU mode, ensure you have:

1. **NVIDIA Driver 535+**
   ```bash
   nvidia-smi
   ```

2. **Docker 24.0+**
   ```bash
   docker --version
   ```

3. **NVIDIA Container Toolkit**
   ```bash
   # Install
   sudo apt-get install nvidia-docker2

   # Configure
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker

   # Verify
   docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
   ```

## 📊 Monitoring

### Check Service Status
```bash
# Health check
curl http://localhost:8000/health

# View logs
docker logs -f pms-llm-service

# Monitor resource usage
docker stats pms-llm-service

# GPU usage (GPU mode only)
docker exec pms-llm-service nvidia-smi -l 1
```

## 🔄 Switching Modes

### CPU → GPU
```bash
./llm-setup.sh gpu
# Or manually update .env and restart
```

### GPU → CPU
```bash
./llm-setup.sh cpu
# Or manually update .env and restart
```

## 🐛 Troubleshooting

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

### Out of memory (CPU mode)
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

# Reinstall NVIDIA Container Toolkit if needed
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Slow inference (GPU mode)
```bash
# Increase GPU layers
sed -i 's/LLM_N_GPU_LAYERS=.*/LLM_N_GPU_LAYERS=80/' .env
docker-compose --profile llm restart

# Check GPU memory usage
docker exec pms-llm-service nvidia-smi
```

## 📝 Configuration Examples

### Example 1: Small CPU (4GB RAM, 2 cores)
```bash
LLM_N_THREADS=2
LLM_N_CTX=1024
MAX_TOKENS=64
```

### Example 2: Medium CPU (16GB RAM, 8 cores)
```bash
LLM_N_THREADS=8
LLM_N_CTX=2048
MAX_TOKENS=128
```

### Example 3: GPU with RTX 4090
```bash
LLM_N_GPU_LAYERS=80
LLM_N_CTX=4096
MAX_TOKENS=512
```

### Example 4: GPU with RTX 3080
```bash
LLM_N_GPU_LAYERS=50
LLM_N_CTX=2048
MAX_TOKENS=256
```

## 🔗 Related Files

- **Detailed Guide**: [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md)
- **Environment Template**: [.env.example](.env.example)
- **Main Compose**: [docker-compose.yml](docker-compose.yml)
- **CPU Compose**: [docker-compose.cpu.yml](docker-compose.cpu.yml)
- **GPU Compose**: [docker-compose.gpu.yml](docker-compose.gpu.yml)
- **CPU Dockerfile**: [llm-service/Dockerfile.cpu](llm-service/Dockerfile.cpu)
- **GPU Dockerfile**: [llm-service/Dockerfile.gpu](llm-service/Dockerfile.gpu)

## 📚 Resources

- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [Google Gemma Models](https://ai.google.dev/gemma)

## ❓ FAQ

**Q: Can I switch between CPU and GPU without rebuilding?**
A: Yes, just update `.env` and restart the service with `docker-compose --profile llm restart`

**Q: How much VRAM do I need for GPU mode?**
A: Minimum 8GB for Gemma-3 12B in Q5_K_M quantization, 6GB in optimal cases.

**Q: Is CPU mode suitable for production?**
A: It depends on your throughput needs. For <1 req/sec, CPU is acceptable. For higher throughput, use GPU.

**Q: What if I don't have a GPU but want to use GPU settings?**
A: CPU will still work but won't benefit from GPU layers. The service will fall back to CPU inference.

**Q: How do I monitor GPU memory usage?**
A: Run `docker exec pms-llm-service nvidia-smi` to see real-time GPU memory usage.
