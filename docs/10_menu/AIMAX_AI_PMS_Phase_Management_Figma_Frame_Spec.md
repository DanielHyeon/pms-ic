# AIMAX AI-PMS — 단계별관리(Phase Management) Figma 프레임 정의서 v1.0
작성일: 2026-02-08  
범위: **단계별관리(Phase Management) 메인 화면 + 트랙(전체/AI/SI/인프라) 레이어 + Drill-down(상세 패널)**  
근거 화면(기존): “프로젝트 단계별 현황 / 단계별 설정” 구성(단계, 계획/실적, AI·SI 구분, 관련 파트/Task 매핑)【turn2file0†L1-L46】

---

## 0) 설계 목표(Design Goals)

1. **한 화면에서 판단 → 원인 → 조치**가 이어져야 한다.
2. 단계(Phase)는 **프로젝트 단일 타임라인**이고, AI/SI/인프라는 **트랙(Track) 레이어**로 분리한다.
3. “표(나열)” 중심에서 **상태(정상/주의/위험) 중심**으로 시선을 유도한다.
4. 권한/역할(Preset/ViewMode)에 따라 **같은 프레임을 변형(Variants)**하여 화면 폭증을 막는다.

---

## 1) 정보 구조(IA) & 사용자 흐름

### 1.1 핵심 엔티티
- Project
- Phase(프로젝트 단계: 분석/설계/개발/테스트/이행/오픈/안정화 등)
- Track: {ALL, AI, SI, INFRA}  
- Sub-Part/Part(조직/파트)
- Task(WBS Task)
- Issue(지연 원인/조치 추적)

### 1.2 사용자 흐름(Top 4)
1) **상태 파악**: 프로젝트 선택 → Health Summary에서 위험 단계 확인  
2) **원인 확인**: 위험 단계 클릭 → 오른쪽 Action Drawer에서 원인/근거(지연 Task/Issue) 확인  
3) **조치 실행**: Drawer에서 “이슈 생성/담당자 지정/기한 설정” → 저장  
4) **트랙 전환**: ALL ↔ AI ↔ SI ↔ INFRA 토글 → 동일 단계에서 책임 주체별 보기

---

## 2) Figma 페이지/프레임 구성

### 2.1 Figma Pages
1. `00_Cover`
2. `01_DesignSystem` (Tokens, Components, Icons)
3. `10_PhaseManagement` (메인/상세)
4. `90_States` (Empty, Loading, Error, NoPermission)

### 2.2 프레임 목록(필수)
- `PM-01 Phase Management / Overview`
- `PM-02 Phase Management / Drilldown Drawer`
- `PM-03 Phase Management / Phase Settings (Admin)`
- `PM-90 States / Empty`
- `PM-91 States / Loading`
- `PM-92 States / Error`
- `PM-93 States / No Permission`

---

## 3) 레이아웃 그리드 & 공통 레일

### 3.1 Desktop 기준
- Frame: 1440 × 1024 (기본)
- Grid: 12 columns / margin 24 / gutter 16
- Left Rail: SideNav 240px (고정)
- Top Bar: 56px (고정)
- Content: `calc(100% - 240px)`

### 3.2 반응형 브레이크포인트(권장)
- 1280: 테이블 컬럼 일부 축약(‘주요 원인’ → 아이콘/툴팁)
- 1024 이하: Drawer를 Full-screen modal로 전환

---

## 4) PM-01 Phase Management / Overview (메인 화면)

### 4.1 상단(Top Bar 영역)
**컴포넌트**
- `ProjectSwitcher` (Dropdown)
- `DateRange` (프로젝트 기간 표시, 읽기 전용)
- `TrackToggle` (Segmented Control: ALL / AI / SI / INFRA)
- `AsOfBadge` (데이터 기준 시각)
- `Export` (PMO/감사 권한에서만 노출)

**레이아웃**
- 좌: ProjectSwitcher + 기간
- 우: TrackToggle + AsOfBadge + Export

### 4.2 Health Summary Strip (판단 요약)
**목표**: 단계별 “상태”를 먼저 보여줌  
**구성**
- `HealthChip` × N(단계 수)
  - Label: Step/단계명
  - Status dot: 정상/주의/위험/중지
  - Tooltip: 계획/실적/편차 요약

**행동**
- Chip 클릭 → 해당 단계 row로 스크롤 + Drawer 오픈(선택)

### 4.3 Phase Table (핵심 테이블)
**필수 컬럼(ALL 트랙)**
1. 단계(Phase)  
2. 계획(Plan %)  
3. 실적(Actual %)  
4. 편차(Delta = Actual - Plan)  
5. 주요 원인(Primary Cause: Task/Issue 카테고리)  
6. 조치(Action: 버튼)

**트랙 전환 시 컬럼 룰**
- ALL: 계획/실적/편차는 **전체 기준**
- AI/SI/INFRA: 계획/실적/편차는 **해당 트랙 기준**, ALL 대비 ‘영향’ 배지 표시

**Row 확장(Inline Expand)**
- Row 오른쪽 chevron 클릭 시:
  - (A) 해당 단계의 Sub-Part 요약(리더/진척/지연 Task 수)
  - (B) 핵심 Task 3~5개(지연/중요도 기준)

### 4.4 Dependency View (의존성)
**목표**: “이 단계 지연이 어디로 번지는지” 시각화  
**형태**
- 간단한 `DependencyMiniGraph` (node 3~6개)
- Node: Phase@Track
- Edge: 영향 관계(지연 전파)

**행동**
- Edge 클릭 → Drawer에서 “영향받는 항목” 목록 필터 적용

---

## 5) PM-02 Phase Management / Drilldown Drawer (오른쪽 패널)

### 5.1 Drawer 규격
- Width: 420px (Desktop)
- Overlay: 없음(콘텐츠와 공존), 단 모바일에서는 Full modal
- Header: `PhaseName + Track + StatusBadge`
- Tabs: `원인` / `지연 Task` / `이슈` / `조치 기록`

### 5.2 탭 상세
**(1) 원인**
- `CauseCards` (Top 3)
  - ex) 인프라 승인 지연, 테스트 실패, 산출물 미승인 등
- 근거 링크: 관련 Task/Issue로 이동

**(2) 지연 Task**
- `TaskList` (columns: Task, 담당, 기한, 상태)
- Quick action: 담당 변경, 기한 조정, 우선순위

**(3) 이슈**
- `IssueList` + `CreateIssueCTA`
- Create 폼(Inline):
  - 제목, 분류(보안/인프라/테스트/기타), 담당, 종료기한, 상세

**(4) 조치 기록**
- Timeline 스타일
- 누가/언제/무엇을 변경했는지(감사 대응)

---

## 6) PM-03 Phase Settings (Admin용 — “단계별 설정” 개선)

기존 “단계별 설정” 화면은 **AI or SI 실행형태**, 단계명, 시작/종료일, 관련 파트, 관련 Task 매핑을 가진 표 형태【turn2file0†L20-L43】.  
개선안은 “정의”와 “운영”을 분리한다.

### 6.1 섹션 분리
1) **Phase Template(정의)**  
- 프로젝트 유형별(예: AI 보험금지급심사 구축) 기본 단계 템플릿 관리  
- 단계명/순서/기본 가중치(ALL 대비) 설정

2) **Phase Instance(운영)**  
- 프로젝트별 시작/종료일, 트랙별 포함 여부, 관련 파트/Task 매핑

### 6.2 필드 정의
- 실행형태: {AI, SI, Hybrid}  
- 단계명(필수), 순서(필수), 시작일/종료일(필수)
- 관련 파트: Multi-select
- 관련 Task: Multi-select(Part 필터 연동)
- 트랙 포함 여부: AI/SI/INFRA 체크

### 6.3 검증 룰(UX)
- 날짜 역전 금지(시작일 ≤ 종료일)
- 순서 중복 금지
- 관련 Task는 반드시 하나 이상의 Part에 속해야 함
- Hybrid일 경우, 최소 2개 트랙 포함

---

## 7) 컴포넌트 라이브러리 정의(Design System)

### 7.1 공통 컴포넌트
- `StatusBadge` (Normal/Warning/Critical/Paused)
- `TrackToggle` (Segmented)
- `KpiCard` (값 + 변화 + 설명)
- `DataBadge` (AsOf, Source)
- `Table` (Sticky header, row expand)
- `Drawer` (Right panel)

### 7.2 상태별(States)
- Empty: “단계 템플릿이 없습니다 → 단계 설정으로 이동”
- Loading: Skeleton(표 + chips)
- Error: 재시도 + 오류 코드
- No Permission: 읽기 전용 안내

---

## 8) ViewMode(프리셋) Variants 규격(필수)

하나의 `PM-01` 프레임을 **Variant**로 확장한다.

- `Preset: EXEC_SUMMARY`
  - 테이블 축약, Health Summary 강조, 조치 버튼 최소화
- `Preset: PMO_CONTROL`
  - Export 노출, 조치/기록 탭 노출, 승인/차단 배지
- `Preset: PM_EXECUTION`
  - Task/Issue 중심, 빠른 조치 CTA
- `Preset: DEV_EXECUTION`
  - Task 탭 기본, 편차/원인 컬럼 축약
- `Preset: CUSTOMER_VIEW`
  - 내부 원인 상세 일부 마스킹, 산출물/승인 중심

---

## 9) 수용 기준(Acceptance Criteria)

1. Track 토글(ALL/AI/SI/INFRA) 전환 시 **동일 단계 리스트가 유지**되며, 수치만 트랙 기준으로 변경된다.
2. 위험(🔴) 단계는 상단 Health Strip에서 **자동 강조**된다.
3. 조치 버튼은 Drawer로 연결되고, Drawer에서 Issue/Task 조치가 가능하다.
4. Admin은 Phase Settings에서 단계/날짜/매핑을 수정 가능하며, 일반 사용자는 읽기 전용이다.
5. 모든 화면은 Empty/Loading/Error/NoPermission 상태를 가진다.

---

## 10) 디자이너 작업 체크리스트

- [ ] `PM-01`에서 테이블 row expand / hover 상태 정의  
- [ ] Drawer 탭 4종 상태 정의  
- [ ] StatusBadge 색상/아이콘 토큰화  
- [ ] Preset Variants(최소 3개: EXEC/PMO/PM) 우선 생성  
- [ ] Empty/Loading/Error 화면 추가

