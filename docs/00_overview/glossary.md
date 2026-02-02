# 용어집

> **버전**: 2.0 | **최종 수정일**: 2026-02-02

---

## 이 문서가 답하는 질문

- 기술 용어들은 무엇을 의미하는가?
- 이 시스템에서 도메인 개념은 어떻게 정의되는가?

---

## 프로젝트 관리 용어

| 용어 | 정의 |
|------|------------|
| **Project** | 모든 프로젝트 활동, 단계, 리소스를 담는 최상위 컨테이너 |
| **Phase** | 프로젝트 생명주기의 주요 단계 (보험심사 방법론에서 6단계) |
| **WBS (Work Breakdown Structure)** | 프로젝트 작업의 계층적 분해 |
| **WBS Group** | 2단계 WBS 요소, Phase에 연결됨 |
| **WBS Item** | 3단계 WBS 요소, 작업 패키지를 나타냄 |
| **WBS Task** | 4단계 WBS 요소, 실행 가능한 태스크 |
| **Epic** | 비즈니스 목표를 나타내는 대규모 작업 |
| **Feature** | 가치를 전달하는 기능 단위, Epic의 하위 요소 |
| **User Story** | 사용자 관점에서 작성된 요구사항 |
| **Task** | 가장 작은 작업 단위, 칸반 보드에 표시됨 |
| **Sprint** | 시간이 정해진 반복 주기 (일반적으로 2주) |
| **Deliverable** | 단계 게이트에서 요구되는 산출물 |
| **Gate Review** | 단계 간 공식적인 검토 체크포인트 |
| **Part** | 프로젝트 내 조직 단위 (AI트랙, SI트랙 등) |
| **Backlog** | 스프린트에 할당되지 않은 작업 목록 |

---

## 기술 용어

| 용어 | 정의 |
|------|------------|
| **R2DBC** | Reactive Relational Database Connectivity - 논블로킹 데이터베이스 접근 |
| **WebFlux** | Spring의 리액티브 웹 프레임워크 |
| **Mono** | 0 또는 1개 요소를 나타내는 리액티브 타입 |
| **Flux** | 0 ~ N개 요소를 나타내는 리액티브 타입 |
| **LangGraph** | 그래프 기반 워크플로우로 LLM 에이전트를 구축하는 프레임워크 |
| **RAG** | Retrieval-Augmented Generation - 검색과 LLM을 결합 |
| **GraphRAG** | 그래프 데이터베이스를 사용한 RAG |
| **Vector Index** | 임베딩을 사용한 유사도 검색 인덱스 |
| **Embedding** | 텍스트의 밀집 수치 표현 (1024차원, E5-Large) |
| **RRF** | Reciprocal Rank Fusion - 검색 결과 병합 알고리즘 |
| **Outbox Pattern** | 데이터베이스 트랜잭션과 함께 이벤트를 안정적으로 발행하는 패턴 |
| **SSE** | Server-Sent Events - 서버에서 클라이언트로 실시간 스트리밍 |
| **Text2SQL** | 자연어를 SQL 쿼리로 변환하는 기능 |
| **Cypher** | Neo4j 그래프 데이터베이스 쿼리 언어 |

---

## AI/LLM 용어

| 용어 | 정의 |
|------|------------|
| **Two-Track Workflow** | 의도 기반 모델 선택 (L1: 빠른 응답, L2: 고품질) |
| **Track A (L1)** | 경량 모델을 사용한 빠른 응답 트랙 (2-4B 파라미터) |
| **Track B (L2)** | 중형 모델을 사용한 고품질 응답 트랙 (8-12B 파라미터) |
| **Hybrid Search** | 벡터 검색과 키워드 검색의 결합 |
| **Chunk** | 인덱싱 및 검색을 위한 문서 분절 |
| **Workflow** | LangGraph 기반 AI 처리 파이프라인 |
| **Skill** | AI 워크플로우에서 재사용 가능한 기능 |
| **Decision Authority Gate** | AI 액션 권한 수준 분류 |
| **Evidence System** | RAG 기반 근거 추출 및 연결 시스템 |
| **Failure Taxonomy** | 복구 전략을 포함한 실패 코드 분류 체계 |
| **Intent Classification** | 사용자 질의의 의도 분류 |
| **Query Validator** | AI 생성 SQL/Cypher 쿼리 보안 검증 |

---

## 권한 수준

| 수준 | 설명 | 예시 |
|-------|-------------|---------|
| **SUGGEST** | AI가 추천만 제공 | "테스트 추가를 고려하세요" |
| **DECIDE** | AI가 결정하고 사람이 검토 | "다음 단계로 이동 추천" |
| **EXECUTE** | AI가 로깅과 함께 액션 수행 | "보고서 초안 생성" |
| **COMMIT** | AI가 변경 커밋 (드물고 통제됨) | "태스크 상태 업데이트" |

---

## 데이터베이스 용어

| 용어 | 정의 |
|------|------------|
| **Schema** | 데이터베이스 테이블의 논리적 그룹 |
| **auth schema** | 사용자 인증 및 인가 테이블 |
| **project schema** | 프로젝트 관리 엔티티 |
| **task schema** | 태스크 및 스프린트 관리 |
| **chat schema** | AI 채팅 세션 및 메시지 |
| **report schema** | 보고서 템플릿 및 생성된 보고서 |
| **rfp schema** | RFP 및 요구사항 관리 |
| **lineage schema** | Outbox 이벤트 및 데이터 계보 |

---

## 보안 용어

| 용어 | 정의 |
|------|------------|
| **Project-Scoped RBAC** | 프로젝트별 역할 기반 접근 제어 |
| **JWT** | JSON Web Token - 사용자 인증 토큰 (24시간 유효) |
| **Query Validation** | AI 생성 쿼리의 보안 검증 (4계층 방어) |
| **Bypass Pattern** | SQL 인젝션 우회 시도 패턴 (OR 1=1 등) |
| **Column Denylist** | 쿼리에서 접근 금지된 민감 컬럼 목록 |

---

*최종 수정일: 2026-02-02*
