# PMS-IC Menu Structure & Phase Management Implementation Plan
> Version 1.1 | Created: 2026-01-25 | Updated: 2026-01-25

---

## 1. Executive Summary

This document outlines the implementation plan for restructuring the PMS-IC menu system and enhancing the Phase Management module based on:
- Excel design document (`AIMAX_PMS설계문서_V1.0_20260123.xlsx`)
- AI Insurance Claims methodology PDF (`보험금지급심사 AI기반 수행 단계별 절차와 방법론.pdf`)
- Current implementation analysis

### Key Decisions (Confirmed)

| Item | Decision |
|------|----------|
| Backlog Hierarchy | **4-Level**: Epic → Feature → User Story → Task |
| Sprint Management | **Integrated in Backlog** (structurally separable) |
| WBS Detail Level | **Full Breakdown** with auto-assignment to Task |
| Phase Templates | **Hybrid**: Locked Core + Editable Extension |
| Gantt Chart | **Simple Timeline** + Advanced Mode option |
| Deployment | **Full Release** (single deployment) |

### Language Policy (언어 정책)

| 구분 | 표시 언어 | 예시 |
| ---- | --------- | ---- |
| **메뉴명** | 한글 | 대시보드, 프로젝트 설정, 백로그 관리 |
| **버튼/레이블** | 한글 | 저장, 삭제, 수정, 새로 만들기 |
| **상태값** | 영어 유지 | TODO, IN_PROGRESS, DONE, OPEN, CLOSED |
| **기술 용어** | 영어 유지 | Sprint, Kanban, Epic, Feature, User Story, Task |
| **DB 컬럼/코드** | 영어 | status, created_at, assignee_id |
| **에러 메시지** | 한글 | "필수 항목입니다", "저장에 실패했습니다" |
| **Placeholder** | 한글 | "프로젝트명을 입력하세요" |
| **Tooltip** | 한글 | "이 버튼을 클릭하면 새 항목이 추가됩니다" |
| **약어/고유명사** | 영어 유지 | WBS, RFP, KPI, OCR, NER, AI |

> **원칙**: 사용자에게 보이는 모든 UI 텍스트는 한글 우선, 업계 표준 용어 및 코드는 영어 유지

### Development Standards (개발 표준)

> 참조: [coding-rules.md](./coding-rules.md), [code-inspection.md](./code-inspection.md)

#### Code Quality Rules (Martin Fowler's Refactoring 기반)

| 규칙 | 설명 |
| ---- | ---- |
| **Naming Convention** | 메서드/변수명은 "어떻게"가 아닌 "무엇을" 하는지 명확히 표현 |
| **Short Method** | 각 메서드는 단일 기능만 수행, 주석이 필요한 부분은 별도 메서드로 추출 |
| **Small Class** | 클래스 책임 분리, 인스턴스 변수/함수가 과다하면 Extract Class |
| **Parameter Limit** | 파라미터 3개 이상 시 Parameter Object로 통합 |

#### Code Smell Detection & Response

| Smell | Refactoring 전략 |
| ----- | ---------------- |
| Duplicated Code | 메서드 추출 → 상위 클래스 이동 또는 클래스 추출 |
| Long Method | 임시변수를 메서드 호출로 변환, 조건문 분리 |
| Large Class | Extract Class 또는 서브클래스 분리 |
| Feature Envy | 데이터를 가진 클래스로 메서드 이동 |
| Data Clumps | 함께 이동하는 데이터는 단일 클래스로 묶음 |
| Primitive Obsession | 데이터 값을 객체로 대체 |
| Switch Statements | 다형성으로 조건문을 오버라이드로 변환 |

#### Code Inspection Checklist

| 검사 항목 | 기준 |
| --------- | ---- |
| **Nesting Level** | 3단계 이상 중첩 시 리팩토링 대상 |
| **Coupling** | 외부 모듈 의존도 과다 여부 점검 |
| **Cognitive Complexity** | 복잡한 if/switch 문 단순화 |
| **Intent Revealing** | 함수명이 "what"을 명확히 표현하는지 확인 |

#### Test Protocol (필수 준수)

| 단계 | 수행 내용 |
| ---- | --------- |
| **Before Refactoring** | 기존 테스트 확인, 없으면 Characterization Test 작성 |
| **During Refactoring** | 각 micro-step 후 테스트 실행, 실패 시 즉시 롤백 |
| **Test Coverage** | 커버리지 감소 변경은 "위험 요소"로 분류 |
| **Boundary Testing** | 루프 시작/끝, 빈 컬렉션, null 데이터 등 경계값 테스트 포함 |
| **Independence** | 각 테스트는 독립적, 실행 순서 무관하게 일관된 결과 |

#### Refactoring-Test Integration Workflow

```
1. Inspect  → 코드 스멜/복잡도 식별
2. Verify   → 대상 기능 단위 테스트 실행
3. Refactor → 한 번에 하나씩 기계적 변환 적용
4. Regression → 전체 테스트 실행, 부작용 확인
5. Commit   → 테스트 통과 시에만 커밋
```

> **예외**: 성능 최적화가 가독성보다 우선해야 하는 경우, 명확한 사유 주석 필수

---

## 2. Current State Analysis

### 2.1 Current Menu Structure (Flat)
```
Dashboard | Projects | Parts | RFP | Requirements | Lineage & History |
Phase Management | Kanban | Backlog | Roles | Common | Education | Settings
```

### 2.2 Design Document Menu Structure (Issues Identified)
| Issue | Description |
|-------|-------------|
| **Naming Inconsistency** | "공통관리" contains core PM activities (Requirements, Test, Schedule) |
| **Misplaced Features** | Kanban/Backlog under "시스템관리" instead of execution area |
| **Missing RFP** | RFP management not explicitly defined |
| **Workflow Mismatch** | Menu order doesn't follow project lifecycle |
| **Depth Imbalance** | Inconsistent hierarchy levels |

### 2.3 Current Phase Structure (6 Phases)
```
1. 업무 진단 및 목표 설정 (Business Analysis)
2. 데이터 수집 및 준비 (Data Preparation)
3. AI 모델링 및 학습 (AI Modeling)
4. 시스템 통합 및 연동 (System Integration)
5. 성능 검증 및 PoC (Validation)
6. 변화 관리 및 확산 (Change Management)
```

---

## 3. Proposed Menu Structure

### 3.1 New Hierarchical Menu Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Dashboard                                                        │
│     └─ Unified project overview with KPIs                           │
├─────────────────────────────────────────────────────────────────────┤
│  2. Project Setup                           [SETUP ZONE]            │
│     ├─ 2.1 Project List/Creation                                    │
│     ├─ 2.2 Part/Organization Setup                                  │
│     └─ 2.3 Team Members & Roles                                     │
├─────────────────────────────────────────────────────────────────────┤
│  3. Requirements Management                 [PLANNING ZONE]         │
│     ├─ 3.1 RFP Management                                           │
│     ├─ 3.2 Requirements Definition                                  │
│     └─ 3.3 Traceability Matrix                                      │
├─────────────────────────────────────────────────────────────────────┤
│  4. Execution Management                    [EXECUTION ZONE]        │
│     │                                                               │
│     │  [Planning Level - PM View]                                   │
│     ├─ 4.1 Phase Management (Waterfall)                             │
│     ├─ 4.2 Master Schedule (WBS/Gantt)                              │
│     │                                                               │
│     │  [Execution Level - Team View]                                │
│     ├─ 4.3 Backlog Management (Sprint 통합)                         │
│     └─ 4.4 Kanban Board                                             │
├─────────────────────────────────────────────────────────────────────┤
│  5. Quality Management                      [VERIFICATION ZONE]     │
│     ├─ 5.1 Test Management                                          │
│     ├─ 5.2 Issue Management                                         │
│     └─ 5.3 Deliverables Management                                  │
├─────────────────────────────────────────────────────────────────────┤
│  6. Collaboration                           [COMMUNICATION ZONE]    │
│     ├─ 6.1 Meeting Management                                       │
│     ├─ 6.2 Announcements/Board                                      │
│     └─ 6.3 AI Assistant                                             │
├─────────────────────────────────────────────────────────────────────┤
│  7. Education Management                    [CAPABILITY ZONE]       │
│     ├─ 7.1 Education Roadmap                                        │
│     ├─ 7.2 IT Staff Training                                        │
│     └─ 7.3 Business User Training                                   │
├─────────────────────────────────────────────────────────────────────┤
│  8. Analytics & Reports                     [INSIGHT ZONE]          │
│     ├─ 8.1 Lineage & History                                        │
│     ├─ 8.2 Project Reports                                          │
│     └─ 8.3 Statistics Dashboard                                     │
├─────────────────────────────────────────────────────────────────────┤
│  9. System Settings                         [ADMIN ZONE]            │
│     ├─ 9.1 User/Permission Management                               │
│     ├─ 9.2 System Configuration                                     │
│     └─ 9.3 Audit Logs                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Workflow Order** | Setup → Plan → Execute → Verify → Report |
| **Separation of Concerns** | Each menu has a single clear purpose |
| **Consistent Depth** | Maximum 2 levels (3 if necessary) |
| **Role-Based Access** | Show only relevant menus per role |
| **Extensibility** | Easy to add future features |

---

## 4. Backlog Hierarchy (4-Level Structure)

### 4.1 Confirmed Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  EPIC (대규모 목표)                                                  │
│  └─ 예: "AI 기반 자동 심사 시스템 구축"                              │
│  └─ 관리자: Product Owner / PM                                      │
│                                                                     │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  FEATURE (기능 단위)                                        │ │
│     │  └─ 예: "OCR 문서 인식 기능"                                 │ │
│     │  └─ 관리자: Part Leader / Tech Lead                         │ │
│     │                                                             │ │
│     │     ┌─────────────────────────────────────────────────────┐ │ │
│     │     │  USER STORY (사용자 관점 요구사항)                   │ │ │
│     │     │  └─ 예: "심사자로서 진단서를 업로드하면              │ │ │
│     │     │         자동으로 텍스트가 추출된다"                  │ │ │
│     │     │  └─ 관리자: Scrum Master / PM                       │ │ │
│     │     │  └─ Sprint 할당 단위                                 │ │ │
│     │     │                                                     │ │ │
│     │     │     ┌─────────────────────────────────────────────┐ │ │ │
│     │     │     │  TASK (개발 작업)                           │ │ │ │
│     │     │     │  └─ 예: "OCR API 연동 구현"                  │ │ │ │
│     │     │     │  └─ 관리자: Developer                       │ │ │ │
│     │     │     │  └─ Kanban 카드 단위                        │ │ │ │
│     │     │     └─────────────────────────────────────────────┘ │ │ │
│     │     └─────────────────────────────────────────────────────┘ │ │
│     └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Database Schema for Backlog Hierarchy

```sql
-- Epic table
CREATE TABLE epics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    phase_id UUID REFERENCES phases(id),          -- Phase 연결
    wbs_task_id UUID REFERENCES wbs_tasks(id),    -- WBS 연결
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    priority INT DEFAULT 0,
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feature table
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id UUID REFERENCES epics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Story table (enhanced)
ALTER TABLE user_stories ADD COLUMN feature_id UUID REFERENCES features(id);
ALTER TABLE user_stories ADD COLUMN epic_id UUID REFERENCES epics(id);

-- Task table (for Kanban)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_story_id UUID REFERENCES user_stories(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'TODO',  -- TODO, IN_PROGRESS, REVIEW, DONE
    assignee_id UUID REFERENCES users(id),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    kanban_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Sprint Management (Backlog 통합)

### 5.1 Design Decision

> **Sprint은 Backlog 화면 내 통합**, 내부 모델은 독립 엔티티로 설계

#### Rationale
- 실무 PM/PO 관점: "백로그 정리 → 스프린트 할당"이 하나의 흐름
- 별도 페이지 분리 시 초반 사용자가 맥락 단절을 느낌
- 중·대형 조직 확장 시에만 Sprint 페이지 활성화 옵션 제공

### 5.2 Backlog 화면 내 Sprint 기능

```
┌─────────────────────────────────────────────────────────────────────┐
│  Backlog Management                                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ [Sprint Panel]                                          [설정] ││
│  │ ┌───────────────────────────────────────────────────────────┐  ││
│  │ │ Sprint 3 (Jan 20 - Feb 2)          목표: OCR 기능 완성   │  ││
│  │ │ 진행률: ████████░░ 80%              Story: 5/6 완료      │  ││
│  │ └───────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐│
│  │ Product Backlog      │  │ Sprint Backlog                       ││
│  │                      │  │                                      ││
│  │ [Epic] AI 자동심사   │  │ [Story] OCR 텍스트 추출      ████   ││
│  │  └─[Feature] OCR     │  │  └─[Task] API 연동           Done   ││
│  │     └─[Story] ...    │→→│  └─[Task] 전처리 로직    Progress   ││
│  │     └─[Story] ...    │  │                                      ││
│  │  └─[Feature] 분류    │  │ [Story] 문서 분류 모델       ██░░   ││
│  │                      │  │  └─[Task] 모델 학습          Todo   ││
│  └──────────────────────┘  └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Sprint Entity (Independent Model)

```sql
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANNING',  -- PLANNING, ACTIVE, COMPLETED, CANCELLED
    velocity INT,  -- Story points completed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sprint-Story relationship
ALTER TABLE user_stories ADD COLUMN sprint_id UUID REFERENCES sprints(id);
```

---

## 6. WBS Full Breakdown with Auto-Assignment

### 6.1 Design Decision

> **WBS 전체 분해**, 업로드 시 Task 단위까지 자동 분해하여 할당

#### Key Concepts
- **WBS = 계획 관리 단위** (PM 관점)
- **Backlog = 실행 관리 단위** (팀 관점)

### 6.2 WBS → Backlog 자동 연결 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│  WBS Upload (Excel/Project File)                                     │
│                                                                     │
│  Phase 2: 데이터 수집/정제                                           │
│    └─ WBS 2.1: 데이터 범위 정의                                      │
│    └─ WBS 2.2: 데이터 정제 및 라벨링                                 │
│         └─ 2.2.1: OCR 텍스트 추출                                    │
│         └─ 2.2.2: NER 개체명 인식                                    │
│         └─ 2.2.3: 피처 엔지니어링                                    │
│    └─ WBS 2.3: 데이터 거버넌스                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Auto-Generate
┌─────────────────────────────────────────────────────────────────────┐
│  Backlog (자동 생성)                                                 │
│                                                                     │
│  [Epic] 데이터 수집/정제 (← Phase 2 연결)                            │
│    └─ [Feature] 데이터 정제 및 라벨링 (← WBS 2.2 연결)               │
│         └─ [User Story] OCR로 진단서 텍스트 추출                     │
│              └─ [Task] OCR 라이브러리 선정                           │
│              └─ [Task] 이미지 전처리 구현                            │
│              └─ [Task] 텍스트 후처리 로직                            │
│         └─ [User Story] NER로 개체명 인식                            │
│              └─ [Task] NER 모델 선정                                 │
│              └─ [Task] 학습 데이터 준비                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Auto-Assignment Logic

```typescript
interface WbsToBacklogMapping {
  wbsLevel1: 'Epic';      // WBS 1단계 → Epic
  wbsLevel2: 'Feature';   // WBS 2단계 → Feature
  wbsLevel3: 'UserStory'; // WBS 3단계 → User Story
  wbsLevel4: 'Task';      // WBS 4단계 → Task (Kanban)
}

// Auto-assignment rules
const autoAssignmentRules = {
  assignByRole: true,           // Part/역할별 자동 할당
  assignByWorkload: true,       // 작업량 기반 균등 분배
  preserveManualAssignment: true // 수동 할당 우선
};
```

### 6.4 WBS Database Schema

```sql
CREATE TABLE wbs_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    phase_id UUID REFERENCES phases(id),
    parent_id UUID REFERENCES wbs_tasks(id),      -- 계층 구조
    wbs_code VARCHAR(50),                         -- e.g., "2.2.1"
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level INT NOT NULL,                           -- 1, 2, 3, 4
    start_date DATE,
    end_date DATE,
    duration_days INT,
    progress INT DEFAULT 0,
    assignee_id UUID REFERENCES users(id),
    predecessor_ids UUID[],                       -- 선행 작업
    -- Backlog 연결
    linked_epic_id UUID REFERENCES epics(id),
    linked_feature_id UUID REFERENCES features(id),
    linked_story_id UUID REFERENCES user_stories(id),
    linked_task_id UUID REFERENCES tasks(id),
    order_num INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wbs_phase ON wbs_tasks(phase_id);
CREATE INDEX idx_wbs_parent ON wbs_tasks(parent_id);
CREATE INDEX idx_wbs_code ON wbs_tasks(wbs_code);
```

---

## 7. Phase Template System (Hybrid)

### 7.1 Design Decision

> **Locked Core + Editable Extension** 방식

#### Structure
- **Core (고정)**: 단계 이름, 필수 Deliverable, 최소 KPI
- **Extension (PM 수정 가능)**: Activity 추가/삭제, Deliverable 보강, KPI 가중치 조정

#### Rationale
- 완전 고정 → 현장 반발
- 완전 자유 → 방법론 붕괴
- PDF 방법론 기반이므로 표준 유지 + 현장 유연성 필수

### 7.2 Template Data Structure

```typescript
interface PhaseTemplate {
  id: string;
  name: string;
  description: string;
  orderNum: number;

  // LOCKED CORE (수정 불가)
  core: {
    requiredDeliverables: Deliverable[];
    minimumKpis: KPI[];
    mandatoryActivities: Activity[];
  };

  // EDITABLE EXTENSION (PM 수정 가능)
  extension: {
    additionalActivities: Activity[];
    additionalDeliverables: Deliverable[];
    kpiWeights: Record<string, number>;
    customFields: Record<string, any>;
  };

  isLocked: boolean;  // Core 수정 잠금
}
```

### 7.3 6-Phase Template (AI Insurance Claims)

```typescript
const phaseTemplates: PhaseTemplate[] = [
  {
    id: 'phase-1',
    name: '1단계: 업무현황 진단/분석',
    description: '현행 프로세스 진단 및 AI 적용 타당성 검증',
    orderNum: 1,
    core: {
      requiredDeliverables: [
        { name: 'AS-IS 프로세스 분석 보고서', type: 'REPORT', mandatory: true },
        { name: 'KPI 정의서', type: 'DOCUMENT', mandatory: true },
        { name: 'AI 적용 타당성 보고서', type: 'REPORT', mandatory: true },
      ],
      minimumKpis: [
        { name: '자동지급율 목표', target: '70%' },
        { name: '처리시간 단축 목표', target: '50%' },
      ],
      mandatoryActivities: [
        '목표 정의 (KPI 설정)',
        '프로세스 맵핑',
        '현황 분석',
        'AI 적용 영역 식별',
      ],
    },
    extension: {
      additionalActivities: [],
      additionalDeliverables: [],
      kpiWeights: {},
      customFields: {},
    },
    isLocked: true,
  },
  // ... Phase 2-6 similar structure
];
```

### 7.4 UI: Core vs Extension 구분

```
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 1: 업무현황 진단/분석                                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 🔒 필수 산출물 (Core - 수정 불가)                               ││
│  │ ├─ ☑ AS-IS 프로세스 분석 보고서                                 ││
│  │ ├─ ☑ KPI 정의서                                                 ││
│  │ └─ ☑ AI 적용 타당성 보고서                                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ✏️ 추가 산출물 (Extension - 수정 가능)               [+ 추가]  ││
│  │ ├─ 📄 데이터 인벤토리 (PM 추가)                      [삭제]    ││
│  │ └─ 📄 PoC 설계서 (PM 추가)                           [삭제]    ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Gantt Chart (Simple Timeline + Advanced Mode)

### 8.1 Design Decision

> **초기: 간단한 타임라인**, 고급 옵션으로 심화 모드 제공

#### Rationale
- 풀 Gantt는 개발 비용 큼, 사용자는 20%만 사용
- 대부분 PM이 필요한 것: "언제 시작/끝", "어디가 밀렸는지", "의존관계"
- AI 분석 연계에도 이 구조가 적합

### 8.2 Basic Timeline View

```
┌─────────────────────────────────────────────────────────────────────┐
│  Phase Timeline                                    [Basic] [Advanced]│
│                                                                     │
│  Phase    │ Jan    │ Feb    │ Mar    │ Apr    │ May    │ Jun       │
│  ─────────┼────────┼────────┼────────┼────────┼────────┼───────────│
│  1.진단   │████████│        │        │        │        │           │
│  2.데이터 │        │████████│████████│        │        │           │
│  3.모델링 │        │        │   █████│████████│████████│           │
│  4.통합   │        │        │        │        │   █████│███        │
│  5.검증   │        │        │        │        │        │  ████     │
│  6.변화   │        │        │        │        │        │     ████  │
│           │        │        │        │        │        │           │
│  Today: ──┼────────┼────────┼───▼────┼────────┼────────┼───────────│
│           │        │        │  Mar 15│        │        │           │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Advanced Mode (Optional)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Advanced Gantt                                           [Toggle]  │
│                                                                     │
│  Features:                                                          │
│  ☑ 의존성 연결선 표시                                               │
│  ☑ 크리티컬 패스 하이라이트                                         │
│  ☑ 지연 영향 분석                                                   │
│  ☐ 리소스 로딩 차트                                                 │
│                                                                     │
│  WBS Task       │ Jan    │ Feb    │ Mar    │        Dependencies    │
│  ───────────────┼────────┼────────┼────────┼─────────────────────── │
│  2.1 범위정의   │████    │        │        │                        │
│       ↓         │   └────┼───────→│        │                        │
│  2.2 정제       │        │████████│        │ ← 2.1 완료 후 시작     │
│       ↓         │        │   └────┼───────→│                        │
│  2.3 거버넌스   │        │        │████    │ ← 2.2 완료 후 시작     │
│                 │        │        │   🔴   │ ← Critical Path        │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.4 Implementation Approach

```typescript
// Basic Timeline Component
interface TimelineConfig {
  mode: 'basic' | 'advanced';
  showDependencies: boolean;
  showCriticalPath: boolean;
  showDelayAnalysis: boolean;
}

// Use lightweight library for basic mode
// Option: react-calendar-timeline or custom SVG
// Advanced mode: extend with dependency arrows
```

---

## 9. Complete Hierarchy Model

### 9.1 Full Integration View

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE (Waterfall Milestone)                     ← 고객 보고 단위   │
│  └─ 계약 마일스톤, 대금 청구 기준                                   │
│                                                                     │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  WBS (Master Schedule)                     ← PM 계획 단위   │ │
│     │  └─ Activity 분해, 의존관계, 크리티컬 패스                  │ │
│     │                                                             │ │
│     │     ┌─────────────────────────────────────────────────────┐ │ │
│     │     │  EPIC (Product Goal)                ← 제품 목표     │ │ │
│     │     │                                                     │ │ │
│     │     │     ┌─────────────────────────────────────────────┐ │ │ │
│     │     │     │  FEATURE (Capability)        ← 기능 단위    │ │ │ │
│     │     │     │                                             │ │ │ │
│     │     │     │     ┌─────────────────────────────────────┐ │ │ │ │
│     │     │     │     │  USER STORY              ← Sprint   │ │ │ │ │
│     │     │     │     │                           계획 단위 │ │ │ │ │
│     │     │     │     │     ┌─────────────────────────────┐ │ │ │ │ │
│     │     │     │     │     │  TASK          ← Kanban 카드│ │ │ │ │ │
│     │     │     │     │     └─────────────────────────────┘ │ │ │ │ │
│     │     │     │     └─────────────────────────────────────┘ │ │ │ │
│     │     │     └─────────────────────────────────────────────┘ │ │ │
│     │     └─────────────────────────────────────────────────────┘ │ │
│     └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Real Example Flow

```
Phase 2: 데이터 수집/정제 (2025-02-16 ~ 2025-04-30)
  │
  └─ WBS 2.2: 데이터 정제 및 라벨링 (4주)
       │
       └─ Epic: 학습 데이터 구축
            │
            ├─ Feature: OCR 데이터 처리
            │    │
            │    ├─ User Story: 진단서 텍스트 자동 추출
            │    │    └─ Task: OCR 라이브러리 선정 [Done]
            │    │    └─ Task: 이미지 전처리 구현 [In Progress]
            │    │    └─ Task: 텍스트 후처리 로직 [Todo]
            │    │
            │    └─ User Story: 영수증 금액 인식
            │         └─ Task: 금액 패턴 정규식 [Todo]
            │
            └─ Feature: NER 데이터 처리
                 │
                 └─ User Story: 질병코드 자동 분류
                      └─ Task: ICD 코드 매핑 [Todo]
```

---

## 10. Implementation Phases

### Phase A: Menu Structure Refactoring (Week 1-2)

| Task | Description | Files Affected |
|------|-------------|----------------|
| A.1 | Create new menu configuration | `menuConfig.ts` (new) |
| A.2 | Update Sidebar component (collapsible groups) | `Sidebar.tsx` |
| A.3 | Update routing structure | `App.tsx` |
| A.4 | Role-based menu filtering | `rolePermissions.ts` |

### Phase B: Backlog Hierarchy (Week 3-4)

| Task | Description | Files Affected |
|------|-------------|----------------|
| B.1 | Create Epic/Feature entities | `types/backlog.ts` (new) |
| B.2 | Update BacklogManagement for 4-level hierarchy | `BacklogManagement.tsx` |
| B.3 | Implement Sprint panel in Backlog | `BacklogManagement.tsx` |
| B.4 | Create Sprint entity & API | Backend migration |
| B.5 | Epic/Feature CRUD UI | `EpicManagement.tsx` (new) |

### Phase C: WBS Integration (Week 5-6)

| Task | Description | Files Affected |
|------|-------------|----------------|
| C.1 | Create WBS data model | `types/wbs.ts` (new) |
| C.2 | WBS upload & parsing (Excel/MS Project) | `WbsUploader.tsx` (new) |
| C.3 | WBS → Backlog auto-generation | `wbsBacklogMapper.ts` (new) |
| C.4 | WBS list/tree view | `WbsManagement.tsx` (new) |
| C.5 | Basic timeline component | `Timeline.tsx` (new) |

### Phase D: Phase Template System (Week 7-8)

| Task | Description | Files Affected |
|------|-------------|----------------|
| D.1 | Create template data model | `phaseTemplates.ts` (new) |
| D.2 | Implement Core/Extension separation | `PhaseManagement.tsx` |
| D.3 | Template selection UI on project creation | `ProjectManagement.tsx` |
| D.4 | Pre-populate phases from template | `usePhases.ts` |

### Phase E: Phase-WBS-Backlog Integration (Week 9-10)

| Task | Description | Files Affected |
|------|-------------|----------------|
| E.1 | Link Phase → WBS → Epic in DB | Backend migration |
| E.2 | Filter backlog by Phase/WBS | `BacklogManagement.tsx` |
| E.3 | Show Phase context in Kanban | `KanbanBoard.tsx` |
| E.4 | Advanced Gantt mode | `GanttChart.tsx` (new) |

### Phase F: Testing & Deployment (Week 11-12)

| Task | Description |
|------|-------------|
| F.1 | Unit tests for new components |
| F.2 | Integration tests (Phase → WBS → Backlog flow) |
| F.3 | E2E workflow testing |
| F.4 | Performance optimization |
| F.5 | Documentation update |
| F.6 | **Full Release Deployment** |

---

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing phase/backlog data | HIGH | Database migration script with rollback |
| Complex hierarchy confusing users | MEDIUM | Progressive disclosure, tooltips, onboarding |
| WBS auto-generation accuracy | MEDIUM | Manual override option, review step |
| Performance with deep hierarchy | MEDIUM | Lazy loading, virtualized lists |
| Backend API changes coordination | HIGH | API versioning, parallel development |

---

## 12. Success Criteria

- [ ] New menu structure reflects project lifecycle
- [ ] 4-level backlog hierarchy (Epic → Feature → Story → Task) working
- [ ] Sprint management integrated in Backlog view
- [ ] WBS upload with auto-generation to Backlog
- [ ] Phase templates with Core (locked) + Extension (editable)
- [ ] Basic timeline view with optional advanced mode
- [ ] Phase → WBS → Epic linkage complete
- [ ] All existing CRUD operations preserved
- [ ] Role-based access works correctly
- [ ] No regression in existing features
- [ ] Full deployment completed

---

## Appendix A: File Change Summary

```
src/
├── app/
│   ├── App.tsx                          [MODIFY] - New routing structure
│   ├── components/
│   │   ├── Sidebar.tsx                  [MODIFY] - Hierarchical menu
│   │   ├── PhaseManagement.tsx          [MODIFY] - Template system (Core/Extension)
│   │   ├── BacklogManagement.tsx        [MODIFY] - 4-level hierarchy, Sprint panel
│   │   ├── KanbanBoard.tsx              [MODIFY] - Phase/Epic context
│   │   ├── WbsManagement.tsx            [NEW] - WBS management
│   │   ├── WbsUploader.tsx              [NEW] - Excel/Project file upload
│   │   ├── Timeline.tsx                 [NEW] - Basic timeline view
│   │   ├── GanttChart.tsx               [NEW] - Advanced Gantt mode
│   │   ├── EpicManagement.tsx           [NEW] - Epic/Feature CRUD
│   │   └── SprintPanel.tsx              [NEW] - Sprint component for Backlog
│   └── config/
│       └── menuConfig.ts                [NEW] - Menu configuration
├── types/
│   ├── backlog.ts                       [NEW] - Epic, Feature, Task types
│   ├── wbs.ts                           [NEW] - WBS types
│   ├── sprint.ts                        [NEW] - Sprint types
│   └── phaseTemplate.ts                 [NEW] - Template types
├── data/
│   └── phaseTemplates.ts                [NEW] - 6-phase default templates
├── utils/
│   ├── rolePermissions.ts               [MODIFY] - New menu permissions
│   └── wbsBacklogMapper.ts              [NEW] - WBS to Backlog conversion
└── hooks/api/
    ├── useEpics.ts                      [NEW]
    ├── useFeatures.ts                   [NEW]
    ├── useSprints.ts                    [NEW]
    └── useWbs.ts                        [NEW]
```

---

## Appendix B: API Endpoints Required

```
# Epic API
GET    /api/projects/{projectId}/epics
POST   /api/projects/{projectId}/epics
PUT    /api/epics/{epicId}
DELETE /api/epics/{epicId}

# Feature API
GET    /api/epics/{epicId}/features
POST   /api/epics/{epicId}/features
PUT    /api/features/{featureId}
DELETE /api/features/{featureId}

# Sprint API
GET    /api/projects/{projectId}/sprints
POST   /api/projects/{projectId}/sprints
PUT    /api/sprints/{sprintId}
DELETE /api/sprints/{sprintId}
POST   /api/sprints/{sprintId}/stories/{storyId}  # Assign story to sprint

# WBS API
GET    /api/projects/{projectId}/wbs
POST   /api/projects/{projectId}/wbs/upload       # Excel/MS Project upload
POST   /api/wbs/{wbsId}/generate-backlog          # Auto-generate backlog
PUT    /api/wbs/{wbsId}
DELETE /api/wbs/{wbsId}

# Phase Template API
GET    /api/phase-templates
GET    /api/phase-templates/{templateId}
POST   /api/projects/{projectId}/apply-template   # Apply template to project
```

---

**Document Status**: READY FOR CONFIRMATION
**Author**: Claude AI Assistant
**Last Updated**: 2026-01-25
