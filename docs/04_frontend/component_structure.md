# 컴포넌트 구조

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: frontend -->

---

## 이 문서가 답하는 질문

- 컴포넌트는 어떻게 구성되어 있는가?
- 각 기능에 어떤 컴포넌트가 존재하는가?
- 새 컴포넌트는 어디에 추가해야 하는가?

---

## 1. 디렉토리 구조

```
src/app/components/
├── ui/                 # 기본 UI 컴포넌트 (shadcn/ui)
├── common/             # 공유 기능 컴포넌트
├── chat/               # AI 채팅 컴포넌트
├── phases/             # 단계 관리
├── wbs/                # 작업 분류 체계
├── backlog/            # 백로그 및 스프린트
├── lineage/            # 데이터 계보
├── templates/          # 템플릿 관리
├── integration/        # WBS-백로그 통합
├── statistics/         # 통계 및 보고서
├── pmo-console/        # PMO 대시보드 위젯
├── roles/              # 역할 관리
├── settings/           # 설정 컴포넌트
└── figma/              # 디자인 시스템 컴포넌트
```

---

## 2. UI 컴포넌트 (shadcn/ui)

`ui/` 디렉토리의 기본 컴포넌트:

| 컴포넌트 | 목적 |
|----------|------|
| `button.tsx` | 주요 액션 버튼 |
| `input.tsx` | 텍스트 입력 필드 |
| `select.tsx` | 드롭다운 선택 |
| `dialog.tsx` | 모달 다이얼로그 |
| `card.tsx` | 콘텐츠 카드 컨테이너 |
| `table.tsx` | 데이터 테이블 |
| `tabs.tsx` | 탭 네비게이션 |
| `sidebar.tsx` | 사이드 네비게이션 |
| `form.tsx` | 폼 컨트롤 |
| `toast.tsx` | 알림 |

---

## 3. 기능 컴포넌트

### 대시보드 및 개요

| 컴포넌트 | 목적 |
|----------|------|
| `Dashboard.tsx` | 프로젝트 개요가 있는 메인 대시보드 |
| `PartDashboard.tsx` | 팀/파트별 대시보드 |
| `StatisticsPage.tsx` | 프로젝트 통계 |
| `PmoConsolePage.tsx` | PMO 관리 콘솔 |

### 프로젝트 관리

| 컴포넌트 | 목적 |
|----------|------|
| `ProjectManagement.tsx` | 프로젝트 CRUD 작업 |
| `ProjectSelector.tsx` | 프로젝트 선택 드롭다운 |
| `ProjectNotSelectedMessage.tsx` | 프로젝트 미선택 시 빈 상태 |

### 단계 관리 (`phases/`)

| 컴포넌트 | 목적 |
|----------|------|
| `PhaseList.tsx` | 프로젝트 단계 목록 |
| `PhaseCard.tsx` | 개별 단계 표시 |
| `DeliverablesList.tsx` | 단계 산출물 |
| `GateApprovalDialog.tsx` | 게이트 승인 모달 |

### WBS 관리 (`wbs/`)

| 컴포넌트 | 목적 |
|----------|------|
| `WbsOverviewTree.tsx` | WBS 트리 뷰 |
| `WbsGanttChart.tsx` | 간트 차트 타임라인 |
| `WbsProgressBar.tsx` | 진척률 시각화 |
| `WbsSnapshotList.tsx` | 버전 스냅샷 |

### 백로그 및 스프린트 (`backlog/`)

| 컴포넌트 | 목적 |
|----------|------|
| `SprintPanel.tsx` | 스프린트 보드 뷰 |
| `EpicFormModal.tsx` | 에픽 생성/수정 |
| `FeatureFormModal.tsx` | 기능 관리 |

### AI 채팅 (`chat/`)

| 컴포넌트 | 목적 |
|----------|------|
| `AIAssistant.tsx` | 메인 채팅 인터페이스 |
| `EvidencePanel.tsx` | RAG 출처 표시 |
| `ApprovalDialog.tsx` | AI 액션 승인 |

### 데이터 계보 (`lineage/`)

| 컴포넌트 | 목적 |
|----------|------|
| `LineageManagement.tsx` | 계보 메인 뷰 |
| `LineageGraph.tsx` | Neo4j 그래프 시각화 |
| `LineageTimeline.tsx` | 타임라인 뷰 |
| `ImpactAnalysis.tsx` | 변경 영향 분석 |

### 공통 컴포넌트 (`common/`)

| 컴포넌트 | 목적 |
|----------|------|
| `DeliverableManagement.tsx` | 산출물 CRUD |
| `MeetingManagement.tsx` | 회의 관리 |
| `IssueManagement.tsx` | 이슈 추적 |
| `StatisticsCard.tsx` | 통계 표시 카드 |
| `FilterBar.tsx` | 필터 컨트롤 |

---

## 4. 컴포넌트 패턴

### 기능 컴포넌트 구조

```tsx
// 훅을 사용한 기능 컴포넌트
export function ProjectManagement() {
  // 상태 훅
  const { currentProject } = useProject();
  const { user } = useAuthStore();

  // Query 훅
  const { data: projects, isLoading } = useProjects();
  const createMutation = useCreateProject();

  // 로컬 상태
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 핸들러
  const handleCreate = async (data) => {
    await createMutation.mutateAsync(data);
    setIsDialogOpen(false);
  };

  // 렌더링
  if (isLoading) return <Skeleton />;

  return (
    <div className="p-4">
      <Header onAdd={() => setIsDialogOpen(true)} />
      <ProjectList projects={projects} />
      <CreateDialog open={isDialogOpen} onSubmit={handleCreate} />
    </div>
  );
}
```

### 프레젠테이셔널 컴포넌트

```tsx
// 순수 표시 컴포넌트
interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{project.description}</p>
        <Badge>{project.status}</Badge>
      </CardContent>
      <CardFooter>
        <Button onClick={onEdit}>수정</Button>
        <Button variant="destructive" onClick={onDelete}>삭제</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 5. 인덱스 파일

각 기능 디렉토리에는 내보내기용 `index.ts`가 있습니다:

```typescript
// components/phases/index.ts
export { PhaseList } from './PhaseList';
export { PhaseCard } from './PhaseCard';
export { DeliverablesList } from './DeliverablesList';
export * from './types';
export * from './constants';
```

---

## 6. 타입 정의

타입은 기능별로 구성됩니다:

```typescript
// components/phases/types.ts
export interface PhaseListProps {
  projectId: string;
  onPhaseSelect: (phaseId: string) => void;
}

export interface PhaseCardProps {
  phase: Phase;
  isEditable: boolean;
  onEdit: () => void;
}
```

---

## 7. 상수

기능별 상수:

```typescript
// components/phases/constants.ts
export const PHASE_STATUSES = [
  { value: 'NOT_STARTED', label: '시작 전' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'ON_HOLD', label: '보류' },
];

export const GATE_STATUSES = [
  { value: 'PENDING', label: '대기' },
  { value: 'SUBMITTED', label: '제출됨' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
];
```

---

## 8. 새 컴포넌트 추가 위치

| 컴포넌트 유형 | 위치 |
|---------------|------|
| 기본 UI 컴포넌트 | `components/ui/` |
| 기능 컴포넌트 | `components/{feature}/` |
| 공유 유틸리티 컴포넌트 | `components/common/` |
| 페이지 레벨 컴포넌트 | `components/{PageName}.tsx` |
| 다이얼로그/모달 | `components/{feature}/modals/` 또는 `dialogs/` |
| 재사용 가능한 위젯 | `components/common/` |

---

## 9. 네이밍 컨벤션

| 유형 | 컨벤션 | 예시 |
|------|--------|------|
| 컴포넌트 파일 | PascalCase | `ProjectCard.tsx` |
| 훅 파일 | camelCase + use 접두사 | `useProjects.ts` |
| 타입 파일 | lowercase | `types.ts` |
| 상수 파일 | lowercase | `constants.ts` |
| 인덱스 파일 | lowercase | `index.ts` |

---

## 10. 모범 사례

### 해야 할 것 (DO)

- 컴포넌트를 작고 집중되게 유지
- 모든 props에 TypeScript 사용
- 인덱스 파일에서 내보내기
- 로직과 프레젠테이션 분리
- shadcn/ui 컴포넌트를 기본으로 사용

### 하지 말아야 할 것 (DON'T)

- 깊게 중첩된 컴포넌트 계층 생성
- 프레젠테이셔널 컴포넌트에 비즈니스 로직 넣기
- 컴포넌트 코드 중복
- TypeScript 타입 생략
- 명확한 목적 없이 컴포넌트 생성

---

*최종 수정일: 2026-02-02*
