# LLM Service Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PMS Backend (Spring Boot)                             │
│  Port 8083                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  AIChatClient                                                          │ │
│  │  - Calls llm-service at http://llm-service:8000/api/chat/v2           │ │
│  │  - Falls back to mock on failure                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ TCP 8000
          ┌────────────────────┴────────────────────┐
          │                                         │
          ▼ Primary                                 ▼ Fallback
   ┌──────────────────────────────────────┐  ┌──────────────────┐
   │  LLM Service (Flask)                 │  │  Mock Server     │
   │  Port 8000                           │  │  Port 1080       │
   │                                      │  │                  │
   │  ┌────────────────────────────────┐  │  │  (MockServer)    │
   │  │  Two-Track Workflow            │  │  └──────────────────┘
   │  │  ├─ Track A (L1): 빠른 응답     │  │
   │  │  └─ Track B (L2): 고품질       │  │
   │  └────────────────────────────────┘  │
   │              │                        │
   │  ┌───────────▼────────────────────┐  │
   │  │  RAG Service (Neo4j)           │  │
   │  │  ├─ Vector Search (Embedding)  │  │
   │  │  ├─ Keyword Search (Lucene)    │  │
   │  │  └─ RRF Merge (Rank Fusion)    │  │
   │  └────────────────────────────────┘  │
   └──────────────────────────────────────┘
```

## Two-Track Workflow Architecture

질문 유형에 따라 적절한 모델과 응답 전략을 선택하는 이중 트랙 시스템입니다.

```
사용자 질문
    │
    ▼
┌─────────────────┐
│ Intent 분류     │
│ (규칙 기반)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Track A│ │Track B│
│ (L1)  │ │ (L2)  │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│경량모델│ │중형모델│
│2-4B   │ │8-12B  │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
    최종 응답
```

### Track 비교

| 특성 | Track A (L1) | Track B (L2) |
|------|--------------|--------------|
| 모델 크기 | 2-4B (LFM2, Qwen3-4B) | 8-12B (Qwen3-8B, Gemma-12B) |
| 용도 | FAQ, 정의 질문, 간단한 쿼리 | 주간보고, 분석, 복잡한 쿼리 |
| 응답 시간 | < 500ms 목표 | 30-90s 허용 |
| max_tokens | 300 (간단), 1800 (일반) | 3000 |
| 프롬프트 | "5-7문장으로 간결하게" | "충분히 상세하게" |

### 모델 선택 로직

```python
# chat_workflow_v2.py
if is_definition and is_short:  # "스크럼이란" 같은 질문
    → Track A (L1), max_tokens=300
elif is_report_request:  # "주간보고서 작성해줘"
    → Track B (L2), max_tokens=3000
else:
    → Track A (L1), max_tokens=1800
```

## Hybrid Search Architecture

Vector Search와 Keyword Search를 결합하여 검색 품질을 향상시킵니다.

```
사용자 쿼리: "플래닝 포커란"
              │
        ┌─────┴─────┐
        ▼           ▼
┌─────────────┐ ┌─────────────┐
│Vector Search│ │Keyword Search│
│ (Embedding) │ │  (Lucene)   │
│             │ │             │
│ multilingual│ │ chunk_      │
│ -e5-large   │ │ fulltext    │
└──────┬──────┘ └──────┬──────┘
       │               │
       │  ┌────────────┘
       │  │
       ▼  ▼
┌──────────────────────────┐
│    Hybrid Merge          │
│ ┌──────────────────────┐ │
│ │  RRF (기본값)        │ │
│ │  or Weighted         │ │
│ │  or RRF + Rerank     │ │
│ └──────────────────────┘ │
└────────────┬─────────────┘
             │
             ▼
      최종 검색 결과
```

## RRF (Reciprocal Rank Fusion)

### RRF란?

**Reciprocal Rank Fusion (RRF)**은 여러 검색 결과 리스트를 하나로 병합하는 알고리즘입니다.
2009년 Cormack et al.의 논문에서 제안되었으며, **순위(rank) 기반**으로 동작합니다.

### RRF 공식

```
RRF_score(d) = Σ 1 / (k + rank_i(d))

where:
  d = 문서
  k = 상수 (기본값 60, 논문 권장)
  rank_i(d) = i번째 검색 리스트에서 문서 d의 순위
```

### RRF 계산 예시

```
Vector Search 결과:          Keyword Search 결과:
┌────┬────────┬───────┐     ┌────┬────────┬───────┐
│순위│ 문서   │ 점수  │     │순위│ 문서   │ 점수  │
├────┼────────┼───────┤     ├────┼────────┼───────┤
│ 1  │ Doc_A  │ 0.95  │     │ 1  │ Doc_A  │ 8.5   │
│ 2  │ Doc_B  │ 0.82  │     │ 2  │ Doc_C  │ 7.2   │
│ 3  │ Doc_C  │ 0.78  │     │ 3  │ Doc_D  │ 6.1   │
└────┴────────┴───────┘     └────┴────────┴───────┘

k = 60 일 때 RRF 계산:

Doc_A: 1/(60+1) + 1/(60+1) = 0.0164 + 0.0164 = 0.0328 ← 최고점
Doc_C: 1/(60+3) + 1/(60+2) = 0.0159 + 0.0161 = 0.0320
Doc_B: 1/(60+2) + 0        = 0.0161
Doc_D: 0        + 1/(60+3) = 0.0159

최종 순위: Doc_A > Doc_C > Doc_B > Doc_D
```

### RRF vs Weighted Scoring

| 특성 | RRF | Weighted Scoring |
|------|-----|------------------|
| 기반 | 순위 (Rank) | 점수 (Score) |
| 스케일 의존성 | 없음 | 있음 |
| 점수 정규화 | 불필요 | 필요 |
| 구현 복잡도 | 낮음 | 중간 |
| 이상치 민감도 | 낮음 | 높음 |
| 기본 설정 | **Yes** | No |

### RRF 장점

1. **스케일 불변성**: Vector 점수(0-1)와 Lucene 점수(0-∞)를 직접 비교 가능
2. **안정성**: 극단적인 점수 값에 덜 민감
3. **속도**: 단순 계산으로 빠른 병합 (테스트: 129ms → 36ms)
4. **효과**: 여러 연구에서 단일 검색보다 우수한 성능 입증

### 병합 방식 설정

```bash
# 환경변수로 설정
HYBRID_MERGE_METHOD=rrf        # RRF (기본값, 권장)
HYBRID_MERGE_METHOD=weighted   # 가중치 기반
HYBRID_MERGE_METHOD=rrf_rerank # RRF + Cross-encoder (느림)
```

### MIN_RELEVANCE_SCORE 주의사항

RRF 점수는 기존 Weighted 점수보다 훨씬 낮습니다:

```python
# chat_workflow_v2.py
if merge_method in ("rrf", "rrf_rerank"):
    MIN_RELEVANCE_SCORE = 0.005  # RRF: max ~0.033
else:
    MIN_RELEVANCE_SCORE = 0.3    # Weighted: 0-1
```

## Keyword Search Enhancements

### Title Boost
제목에 검색어가 포함되면 +0.3 부스트

### Definition Boost
정의 질문(`~란`, `~이란`)에서 정의 패턴 감지 시 +0.4 부스트

```python
# 감지 패턴
rf'{core_query}[은는이가]\s'      # "스크럼은", "스크럼이"
rf'{core_query}\s*\([^)]+\)\s*라' # "플래닝 포커(Planning Poker)라"
```

## Docker Compose Configuration

```
docker-compose.yml (Base Configuration)
    ├── services: db, redis, backend, frontend
    ├── llm-service:
    │   ├── dockerfile: ${LLM_DOCKERFILE:-Dockerfile.cpu}
    │   ├── LIGHTWEIGHT_MODEL_PATH (L1)
    │   └── MEDIUM_MODEL_PATH (L2)
    │
    ├── docker-compose.cpu.yml (Override)
    │   └── llm-service: CPU optimized
    │
    └── docker-compose.gpu.yml (Override)
        └── llm-service: GPU optimized + deploy resources
```

## CPU Mode Architecture

```
┌─────────────────────────────────────────────────┐
│  LLM Service Container (CPU Mode)               │
│  Base: python:3.11-slim-bullseye                │
│  ~800MB image size                              │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Flask Application (Port 8000)            │  │
│  │ - /api/chat/v2 (Two-Track Workflow)      │  │
│  │ - /api/model/change/lightweight          │  │
│  │ - /api/model/change/medium               │  │
│  │ - /health                                │  │
│  └──────────────────────────────────────────┘  │
│                  │                              │
│  ┌───────────────▼──────────────────────────┐  │
│  │ Two-Track Workflow                       │  │
│  │ ├─ L1: LFM2-2.6B (경량)                  │  │
│  │ └─ L2: Gemma-12B (중형)                  │  │
│  └──────────────────────────────────────────┘  │
│                  │                              │
│  ┌───────────────▼──────────────────────────┐  │
│  │ RAG Service (Neo4j)                      │  │
│  │ ├─ Vector Index: chunk_vector_index      │  │
│  │ ├─ Fulltext Index: chunk_fulltext        │  │
│  │ └─ Embedding: multilingual-e5-large      │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

CPU Resources Required:
├─ RAM: 8-16GB (model + buffers)
├─ CPU: 8+ cores recommended
├─ Disk: 15-20GB (OS + models)
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
│  │ Flask Application (Port 8000)                 │  │
│  │ - /api/chat/v2 (Two-Track Workflow)           │  │
│  │ - CUDA-accelerated inference                  │  │
│  └───────────────────────────────────────────────┘  │
│                  │                                   │
│  ┌───────────────▼───────────────────────────────┐  │
│  │ LLaMA.cpp Python Binding (CUDA-enabled)      │  │
│  │ - LLM_N_GPU_LAYERS: 50 (configurable)        │  │
│  │ - EMBEDDING_DEVICE: cuda                     │  │
│  └───────────────────────────────────────────────┘  │
│         │                                            │
│    ┌────┴────┐                                      │
│    ▼         ▼                                      │
│ GPU Layers  CPU Fallback                            │
│ (VRAM 6-8GB)(RAM 2-4GB)                             │
└──────────────────────────────────────────────────────┘

GPU Resources Required:
├─ VRAM: 6-8GB minimum (RTX 4090, RTX 3080, A100)
├─ RAM: 2-4GB (buffer + system)
├─ Disk: 15-20GB (OS + models)
└─ Inference: 5-15ms per token
```

## Environment Variables

### Model Configuration

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MODEL_PATH` | 기본 LLM 모델 | `./models/google.gemma-3-12b-pt.Q5_K_M.gguf` |
| `LIGHTWEIGHT_MODEL_PATH` | L1 경량 모델 | `./models/LFM2-2.6B-Uncensored-X64.i1-Q6_K.gguf` |
| `MEDIUM_MODEL_PATH` | L2 중형 모델 | (MODEL_PATH 사용) |

### Generation Parameters

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MAX_TOKENS` | Track A 최대 토큰 | `1800` |
| `L2_MAX_TOKENS` | Track B 최대 토큰 | `3000` |
| `TEMPERATURE` | 생성 온도 | `0.35` |
| `TOP_P` | Top-p 샘플링 | `0.90` |
| `MIN_P` | Min-p 샘플링 | `0.12` |
| `REPEAT_PENALTY` | 반복 패널티 | `1.10` |

### Hybrid Search Configuration

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `HYBRID_SEARCH_ENABLED` | 하이브리드 검색 활성화 | `true` |
| `HYBRID_MERGE_METHOD` | 병합 방식 | `rrf` |
| `HYBRID_VECTOR_WEIGHT` | Vector 가중치 (weighted) | `0.4` |
| `HYBRID_KEYWORD_WEIGHT` | Keyword 가중치 (weighted) | `0.6` |
| `RERANKER_MODEL` | Cross-encoder 모델 | `cross-encoder/ms-marco-MiniLM-L-6-v2` |

### LLM Inference Settings

| 변수 | CPU | GPU |
|------|-----|-----|
| `LLM_N_GPU_LAYERS` | 0 | 50 |
| `LLM_N_CTX` | 2048 | 4096 |
| `LLM_N_THREADS` | 8 | 6 |
| `EMBEDDING_DEVICE` | cpu | cuda |

## File Structure

```
pms-ic/
├── docker-compose.yml
├── docker-compose.cpu.yml
├── docker-compose.gpu.yml
│
├── llm-service/
│   ├── Dockerfile.cpu
│   ├── Dockerfile.gpu
│   ├── app.py                    (Flask entry point)
│   ├── chat_workflow_v2.py       (Two-Track Workflow)
│   ├── rag_service_neo4j.py      (Hybrid Search + RRF)
│   ├── service_state.py          (Singleton state)
│   ├── routes/
│   │   ├── chat_routes.py        (/api/chat/v2)
│   │   └── model_routes.py       (/api/model/change/*)
│   └── prompts/
│       ├── system.txt
│       ├── casual_response.txt
│       └── out_of_scope.txt
│
├── docs/
│   └── LLM_ARCHITECTURE.md       (이 파일)
│
└── .env                          (환경 변수)
```

## Performance Characteristics

### Hybrid Search (RRF vs Weighted)

| 방식 | 평균 품질 | 평균 시간 | 비고 |
|------|----------|----------|------|
| weighted | 55% | 129ms | 기존 방식 |
| **rrf** | **55%** | **36ms** | **권장 (3.6x 빠름)** |
| rrf_rerank | 50% | 1667ms | 영어 전용 모델 |

### Inference Speed

| Mode | 토큰/초 | 처리량 |
|------|--------|--------|
| CPU (i9-13900K) | 5-8 tok/s | 0.5-2 req/s |
| GPU (RTX 4090) | 100-200 tok/s | 15-30 req/s |
| GPU (A100) | 200-300 tok/s | 30-60 req/s |

## Troubleshooting

### "out of scope" 응답이 잘못 나오는 경우

RRF 점수 임계값 문제일 수 있습니다:

```python
# chat_workflow_v2.py
if merge_method in ("rrf", "rrf_rerank"):
    MIN_RELEVANCE_SCORE = 0.005  # RRF scores are low
else:
    MIN_RELEVANCE_SCORE = 0.3
```

### 응답이 너무 길거나 짧은 경우

L1 프롬프트 조정:

```python
# 간결한 응답
system_prompt = "...5-7문장으로 간결하게 설명하세요."

# 상세한 응답
system_prompt = "...충분히 상세하게 설명하세요."
```

### 검색 결과가 없는 경우

```bash
# Neo4j 인덱스 확인
docker exec -it pms-neo4j cypher-shell -u neo4j -p password "SHOW INDEXES"

# 필요한 인덱스:
# - chunk_vector_index (Vector)
# - chunk_fulltext (Fulltext)
```

### GPU not detected

```bash
# Driver 확인
nvidia-smi

# Docker GPU 확인
docker run --rm --gpus all nvidia/cuda:12.3.0-base nvidia-smi

# Container Toolkit 설치
sudo nvidia-ctk runtime configure
```

## References

- [RRF Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf): Cormack et al., 2009
- [llama-cpp-python](https://github.com/abetlen/llama-cpp-python)
- [Neo4j Vector Search](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
- [Sentence Transformers](https://www.sbert.net/)
