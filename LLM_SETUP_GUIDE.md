# LLM Service GPU/CPU Configuration Guide

This guide explains how to set up and run the PMS LLM service in either CPU or GPU mode.

## Quick Start

### CPU Mode (Default - No GPU Required)

```bash
# 1. Copy environment template (first time only)
cp .env.example .env

# 2. Ensure LLM_MODE is set to cpu (default)
echo "LLM_MODE=cpu" >> .env

# 3. Start with CPU mode
docker-compose --profile llm up -d

# 4. Verify the service is running
curl http://localhost:8000/health
```

### GPU Mode (Requires NVIDIA Setup)

```bash
# 1. First, set up NVIDIA Container Toolkit (one-time setup)
# See "GPU Prerequisites" section below

# 2. Copy environment template
cp .env.example .env

# 3. Update .env for GPU mode
cat << EOF >> .env
LLM_MODE=gpu
LLM_DOCKERFILE=Dockerfile.gpu
LLM_N_GPU_LAYERS=50
LLM_N_CTX=4096
LLM_N_THREADS=6
EMBEDDING_DEVICE=cuda
MINERU_DEVICE=cuda
EOF

# 4. Start with GPU mode using compose override
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d

# 5. Verify GPU is being used
docker exec pms-llm-service-gpu nvidia-smi
```

---

## Detailed Setup Instructions

### CPU Mode Setup

#### Requirements
- Docker 20.10+
- At least 4GB available RAM
- 10GB disk space for models

#### Steps

1. **Clone environment variables**
   ```bash
   cp .env.example .env
   ```

2. **Verify CPU settings in .env**
   ```bash
   LLM_DOCKERFILE=Dockerfile.cpu
   LLM_N_GPU_LAYERS=0
   LLM_N_CTX=2048
   LLM_N_THREADS=8
   EMBEDDING_DEVICE=cpu
   MINERU_DEVICE=cpu
   ```

3. **Start the service**
   ```bash
   # Using profile
   docker-compose --profile llm up -d

   # Or using override file
   docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up -d
   ```

4. **Monitor startup** (can take 2-3 minutes on CPU)
   ```bash
   docker logs -f pms-llm-service
   ```

5. **Test the service**
   ```bash
   curl -X POST http://localhost:8000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Hello",
       "context": [],
       "retrieved_docs": []
     }'
   ```

#### Performance Notes (CPU Mode)
- **Inference Time**: 30-120 seconds per query (Gemma-3 12B on modern CPUs)
- **Memory Usage**: 8-16GB RAM
- **Best For**: Development, testing, small deployments
- **Optimization**: Increase `LLM_N_THREADS` for multi-core CPUs

---

### GPU Mode Setup

#### Prerequisites

1. **NVIDIA Driver 535+**
   ```bash
   # Check current driver version
   nvidia-smi

   # Install/update if needed (Ubuntu/Debian)
   sudo ubuntu-drivers autoinstall
   ```

2. **Docker 24.0+**
   ```bash
   docker --version
   ```

3. **NVIDIA Container Toolkit**
   ```bash
   # Install from official repository
   curl https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
   sudo apt-get update
   sudo apt-get install -y nvidia-docker2

   # Configure Docker daemon
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker

   # Verify installation
   docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
   ```

#### Steps

1. **Verify GPU is accessible**
   ```bash
   docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
   ```

   You should see output showing your GPU(s).

2. **Set GPU environment variables**
   ```bash
   # Create/update .env
   cp .env.example .env

   # Add GPU settings
   cat << EOF >> .env
   LLM_MODE=gpu
   LLM_DOCKERFILE=Dockerfile.gpu
   LLM_N_GPU_LAYERS=50
   LLM_N_CTX=4096
   LLM_N_THREADS=6
   EMBEDDING_DEVICE=cuda
   MINERU_DEVICE=cuda
   EOF
   ```

3. **Start GPU service**
   ```bash
   # Using GPU compose override
   docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d

   # Or set environment variable and use standard command
   export LLM_DOCKERFILE=Dockerfile.gpu
   export LLM_N_GPU_LAYERS=50
   export EMBEDDING_DEVICE=cuda
   export MINERU_DEVICE=cuda
   docker-compose --profile llm up -d
   ```

4. **Verify GPU utilization**
   ```bash
   # Monitor GPU memory and utilization
   docker exec pms-llm-service nvidia-smi -l 1  # Refresh every second

   # Check container GPU access
   docker run --rm --gpus all pms-llm-service nvidia-smi
   ```

5. **Test the service**
   ```bash
   curl -X POST http://localhost:8000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Hello",
       "context": [],
       "retrieved_docs": []
     }'
   ```

#### Performance Notes (GPU Mode)
- **Inference Time**: 2-10 seconds per query (on NVIDIA A100/RTX 4090)
- **Memory Usage**: 6-8GB VRAM for Gemma-3 12B
- **Shared Memory**: 16GB shared memory allocated in docker-compose.gpu.yml
- **Best For**: Production, real-time inference, high-throughput
- **Optimization**: Tune `LLM_N_GPU_LAYERS` based on VRAM availability

---

## Switching Between Modes

### From CPU to GPU

```bash
# Stop current service
docker-compose --profile llm down

# Update environment
sed -i 's/LLM_DOCKERFILE=Dockerfile.cpu/LLM_DOCKERFILE=Dockerfile.gpu/' .env
sed -i 's/LLM_N_GPU_LAYERS=0/LLM_N_GPU_LAYERS=50/' .env
sed -i 's/EMBEDDING_DEVICE=cpu/EMBEDDING_DEVICE=cuda/' .env
sed -i 's/MINERU_DEVICE=cpu/MINERU_DEVICE=cuda/' .env

# Rebuild and start
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d --build
```

### From GPU to CPU

```bash
# Stop current service
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm down

# Update environment
sed -i 's/LLM_DOCKERFILE=Dockerfile.gpu/LLM_DOCKERFILE=Dockerfile.cpu/' .env
sed -i 's/LLM_N_GPU_LAYERS=50/LLM_N_GPU_LAYERS=0/' .env
sed -i 's/EMBEDDING_DEVICE=cuda/EMBEDDING_DEVICE=cpu/' .env
sed -i 's/MINERU_DEVICE=cuda/MINERU_DEVICE=cpu/' .env

# Rebuild and start
docker-compose --profile llm up -d --build
```

---

## Useful Commands

### Monitor Service

```bash
# View logs
docker logs pms-llm-service

# Monitor in real-time
docker logs -f pms-llm-service

# GPU monitoring (GPU mode only)
docker exec pms-llm-service nvidia-smi -l 1
```

### Health Checks

```bash
# Check service health
curl http://localhost:8000/health

# Check if backend can reach LLM service
curl http://localhost:8083/actuator/health | jq '.components.aiServiceClient'
```

### Scaling Resources

#### CPU Mode Optimization
```bash
# Increase threads for multi-core systems
echo "LLM_N_THREADS=16" >> .env

# Increase context window if RAM available
echo "LLM_N_CTX=4096" >> .env

# Restart service
docker-compose --profile llm restart
```

#### GPU Mode Optimization
```bash
# Use more GPU layers for faster inference (if VRAM allows)
echo "LLM_N_GPU_LAYERS=80" >> .env

# Increase max tokens
echo "MAX_TOKENS=512" >> .env

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d --build
```

---

## Troubleshooting

### CPU Mode Issues

**Problem**: Service is slow or timing out
```bash
# Solution 1: Increase threads
sed -i 's/LLM_N_THREADS=.*/LLM_N_THREADS=16/' .env
docker-compose --profile llm restart

# Solution 2: Reduce context window
sed -i 's/LLM_N_CTX=.*/LLM_N_CTX=1024/' .env
docker-compose --profile llm restart

# Solution 3: Check available memory
free -h
```

**Problem**: Out of memory errors
```bash
# Check actual memory usage
docker stats pms-llm-service

# Reduce context or threads
sed -i 's/LLM_N_CTX=.*/LLM_N_CTX=1024/' .env
sed -i 's/LLM_N_THREADS=.*/LLM_N_THREADS=4/' .env
docker-compose --profile llm restart
```

### GPU Mode Issues

**Problem**: GPU not detected
```bash
# Verify NVIDIA runtime is installed
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# If failed, reinstall NVIDIA Container Toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

**Problem**: CUDA out of memory
```bash
# Reduce GPU layers
sed -i 's/LLM_N_GPU_LAYERS=.*/LLM_N_GPU_LAYERS=30/' .env

# Reduce max tokens
sed -i 's/MAX_TOKENS=.*/MAX_TOKENS=128/' .env

# Restart
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm restart
```

**Problem**: Device not found error
```bash
# Check GPU availability
nvidia-smi

# Make sure Docker has GPU access
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# Verify compose file includes GPU configuration
grep -A 5 "devices:" docker-compose.gpu.yml
```

---

## Performance Comparison

| Metric | CPU Mode | GPU Mode (RTX 4090) | GPU Mode (A100) |
|--------|----------|-------------------|-----------------|
| Inference Time (token) | 80-200ms | 5-15ms | 2-5ms |
| Memory Usage | 8-16GB RAM | 6-8GB VRAM | 5-7GB VRAM |
| Max Throughput (req/s) | 0.5-2 | 10-50 | 50-100 |
| Cost per Query | Low (CPU) | Medium (GPU) | High (GPU) |
| Best Use Case | Dev/Test | Production | High-Scale Prod |

---

## File Locations

- **CPU Dockerfile**: `llm-service/Dockerfile.cpu`
- **GPU Dockerfile**: `llm-service/Dockerfile.gpu`
- **CPU Compose**: `docker-compose.cpu.yml`
- **GPU Compose**: `docker-compose.gpu.yml`
- **Main Compose**: `docker-compose.yml` (base configuration)
- **Environment**: `.env` (created from `.env.example`)

---

## Additional Resources

- [NVIDIA Container Toolkit Docs](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Llama.cpp Documentation](https://github.com/ggerganov/llama.cpp)
- [Gemma Model Cards](https://ai.google.dev/gemma)
