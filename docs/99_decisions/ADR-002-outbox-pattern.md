# ADR-002: Outbox 패턴을 통한 PostgreSQL-Neo4j 동기화

## 상태

**승인됨** | 2026-01-31

---

## 배경

PostgreSQL을 주요 트랜잭션 데이터베이스로, Neo4j를 그래프 기반 RAG에 사용합니다. 둘 사이의 데이터 동기화가 필요하지만 트랜잭션 일관성을 유지해야 합니다.

---

## 검토한 옵션

### 옵션 A: 이중 쓰기

동일 트랜잭션에서 PostgreSQL과 Neo4j 모두에 쓰기.

**장점:**
- 즉각적인 일관성
- 개념적으로 간단

**단점:**
- 분산 트랜잭션 미지원
- 부분 실패 시나리오
- Neo4j 쓰기 실패가 메인 작업 차단
- 성능 영향

### 옵션 B: 변경 데이터 캡처 (CDC)

Debezium 또는 유사 도구로 PostgreSQL CDC 사용.

**장점:**
- 애플리케이션 코드 변경 없음
- 실시간 스트리밍

**단점:**
- 인프라 복잡성
- 추가 이동 부품
- Kafka/Connect 의존성
- 디버깅 어려움

### 옵션 C: 트랜잭션 Outbox (선택됨)

같은 트랜잭션에서 outbox 테이블에 쓰고, 폴링하여 Neo4j에 동기화.

**장점:**
- 트랜잭션 보장 (로컬 커밋)
- 간단한 폴링 메커니즘
- 디버깅과 재시도 용이
- 외부 의존성 없음

**단점:**
- 최종 일관성 (지연)
- 폴링 오버헤드
- Outbox 테이블 관리 필요

---

## 결정

**옵션 C: 트랜잭션 Outbox 패턴**

폴링 기반 Neo4j 동기화와 함께 outbox 패턴을 구현하기로 결정했습니다.

---

## 근거

1. **일관성 보장**: Outbox 쓰기는 비즈니스 데이터와 같은 트랜잭션. 트랜잭션 실패 시 둘 다 원자적으로 실패.

2. **단순성**: Kafka, Debezium, 분산 트랜잭션 코디네이터 불필요.

3. **디버깅 용이성**: Outbox 이벤트가 데이터베이스에서 보임, 검사와 재실행 용이.

4. **장애 처리**: 실패한 동기화를 메인 작업에 영향 없이 재시도 가능.

5. **독립성**: Neo4j 불가용성이 PostgreSQL 쓰기를 차단하지 않음.

---

## 구현

### Outbox 테이블

```sql
CREATE TABLE project.outbox_events (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,  -- CREATE, UPDATE, DELETE
    payload JSONB NOT NULL,
    project_id VARCHAR(50),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);
```

### 동기화 흐름

```
1. 비즈니스 작업 + outbox 삽입 (단일 트랜잭션)
2. 폴러가 처리되지 않은 이벤트 읽기 (매 5분)
3. Neo4j에 적용
4. 처리됨으로 표시
5. 일관성 확인을 위해 매 24시간 전체 동기화
```

---

## 결과

### 긍정적

- PostgreSQL 작업이 Neo4j에 의해 차단되지 않음
- 모든 동기화 변경 사항의 명확한 감사 추적
- 실패한 이벤트 쉽게 재실행
- 트랜잭션 안전성

### 부정적

- 그래프 업데이트에 5분 지연
- Outbox 테이블 증가 관리 필요
- 폴링 리소스 사용

### 완화

- RAG 쿼리에 "마지막 동기화" 메타데이터 포함
- Outbox 정리 작업 (7일 보존)
- 설정 가능한 폴링 간격

---

## 재검토 조건

다음 경우 이 결정을 재검토:

- 실시간 그래프 업데이트가 필요해질 때
- Outbox 테이블이 너무 커질 때
- CDC 도구가 운영하기 더 간단해질 때

---

## 증거

- 스키마: `V20260121__add_outbox_events.sql`
- 폴러: `DeliverableOutboxPollerService.java`
- Neo4j 동기화: `llm-service/run_sync.py`

---

*결정자: 아키텍처 팀*
*날짜: 2026-01-31*
