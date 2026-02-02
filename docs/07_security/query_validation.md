# 쿼리 검증 보안

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: llm, backend, security -->

---

## 이 문서가 답하는 질문

- AI가 생성한 SQL 쿼리는 어떻게 보안 검증되는가?
- 어떤 우회 패턴이 탐지되고 차단되는가?
- 쿼리에서 프로젝트 범위는 어떻게 강제되는가?
- 어떤 민감 데이터가 보호되는가?

---

## 1. 개요

QueryValidator는 AI가 생성한 SQL 및 Cypher 쿼리를 실행 전에 검증하는 4계층 심층 방어 전략을 구현합니다.

```
+---------------------------------------------------------------+
|                    쿼리 검증 파이프라인                          |
+---------------------------------------------------------------+
|                                                                |
|  계층 1: 구문 검증                                              |
|  +-- 쿼리 길이, 비어있음, 기본 구조                              |
|                                                                |
|  계층 2: 스키마 검증                                            |
|  +-- 테이블 존재, 컬럼 유효, 타입 확인                           |
|                                                                |
|  계층 3: 보안 검증   <-- 2단계 보안                              |
|  +-- 단계 1: 우회 패턴 탐지 (빠른 실패)                         |
|  +-- 단계 2: 프로젝트 범위 무결성                               |
|                                                                |
|  계층 4: 성능 검증                                              |
|  +-- LIMIT 강제, 서브쿼리 깊이, UNION 수                        |
|                                                                |
+---------------------------------------------------------------+
```

---

## 2. 보안 계층 (계층 3) 상세

### 2.1 단계 1: 우회 패턴 탐지

**목적**: 알려진 SQL 인젝션 및 범위 우회 패턴의 빠른 실패 탐지.

#### OR 기반 항진식 (차단됨)

| 패턴 | 예시 | 위험 |
|------|------|------|
| 숫자 항진식 | `OR 1=1`, `OR 0=0` | WHERE 조건 우회 |
| 불리언 항진식 | `OR TRUE`, `OR NOT FALSE` | 모든 행 반환 |
| 문자열 항진식 | `OR 'a'='a'` | 필터 우회 |
| 비교 항진식 | `OR 2>1`, `OR 1<2` | 항상 참으로 평가 |
| NULL 항진식 | `OR NULL IS NULL` | 항상 참 |
| EXISTS 우회 | `OR EXISTS(SELECT 1)` | 서브쿼리 항상 반환 |
| 함수 우회 | `OR COALESCE(...)` | 잠재적 항진식 |

#### 주석 기반 우회 방지

```sql
-- 차단됨: 주석으로 난독화된 패턴
OR/**/1=1          -- 블록 주석 우회
OR/* comment */1=1 -- 확장 주석 우회
OR--
1=1                -- 라인 주석 우회
```

**구현**: `normalize_sql()`이 주석을 공백으로 대체하여 토큰 경계 보존.

### 2.2 단계 2: 프로젝트 범위 무결성

**목적**: 프로젝트 범위 테이블에 접근하는 모든 쿼리에 적절한 `project_id` 필터링 포함 보장.

#### 프로젝트 범위 테이블

| 테이블 | 범위 방법 |
|--------|----------|
| `task.tasks` | `task.user_stories.project_id` 경유 |
| `task.user_stories` | 직접 `project_id` 컬럼 |
| `task.sprints` | 직접 `project_id` 컬럼 |
| `project.phases` | 직접 `project_id` 컬럼 |
| `project.issues` | 직접 `project_id` 컬럼 |
| `project.risks` | 직접 `project_id` 컬럼 |

#### 별칭 인식 검증

```sql
-- 유효: FROM 절의 테이블과 별칭 일치
SELECT t.id FROM task.tasks t
WHERE t.project_id = :project_id

-- 무효: 별칭이 존재하지 않음
SELECT t.id FROM task.tasks t
WHERE x.project_id = :project_id  -- 'x'가 정의되지 않음
```

---

## 3. 금지된 테이블

다음 테이블은 쿼리 접근이 완전히 차단됩니다:

| 테이블 | 이유 |
|--------|------|
| `auth.password_history` | 비밀번호 해시 포함 |
| `auth.tokens` | 인증 토큰 포함 |
| `auth.refresh_tokens` | 리프레시 토큰 포함 |

---

## 4. 컬럼 거부 목록

SELECT 절에 절대 나타나면 안 되는 특정 컬럼:

| 테이블 | 컬럼 | 이유 |
|--------|------|------|
| `auth.users` | `password_hash` | 인증 정보 |
| `auth.users` | `password` | 인증 정보 |
| `auth.users` | `salt` | 암호화 자료 |
| `auth.users` | `api_key` | 비밀 키 |
| `auth.users` | `refresh_token` | 인증 토큰 |
| `auth.users` | `access_token` | 인증 토큰 |

### UNION 우회 방지

컬럼 검증은 UNION 쿼리의 것을 포함하여 **모든** SELECT 절을 확인합니다:

```sql
-- 차단됨: 두 번째 SELECT의 컬럼
SELECT id FROM auth.users
UNION SELECT password_hash FROM auth.users
```

---

## 5. 금지된 SQL 패턴

| 패턴 | 이유 |
|------|------|
| `DROP`, `DELETE`, `TRUNCATE` | 데이터 파괴 |
| `INSERT`, `UPDATE`, `ALTER` | 데이터 수정 |
| `CREATE`, `GRANT`, `REVOKE` | 스키마/권한 변경 |
| `EXECUTE`, `EXEC` | 저장 프로시저 실행 |
| `--`, `/*` | SQL 주석 (인젝션 벡터) |
| `pg_sleep` | 리소스 고갈 |
| `COPY`, `LOAD` | 파일 시스템 접근 |
| `;` 뒤에 텍스트 | 다중 문장 |

---

## 6. 성능 보호 장치 (계층 4)

| 제약 | 기본값 | 목적 |
|------|--------|------|
| 최대 쿼리 길이 | 5,000자 | DoS 방지 |
| LIMIT 필수 | 예 | 무제한 결과 방지 |
| 최대 LIMIT 값 | 100행 | 리소스 보호 |
| 최대 서브쿼리 깊이 | 3레벨 | 쿼리 복잡성 |
| 최대 UNION 수 | 5개 | 쿼리 복잡성 |
| RECURSIVE CTE | 차단됨 | 무한 루프 방지 |
| SELECT * | 차단됨 | 컬럼 노출 방지 |

---

## 7. 오류 응답

| 오류 유형 | 메시지 | 제안 |
|----------|--------|------|
| `SECURITY_VIOLATION` | "보안 우회 시도: OR 1=1 우회 탐지됨" | "항진식 조건 제거" |
| `SECURITY_VIOLATION` | "'auth.tokens' 테이블 접근 금지됨" | "이 테이블은 쿼리할 수 없음" |
| `SCOPE_MISSING` | "쿼리는 project_id로 필터링해야 함" | "WHERE project_id = :project_id 추가" |
| `POLICY_VIOLATION` | "SELECT * 금지됨" | "특정 컬럼 나열" |

---

## 8. 테스트 커버리지

보안 우회 방지는 13개의 전용 테스트로 검증됩니다:

| 테스트 | 목적 |
|--------|------|
| `test_or_bypass_detected` | 표준 OR 항진식 |
| `test_comment_bypass_detected` | 주석 난독화 패턴 |
| `test_additional_or_patterns_detected` | 비교/EXISTS/COALESCE |
| `test_legitimate_or_not_blocked` | 유효한 OR 조건 통과 |
| `test_forbidden_tables_blocked` | auth.tokens 등 차단 |
| `test_allowed_tables_not_blocked` | auth.users 허용 |
| `test_password_hash_column_blocked` | 민감 컬럼 차단 |
| `test_union_column_bypass_blocked` | UNION 우회 방지 |
| `test_safe_columns_allowed` | 일반 컬럼 통과 |
| `test_subquery_without_scope_detected` | 서브쿼리 범위 확인 |
| `test_valid_scope_with_alias` | 별칭 검증 |
| `test_legitimate_cte_not_blocked` | 유효한 CTE 통과 |
| `test_legitimate_cte_without_inner_where_not_blocked` | CTE 집계 통과 |

---

## 9. 구현 참조

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| 메인 검증기 | `llm-service/text2query/query_validator.py` | 4계층 검증 |
| 우회 패턴 | `OR_BYPASS_PATTERNS` 상수 | 패턴 정의 |
| 컬럼 거부 목록 | `COLUMN_DENYLIST` 상수 | 차단된 컬럼 |
| 금지된 테이블 | `schema_manager.py`의 `FORBIDDEN_TABLES` | 차단된 테이블 |
| 테스트 | `tests/test_schema_graph_regression.py` | 보안 테스트 |

---

## 10. 알려진 제한사항

| 제한사항 | 영향 | 완화 |
|----------|------|------|
| 내부 WHERE가 있는 CTE | 잘못된 WHERE 절 찾을 수 있음 | 제한사항 문서화 |
| 따옴표로 묶인 식별자 | 완전히 지원되지 않음 | 낮은 우선순위 |
| 복잡한 별칭 | 일부 패턴 놓칠 수 있음 | 추가 테스트 커버리지 |

---

## 11. 관련 문서

| 문서 | 설명 |
|------|------|
| [access_control.md](./access_control.md) | RBAC 및 인가 |
| [../05_llm/README.md](../05_llm/README.md) | LLM 서비스 개요 |
| [ADR-005](../99_decisions/ADR-005-query-validation-security.md) | 보안 우회 방지 결정 |

---

*최종 수정일: 2026-02-02*
