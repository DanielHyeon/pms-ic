# RAG 파이프라인

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: llm, data -->

---

## 이 문서가 답하는 질문

- 문서 검색은 어떻게 동작하는가?
- 하이브리드 검색이란 무엇인가?
- RRF는 어떻게 결과를 병합하는가?

---

## 1. 파이프라인 개요

```
사용자 쿼리
    │
    ▼
┌─────────────────────────┐
│    쿼리 전처리           │
│  - 언어 감지             │
│  - 쿼리 확장             │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────────┐ ┌─────────────┐
│ 벡터 검색    │ │ 키워드 검색  │
│ (임베딩)    │ │  (Lucene)   │
│ E5-Large   │ │ chunk_fts   │
└──────┬──────┘ └──────┬──────┘
       │               │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │   RRF 병합    │
       │ (랭크 융합)   │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │ 그래프 확장   │
       │ (선택사항)    │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │ 컨텍스트 구성 │
       │(청크 + 메타)  │
       └───────┬───────┘
               │
               ▼
         LLM 생성
```

---

## 2. 하이브리드 검색

### 벡터 검색

| 컴포넌트 | 값 |
|----------|-----|
| 임베딩 모델 | multilingual-e5-large |
| 차원 | 1024 |
| 유사도 | 코사인 |
| 인덱스 | chunk_vector_index |

```cypher
CALL db.index.vector.queryNodes(
  'chunk_vector_index',
  10,
  $query_embedding
) YIELD node, score
RETURN node.content, score
```

### 키워드 검색

| 컴포넌트 | 값 |
|----------|-----|
| 인덱스 유형 | Fulltext (Lucene) |
| 인덱스 이름 | chunk_fulltext |
| 필드 | content, title |
| 부스트 | 제목 +0.3, 정의 +0.4 |

```cypher
CALL db.index.fulltext.queryNodes(
  'chunk_fulltext',
  $query
) YIELD node, score
RETURN node.content, score
```

---

## 3. RRF (Reciprocal Rank Fusion)

### 공식

```
RRF_score(d) = Σ 1 / (k + rank_i(d))

여기서:
  d = 문서
  k = 상수 (기본값: 60)
  rank_i(d) = 리스트 i에서 문서의 순위
```

### 계산 예시

```
벡터 결과:                키워드 결과:
순위 1: Doc_A (0.95)      순위 1: Doc_A (8.5)
순위 2: Doc_B (0.82)      순위 2: Doc_C (7.2)
순위 3: Doc_C (0.78)      순위 3: Doc_D (6.1)

k=60인 RRF:
Doc_A: 1/(60+1) + 1/(60+1) = 0.0328 ← 최고
Doc_C: 1/(60+3) + 1/(60+2) = 0.0320
Doc_B: 1/(60+2) + 0        = 0.0161
Doc_D: 0        + 1/(60+3) = 0.0159

최종: Doc_A > Doc_C > Doc_B > Doc_D
```

### RRF를 사용하는 이유

| 장점 | 설명 |
|------|------|
| 스케일 불변 | 다른 점수 범위에서 동작 |
| 강건함 | 점수 이상치에 민감하지 않음 |
| 빠름 | 단순한 산술, 정규화 불필요 |
| 효과적 | IR 연구에서 검증됨 |

---

## 4. 설정

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `HYBRID_SEARCH_ENABLED` | true | 하이브리드 검색 활성화 |
| `HYBRID_MERGE_METHOD` | rrf | rrf, weighted, rrf_rerank |
| `HYBRID_VECTOR_WEIGHT` | 0.4 | 벡터 가중치 (weighted인 경우) |
| `HYBRID_KEYWORD_WEIGHT` | 0.6 | 키워드 가중치 (weighted인 경우) |
| `RRF_K` | 60 | RRF k 상수 |

### 병합 방법

| 방법 | 속도 | 품질 | 사용 사례 |
|------|------|------|----------|
| `rrf` | 빠름 (36ms) | 좋음 | **기본값, 권장** |
| `weighted` | 중간 (129ms) | 좋음 | 튜닝이 필요할 때 |
| `rrf_rerank` | 느림 (1667ms) | 더 좋음 (영어) | 영어 전용 |

---

## 5. 관련성 임계값

### 점수 해석

| 방법 | 점수 범위 | 최소 임계값 |
|------|-----------|------------|
| RRF | 0 - 0.033 | 0.005 |
| Weighted | 0 - 1.0 | 0.3 |

### "범위 외" 결정

```python
if max_score < MIN_RELEVANCE_SCORE:
    return "관련 정보를 찾을 수 없습니다"
```

---

## 6. 그래프 확장 (선택사항)

하이브리드 검색 후 선택적으로 그래프를 통해 컨텍스트 확장:

```cypher
MATCH (c:Chunk)-[:BELONGS_TO]->(d:Document)
MATCH (d)-[:BELONGS_TO]->(p:Project {id: $project_id})
WHERE c.chunk_id IN $chunk_ids
OPTIONAL MATCH (c)-[:NEXT_CHUNK]->(next:Chunk)
RETURN c, d, next
```

---

## 7. 성능 메트릭

| 메트릭 | 목표 | 현재 |
|--------|------|------|
| 검색 지연시간 | < 100ms | 36ms (RRF) |
| 관련성 (MRR) | > 0.5 | 0.55 |
| Top-3 리콜 | > 0.7 | 0.72 |

---

## 8. 문서 인덱싱

### 인덱싱 프로세스

```
문서 업로드
    ↓
┌─────────────────┐
│ 텍스트 추출     │
│ (PDF, DOCX 등)  │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 청크 분할       │
│ (500자, 50 오버랩) │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 임베딩 생성     │
│ (E5-Large)     │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Neo4j 저장     │
│ (노드 + 벡터)   │
└─────────────────┘
```

### 청크 노드 스키마

```cypher
(:Chunk {
  chunk_id: string,
  content: string,
  embedding: list<float>,
  document_id: string,
  position: integer,
  title: string
})
```

---

*최종 수정일: 2026-02-02*
