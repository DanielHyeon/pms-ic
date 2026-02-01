# [Service/System] Operations Documentation

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]

<!-- affects: all services -->

---

## Questions This Document Answers

- How do I deploy this?
- How do I configure it?
- How do I monitor it?
- What do I do when something breaks?

---

## 1. Deployment

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | 2.0+ | Orchestration |
| [Other] | [Version] | [Purpose] |

### Quick Start

```bash
# Clone and start
git clone [repo]
cd [project]
docker-compose up -d

# Verify services
docker-compose ps
```

### Service URLs

| Service | URL | Health Check |
|---------|-----|--------------|
| Frontend | http://localhost:5173 | / |
| Backend | http://localhost:8083 | /actuator/health |
| LLM Service | http://localhost:8000 | /health |

---

## 2. Environment Configuration

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | PostgreSQL connection | postgresql://... | Yes |
| JWT_SECRET | Token signing key | [random 256-bit] | Yes |
| REDIS_URL | Redis connection | redis://localhost:6379 | Yes |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| LOG_LEVEL | Logging verbosity | INFO |
| MAX_POOL_SIZE | DB connection pool | 10 |

### Environment Files

```
.env.example     # Template (commit this)
.env             # Local config (DO NOT COMMIT)
.env.production  # Production config (secrets manager)
```

---

## 3. Service Architecture

### Container Topology

```
                    ┌─────────────┐
                    │   nginx     │ :80, :443
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Frontend   │ │   Backend   │ │ LLM Service │
    │    :5173    │ │    :8083    │ │    :8000    │
    └─────────────┘ └──────┬──────┘ └──────┬──────┘
                           │               │
                    ┌──────▼──────┐ ┌──────▼──────┐
                    │ PostgreSQL  │ │    Neo4j    │
                    │    :5433    │ │    :7687    │
                    └─────────────┘ └─────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │    :6379    │
                    └─────────────┘
```

### Port Assignments

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| Frontend | 5173 | 5173 |
| Backend | 8083 | 8083 |
| LLM Service | 8000 | 8000 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6379 |
| Neo4j | 7687, 7474 | 7687, 7474 |

---

## 4. Monitoring

### Health Checks

```bash
# Backend
curl http://localhost:8083/actuator/health

# LLM Service
curl http://localhost:8000/health

# Database
docker-compose exec postgres pg_isready
```

### Key Metrics

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU % | > 70% | > 90% | Scale up |
| Memory % | > 75% | > 90% | Check for leaks |
| Response time | > 2s | > 5s | Investigate |
| Error rate | > 1% | > 5% | Alert oncall |

### Logging

| Service | Log Location | Format |
|---------|--------------|--------|
| Backend | stdout / /var/log/app | JSON |
| LLM Service | stdout / /var/log/llm | JSON |
| Nginx | /var/log/nginx | Combined |

### Log Queries

```bash
# Recent errors
docker-compose logs --tail=100 backend | grep ERROR

# LLM failures
docker-compose logs llm-service | grep -E "(FAIL|ERROR)"
```

---

## 5. Incident Response

### Severity Levels

| Level | Definition | Response Time |
|-------|------------|---------------|
| P1 | Service down, data loss risk | Immediate |
| P2 | Major feature broken | 1 hour |
| P3 | Minor feature broken | 4 hours |
| P4 | Cosmetic/minor issue | Next sprint |

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs [service]

# Check resource usage
docker stats

# Restart service
docker-compose restart [service]
```

#### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check connection pool
curl http://localhost:8083/actuator/metrics/hikaricp.connections.active
```

#### LLM Service Slow

```bash
# Check GPU utilization (if applicable)
nvidia-smi

# Check queue depth
curl http://localhost:8000/metrics | grep queue

# Restart if stuck
docker-compose restart llm-service
```

### Escalation Path

1. **On-call engineer**: Initial triage
2. **Team lead**: P1/P2 decisions
3. **Engineering manager**: Customer communication
4. **CTO**: Major incidents

---

## 6. Backup & Recovery

### Backup Schedule

| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| PostgreSQL | Daily | 30 days | S3/backup |
| Neo4j | Daily | 14 days | S3/backup |
| Redis | Hourly | 24 hours | Local |

### Backup Commands

```bash
# PostgreSQL backup
docker-compose exec postgres pg_dump -U postgres pms > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres pms < backup.sql
```

### Recovery Procedures

1. Stop affected service
2. Restore from latest backup
3. Replay transactions if needed
4. Verify data integrity
5. Restart service
6. Monitor for issues

---

## 7. Scaling

### Horizontal Scaling

| Service | Can Scale | Considerations |
|---------|-----------|----------------|
| Frontend | Yes | CDN recommended |
| Backend | Yes | Session affinity for WS |
| LLM Service | Yes | GPU availability |
| PostgreSQL | Read replicas | Write to primary only |

### Vertical Scaling

| Service | Recommended Resources |
|---------|----------------------|
| Backend | 2 CPU, 4GB RAM |
| LLM Service | 4 CPU, 16GB RAM, GPU |
| PostgreSQL | 2 CPU, 8GB RAM |

---

## 8. Maintenance Windows

### Scheduled Maintenance

- **When**: Sundays 02:00-04:00 UTC
- **Notification**: 48 hours advance
- **Process**: Blue-green deployment

### Maintenance Checklist

- [ ] Notify users
- [ ] Create backup
- [ ] Deploy to staging
- [ ] Verify staging
- [ ] Deploy to production
- [ ] Verify production
- [ ] Monitor for 30 minutes

---

## Related Documents

- [env_config.md](./env_config.md) - Detailed environment setup
- [monitoring.md](./monitoring.md) - Monitoring setup
- [incident_response.md](./incident_response.md) - Full incident playbook

---

*Operations documentation is for operators, not developers.*
