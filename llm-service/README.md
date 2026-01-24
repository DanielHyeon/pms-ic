# LLM Service (PMS AI Chatbot)

GGUF 형식의 LLM 모델과 Neo4j GraphRAG를 사용하는 Python 기반 AI 챗봇 서비스입니다.

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Service                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────────────────────────────────┐ │
│  │  Flask API  │───▶│         Two-Track Workflow              │ │
│  └─────────────┘    │  ┌─────────┐        ┌─────────┐        │ │
│                      │  │ Track A │        │ Track B │        │ │
│                      │  │  (L1)   │        │  (L2)   │        │ │
│                      │  │ 빠른응답 │        │ 고품질  │        │ │
│                      │  └────┬────┘        └────┬────┘        │ │
│                      └───────┼──────────────────┼─────────────┘ │
│                              │                  │                │
│  ┌───────────────────────────▼──────────────────▼───────────┐   │
│  │                    RAG Service (Neo4j)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │Vector Search│  │Keyword Search│  │   RRF Merge    │   │   │
│  │  │ (Embedding) │  │  (Lucene)   │  │ (Rank Fusion)  │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 핵심 기능

### 1. Two-Track Workflow (이중 트랙 워크플로우)

질문 유형에 따라 적절한 모델과 응답 전략을 선택합니다.

| Track | 모델 | 용도 | 응답 시간 목표 |
|-------|------|------|----------------|
| **Track A (L1)** | 경량 모델 (2-4B) | FAQ, 정의 질문, 간단한 쿼리 | < 500ms |
| **Track B (L2)** | 중형 모델 (8-12B) | 주간보고, 분석, 복잡한 쿼리 | 30-90s |

### 2. Hybrid Search (하이브리드 검색)

Vector Search와 Keyword Search를 결합하여 검색 품질을 향상시킵니다.

```
사용자 쿼리: "플래닝 포커란"
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Vector  │ │ Keyword │
│ Search  │ │ Search  │
│(Semantic)│ │(Lucene) │
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           ▼
    ┌─────────────┐
    │  RRF Merge  │
    │ (순위 융합)  │
    └─────────────┘
           │
           ▼
    최종 검색 결과
```

### 3. RRF (Reciprocal Rank Fusion)

#### RRF란?

**Reciprocal Rank Fusion (RRF)**은 여러 검색 결과 리스트를 하나로 병합하는 알고리즘입니다. 2009년 Cormack et al.의 논문에서 제안되었으며, 점수(score) 기반이 아닌 **순위(rank) 기반**으로 동작하여 서로 다른 스케일의 점수를 가진 검색 결과를 효과적으로 결합합니다.

#### RRF 공식

```
RRF_score(d) = Σ 1 / (k + rank_i(d))
```

- `d`: 문서
- `k`: 상수 (기본값 60, 논문 권장)
- `rank_i(d)`: i번째 검색 리스트에서 문서 d의 순위

#### RRF vs Weighted Scoring

| 특성 | RRF | Weighted Scoring |
|------|-----|------------------|
| 기반 | 순위 (Rank) | 점수 (Score) |
| 스케일 의존성 | 없음 | 있음 |
| 점수 정규화 필요 | 불필요 | 필요 |
| 구현 복잡도 | 낮음 | 중간 |
| 이상치 민감도 | 낮음 | 높음 |

#### RRF 예시

```
Vector Search 결과:     Keyword Search 결과:
1. Doc_A (0.95)         1. Doc_A (8.5)
2. Doc_B (0.82)         2. Doc_C (7.2)
3. Doc_C (0.78)         3. Doc_D (6.1)

k = 60 일 때:

Doc_A: 1/(60+1) + 1/(60+1) = 0.0328 (양쪽 1위 → 최고점)
Doc_B: 1/(60+2) + 0        = 0.0161 (Vector만)
Doc_C: 1/(60+3) + 1/(60+2) = 0.0320 (양쪽 등장)
Doc_D: 0        + 1/(60+3) = 0.0159 (Keyword만)

최종 순위: Doc_A > Doc_C > Doc_B > Doc_D
```

#### RRF 장점

1. **스케일 불변성**: Vector 점수(0-1)와 Lucene 점수(0-∞)를 직접 비교 가능
2. **안정성**: 극단적인 점수 값에 덜 민감
3. **속도**: 단순 계산으로 빠른 병합
4. **효과**: 여러 연구에서 단일 검색보다 우수한 성능 입증

### 4. 환경 변수

#### 모델 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MODEL_PATH` | 기본 LLM 모델 경로 | `./models/google.gemma-3-12b-pt.Q5_K_M.gguf` |
| `LIGHTWEIGHT_MODEL_PATH` | L1 경량 모델 경로 | `./models/LFM2-2.6B-Uncensored-X64.i1-Q6_K.gguf` |
| `MEDIUM_MODEL_PATH` | L2 중형 모델 경로 | (MODEL_PATH 사용) |

#### 생성 파라미터

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MAX_TOKENS` | Track A 최대 토큰 | `1800` |
| `L2_MAX_TOKENS` | Track B 최대 토큰 | `3000` |
| `TEMPERATURE` | 생성 온도 | `0.35` |
| `TOP_P` | Top-p 샘플링 | `0.90` |
| `MIN_P` | Min-p 샘플링 | `0.12` |
| `REPEAT_PENALTY` | 반복 패널티 | `1.10` |

#### 하이브리드 검색 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `HYBRID_SEARCH_ENABLED` | 하이브리드 검색 활성화 | `true` |
| `HYBRID_MERGE_METHOD` | 병합 방식 (`rrf`, `weighted`, `rrf_rerank`) | `rrf` |
| `HYBRID_VECTOR_WEIGHT` | Vector 가중치 (weighted 방식) | `0.4` |
| `HYBRID_KEYWORD_WEIGHT` | Keyword 가중치 (weighted 방식) | `0.6` |
| `RERANKER_MODEL` | Cross-encoder 모델 (rrf_rerank) | `cross-encoder/ms-marco-MiniLM-L-6-v2` |

#### Neo4j 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEO4J_URI` | Neo4j 연결 URI | `bolt://neo4j:7687` |
| `NEO4J_USER` | Neo4j 사용자 | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j 비밀번호 | (필수) |

## API 엔드포인트

### POST /api/chat/v2

Two-Track Workflow를 사용한 채팅 API입니다.

**Request:**
```json
{
  "message": "스크럼이란",
  "context": [],
  "user_id": "user-001",
  "project_id": "proj-001",
  "user_role": "MEMBER"
}
```

**Response:**
```json
{
  "reply": "스크럼은 애자일 방법론의 대표적인 프레임워크로...",
  "confidence": 0.85,
  "track": "track_a",
  "suggestions": [],
  "metadata": {
    "intent": "pms_query",
    "rag_docs_count": 5,
    "workflow": "two_track_v2",
    "metrics": {
      "classify_time_ms": 0.1,
      "rag_time_ms": 65.0,
      "generate_time_ms": 15000.0,
      "total_time_ms": 15065.1,
      "track": "track_a"
    }
  }
}
```

### GET /health

서비스 상태를 확인합니다.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "rag_service_loaded": true,
  "two_track_workflow_loaded": true
}
```

### POST /api/model/change/lightweight

경량 모델(L1)을 변경합니다.

### POST /api/model/change/medium

중형 모델(L2)을 변경합니다.

## 설치 및 실행

### 1. 모델 파일 준비

```bash
mkdir -p models
# 모델 파일을 models/ 폴더에 복사
# 예: LFM2-2.6B-Uncensored-X64.i1-Q6_K.gguf
```

### 2. 로컬 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
export MODEL_PATH=./models/LFM2-2.6B-Uncensored-X64.i1-Q6_K.gguf
export NEO4J_URI=bolt://localhost:7687
export NEO4J_PASSWORD=your_password

# 서비스 실행
python app.py
```

### 3. Docker로 실행

```bash
docker-compose up llm-service
```

## 성능 튜닝

### RRF k 값 조정

`k` 값이 클수록 순위 차이에 덜 민감해집니다.

- `k=60` (기본값): 균형 잡힌 설정
- `k=20`: 상위 순위에 더 큰 가중치
- `k=100`: 순위 차이를 더 완화

### 검색 품질 향상

1. **Definition Query 감지**: `~란`, `~이란` 패턴 감지하여 정의 문서 부스팅
2. **Title Boost**: 제목에 키워드 포함 시 +0.3 부스트
3. **Hybrid Boost**: Vector + Keyword 모두에서 발견된 문서 우선

### 응답 길이 조절

```python
# chat_workflow_v2.py
# 간단한 질문: max_tokens=300
# 일반 질문: max_tokens=1800
# 보고서: max_tokens=3000
```

## 문제 해결

### 1. "out of scope" 응답이 잘못 나오는 경우

RRF 점수 임계값 확인:
```python
# RRF scores are much lower (max ~0.033)
if merge_method in ("rrf", "rrf_rerank"):
    MIN_RELEVANCE_SCORE = 0.005
else:
    MIN_RELEVANCE_SCORE = 0.3
```

### 2. 응답이 너무 길거나 짧은 경우

L1 프롬프트의 문장 수 제한 조정:
```python
system_prompt = "...5-7문장으로 간결하게 설명하세요."
```

### 3. 검색 결과가 없는 경우

- Neo4j 연결 확인
- Fulltext 인덱스 존재 확인: `SHOW INDEXES`
- Vector 인덱스 확인: `chunk_vector_index`

## 참고 자료

- [RRF 논문](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf): Cormack et al., 2009
- [llama-cpp-python](https://github.com/abetlen/llama-cpp-python)
- [Neo4j Vector Search](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
