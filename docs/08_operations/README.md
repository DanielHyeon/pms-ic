# 운영 가이드

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: operations, backend, llm -->

---

## 이 문서가 답하는 질문

- 시스템을 어떻게 배포하는가?
- 환경 설정은 어떻게 하는가?
- 시스템을 어떻게 모니터링하는가?
- 문제가 발생하면 어떻게 대응하는가?

---

## 1. 빠른 시작

### 사전 요구사항

- Docker 24.0+
- Docker Compose 2.20+
- 최소 16GB RAM
- 50GB 디스크 공간

### 모든 서비스 시작

```bash
# 개발 모드로 시작
docker-compose up -d

# 모든 서비스 실행 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

### 서비스 URL

| 서비스 | URL | 목적 |
|--------|-----|------|
| 프론트엔드 | http://localhost:5173 | React SPA |
| 백엔드 | http://localhost:8083 | Spring Boot API |
| LLM 서비스 | http://localhost:8000 | AI/LLM |
| Neo4j 브라우저 | http://localhost:7474 | 그래프 DB UI |

---

## 2. 환경 설정

### 필수 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 | `strongpassword` |
| `NEO4J_PASSWORD` | Neo4j 비밀번호 | `neo4jpassword` |
| `JWT_SECRET` | JWT 서명 키 | Base64 인코딩 키 |
| `AI_SERVICE_URL` | LLM 서비스 URL | `http://llm-service:8000` |

### LLM 설정

| 변수 | CPU 값 | GPU 값 |
|------|--------|--------|
| `LLM_N_GPU_LAYERS` | 0 | 50 |
| `LLM_N_CTX` | 2048 | 4096 |
| `EMBEDDING_DEVICE` | cpu | cuda |

### 데이터베이스 설정

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `POSTGRES_HOST` | postgres | PostgreSQL 호스트 |
| `POSTGRES_PORT` | 5433 | PostgreSQL 포트 |
| `POSTGRES_DB` | pms_db | 데이터베이스 이름 |
| `NEO4J_URI` | bolt://neo4j:7687 | Neo4j 연결 URI |
| `REDIS_HOST` | redis | Redis 호스트 |
| `REDIS_PORT` | 6379 | Redis 포트 |

---

## 3. 서비스 헬스 체크

| 서비스 | 헬스 엔드포인트 | 예상 응답 |
|--------|----------------|----------|
| 백엔드 | `GET /actuator/health` | `{"status":"UP"}` |
| LLM 서비스 | `GET /health` | `{"status":"healthy"}` |
| PostgreSQL | `pg_isready -U pms_user` | Exit 0 |
| Neo4j | `GET :7474` | HTTP 200 |
| Redis | `redis-cli ping` | `PONG` |

---

## 4. 일반 운영 작업

### 서비스 재시작

```bash
docker-compose restart <service-name>

# 예시
docker-compose restart backend
docker-compose restart llm-service
```

### 로그 확인

```bash
# 모든 서비스
docker-compose logs -f

# 특정 서비스
docker-compose logs -f backend

# 마지막 100줄
docker-compose logs --tail=100 llm-service
```

### 데이터베이스 작업

```bash
# PostgreSQL 셸
docker exec -it pms-postgres psql -U pms_user -d pms_db

# Neo4j 셸
docker exec -it pms-neo4j cypher-shell -u neo4j -p <password>

# Redis 셸
docker exec -it pms-redis redis-cli
```

### PostgreSQL -> Neo4j 전체 동기화

```bash
docker exec -it pms-llm-service python run_sync.py full
```

---

## 5. 배포 절차

### 개발 환경

```bash
# 1. 환경 파일 복사
cp .env.example .env

# 2. 필수 변수 설정
vi .env

# 3. 서비스 시작
docker-compose up -d

# 4. 데이터베이스 마이그레이션
docker exec -it pms-backend ./gradlew flywayMigrate
```

### 운영 환경

```bash
# 1. 이미지 빌드
docker-compose -f docker-compose.prod.yml build

# 2. 무중단 배포
docker-compose -f docker-compose.prod.yml up -d --no-deps backend

# 3. 헬스 체크 확인
curl http://localhost:8083/actuator/health
```

---

## 6. 백업 및 복구

### PostgreSQL 백업

```bash
# 백업 생성
docker exec pms-postgres pg_dump -U pms_user pms_db > backup_$(date +%Y%m%d).sql

# 백업 복구
docker exec -i pms-postgres psql -U pms_user pms_db < backup_20260202.sql
```

### Neo4j 백업

```bash
# 백업 생성
docker exec pms-neo4j neo4j-admin database dump neo4j --to-path=/backups

# 백업 복구
docker exec pms-neo4j neo4j-admin database load neo4j --from-path=/backups
```

---

## 7. 문제 해결

| 증상 | 가능한 원인 | 해결 방법 |
|------|------------|----------|
| 백엔드 시작 안됨 | DB 준비 안됨 | PostgreSQL 로그 확인 |
| LLM 타임아웃 | 모델 로딩 중 | 대기, 메모리 확인 |
| API에서 403 | 인증 실패 | JWT, 프로젝트 멤버십 확인 |
| RAG 결과 없음 | Neo4j 동기화 안됨 | 전체 동기화 실행 |
| 느린 응답 | 리소스 경합 | 컨테이너 리소스 확인 |

### 일반적인 오류 해결

#### 백엔드 시작 실패

```bash
# PostgreSQL 상태 확인
docker-compose logs postgres

# 연결 테스트
docker exec pms-backend pg_isready -h postgres -U pms_user
```

#### LLM 서비스 메모리 부족

```bash
# 메모리 사용량 확인
docker stats pms-llm-service

# 컨테이너 메모리 제한 조정
# docker-compose.yml에서 mem_limit 수정
```

#### Neo4j 동기화 문제

```bash
# Outbox 이벤트 확인
docker exec pms-postgres psql -U pms_user -d pms_db \
  -c "SELECT * FROM project.outbox_events WHERE processed = false LIMIT 10;"

# 수동 동기화 실행
docker exec pms-llm-service python run_sync.py incremental
```

---

## 8. 모니터링

### 주요 지표

| 지표 | 정상 범위 | 알림 임계값 |
|------|----------|------------|
| API 응답 시간 | < 200ms | > 1000ms |
| LLM 응답 시간 | < 5s | > 30s |
| 메모리 사용률 | < 70% | > 90% |
| 디스크 사용률 | < 80% | > 95% |
| 오류율 | < 1% | > 5% |

### 로그 레벨 조정

```bash
# 백엔드 로그 레벨 변경
docker exec pms-backend curl -X POST \
  http://localhost:8083/actuator/loggers/com.pms \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel":"DEBUG"}'
```

---

## 9. 관련 문서

| 문서 | 설명 |
|------|------|
| [../01_architecture/](../01_architecture/) | 시스템 아키텍처 |
| [../../docker-compose.yml](../../docker-compose.yml) | Docker 설정 |
| [../../.env.example](../../.env.example) | 환경 템플릿 |

---

*최종 수정일: 2026-02-02*
