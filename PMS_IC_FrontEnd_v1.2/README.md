# PMS Insurance Claims Frontend v1.2

보험 심사 자동화를 위한 AI 기반 프로젝트 관리 시스템 프론트엔드

## 주요 기능

### Core Features

- **역할 기반 접근 제어 (RBAC)** - 7가지 역할별 권한 관리
- **대시보드** - 실시간 차트, 프로젝트 현황
- **단계별 관리 (Waterfall)** - Phase, Deliverable, KPI 관리
- **WBS 관리** - 3단계 작업분해구조 (Group → Item → Task)
- **백로그 관리** - 4단계 계층 (Epic → Feature → Story → Task)
- **칸반 보드** - 드래그 앤 드롭 태스크 관리
- **AI 어시스턴트** - LLM 기반 프로젝트 어시스턴트

### v1.2 New Features

- **4-Level Backlog Hierarchy**: Epic → Feature → User Story → Task
- **WBS Integration**: Phase별 WBS 관리 (WbsGroup → WbsItem → WbsTask)
- **Phase Templates**: 프로젝트 템플릿 적용
- **Phase-Backlog Integration**: Phase ↔ Epic, Feature ↔ WbsGroup, Story ↔ WbsItem 연결
- **Auto API Fallback**: 백엔드 없이도 목업 데이터로 자동 동작

## 설치

```bash
npm install
```

## 설정

백엔드 API를 사용하려면 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 수정:

```
VITE_API_URL=http://localhost:8083/api
```

> **참고:** 백엔드가 없으면 자동으로 목업 데이터를 사용합니다.

## 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 빌드

```bash
npm run build
```

## 사용자 계정

### 백엔드 연동 시

모든 계정 비밀번호: `password123`

| 이메일 | 역할 |
|--------|------|
| kim@example.com | PM |
| lee@example.com | Developer |
| park@example.com | Developer |
| choi@example.com | QA |
| jung@example.com | PMO Head |
| kang@example.com | Sponsor |

### 목업 데이터 사용 시 (백엔드 없이)

| 이메일 | 비밀번호 | 역할 |
|--------|---------|------|
| sponsor@insure.com | sponsor123 | 스폰서 |
| pmo@insure.com | pmo123 | PMO 총괄 |
| pm@insure.com | pm123 | PM |
| dev@insure.com | dev123 | 개발자 |
| qa@insure.com | qa123 | QA |
| ba@insure.com | ba123 | 현업분석가 |
| admin@insure.com | admin123 | 관리자 |

## 역할별 권한

| 역할 | 접근 권한 |
|------|----------|
| **Sponsor** | 대시보드, 단계별 관리 (읽기) |
| **PMO Head** | 모든 메뉴, 승인 권한 |
| **PM** | 단계별 관리, 칸반, 백로그, WBS |
| **Developer/QA** | 칸반 보드, 백로그, AI 어시스턴트 |
| **Business Analyst** | 읽기 전용 |

## 기술 스택

- **Framework:** React 18.3 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS 4.x
- **UI Components:** Radix UI
- **Drag & Drop:** React DnD
- **Charts:** Recharts
- **State Management:** React Query (TanStack Query)
- **Icons:** Lucide Icons

## 프로젝트 구조

```
src/
├── app/
│   ├── components/
│   │   ├── Dashboard.tsx           # 통합 대시보드
│   │   ├── PhaseManagement.tsx     # 단계별 관리 + WBS
│   │   ├── KanbanBoard.tsx         # 칸반 보드
│   │   ├── BacklogManagement.tsx   # 백로그 관리 (Epic/Feature/Story)
│   │   ├── RoleManagement.tsx      # 권한 관리
│   │   ├── AIAssistant.tsx         # AI 어시스턴트
│   │   ├── LoginScreen.tsx         # 로그인
│   │   ├── Header.tsx              # 헤더
│   │   ├── Sidebar.tsx             # 사이드바
│   │   └── ui/                     # 공통 UI 컴포넌트
│   └── App.tsx
├── hooks/
│   └── api/
│       ├── useWbs.ts               # WBS CRUD hooks
│       ├── useFeatures.ts          # Feature CRUD hooks
│       ├── useTemplates.ts         # Template hooks
│       └── useWbsBacklogIntegration.ts  # Integration hooks
├── services/
│   └── api.ts                      # API 서비스 (자동 fallback)
├── types/
│   ├── backlog.ts                  # Backlog 타입 정의
│   ├── wbs.ts                      # WBS 타입 정의
│   └── templates.ts                # Template 타입 정의
└── main.tsx
```

## API Hooks

### WBS Management

```typescript
import { useWbsGroups, useCreateWbsGroup, useWbsItems } from '@/hooks/api/useWbs';

// Phase별 WBS Groups 조회
const { data: groups } = useWbsGroups(phaseId);

// WBS Group 생성
const createGroup = useCreateWbsGroup();
createGroup.mutate({ phaseId, name: 'Analysis', ... });

// Group별 WBS Items 조회
const { data: items } = useWbsItems(groupId);
```

### Feature Management

```typescript
import { useFeatures, useCreateFeature, useLinkFeatureToWbsGroup } from '@/hooks/api/useFeatures';

// Epic별 Features 조회
const { data: features } = useFeatures(epicId);

// Feature 생성
const createFeature = useCreateFeature();
createFeature.mutate({ epicId, name: 'Login', ... });

// Feature-WbsGroup 연결
const linkFeature = useLinkFeatureToWbsGroup();
linkFeature.mutate({ featureId, wbsGroupId });
```

### Integration

```typescript
import { useLinkEpicToPhase, usePhaseIntegration } from '@/hooks/api/useWbsBacklogIntegration';

// Epic-Phase 연결
const linkEpic = useLinkEpicToPhase();
linkEpic.mutate({ epicId, phaseId });

// Phase 통합 현황 조회
const { data: summary } = usePhaseIntegration(phaseId, projectId);
```

## 자동 Fallback 시스템

`src/services/api.ts`가 자동으로:

1. 백엔드 API 연결 시도
2. 실패 시 목업 데이터 사용
3. 사용자에게 투명하게 작동

이를 통해 백엔드 없이도 전체 시스템을 테스트할 수 있습니다.

## 관련 문서

- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - 시스템 아키텍처
- [IMPLEMENTATION_PLAN_MENU_RESTRUCTURE.md](../docs/IMPLEMENTATION_PLAN_MENU_RESTRUCTURE.md) - 구현 계획
