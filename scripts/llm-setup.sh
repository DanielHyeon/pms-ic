#!/bin/bash

# PMS LLM Service Setup Script
# Easily switch between CPU and GPU modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_success ".env created"
fi

# Parse arguments
MODE=${1:-help}

case $MODE in
    cpu)
        print_header "Setting up CPU Mode"

        # Ensure LLM variables exist in .env, add if missing
        grep -q "^LLM_DOCKERFILE=" .env || echo "LLM_DOCKERFILE=Dockerfile.cpu" >> .env
        grep -q "^LLM_N_GPU_LAYERS=" .env || echo "LLM_N_GPU_LAYERS=0" >> .env
        grep -q "^LLM_N_CTX=" .env || echo "LLM_N_CTX=2048" >> .env
        grep -q "^LLM_N_THREADS=" .env || echo "LLM_N_THREADS=8" >> .env
        grep -q "^EMBEDDING_DEVICE=" .env || echo "EMBEDDING_DEVICE=cpu" >> .env

        # Update .env
        sed -i.bak \
            -e 's/^LLM_DOCKERFILE=.*/LLM_DOCKERFILE=Dockerfile.cpu/' \
            -e 's/^LLM_N_GPU_LAYERS=.*/LLM_N_GPU_LAYERS=0/' \
            -e 's/^LLM_N_CTX=.*/LLM_N_CTX=2048/' \
            -e 's/^LLM_N_THREADS=.*/LLM_N_THREADS=8/' \
            -e 's/^EMBEDDING_DEVICE=.*/EMBEDDING_DEVICE=cpu/' \
            .env

        print_success "Environment variables updated for CPU mode"

        # Stop existing services
        print_warning "Stopping existing services..."
        docker-compose --profile llm down 2>/dev/null || true

        # Start CPU mode
        print_header "Starting LLM service in CPU mode..."
        docker-compose --profile llm up -d

        sleep 3

        # Health check
        if curl -s http://localhost:8000/health > /dev/null; then
            print_success "LLM service is running in CPU mode"
            echo -e "${BLUE}Service Info:${NC}"
            echo "  URL: http://localhost:8000"
            echo "  Mode: CPU"
            echo "  Max Context: 2048 tokens"
            echo "  Threads: 8"
        else
            print_error "Health check failed. View logs with: docker logs -f pms-llm-service"
        fi
        ;;

    gpu)
        print_header "Setting up GPU Mode"

        # Check NVIDIA driver
        if ! command -v nvidia-smi &> /dev/null; then
            print_error "NVIDIA driver not found. Please install NVIDIA driver 535+"
            exit 1
        fi

        print_success "NVIDIA driver found"
        nvidia-smi --query-gpu=name --format=csv,noheader

        # Check Docker GPU support
        if ! docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi > /dev/null 2>&1; then
            print_error "Docker GPU support not configured. Run:"
            echo "  sudo nvidia-ctk runtime configure --runtime=docker"
            echo "  sudo systemctl restart docker"
            exit 1
        fi

        print_success "Docker GPU support configured"

        # Ensure LLM variables exist in .env, add if missing
        grep -q "^LLM_DOCKERFILE=" .env || echo "LLM_DOCKERFILE=Dockerfile.gpu" >> .env
        grep -q "^LLM_N_GPU_LAYERS=" .env || echo "LLM_N_GPU_LAYERS=50" >> .env
        grep -q "^LLM_N_CTX=" .env || echo "LLM_N_CTX=4096" >> .env
        grep -q "^LLM_N_THREADS=" .env || echo "LLM_N_THREADS=6" >> .env
        grep -q "^EMBEDDING_DEVICE=" .env || echo "EMBEDDING_DEVICE=cuda" >> .env

        # Update .env
        sed -i.bak \
            -e 's/^LLM_DOCKERFILE=.*/LLM_DOCKERFILE=Dockerfile.gpu/' \
            -e 's/^LLM_N_GPU_LAYERS=.*/LLM_N_GPU_LAYERS=50/' \
            -e 's/^LLM_N_CTX=.*/LLM_N_CTX=4096/' \
            -e 's/^LLM_N_THREADS=.*/LLM_N_THREADS=6/' \
            -e 's/^EMBEDDING_DEVICE=.*/EMBEDDING_DEVICE=cuda/' \
            .env

        print_success "Environment variables updated for GPU mode"

        # Stop existing services
        print_warning "Stopping existing services..."
        docker-compose --profile llm down 2>/dev/null || true

        # Start GPU mode
        print_header "Starting LLM service in GPU mode..."
        docker-compose -f docker-compose.yml -f docker-compose.gpu.yml --profile llm up -d --build

        sleep 5

        # Health check
        if curl -s http://localhost:8000/health > /dev/null; then
            print_success "LLM service is running in GPU mode"
            echo -e "${BLUE}Service Info:${NC}"
            echo "  URL: http://localhost:8000"
            echo "  Mode: GPU"
            echo "  Max Context: 4096 tokens"

            # Show GPU status
            if docker exec pms-llm-service nvidia-smi > /dev/null 2>&1; then
                echo ""
                echo -e "${BLUE}GPU Status:${NC}"
                docker exec pms-llm-service nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader
            fi
        else
            print_error "Health check failed. View logs with: docker logs -f pms-llm-service"
        fi
        ;;

    status)
        print_header "LLM Service Status"

        # Check if service is running
        if docker ps --filter "name=pms-llm-service" --quiet | grep -q .; then
            print_success "LLM service is running"

            # Get current mode from environment
            DEVICE=$(grep "^EMBEDDING_DEVICE=" .env | cut -d'=' -f2)
            echo "  Mode: $([ "$DEVICE" = "cuda" ] && echo "GPU" || echo "CPU")"

            # Health check
            if curl -s http://localhost:8000/health > /dev/null; then
                print_success "Service is healthy"
            else
                print_error "Service is not responding to health check"
            fi

            # Show resource usage
            echo -e "${BLUE}Resource Usage:${NC}"
            docker stats pms-llm-service --no-stream
        else
            print_warning "LLM service is not running"
            echo "Start it with: docker-compose --profile llm up -d"
        fi
        ;;

    logs)
        print_header "LLM Service Logs"
        docker logs -f pms-llm-service
        ;;

    stop)
        print_header "Stopping LLM Service"
        docker-compose --profile llm down
        print_success "LLM service stopped"
        ;;

    restart)
        print_header "Restarting LLM Service"
        docker-compose --profile llm restart
        print_success "LLM service restarted"
        ;;

    *)
        cat << EOF

${BLUE}PMS LLM Service Setup Script${NC}

Usage: ./llm-setup.sh [COMMAND]

Commands:
  cpu       - Setup and start in CPU mode (default)
  gpu       - Setup and start in GPU mode (requires NVIDIA setup)
  status    - Show current service status
  logs      - View service logs
  restart   - Restart the service
  stop      - Stop the service
  help      - Show this help message

Examples:
  # Start in CPU mode
  ./llm-setup.sh cpu

  # Start in GPU mode (requires NVIDIA Container Toolkit)
  ./llm-setup.sh gpu

  # Check service status
  ./llm-setup.sh status

  # View logs
  ./llm-setup.sh logs

For detailed setup instructions, see: docs/LLM_GUIDE.md

${YELLOW}GPU Mode Requirements:${NC}
  - NVIDIA Driver 535+
  - Docker 24.0+
  - NVIDIA Container Toolkit installed

To install NVIDIA Container Toolkit:
  sudo nvidia-ctk runtime configure --runtime=docker
  sudo systemctl restart docker

EOF
        exit 0
        ;;
esac
