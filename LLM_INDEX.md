# PMS LLM Service - Complete Index

This is the main reference guide for GPU/CPU configuration of the PMS LLM service.

## 📖 Documentation Map

### Start Here (Choose One)
- **[QUICKSTART_LLM.md](QUICKSTART_LLM.md)** ⭐ **START HERE**
  - 30-second quick start guide
  - Basic commands and usage
  - Perfect for first-time setup

### Understanding the Setup
- **[LLM_CONFIG_README.md](LLM_CONFIG_README.md)**
  - Configuration reference
  - Mode comparison
  - Environment variables explained
  - Common examples

- **[docs/LLM_ARCHITECTURE.md](docs/LLM_ARCHITECTURE.md)**
  - System architecture diagrams
  - CPU vs GPU architecture
  - Data flow visualization
  - Deployment scenarios

### Deep Dives
- **[LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md)**
  - Comprehensive setup instructions
  - GPU prerequisites and setup
  - CPU optimization tips
  - Troubleshooting guide
  - Performance tuning

- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
  - Technical specifications
  - File structure
  - Integration points
  - Future enhancements

---

## 🚀 Quick Start

### Option A: Using Setup Script (Recommended)
```bash
cd /home/daniel/projects/pms-ic

# CPU mode (no GPU needed)
./llm-setup.sh cpu

# Verify it's running
./llm-setup.sh status
```

### Option B: Using Docker Compose
```bash
# CPU mode
docker-compose --profile llm up -d

# GPU mode
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d
```

---

## 📂 File Organization

### Dockerfiles
```
llm-service/
├── Dockerfile.cpu      CPU-optimized build (Python 3.11 slim, ~800MB)
└── Dockerfile.gpu      GPU-optimized build (CUDA 12.3, ~10GB)
```

### Docker Compose
```
├── docker-compose.yml          Base configuration (updated)
├── docker-compose.cpu.yml      CPU mode overrides
└── docker-compose.gpu.yml      GPU mode overrides
```

### Configuration
```
├── .env.example       Updated with LLM settings
└── llm-setup.sh       Interactive setup script
```

### Documentation
```
├── QUICKSTART_LLM.md               ⭐ Start here (5 min)
├── LLM_CONFIG_README.md            Configuration reference
├── LLM_SETUP_GUIDE.md              Comprehensive guide
├── IMPLEMENTATION_SUMMARY.md       Technical specs
├── docs/LLM_ARCHITECTURE.md        Architecture & diagrams
└── LLM_INDEX.md                    This file
```

---

## 🎯 Common Tasks

### Setup CPU Mode
```bash
./llm-setup.sh cpu
```
See: [QUICKSTART_LLM.md](QUICKSTART_LLM.md) → CPU Mode

### Setup GPU Mode
```bash
./llm-setup.sh gpu
```
See: [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md) → GPU Prerequisites

### Check Service Status
```bash
./llm-setup.sh status
curl http://localhost:8000/health
```

### View Logs
```bash
./llm-setup.sh logs
# or
docker logs -f pms-llm-service
```

### Switch Modes
```bash
# From CPU to GPU
./llm-setup.sh gpu

# From GPU to CPU
./llm-setup.sh cpu
```

### Troubleshoot Issues
See: [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md) → Troubleshooting

---

## 🔧 Commands Reference

| Command | Purpose |
|---------|---------|
| `./llm-setup.sh help` | Show help |
| `./llm-setup.sh cpu` | Setup CPU mode |
| `./llm-setup.sh gpu` | Setup GPU mode |
| `./llm-setup.sh status` | Show status |
| `./llm-setup.sh logs` | View logs |
| `./llm-setup.sh restart` | Restart service |
| `./llm-setup.sh stop` | Stop service |

---

## 📊 Performance

### CPU Mode
- **Speed:** 80-200ms/token
- **Throughput:** 0.5-2 req/sec
- **Memory:** 8-16GB RAM
- **Best For:** Development & Testing

### GPU Mode (RTX 4090)
- **Speed:** 5-15ms/token
- **Throughput:** 10-50+ req/sec
- **Memory:** 6-8GB VRAM
- **Best For:** Production & Real-time

See: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) → Performance

---

## 🔑 Environment Variables

### CPU Mode
```env
LLM_DOCKERFILE=Dockerfile.cpu
LLM_N_GPU_LAYERS=0
LLM_N_CTX=2048
LLM_N_THREADS=8
EMBEDDING_DEVICE=cpu
MINERU_DEVICE=cpu
```

### GPU Mode
```env
LLM_DOCKERFILE=Dockerfile.gpu
LLM_N_GPU_LAYERS=50
LLM_N_CTX=4096
LLM_N_THREADS=6
EMBEDDING_DEVICE=cuda
MINERU_DEVICE=cuda
```

See: [LLM_CONFIG_README.md](LLM_CONFIG_README.md) → Environment Variables

---

## 🎓 Learning Path

### 5 Minutes
Read: [QUICKSTART_LLM.md](QUICKSTART_LLM.md)
- Basic setup
- Quick commands

### 15 Minutes
Read: [LLM_CONFIG_README.md](LLM_CONFIG_README.md)
- Configuration options
- Environment variables
- Examples

### 30 Minutes
Read: [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md)
- Detailed setup instructions
- GPU prerequisites
- Troubleshooting

### 45 Minutes (Optional)
Read: [docs/LLM_ARCHITECTURE.md](docs/LLM_ARCHITECTURE.md)
- System architecture
- Data flow
- Deployment scenarios

---

## ❓ FAQ

**Q: Do I need a GPU?**
A: No. CPU mode works without any GPU hardware. See [QUICKSTART_LLM.md](QUICKSTART_LLM.md)

**Q: How do I switch between modes?**
A: Use `./llm-setup.sh cpu` or `./llm-setup.sh gpu`. See [LLM_CONFIG_README.md](LLM_CONFIG_README.md)

**Q: What if the service won't start?**
A: Check logs with `./llm-setup.sh logs`. See [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md) → Troubleshooting

**Q: How do I improve performance?**
A: For CPU, increase threads. For GPU, increase layers. See [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md) → Optimization

**Q: Can I use multiple GPUs?**
A: Current setup uses `count: all` in GPU mode. See [docs/LLM_ARCHITECTURE.md](docs/LLM_ARCHITECTURE.md)

---

## 🔗 Related Documentation

- **Backend Integration:** [AIChatClient.java](PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/chat/service/AIChatClient.java)
- **Configuration:** [application.yml](PMS_IC_BackEnd_v1.2/src/main/resources/application.yml)
- **Project Guide:** [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## 📝 Git Commits

| Commit | Message |
|--------|---------|
| 84761cd | Feat: Add GPU and CPU mode configuration for LLM service |
| c958158 | Docs: Add LLM service quick start guide |
| ae09fb1 | Docs: Add LLM architecture and deployment diagrams |
| beed2cf | Docs: Add implementation summary for GPU/CPU setup |

---

## 🆘 Getting Help

1. **Quick Start Issues:** See [QUICKSTART_LLM.md](QUICKSTART_LLM.md)
2. **Configuration Questions:** See [LLM_CONFIG_README.md](LLM_CONFIG_README.md)
3. **Setup Problems:** See [LLM_SETUP_GUIDE.md](LLM_SETUP_GUIDE.md) → Troubleshooting
4. **Architecture Understanding:** See [docs/LLM_ARCHITECTURE.md](docs/LLM_ARCHITECTURE.md)
5. **Technical Details:** See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## ✅ Checklist

Setup Checklist:
- [ ] Read [QUICKSTART_LLM.md](QUICKSTART_LLM.md)
- [ ] Run `./llm-setup.sh cpu` or `./llm-setup.sh gpu`
- [ ] Verify with `./llm-setup.sh status`
- [ ] Test with `curl http://localhost:8000/health`
- [ ] Read [LLM_CONFIG_README.md](LLM_CONFIG_README.md) for customization

---

**Last Updated:** 2026-01-17
**Version:** 1.0.0
**Status:** Production Ready ✅
