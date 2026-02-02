# 도메인 모델

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: backend, api, data -->

---

## 이 문서가 답하는 질문

- 핵심 도메인 엔티티는 무엇인가?
- 엔티티들은 어떻게 관계를 맺는가?
- 주요 필드와 열거형은 무엇인가?

---

## 1. 엔티티 관계 개요

```
User ──────────────────────────────────────────────────┐
  │                                                     │
  └─ ProjectMember ─── Project ─── Phase               │
                          │          │                  │
                          │          └─ WbsGroup       │
                          │               │             │
                          │               └─ WbsItem    │
                          │                    │        │
                          │                    └─ WbsTask
                          │
                          ├─── Part ─── PartMember
                          │
                          ├─── Sprint ─── UserStory ─── Task
                          │
                          ├─── Deliverable
                          │
                          ├─── Issue
                          │
                          ├─── Meeting
                          │
                          └─── ChatSession ─── ChatMessage
```

---

## 2. 핵심 엔티티

### 2.1 Project (프로젝트)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| name | String | 프로젝트명 |
| description | String | 프로젝트 설명 |
| status | Enum | PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| startDate | LocalDate | 시작일 |
| endDate | LocalDate | 종료일 |
| budget | BigDecimal | 총 예산 |
| aiWeight | BigDecimal | AI 트랙 가중치 (기본 0.70) |
| siWeight | BigDecimal | SI 트랙 가중치 (기본 0.30) |
| progress | Integer | 전체 진척률 (0-100) |
| isDefault | Boolean | 기본 프로젝트 플래그 |

### 2.2 Phase (단계)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| projectId | String | Project 외래키 |
| name | String | 단계명 |
| orderNum | Integer | 표시 순서 |
| status | Enum | NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD |
| gateStatus | Enum | PENDING, SUBMITTED, APPROVED, REJECTED |
| trackType | Enum | AI, SI, COMMON |
| progress | Integer | 단계 진척률 (0-100) |

### 2.3 WbsGroup / WbsItem / WbsTask

**WbsGroup** (작업 분류 체계 레벨 1)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| phaseId | String | Phase 외래키 |
| name | String | 그룹명 |
| orderNum | Integer | 표시 순서 |

**WbsItem** (작업 분류 체계 레벨 2)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| groupId | String | WbsGroup 외래키 |
| name | String | 항목명 |
| orderNum | Integer | 표시 순서 |
| weight | BigDecimal | 진척률 계산용 가중치 |

**WbsTask** (작업 분류 체계 레벨 3)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| itemId | String | WbsItem 외래키 |
| name | String | 태스크명 |
| status | Enum | NOT_STARTED, IN_PROGRESS, COMPLETED |
| assigneeId | String | 담당자 |
| weight | BigDecimal | 진척률용 가중치 |

### 2.4 Sprint & UserStory & Task

**Sprint** (애자일 반복 주기)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| projectId | String | Project 외래키 |
| name | String | 스프린트명 |
| status | Enum | PLANNING, ACTIVE, COMPLETED |
| startDate | LocalDate | 스프린트 시작일 |
| endDate | LocalDate | 스프린트 종료일 |
| goal | String | 스프린트 목표 |

**UserStory** (애자일 작업 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| sprintId | String | Sprint 외래키 |
| title | String | 스토리 제목 |
| description | String | 스토리 설명 |
| points | Integer | 스토리 포인트 |
| status | Enum | TODO, IN_PROGRESS, REVIEW, DONE |

**Task** (칸반 작업 항목)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| projectId | String | Project 외래키 |
| userStoryId | String | UserStory 외래키 (선택) |
| title | String | 태스크 제목 |
| status | Enum | TODO, IN_PROGRESS, REVIEW, DONE |
| priority | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| assigneeId | String | 담당자 |

---

## 3. 지원 엔티티

### 3.1 ChatSession & ChatMessage

**ChatSession** (AI 대화 컨테이너)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| projectId | String | Project 외래키 |
| userId | String | 세션 소유자 |
| title | String | 세션 제목 |
| status | Enum | ACTIVE, ARCHIVED |

**ChatMessage** (개별 메시지)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| sessionId | String | ChatSession 외래키 |
| role | Enum | USER, ASSISTANT, SYSTEM |
| content | String | 메시지 내용 |
| metadata | JSON | 출처, 인용 정보 |

### 3.2 Deliverable (산출물)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| projectId | String | Project 외래키 |
| phaseId | String | Phase 외래키 |
| name | String | 산출물명 |
| type | String | 문서 유형 |
| status | Enum | DRAFT, REVIEW, APPROVED, REJECTED |
| filePath | String | 저장 경로 |
| ragStatus | Enum | PENDING, INDEXED, FAILED |

### 3.3 Issue (이슈)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (UUID) | 기본키 |
| projectId | String | Project 외래키 |
| title | String | 이슈 제목 |
| description | String | 이슈 설명 |
| severity | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| status | Enum | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| assigneeId | String | 담당자 |

---

## 4. 기본 엔티티

모든 엔티티는 `R2dbcBaseEntity`를 상속합니다:

```java
public abstract class R2dbcBaseEntity {
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

---

## 5. 주요 열거형 참조

### 프로젝트 상태 (Project Status)

```java
PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
```

### 단계 상태 (Phase Status)

```java
NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD
```

### 게이트 상태 (Gate Status)

```java
PENDING, SUBMITTED, APPROVED, REJECTED
```

### 트랙 유형 (Track Type)

```java
AI, SI, COMMON
```

### 태스크 우선순위 (Task Priority)

```java
LOW, MEDIUM, HIGH, CRITICAL
```

---

## 6. 엔티티 위치 참조

| 엔티티 | 파일 경로 |
|--------|-----------|
| R2dbcProject | `project/reactive/entity/R2dbcProject.java` |
| R2dbcPhase | `project/reactive/entity/R2dbcPhase.java` |
| R2dbcWbsGroup | `project/reactive/entity/R2dbcWbsGroup.java` |
| R2dbcWbsItem | `project/reactive/entity/R2dbcWbsItem.java` |
| R2dbcWbsTask | `project/reactive/entity/R2dbcWbsTask.java` |
| R2dbcSprint | `task/reactive/entity/R2dbcSprint.java` |
| R2dbcTask | `task/reactive/entity/R2dbcTask.java` |
| R2dbcChatSession | `chat/reactive/entity/R2dbcChatSession.java` |
| R2dbcDeliverable | `project/reactive/entity/R2dbcDeliverable.java` |

---

*최종 수정일: 2026-02-02*
