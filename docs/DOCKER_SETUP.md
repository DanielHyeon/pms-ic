# Docker Setup Guide

PMS-IC Docker environment setup and configuration guide.

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 16GB+ RAM (32GB recommended for LLM service)
- NVIDIA GPU with CUDA 12.0+ (for LLM service)

## Quick Start

```bash
# Start core services (postgres, redis, neo4j, backend, frontend)
docker-compose up -d

# Start with LLM service
docker-compose --profile llm up -d

# Start with OpenMetadata
docker-compose -f docker-compose.yml -f docker-compose.openmetadata.yml up -d
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5433 | Database |
| Redis | 6379 | Cache/Session |
| Neo4j Browser | 7474 | Graph DB UI |
| Neo4j Bolt | 7687 | Graph DB Protocol |
| Backend | 8083 | Spring Boot API |
| Frontend | 5173 | Vite Dev Server |
| LLM Service | 8000 | AI/Chat API |
| PgAdmin | 5050 | DB Admin UI |
| Redis Commander | 8082 | Redis Admin UI |
| OpenMetadata | 8585 | Data Catalog |

## Default Credentials

> **Warning**: Change default passwords in production environment.

### PostgreSQL

| Property | Value |
|----------|-------|
| Host | localhost:5433 |
| Database | pms_db |
| Username | pms_user |
| Password | pms_password |
| JDBC URL | `jdbc:postgresql://localhost:5433/pms_db` |

Additional schemas: `auth`, `project`, `task`, `chat`, `risk`, `report`

### Neo4j

| Property | Value |
|----------|-------|
| Browser | http://localhost:7474 |
| Bolt URL | bolt://localhost:7687 |
| Username | neo4j |
| Password | pmspassword123 |

### Redis

| Property | Value |
|----------|-------|
| Host | localhost:6379 |
| Password | (none) |
| Commander UI | http://localhost:8082 |

### PgAdmin

| Property | Value |
|----------|-------|
| URL | http://localhost:5050 |
| Email | admin@pms.com |
| Password | admin |

### OpenMetadata

| Property | Value |
|----------|-------|
| URL | http://localhost:8585 |
| Username | admin |
| Password | admin |

### Backend API

| Property | Value |
|----------|-------|
| URL | http://localhost:8083/api |
| Swagger UI | http://localhost:8083/swagger-ui.html |

### Frontend

| Property | Value |
|----------|-------|
| URL | http://localhost:5173 |

## Data Storage

All persistent data is stored in the local `./data/` directory:

```
./data/
├── postgres/           # PostgreSQL data
├── redis/              # Redis AOF/RDB
├── neo4j/
│   ├── data/           # Graph database
│   ├── logs/           # Neo4j logs
│   ├── import/         # Import files
│   └── plugins/        # APOC, etc.
├── qdrant/             # Vector DB (optional)
├── pgadmin/            # PgAdmin config
└── openmetadata/
    ├── data/           # OpenMetadata server
    └── elasticsearch/  # Search index
```

## Service Versions

| Service | Image | Version |
|---------|-------|---------|
| PostgreSQL | postgres:15-alpine | 15.x |
| Redis | redis:7-alpine | 7.x |
| Neo4j | neo4j:5.26.0-community | 5.26.0 |
| Qdrant | qdrant/qdrant:latest | latest |
| Elasticsearch | elasticsearch:8.10.2 | 8.10.2 |
| OpenMetadata | openmetadata/server:1.4.0 | 1.4.0 |

## Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis neo4j

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f llm-service
```

### LLM Service

```bash
# Start with GPU support
docker-compose --profile llm up -d llm-service

# CPU-only mode
LLM_DOCKERFILE=Dockerfile.cpu docker-compose --profile llm up -d llm-service
```

### OpenMetadata Stack

```bash
# Start OpenMetadata
docker-compose -f docker-compose.yml -f docker-compose.openmetadata.yml up -d

# Start with ingestion
docker-compose -f docker-compose.yml -f docker-compose.openmetadata.yml --profile ingestion up -d
```

## Data Backup

### Backup All Data

```bash
tar -czvf pms-data-backup-$(date +%Y%m%d).tar.gz ./data/
```

### Backup Individual Services

```bash
# PostgreSQL
docker exec pms-postgres pg_dumpall -U pms_user > backup.sql

# Neo4j
docker exec pms-neo4j neo4j-admin database dump neo4j --to-path=/data/backup
```

### Restore from Backup

```bash
# Extract backup
tar -xzvf pms-data-backup-YYYYMMDD.tar.gz

# Restart services
docker-compose down && docker-compose up -d
```

## Troubleshooting

### Permission Issues

If containers fail due to permission errors on `./data/`:

```bash
sudo chown -R $(id -u):$(id -g) ./data/
```

### Neo4j Startup Issues

```bash
# Check logs
docker-compose logs neo4j

# Reset Neo4j (WARNING: deletes data)
rm -rf ./data/neo4j/*
docker-compose up -d neo4j
```

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is healthy
docker exec pms-postgres pg_isready -U pms_user -d pms_db

# Check logs
docker-compose logs postgres
```

### Clean Restart

```bash
# Stop and remove containers
docker-compose down

# Remove all data (WARNING: destructive)
rm -rf ./data/*

# Start fresh
docker-compose up -d
```

## Environment Variables

Create `.env` file for custom configuration:

```bash
# Database
POSTGRES_DB=pms_db
POSTGRES_USER=pms_user
POSTGRES_PASSWORD=your_secure_password

# Neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key

# LLM
LLM_N_GPU_LAYERS=35
LLM_N_CTX=4096
```

## Health Checks

| Service | Endpoint |
|---------|----------|
| Backend | `http://localhost:8083/actuator/health` |
| LLM Service | `http://localhost:8000/health` |
| Neo4j | `http://localhost:7474` |
| OpenMetadata | `http://localhost:8585/api/v1/system/version` |
