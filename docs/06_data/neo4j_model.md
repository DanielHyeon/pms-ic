# Neo4j 그래프 모델

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: llm, data -->

---

## 이 문서가 답하는 질문

- Neo4j에 어떤 노드와 관계가 존재하는가?
- RAG를 위해 데이터는 어떻게 인덱싱되는가?
- 어떤 Cypher 패턴이 사용되는가?

---

## 1. 노드 유형 (12개)

### 엔티티 노드

| 노드 유형 | 속성 | 소스 테이블 |
|-----------|------|-------------|
| **Project** | id, name, status, progress | project.projects |
| **Phase** | id, name, status, progress, order_num | project.phases |
| **Sprint** | id, name, status, start_date, end_date | task.sprints |
| **Task** | id, title, status, priority, assignee_id | task.tasks |
| **UserStory** | id, title, story_points, status | task.user_stories |
| **Epic** | id, name, status, business_value | project.epics |
| **Feature** | id, name, status, priority | project.features |
| **WbsGroup** | id, code, name, status, progress | project.wbs_groups |
| **WbsItem** | id, code, name, status, progress | project.wbs_items |
| **User** | id, name, email, role | auth.users |
| **Deliverable** | id, name, type, status | project.deliverables |
| **Issue** | id, title, status, priority | project.issues |

### 문서 노드 (RAG)

| 노드 유형 | 속성 | 목적 |
|-----------|------|------|
| **Document** | doc_id, title, file_type, created_at | 문서 메타데이터 |
| **Chunk** | chunk_id, content, embedding, chunk_index | RAG용 텍스트 세그먼트 |

---

## 2. 관계 유형 (17개)

### 계층 관계

| 관계 | From | To | 의미 |
|------|------|----|----|
| HAS_PHASE | Project | Phase | 프로젝트가 단계 포함 |
| HAS_SPRINT | Project | Sprint | 프로젝트가 스프린트 포함 |
| HAS_EPIC | Project | Epic | 프로젝트가 에픽 포함 |
| HAS_FEATURE | Epic | Feature | 에픽이 기능 포함 |
| HAS_WBS_GROUP | Phase | WbsGroup | 단계가 WBS 그룹 포함 |
| HAS_WBS_ITEM | WbsGroup | WbsItem | WBS 그룹이 항목 포함 |
| HAS_TASK | Sprint | Task | 스프린트가 태스크 포함 |
| HAS_STORY | Sprint | UserStory | 스프린트가 스토리 포함 |
| HAS_DELIVERABLE | Phase | Deliverable | 단계가 산출물 보유 |

### 교차 연결 관계

| 관계 | From | To | 의미 |
|------|------|----|----|
| BELONGS_TO_PHASE | Epic | Phase | 에픽이 단계에 연결 |
| LINKED_TO_WBS_GROUP | Feature | WbsGroup | 기능이 WBS에 연결 |
| PART_OF | UserStory | Feature | 스토리가 기능의 일부 |
| PART_OF | Task | UserStory | 태스크가 스토리의 일부 |

### 의존성 관계

| 관계 | From | To | 의미 |
|------|------|----|----|
| DEPENDS_ON | Task | Task | 태스크 의존성 |
| BLOCKED_BY | Task | Task | 차단 관계 |

### 할당 관계

| 관계 | From | To | 의미 |
|------|------|----|----|
| ASSIGNED_TO | Task | User | 태스크가 사용자에게 할당됨 |
| CREATED_BY | * | User | 생성자 추적 |

### 문서 관계

| 관계 | From | To | 의미 |
|------|------|----|----|
| HAS_CHUNK | Document | Chunk | 문서가 청크 보유 |
| NEXT_CHUNK | Chunk | Chunk | 순차적 정렬 |
| BELONGS_TO | Document | Category | 문서 카테고리 |

---

## 3. 인덱스

### 벡터 인덱스 (RAG)

```cypher
CREATE VECTOR INDEX chunk_embeddings
FOR (c:Chunk) ON c.embedding
OPTIONS {
    indexConfig: {
        `vector.dimensions`: 1024,
        `vector.similarity_function`: 'cosine'
    }
}
```

### 전문 검색 인덱스 (키워드 검색)

```cypher
CREATE FULLTEXT INDEX chunk_fulltext
FOR (c:Chunk) ON EACH [c.content, c.title]
```

### 고유성 제약조건

```cypher
CREATE CONSTRAINT FOR (p:Project) REQUIRE p.id IS UNIQUE
CREATE CONSTRAINT FOR (ph:Phase) REQUIRE ph.id IS UNIQUE
CREATE CONSTRAINT FOR (t:Task) REQUIRE t.id IS UNIQUE
-- ... (노드 유형당 하나씩)
```

---

## 4. 일반적인 Cypher 패턴

### 프로젝트 구조 쿼리

```cypher
MATCH (p:Project {id: $projectId})
OPTIONAL MATCH (p)-[:HAS_PHASE]->(phase:Phase)
OPTIONAL MATCH (phase)-[:HAS_WBS_GROUP]->(wg:WbsGroup)
RETURN p, collect(DISTINCT phase), collect(DISTINCT wg)
```

### 태스크 의존성

```cypher
MATCH (t:Task {id: $taskId})
OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:Task)
OPTIONAL MATCH (t)<-[:BLOCKED_BY]-(blocker:Task)
RETURN t, collect(dep) as dependencies, collect(blocker) as blockers
```

### RAG 하이브리드 검색

```cypher
// 벡터 검색
CALL db.index.vector.queryNodes('chunk_embeddings', 10, $embedding)
YIELD node, score as vec_score

// 키워드 검색
CALL db.index.fulltext.queryNodes('chunk_fulltext', $query)
YIELD node, score as kw_score

// RRF로 병합
WITH collect({node: node, vec: vec_score, kw: kw_score}) as results
// ... RRF 계산
```

### 사용자별 태스크 조회

```cypher
MATCH (u:User {id: $userId})<-[:ASSIGNED_TO]-(t:Task)
WHERE t.status IN ['TODO', 'IN_PROGRESS']
RETURN t
ORDER BY t.priority DESC
LIMIT 20
```

### 스프린트 진행 현황

```cypher
MATCH (s:Sprint {id: $sprintId})-[:HAS_TASK]->(t:Task)
WITH s,
     count(t) as total,
     sum(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completed
RETURN s.name, total, completed,
       toFloat(completed) / total * 100 as progress_pct
```

---

## 5. 그래프 시각화

```
(:Project)
    |
    +--[:HAS_PHASE]-->(:Phase)
    |                     |
    |                     +--[:HAS_WBS_GROUP]-->(:WbsGroup)
    |                     |                          |
    |                     |                          +--[:HAS_WBS_ITEM]-->(:WbsItem)
    |                     |
    |                     +--[:HAS_DELIVERABLE]-->(:Deliverable)
    |
    +--[:HAS_SPRINT]-->(:Sprint)
    |                     |
    |                     +--[:HAS_TASK]-->(:Task)--[:ASSIGNED_TO]-->(:User)
    |                     |                  |
    |                     |                  +--[:DEPENDS_ON]-->(:Task)
    |                     |
    |                     +--[:HAS_STORY]-->(:UserStory)
    |
    +--[:HAS_EPIC]-->(:Epic)
                        |
                        +--[:HAS_FEATURE]-->(:Feature)
```

---

## 6. RAG 문서 그래프

```
(:Document)
    |
    +--[:HAS_CHUNK]-->(:Chunk)--[:NEXT_CHUNK]-->(:Chunk)-->...
    |                    |
    |                    +-- embedding: [1024 floats]
    |                    +-- content: "텍스트 내용..."
    |
    +--[:BELONGS_TO]-->(:Category)
                           |
                           +--[:BELONGS_TO]-->(:Project)
```

---

## 7. 성능 고려사항

### 쿼리 최적화

| 패턴 | 권장사항 |
|------|----------|
| 대규모 탐색 | LIMIT 절 필수 사용 |
| 다중 MATCH | WITH 절로 중간 결과 제한 |
| 속성 필터 | 인덱스된 속성 우선 |
| 관계 방향 | 명시적 방향 지정 |

### 인덱스 활용

| 쿼리 유형 | 사용 인덱스 |
|-----------|------------|
| 벡터 유사도 | chunk_embeddings |
| 텍스트 검색 | chunk_fulltext |
| ID 조회 | 고유성 제약조건 |

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [../05_llm/rag_pipeline.md](../05_llm/rag_pipeline.md) | RAG 파이프라인 |
| [./README.md](./README.md) | 데이터 아키텍처 개요 |

---

*최종 수정일: 2026-02-02*
