# LLM Service Quick Start

## 30-Second Setup

### CPU Mode (No GPU)
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

## What's Been Set Up

You now have a flexible LLM service configuration that supports both CPU and GPU modes:

### Files Created
- **Dockerfile.cpu** - Lightweight Python 3.11 slim build
- **Dockerfile.gpu** - CUDA 12.3 optimized build
- **docker-compose.cpu.yml** - CPU configuration
- **docker-compose.gpu.yml** - GPU configuration with NVIDIA support
- **llm-setup.sh** - Interactive setup script
- **Documentation** - Comprehensive guides

### Key Features
✅ Switch between CPU/GPU modes with one command
✅ Automatic environment variable management
✅ Docker Compose overlay architecture
✅ Health checks and monitoring
✅ Performance optimized defaults

---

## Usage

### Using the Setup Script (Recommended)
```bash
# View all options
./llm-setup.sh help

# Switch to CPU mode
./llm-setup.sh cpu

# Switch to GPU mode (requires NVIDIA setup)
./llm-setup.sh gpu

# Check service status
./llm-setup.sh status

# View live logs
./llm-setup.sh logs

# Restart service
./llm-setup.sh restart

# Stop service
./llm-setup.sh stop
```

### Manual Docker Compose
```bash
# CPU mode (default)
docker-compose --profile llm up -d

# GPU mode
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d

# View logs
docker logs -f pms-llm-service

# Stop
docker-compose --profile llm down
```

---

## Configuration

### Environment Variables (.env)

**CPU Mode (Default)**
```env
LLM_DOCKERFILE=Dockerfile.cpu
LLM_N_GPU_LAYERS=0
LLM_N_CTX=2048
LLM_N_THREADS=8
EMBEDDING_DEVICE=cpu
MINERU_DEVICE=cpu
```

**GPU Mode**
```env
LLM_DOCKERFILE=Dockerfile.gpu
LLM_N_GPU_LAYERS=50
LLM_N_CTX=4096
LLM_N_THREADS=6
EMBEDDING_DEVICE=cuda
MINERU_DEVICE=cuda
```

### Modify Settings

Edit `.env` and restart:
```bash
nano .env
docker-compose --profile llm restart
```

---

## Performance Comparison

| Aspect | CPU | GPU |
|--------|-----|-----|
| Inference Speed | 80-200ms/token | 5-15ms/token |
| Memory | 8-16GB RAM | 6-8GB VRAM |
| Setup | 2-3 min | 1-2 min |
| Cost | Free | GPU cost |

---

## GPU Prerequisites

If using GPU mode, ensure:

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
   sudo apt-get install nvidia-docker2
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```

---

## Documentation

📖 **Full Setup Guide**: [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md)
- Detailed CPU setup
- Detailed GPU setup
- Troubleshooting
- Performance tuning
- Advanced configurations

📋 **Configuration Reference**: [LLM_CONFIG_README.md](LLM_CONFIG_README.md)
- Quick reference
- Examples
- FAQ

---

## Common Commands

```bash
# Start LLM service
./llm-setup.sh cpu              # or gpu

# Check if running
curl http://localhost:8000/health

# View status
./llm-setup.sh status

# View logs (streaming)
./llm-setup.sh logs

# Restart
./llm-setup.sh restart

# Stop
./llm-setup.sh stop

# Monitor GPU usage (GPU mode)
docker exec pms-llm-service nvidia-smi -l 1
```

---

## Troubleshooting

### Service won't start
```bash
docker logs -f pms-llm-service
```

### Slow inference
- CPU: Increase `LLM_N_THREADS` in .env
- GPU: Increase `LLM_N_GPU_LAYERS` in .env

### Out of memory
- CPU: Reduce `LLM_N_CTX` in .env
- GPU: Reduce `LLM_N_GPU_LAYERS` in .env

### GPU not found
```bash
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
```

---

## Next Steps

1. Choose your mode: `./llm-setup.sh cpu` or `./llm-setup.sh gpu`
2. Verify it's running: `curl http://localhost:8000/health`
3. Test with the backend: Backend will auto-connect at `http://llm-service:8000`
4. Monitor with: `./llm-setup.sh logs`

---

## Support

For detailed information, see:
- [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md) - Comprehensive guide
- [LLM_CONFIG_README.md](LLM_CONFIG_README.md) - Configuration reference
- `.env.example` - Environment variable template
