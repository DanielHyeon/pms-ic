# Operations Guide

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- How do I deploy the system?
- What are the environment configurations?
- How do I monitor the system?
- What do I do when something breaks?

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [deployment.md](./deployment.md) | Deployment procedures |
| [env_config.md](./env_config.md) | Environment variables |
| [monitoring.md](./monitoring.md) | Monitoring and alerting |
| [incident_response.md](./incident_response.md) | Incident handling |
| [backup_restore.md](./backup_restore.md) | Backup procedures |

---

## 1. Quick Start

### Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 16GB RAM minimum
- 50GB disk space

### Start All Services

```bash
# Start in development mode
docker-compose up -d

# Verify all services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React SPA |
| Backend | http://localhost:8083 | Spring Boot API |
| LLM Service | http://localhost:8000 | AI/LLM |
| Neo4j Browser | http://localhost:7474 | Graph DB UI |

---

## 2. Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password | `strongpassword` |
| `NEO4J_PASSWORD` | Neo4j password | `neo4jpassword` |
| `JWT_SECRET` | JWT signing key | Base64 encoded key |
| `AI_SERVICE_URL` | LLM service URL | `http://llm-service:8000` |

### LLM Configuration

| Variable | CPU Value | GPU Value |
|----------|-----------|-----------|
| `LLM_N_GPU_LAYERS` | 0 | 50 |
| `LLM_N_CTX` | 2048 | 4096 |
| `EMBEDDING_DEVICE` | cpu | cuda |

---

## 3. Service Health Checks

| Service | Health Endpoint | Expected |
|---------|----------------|----------|
| Backend | `GET /actuator/health` | `{"status":"UP"}` |
| LLM Service | `GET /health` | `{"status":"healthy"}` |
| PostgreSQL | `pg_isready -U pms_user` | Exit 0 |
| Neo4j | `GET :7474` | HTTP 200 |
| Redis | `redis-cli ping` | `PONG` |

---

## 4. Common Operations

### Restart a Service

```bash
docker-compose restart <service-name>

# Examples
docker-compose restart backend
docker-compose restart llm-service
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 llm-service
```

### Database Operations

```bash
# PostgreSQL shell
docker exec -it pms-postgres psql -U pms_user -d pms_db

# Neo4j shell
docker exec -it pms-neo4j cypher-shell -u neo4j -p <password>
```

### Full Sync PostgreSQL → Neo4j

```bash
docker exec -it pms-llm-service python run_sync.py full
```

---

## 5. Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Backend won't start | DB not ready | Check PostgreSQL logs |
| LLM timeout | Model loading | Wait, check memory |
| 403 on API | Auth failure | Check JWT, project membership |
| No RAG results | Neo4j not synced | Run full sync |
| Slow responses | Resource contention | Check container resources |

---

## 6. Related Documents

| Document | Description |
|----------|-------------|
| [../01_architecture/](../01_architecture/) | System architecture |
| [../../docker-compose.yml](../../docker-compose.yml) | Docker configuration |
| [../../.env.example](../../.env.example) | Environment template |

---

*Last Updated: 2026-01-31*
