# RFP 메뉴 페이지 구성 계획

> **문서 버전**: v2.4
> **작성일**: 2026-02-10
> **기반 문서**: RFP 화면구성.pdf
> **목적**: RFP 관리 화면을 "프로젝트 기원의 관문(Origin Console)"으로 재설계하기 위한 전체 구현 계획
> **변경 이력**:
>
> - v2.0 → v2.1 — 상태 모델, Origin 정책, API 계약, 권한 매트릭스, 스프린트 계획, 테스트 시나리오 추가
> - v2.1 → v2.2 — 상태↔UI 매핑 추가, Wizard/Empty State 흐름 정합성 수정, API 응답 스키마 보강, Origin 진입 시나리오별 분기 명확화
> - v2.2 → v2.3 — E2E 통합 장애 진단 추가, Frontend-Backend API 응답/에러 처리 정책 확정, Profile 기반 인증 전략, UI 상태 머신(loading/null/error/auth) 도입, 통합 테스트 시나리오 추가
> - v2.3 → v2.4 — 구현 상태 재평가(가치 사슬 관점), E2E 회복 실행 계획(Sprint A/B/C), 끊김 지점 3곳 진단, Definition of Done + 관측/검증 포인트 추가, Deep-link 최소 구현 전략

---

## 목차

1. [현재 화면 진단 및 문제점](#1-현재-화면-진단-및-문제점)
2. [화면 정체성 재정의](#2-화면-정체성-재정의)
3. [개선 방향 요약](#3-개선-방향-요약)
4. [RFP 상태 모델 (State Machine)](#4-rfp-상태-모델-state-machine)
5. [Origin 정책 모델](#5-origin-정책-모델)
6. [와이어프레임 정의서 (Figma 기준)](#6-와이어프레임-정의서-figma-기준)
7. [Preset별 화면 표시 차등](#7-preset별-화면-표시-차등)
8. [API 계약 (Contract)](#8-api-계약-contract)
9. [전체 흐름 시퀀스 (RFP → 요구사항 → Epic → WBS)](#9-전체-흐름-시퀀스)
10. [AI 분석 파이프라인 설계](#10-ai-분석-파이프라인-설계)
11. [외부 감사 대응 RFP Evidence 모델](#11-외부-감사-대응-rfp-evidence-모델)
12. [Role × Capability × Screen 매트릭스](#12-role--capability--screen-매트릭스)
13. [FilterSpec / Deep-link 규칙](#13-filterspec--deep-link-규칙)
14. [스프린트별 구현 계획](#14-스프린트별-구현-계획)
15. [테스트 시나리오](#15-테스트-시나리오)
16. [Frontend-Backend 통합 정책](#16-frontend-backend-통합-정책)
17. [인증/보안 개발 전략](#17-인증보안-개발-전략)
18. [E2E 통합 장애 진단 및 해결](#18-e2e-통합-장애-진단-및-해결)
19. [구현 상태 재평가 (가치 사슬 관점)](#19-구현-상태-재평가-가치-사슬-관점)
20. [E2E 회복 실행 계획 (체감 E2E 25% → 60%+)](#20-e2e-회복-실행-계획-체감-e2e-25--60)
21. [관측/검증 포인트 및 의사결정 요약](#21-관측검증-포인트-및-의사결정-요약)

---

## 1. 현재 화면 진단 및 문제점

### 1.1 현재 화면의 암묵적 메시지

현재 RFP 화면은 사용자에게 다음과 같이 전달하고 있다:

> "RFP는 그냥 하나의 관리 대상 엔티티다. 없으면 등록하면 되고, 있으면 검색해서 보면 된다."

이 메시지는 일반 문서 관리 시스템(DMS)에서는 맞지만, **AI-PMS / 거버넌스 중심 PMS**에서는 틀린 메시지다.

### 1.2 PMS 전체 흐름에서 RFP의 실제 역할

이 PMS에서 RFP는 단순 문서가 아니라:

- 프로젝트 범위(Scope)의 **최초 선언**
- 요구사항의 **법적/계약적 출처**
- 향후 감사(Lineage, Trace, Evidence)의 **최상위 노드**
- AI가 "왜 이 요구사항이 생겼는지"를 설명할 수 있는 **유일한 근거**

즉, **RFP = 모든 요구사항/WBS/일정/비용/리스크의 원천(Source of Truth)**

### 1.3 구조적 핵심 문제 5가지

| # | 문제 | 설명 |
|---|------|------|
| 1 | **RFP가 "고립된 리스트"로 존재** | 요구사항 관리 / 백로그 / WBS와 연결된 느낌이 전혀 없음. "이 RFP에서 무엇이 파생되었는가?"를 암시하는 정보가 0 |
| 2 | **Empty State가 너무 약함** | "등록된 RFP가 없습니다"는 시스템 상태 설명일 뿐, 사용자 행동 유도가 아님. 프로젝트 유형 분기(외부 RFP / 내부 기획 / 고도화)가 빠져있음 |
| 3 | **"RFP 등록"의 의미가 불분명** | PDF 올리면 끝인가? 여러 개 올려도 되나? 버전 개념이 있나? 요구사항이랑 자동 연결되나? 버튼 하나에 너무 많은 암묵적 결정이 숨어 있음 |
| 4 | **AI 어시스턴트와의 역할 분리가 안 보임** | 상단에 "AI 어시스턴트" 버튼이 있지만, RFP 화면에서 AI가 무엇을 해주는지 전혀 드러나지 않음. 실제로는 **RFP 화면이 AI 가치가 가장 큰 지점** |
| 5 | **거버넌스/감사 관점 정보가 완전히 숨겨짐** | 어떤 RFP를 근거로 시작했나? 요구사항 변경은 원 RFP 대비 얼마나 벗어났나? RFP 원문과 현재 구현 간 정합성은? — 단서조차 없음 |

---

## 2. 화면 정체성 재정의

이 화면의 정체성은 다음과 같이 바뀌어야 한다:

| 기존 | 변경 |
|------|------|
| "RFP 문서 관리 화면" | **"프로젝트의 기원을 정의하고, AI 분석이 시작되는 관문"** |

이를 UI 언어로 번역하면:

- 리스트 화면 ≠ 단순 목록
- 등록 버튼 ≠ 단순 업로드
- Empty State ≠ 데이터 없음
- AI ≠ 부가 기능

---

## 3. 개선 방향 요약

### 3.1 Empty State를 "결정 화면"으로 전환

Empty State를 다음과 같이 변경:

```
이 프로젝트의 출발점을 정의하세요

이 프로젝트는 무엇을 기반으로 시작되었나요?

[ 외부 고객 RFP 기반 ]
 - 고객 제안 요청서(PDF, Word 등)를 업로드
 - AI가 요구사항/범위/제약 조건을 자동 추출

[ 내부 기획 프로젝트 ]
 - RFP 없이 내부 요구사항부터 시작
 - AI가 표준 RFP 초안을 생성

[ 기존 시스템 고도화 ]
 - 기존 문서 또는 요구사항 불러오기
 - 변경 영향 분석 자동 활성화
```

이 선택 하나로 데이터 모델, AI 파이프라인, 이후 화면 동선이 전부 달라진다.

### 3.2 RFP 리스트를 "상태 요약 카드"로 진화

기존 테이블 → **RFP Status Card Grid**

각 카드 구성:

| 정보 | 설명 |
|------|------|
| RFP 이름 / 버전 | 기본 식별 |
| 추출된 요구사항 수 | AI 분석 결과 |
| 요구사항 → Epic 연결률 (%) | 전개 진행도 |
| 최근 변경 이후 영향 알림 | 변경 관리 |
| AI 분석 상태 | 완료 / 재분석 필요 |

### 3.3 "RFP 등록"을 Wizard + AI 중심으로 전환

> **전제**: Origin Type은 Empty State(Section 6.3)에서 이미 선택된 상태.
> Wizard는 Origin 선택 **이후** 개별 RFP 등록 시 진입한다.

| Step | 내용 |
|------|------|
| **Step 1** | RFP 메타데이터 입력 (제목, 발행처/고객명, RFP 유형) + 현재 Origin 정책 확인 |
| **Step 2** | 문서 업로드 / 텍스트 입력 |
| **Step 3** | AI 사전 분석 미리보기 (핵심 범위 요약, 주요 제약 조건, 불명확한 항목 질문) |
| **Step 4** | "요구사항으로 전개" 실행 — 이 순간부터 RFP는 문서가 아니라 구조화된 지식 노드가 됨 |

### 3.4 요구사항 관리와의 명시적 연결

RFP 화면에서 반드시 보여줄 CTA:

- "이 RFP에서 추출된 요구사항 보기"
- "요구사항 누락/중복 검토"
- "변경 영향 분석 실행"

→ RFP 화면에서 요구사항 화면으로 자연스럽게 흐르게

---

## 4. RFP 상태 모델 (State Machine)

> 이 섹션이 없으면 프론트/백/워커가 각자 다른 상태 해석을 하게 되고, 재분석/버전/검토 흐름이 운영에서 꼬인다.

### 4.1 RFP Top-level Status

| Status | 설명 | 진입 조건 |
|--------|------|----------|
| `EMPTY` | 프로젝트에 RFP/Origin이 아직 정의되지 않음 (Empty State) | 프로젝트 생성 직후 |
| `ORIGIN_DEFINED` | OriginType 선택 완료 (외부/내부/고도화/혼합) | Origin 선택 저장 |
| `UPLOADED` | 파일 업로드 완료 (파싱/추출 전) | 파일 업로드 성공 |
| `PARSING` | 파싱 잡 실행 중 | 파싱 워커 시작 |
| `PARSED` | chunk 저장 완료, 추출 대기 | chunk 저장 완료 |
| `EXTRACTING` | LLM 추출 실행 중 | 추출 워커 시작 |
| `EXTRACTED` | 후보(candidate) 생성 완료 | candidate 저장 완료 |
| `REVIEWING` | 사람이 검토 중 (ExtractionReview 오픈 이후) | 리뷰 화면 최초 진입 |
| `CONFIRMED` | 후보 → requirement로 확정 완료 (최소 1개 이상) | bulk-confirm 성공 |
| `NEEDS_REANALYSIS` | 재분석 필요 | 새 버전 업로드 / 파서·프롬프트 변경 / 품질 경고 |
| `ON_HOLD` | 보류 (계약 중단, 취소, 진행중지 등) | 수동 전환 (PM 이상) |
| `FAILED` | 파싱/추출 실패 (원인 메시지 포함) | 워커 에러 |

### 4.2 상태 전이 다이어그램

```
                         ┌──────────────────────────────────┐
                         │                                  │
  ┌───────┐  Origin선택  ┌────────────────┐  파일업로드  ┌──────────┐
  │ EMPTY │ ──────────→ │ ORIGIN_DEFINED │ ──────────→ │ UPLOADED │
  └───────┘             └────────────────┘             └────┬─────┘
                                                            │ 파싱시작
                                                            ▼
                         ┌──────────┐  chunk저장완료  ┌─────────┐
                         │  PARSED  │ ◄──────────── │ PARSING │
                         └────┬─────┘               └─────────┘
                              │ 추출시작                    │ 실패
                              ▼                            ▼
  ┌───────────┐  후보생성  ┌────────────┐            ┌────────┐
  │ EXTRACTED │ ◄──────── │ EXTRACTING │            │ FAILED │
  └─────┬─────┘           └────────────┘            └────────┘
        │ 리뷰시작               │ 실패                  ▲
        ▼                       ▼                       │
  ┌───────────┐            ┌────────┐                   │
  │ REVIEWING │            │ FAILED │                   │
  └─────┬─────┘            └────────┘                   │
        │ 확정(1개+)                                     │
        ▼                                               │
  ┌───────────┐  새버전/환경변경  ┌───────────────────┐   │
  │ CONFIRMED │ ──────────────→ │ NEEDS_REANALYSIS │ ──┘ (재분석시작→PARSING)
  └───────────┘                 └───────────────────┘
        │
        ▼ (수동)
  ┌─────────┐
  │ ON_HOLD │
  └─────────┘
```

### 4.3 상태 전이 이벤트 상세

| 이벤트 | From | To | 트리거 | 권한 |
|--------|------|----|--------|------|
| Origin 선택 | `EMPTY` | `ORIGIN_DEFINED` | 사용자 UI | `manage_rfp_upload` |
| 파일 업로드 성공 | `ORIGIN_DEFINED` | `UPLOADED` | API 응답 | `manage_rfp_upload` |
| 파싱 잡 시작 | `UPLOADED` | `PARSING` | Worker 자동 | system |
| Chunk 저장 완료 | `PARSING` | `PARSED` | Worker 완료 | system |
| 파싱 실패 | `PARSING` | `FAILED` | Worker 에러 | system |
| 추출 시작 | `PARSED` | `EXTRACTING` | Worker 자동 또는 수동 | `run_rfp_analysis` |
| 후보 생성 완료 | `EXTRACTING` | `EXTRACTED` | Worker 완료 | system |
| 추출 실패 | `EXTRACTING` | `FAILED` | Worker 에러 | system |
| 리뷰 화면 진입 | `EXTRACTED` | `REVIEWING` | 사용자 UI | `review_rfp_candidates` |
| 후보 확정 (1개+) | `REVIEWING` | `CONFIRMED` | bulk-confirm API | `confirm_requirements` |
| 새 버전 업로드 | `CONFIRMED` | `NEEDS_REANALYSIS` | 버전 업로드 API | `manage_rfp_upload` |
| 환경 변경 감지 | `CONFIRMED` | `NEEDS_REANALYSIS` | 파서/프롬프트/모델 변경 | system |
| 품질 경고 | `CONFIRMED` | `NEEDS_REANALYSIS` | 수동 요청 | `run_rfp_analysis` |
| 재분석 시작 | `NEEDS_REANALYSIS` | `PARSING` | 수동/자동 트리거 | `run_rfp_analysis` |
| 보류 전환 | `CONFIRMED` / `REVIEWING` | `ON_HOLD` | 수동 전환 | PM 이상 |
| 보류 해제 | `ON_HOLD` | 이전 상태 복원 | 수동 전환 | PM 이상 |
| 실패 재시도 | `FAILED` | `UPLOADED` | 수동 재업로드 | `manage_rfp_upload` |

### 4.4 상태 전이 핵심 규칙

1. **역방향 전이 금지**: `CONFIRMED` → `EXTRACTED`로 되돌리지 않음 (대신 `NEEDS_REANALYSIS`로 이동)
2. **FAILED는 원인 메시지 필수**: `rfp.failure_reason` 필드에 반드시 기록
3. **ON_HOLD는 이전 상태를 보존**: `rfp.previous_status` 필드에 저장하여 해제 시 복원
4. **NEEDS_REANALYSIS는 기존 데이터를 삭제하지 않음**: 기존 run/candidate는 유지, 새 run 생성

### 4.5 Status → UI 표시 매핑

> 백엔드 Status Enum과 프론트엔드 표시(배지/필터/카드)가 동일한 언어를 쓰도록 고정하는 테이블.

| Backend Status | Badge Label | Badge Color | Filter Label | Card 표시 여부 | 설명 |
|----------------|-------------|-------------|--------------|:---:|------|
| `EMPTY` | — | — | — | N | 카드 자체 없음 (Empty State) |
| `ORIGIN_DEFINED` | — | — | — | N | 카드 자체 없음 (Origin만 설정됨) |
| `UPLOADED` | `업로드됨` | `gray` | `업로드됨` | Y | 파싱 대기 |
| `PARSING` | `분석중` | `blue` (pulse) | `분석중` | Y | 파싱 진행 중 (spinner) |
| `PARSED` | `분석중` | `blue` | `분석중` | Y | 추출 대기 (파싱 완료이나 사용자에겐 "분석중") |
| `EXTRACTING` | `분석중` | `blue` (pulse) | `분석중` | Y | LLM 추출 진행 중 |
| `EXTRACTED` | `검토대기` | `yellow` | `검토대기` | Y | 후보 생성 완료, 리뷰 필요 |
| `REVIEWING` | `검토중` | `orange` | `검토중` | Y | Human-in-the-loop 진행 |
| `CONFIRMED` | `분석완료` | `green` | `분석완료` | Y | 요구사항 확정 완료 |
| `NEEDS_REANALYSIS` | `재분석필요` | `red` | `재분석필요` | Y | 재분석 트리거 대기 |
| `ON_HOLD` | `보류` | `gray` | `보류` | Y | 진행 중지 |
| `FAILED` | `실패` | `red` | `실패` | Y | 파싱/추출 실패 |

**매핑 규칙:**

- `PARSING` + `PARSED` + `EXTRACTING`은 사용자에게 모두 **"분석중"**으로 표시 (내부 단계를 노출하지 않음)
- Filter의 "전체" 옵션은 모든 상태를 포함 (EMPTY/ORIGIN_DEFINED 제외)
- Sort "영향큰순"은 `CONFIRMED` + `NEEDS_REANALYSIS` 상태에만 적용 가능

---

## 5. Origin 정책 모델

> Origin 선택은 단순 "UI 분기"가 아니라 **시스템 거버넌스 설정**이다.

### 5.1 Origin별 정책 차이

| 정책 항목 | `EXTERNAL_RFP` | `INTERNAL_INITIATIVE` | `MODERNIZATION` | `MIXED` |
|---------|----------------|----------------------|-----------------|---------|
| **요구사항 Source 강제** | `source_rfp_id` 필수 | 선택 (내부 근거 문서 가능) | Import/기존 요구사항 근거 필수 | 부분 강제 |
| **Evidence 강도** | 강 (원문 스니펫 + 체크섬) | 중 | 강 (현행 근거 + diff) | 강 |
| **변경관리 (승인)** | 강 (Decision 링크 권장) | 중 | 강 (영향분석 자동) | 강 |
| **AI 추출 기본값** | ON (전체 추출) | "RFP 초안 생성" 또는 "요구사항 정리" | ON (분류/정리 중심) | ON |
| **감사 대응 수준** | 전체 (원문→추출→확정→변경 체인) | 부분 (내부 근거 기준) | 전체 (현행 대비 diff 포함) | 전체 |
| **Lineage 생성 시점** | 확정 즉시 (DERIVES) | 요구사항 생성 시 | Import 시 + 변경 시 | 혼합 |

### 5.2 Origin 선택 후 자동 적용 항목

Origin이 선택되면 다음이 프로젝트 수준에서 자동 설정된다:

```typescript
interface OriginPolicy {
  originType: 'EXTERNAL_RFP' | 'INTERNAL_INITIATIVE' | 'MODERNIZATION' | 'MIXED';
  requireSourceRfpId: boolean;       // requirement 생성 시 source_rfp_id 필수 여부
  evidenceLevel: 'FULL' | 'PARTIAL'; // Evidence 수집 강도
  changeApprovalRequired: boolean;   // 변경 시 승인 필요 여부
  autoAnalysisEnabled: boolean;      // 업로드 후 자동 분석 시작 여부
  lineageEnforcement: 'STRICT' | 'RELAXED'; // Trace Link 강제 수준
}
```

### 5.3 Origin 변경 정책

- Origin은 **프로젝트당 1회만 설정** 가능 (변경 시 PM + PMO 승인 필요)
- Origin 변경 시 기존 RFP/요구사항 데이터는 유지되지만, 정책이 새 Origin 기준으로 전환
- Origin 변경 이력은 `project_audit_log`에 기록

### 5.4 Origin → OriginPolicy 자동 매핑 (코드 계약)

> Empty State(Section 6.3)에서 Origin 선택 시, 아래 매핑이 서버에서 자동 적용된다.
> 프론트엔드는 이 정책 값을 기반으로 UI 분기를 결정한다.

```typescript
const ORIGIN_POLICY_MAP: Record<OriginType, OriginPolicy> = {
  EXTERNAL_RFP: {
    originType: 'EXTERNAL_RFP',
    requireSourceRfpId: true,
    evidenceLevel: 'FULL',
    changeApprovalRequired: true,
    autoAnalysisEnabled: true,
    lineageEnforcement: 'STRICT',
  },
  INTERNAL_INITIATIVE: {
    originType: 'INTERNAL_INITIATIVE',
    requireSourceRfpId: false,
    evidenceLevel: 'PARTIAL',
    changeApprovalRequired: false,
    autoAnalysisEnabled: false,
    lineageEnforcement: 'RELAXED',
  },
  MODERNIZATION: {
    originType: 'MODERNIZATION',
    requireSourceRfpId: true,   // import source required
    evidenceLevel: 'FULL',
    changeApprovalRequired: true,
    autoAnalysisEnabled: true,
    lineageEnforcement: 'STRICT',
  },
  MIXED: {
    originType: 'MIXED',
    requireSourceRfpId: false,  // partially enforced per-requirement
    evidenceLevel: 'FULL',
    changeApprovalRequired: true,
    autoAnalysisEnabled: true,
    lineageEnforcement: 'STRICT',
  },
};
```

**프론트엔드 분기 포인트:**

| 정책 필드 | UI 영향 |
|---------|---------|
| `requireSourceRfpId` | `true`이면 요구사항 생성 시 "원본 RFP" 선택 필수 (validation) |
| `evidenceLevel` | `FULL`이면 Evidence View에 체크섬/원문 스니펫 표시, `PARTIAL`이면 간략 표시 |
| `changeApprovalRequired` | `true`이면 변경 시 "승인 요청" 워크플로 활성화 |
| `autoAnalysisEnabled` | `true`이면 Wizard Step 3 자동 진입, `false`이면 수동 트리거 버튼 표시 |
| `lineageEnforcement` | `STRICT`이면 Epic/WBS 연결 없는 요구사항에 경고 배지 표시 |

---

## 6. 와이어프레임 정의서 (Figma 기준)

### 6.0 Figma 파일/페이지 구조

- **Page 01 — IA & States**
  - `RFP_Manage__Default`
  - `RFP_Manage__Empty_OriginSelect`
  - `RFP_Manage__List_Cards`
  - `RFP_Manage__Detail_Drawer`
  - `RFP_Manage__Upload_Wizard` (Step 1~4)
  - `RFP_Manage__ExtractionReview`
  - `RFP_Manage__Diff_Compare`
  - `RFP_Manage__Evidence_View` (Audit Mode)
- **Page 02 — Components**
  - `OriginSummaryStrip`
  - `RfpCard`
  - `RfpStatusBadge`
  - `ExtractionRunBadge`
  - `ImpactChips`
  - `EvidenceSnippet`
  - `ReviewTableRow`
- **Page 03 — Interaction**
  - Wizard flow prototype
  - Deep-link (AI/URL) state switching

---

### 6.1 프레임: `RFP_Manage__Default`

**목적**: "프로젝트의 출발 근거(Origin)"와 "RFP들의 상태"를 한 화면에서 요약하고, RFP → 요구사항 전개(Extraction → Review → Persist)로 이어지게 한다.

**Layout** (12-column grid 기준):

| 영역 | 구성 |
|------|------|
| **Top App Header** | 글로벌 헤더 유지 (프로젝트 선택/AI버튼/알림/프로필) |
| **Local Header (H1)** | Title: `RFP 관리` / Subtitle: `프로젝트 제안 요청서(RFP)를 근거로 요구사항을 추출·관리합니다.` |
| **Right Actions** | Primary: `RFP 업로드/등록` / Secondary: `Origin 요약` / Secondary: `AI 분석 히스토리` |
| **Origin Summary Strip** | H1 바로 아래 Full-width (신규 컴포넌트) |
| **Search & Filter Row** | Search: `RFP 검색...` / Filter: 상태(전체/업로드됨/분석중/검토대기/검토중/분석완료/재분석필요/보류/실패) — Section 4.5 매핑 참조 / Sort: 최신순/영향큰순/요구사항많은순 |
| **Content Area** | Empty / List Cards / Error states 분기 |

---

### 6.2 컴포넌트: `OriginSummaryStrip` (신규)

> 이 프로젝트는 현재 무엇을 기반으로 운영되고 있는가?

**필드:**

| 필드 | 값 예시 |
|------|--------|
| Origin Type | `EXTERNAL_RFP` \| `INTERNAL_INITIATIVE` \| `MODERNIZATION` \| `MIXED` |
| Active RFP Count | 2 |
| Derived Requirements Count | 47 |
| Epic Link Rate (%) | 89% |
| Last Change Impact | `NONE` \| `LOW` \| `MEDIUM` \| `HIGH` + 영향 Epic/Task 개수 |
| Data Freshness | `asOf` timestamp |

**UI 레이아웃:**

- 왼쪽: Origin Type + 설명
- 가운데: KPI 4~5개
- 오른쪽: Change Impact 경고 + `View Evidence` 버튼

**행동(Interaction):**

- Origin 요약 클릭 → `RFP_Manage__Evidence_View` (감사 모드)
- Change Impact 클릭 → `RFP_Manage__Diff_Compare` (변경 영향 비교 화면)

---

### 6.3 프레임: `RFP_Manage__Empty_OriginSelect` (Empty State 재설계)

**Empty 메시지 (중요):**

- **Title**: 이 프로젝트의 출발점을 정의하세요
- **Body**: RFP 기반/내부 기획/고도화 유형에 따라 요구사항 추출·변경관리 방식이 달라집니다.
- **CTA 4개 (카드 버튼)**:
  1. 외부 고객 RFP 기반 (`EXTERNAL_RFP`)
  2. 내부 기획 프로젝트 (`INTERNAL_INITIATIVE`)
  3. 기존 시스템 고도화 (`MODERNIZATION`)
  4. 혼합 (외부 RFP + 내부 요구사항 병행) (`MIXED`)
- **보조 CTA**:
  - `샘플 RFP로 체험` (데모/시드 데이터용)
  - `Origin 없이 진행(제한 모드)` (감사 기능 제한됨을 명시)

**선택 후 동작:**

> Origin 선택 → `POST /api/v2/projects/{projectId}/origin` 호출 → 정책 자동 설정(Section 5.2) → 다음 화면 진입

| 선택 | `originType` | 다음 화면 | 설명 |
|------|-------------|----------|------|
| 외부 RFP 기반 | `EXTERNAL_RFP` | Upload Wizard (Step 1) | RFP 메타데이터 → 파일 업로드 → AI 분석 |
| 내부 기획 | `INTERNAL_INITIATIVE` | 요구사항 화면 딥링크 | 내부 RFP 템플릿 생성 또는 요구사항 직접 작성 |
| 고도화 | `MODERNIZATION` | Import 화면 | 현행 문서/요구사항 Import + Lineage 활성화 옵션 |
| 혼합 | `MIXED` | Upload Wizard (Step 1) | 외부 RFP 업로드 + 내부 보충 요구사항 병행 가능 |

---

### 6.4 프레임: `RFP_Manage__List_Cards` (카드 리스트)

**Card**: `RfpCard`

**표시 필드:**

| 필드 | 설명 |
|------|------|
| RFP명 + 버전 + 소스(고객/내부) | 기본 식별 |
| 업로드일/작성자 | 메타데이터 |
| 분석 상태 배지 | `분석완료(CONFIRMED)` / `재분석필요(NEEDS_REANALYSIS)` / `검토중(REVIEWING)` / `보류(ON_HOLD)` / `분석중(PARSING~EXTRACTING)` / `실패(FAILED)` — Section 4.5 매핑 참조 |
| 파생 요구사항 수 | AI 추출 결과 |
| Epic 연결률(%) | 전개 진행도 |
| 변경 영향 칩(없음/낮음/중간/높음) | 변경 관리 |
| 최근 Extraction Run 배지 | 모델/시간/성공여부 |

**액션:**

| 유형 | 동작 |
|------|------|
| Primary | `요구사항 보기` (RFP로 필터된 요구사항 화면 딥링크) |
| Secondary | `AI 재분석` |
| Secondary | `Lineage` |
| Overflow | 버전 업로드, Diff 비교, Evidence 보기, 내보내기 |

---

### 6.5 프레임: `RFP_Manage__Detail_Drawer` (우측 패널)

리스트에서 RFP 클릭 시, RightPanel로 상세 표시 (기존 PMS 패턴과 동일)

**Panel Mode 정의:**

| panelMode | 데이터 최소셋 | 설명 |
|-----------|------------|------|
| `overview` | rfp 기본 정보 + origin_type + status + version_label + 요약 텍스트 | RFP 기본 정보 + 요약 |
| `extraction_runs` | run[] (id, model_name, model_version, prompt_version, started_at, status, stats_json) | AI 분석 이력 |
| `derived_requirements` | requirement[] (id, title, category, status, confidence, source_rfp_id) + 총 개수 + 확정률 | 파생된 요구사항 목록 |
| `impact` | change_event[] (id, change_type, reason, changed_at) + impact_snapshot (counts) | 변경 이력 + 영향 분석 |
| `evidence` | evidence_card[] (source_evidence + ai_evidence + change_evidence + impact_evidence) | 감사용 근거 뷰 |

**핵심**: "RFP가 문서"가 아니라 "파생 결과(요구사항/Epic/WBS)"를 항상 같이 보여줘야 함

---

### 6.6 프레임: `RFP_Manage__Upload_Wizard` (Step 1~4)

> **진입 시점**: Origin이 이미 설정된 상태(`ORIGIN_DEFINED` 이후). Empty State(Section 6.3) 또는 리스트 화면의 "RFP 업로드/등록" 버튼에서 진입.

**진입 경로별 분기:**

| 진입 경로 | Origin 상태 | Wizard 동작 |
|---------|-----------|-----------|
| Empty State → "외부 RFP 기반" 선택 | 방금 설정됨 | Step 1에 Origin 정책 요약 표시 (읽기 전용) |
| Empty State → "혼합" 선택 | 방금 설정됨 | Step 1에 Origin 정책 요약 표시 (읽기 전용) |
| 리스트 화면 → "RFP 업로드/등록" 버튼 | 이미 존재 | Step 1에 Origin 정책 요약 표시 (읽기 전용) |
| Deep-link `?wizard=true` | 이미 존재 | Step 1에 Origin 정책 요약 표시 (읽기 전용) |

**Step 정의:**

| Step | 내용 | 상세 |
|------|------|------|
| **Step 1** | RFP 메타데이터 + 정책 확인 | RFP 제목, 발행처/고객명, RFP 유형(제안요청/기술사양/계약서 등) 입력. 상단에 현재 Origin 정책 요약 표시 (읽기 전용, 변경은 Origin 설정에서만 가능) |
| **Step 2** | 파일 업로드/텍스트 입력 | PDF/DOC 업로드 또는 직접 입력. 업로드 시 checksum 자동 생성. 다중 파일 지원 (하나의 RFP에 여러 첨부) |
| **Step 3** | AI 사전 분석 | 요약 + 불명확 질문 + 위험 경고. `autoAnalysisEnabled=true`이면 업로드 완료 후 자동 시작, 아니면 수동 트리거 버튼 |
| **Step 4** | "요구사항으로 전개" 옵션 | 추출 규칙(FR/NFR/Constraint), 중복 처리 전략(merge/split/keep), 저장 모드(draft → review required) |

---

### 6.7 프레임: `RFP_Manage__ExtractionReview`

AI가 만든 요구사항 후보를 Human-in-the-loop로 확정

**Table columns:**

| 열 | 설명 |
|---|------|
| 선택 | 채택/보류/폐기 |
| 요구사항 텍스트 | 편집 가능 |
| 분류 | FR/NFR/Constraint |
| Confidence | AI 신뢰도 |
| Source Section | 문단 링크 |
| 충돌/중복 플래그 | 기존 요구사항과 비교 |

**상단 요약:**

- 총 후보 수 / 채택 수 / 보류 수 / 폐기 수
- 낮은 신뢰도 Top 5
- 불명확 질문 Top 5

---

### 6.8 프레임: `RFP_Manage__Diff_Compare`

RFP 버전 또는 Extraction Run 간 비교

| 항목 | 설명 |
|------|------|
| 비교 대상 | Left: v1.1 / Right: v1.2 |
| 변경 유형 | New Requirements / Removed / Modified |
| Impact Summary | 영향을 받는 Epic / WBS / Sprint / Test |
| Action | "변경 승인 요청(Decision/Risk로)" 딥링크 |

---

### 6.9 프레임: `RFP_Manage__Evidence_View` (Audit Mode)

감사용 읽기 전용, "근거 제시" 중심

**Requirement 단위 Evidence 카드:**

| 정보 | 내용 |
|------|------|
| Source RFP | + Section + 문단 스니펫 |
| 변경 이력 | 누가/언제/왜 |
| 연결된 Epic/WBS/Test | 하위 추적 |
| AI 추출 run 메타데이터 | 모델/프롬프트버전 |

---

### 6.10 핵심 UX 포인트

- "등록"이라는 말은 최소화
- **"기원 정의 / 전개 / 영향"**이라는 언어 사용
- 모든 버튼은 **다음 행동이 명확**해야 함

---

## 7. Preset별 화면 표시 차등

> 같은 RFP 화면을 역할에 따라 다르게 보이게 하는 것이 PMS 핵심 패턴이다.

### 7.1 Preset별 RFP 화면 차등 표시

| Preset | 주요 표시 | 숨김/축소 | 핵심 액션 |
|--------|---------|---------|---------|
| **PM_WORK** | 전체 (업로드/리뷰/확정/재분석) | 없음 | RFP 업로드, AI 분석, 후보 확정, 재분석 |
| **PMO_CONTROL** | Origin 요약 + 변경 영향 + Epic 연결률 | 업로드 위저드 숨김 | Export, Evidence 보기, 영향도 리포트 |
| **EXEC_SUMMARY** | Origin + 영향도 + 핵심 리스크만 간결 표시 | 리뷰/분석 상세 숨김 | 대시보드형 요약만 |
| **AUDIT_EVIDENCE** | Evidence View 중심 (읽기 전용) | 편집/삭제 전체 숨김 | 원문/체크섬/변경이력 조회, Export |
| **DEV_EXECUTION** | 요구사항→Epic/WBS 연결 상태, 모호성 질문 | 감사/거버넌스 축소 | 요구사항 보기 딥링크, 기술 제약 확인 |

### 7.2 Preset 적용 규칙

```typescript
function getRfpPreset(userRole: UserRole): RfpPreset {
  switch (userRole) {
    case 'pm':
    case 'business_analyst':
      return 'PM_WORK';
    case 'pmo_head':
      return 'PMO_CONTROL';
    case 'sponsor':
      return 'EXEC_SUMMARY';
    case 'auditor':
      return 'AUDIT_EVIDENCE';
    case 'developer':
    case 'qa':
      return 'DEV_EXECUTION';
    case 'admin':
      return 'PM_WORK'; // full access
    default:
      return 'DEV_EXECUTION';
  }
}
```

---

## 8. API 계약 (Contract)

> 팀이 바로 Swagger/Controller로 내릴 수 있는 수준의 엔드포인트 정의.

### 8.1 RFP CRUD + 버전

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/v2/projects/{projectId}/rfps` | RFP 생성 + 초기 version 업로드 (또는 metadata만) | `manage_rfp_upload` |
| `GET` | `/api/v2/projects/{projectId}/rfps` | RFP 리스트 (필터/정렬/검색) | `view_rfp` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}` | RFP 상세 (요약 + 상태 + KPI) | `view_rfp` |
| `PATCH` | `/api/v2/projects/{projectId}/rfps/{rfpId}` | RFP 메타데이터 수정 | `manage_rfp_upload` |
| `DELETE` | `/api/v2/projects/{projectId}/rfps/{rfpId}` | RFP 삭제 (soft delete, CONFIRMED 이후 금지) | `manage_rfp_upload` + PM 이상 |
| `POST` | `/api/v2/projects/{projectId}/rfps/{rfpId}/versions` | 새 버전 업로드 → `NEEDS_REANALYSIS` 전이 | `manage_rfp_upload` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/versions` | 버전 목록 | `view_rfp` |

### 8.2 Origin 관리

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/v2/projects/{projectId}/origin` | Origin 타입 설정 (최초 1회) | `manage_rfp_upload` |
| `GET` | `/api/v2/projects/{projectId}/origin` | Origin 설정 조회 (정책 포함) | `view_rfp` |
| `PUT` | `/api/v2/projects/{projectId}/origin` | Origin 변경 (PM + PMO 승인 필요) | `manage_rfp_upload` + 승인 |
| `GET` | `/api/v2/projects/{projectId}/origin/summary` | OriginSummaryStrip 데이터 | `view_rfp` |

### 8.3 파싱 / 추출 / 리뷰

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/v2/projects/{projectId}/rfps/{rfpId}/analyze` | 분석 트리거 (재분석 포함) | `run_rfp_analysis` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/extractions` | Extraction run 목록 | `view_rfp` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/extractions/latest` | 최신 run + candidates | `view_rfp` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/extractions/{runId}` | 특정 run 조회 | `view_rfp` |
| `POST` | `/api/v2/projects/{projectId}/rfps/{rfpId}/candidates/confirm` | 후보 확정 (벌크) → requirement 생성 + trace 생성 | `confirm_requirements` |
| `POST` | `/api/v2/projects/{projectId}/rfps/{rfpId}/candidates/reject` | 후보 폐기 (벌크) | `review_rfp_candidates` |
| `PATCH` | `/api/v2/projects/{projectId}/rfps/{rfpId}/candidates/{candidateId}` | 개별 후보 수정 (텍스트/분류) | `review_rfp_candidates` |

### 8.4 Diff / Impact / Evidence

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/diff` | 버전 비교 (`?from=v1.0&to=v1.1` 또는 `?fromRun=...&toRun=...`) | `view_rfp` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/impact` | 영향 분석 (`?changeEventId=...` 또는 run 비교 기반) | `view_rfp` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/evidence` | Evidence 조회 (`?requirementId=...`) | `view_rfp_evidence` |
| `GET` | `/api/v2/projects/{projectId}/rfps/{rfpId}/audit/export` | 감사 데이터 Export (CSV/PDF) | `export_rfp_evidence` |

### 8.5 RFP 리스트 Query Parameters

```
GET /api/v2/projects/{projectId}/rfps
  ?search=키워드
  &status=CONFIRMED,NEEDS_REANALYSIS  (comma-separated)
  &originType=EXTERNAL_RFP
  &sort=updatedAt:desc | impactLevel:desc | requirementCount:desc
  &page=0&size=20
```

### 8.6 Origin Summary 응답 스키마

```json
{
  "originType": "EXTERNAL_RFP",
  "originTypeLabel": "외부 고객 RFP 기반",
  "policy": {
    "requireSourceRfpId": true,
    "evidenceLevel": "FULL",
    "changeApprovalRequired": true,
    "autoAnalysisEnabled": true,
    "lineageEnforcement": "STRICT"
  },
  "kpi": {
    "activeRfpCount": 2,
    "totalRequirements": 47,
    "confirmedRequirements": 42,
    "epicLinkRate": 0.89,
    "lastChangeImpact": {
      "level": "MEDIUM",
      "impactedEpics": 3,
      "impactedTasks": 12
    }
  },
  "asOf": "2026-02-10T09:30:00Z"
}
```

### 8.7 RFP 상세 응답 스키마 (RfpCard + Detail Drawer 공용)

> RFP 리스트의 각 카드와 Detail Drawer의 `overview` 탭이 동일한 데이터 구조를 사용한다.

```json
{
  "id": "uuid",
  "projectId": "uuid",
  "title": "보험심사 시스템 구축 RFP",
  "originType": "EXTERNAL_RFP",
  "status": "CONFIRMED",
  "statusLabel": "분석완료",
  "previousStatus": null,
  "failureReason": null,
  "currentVersion": {
    "id": "uuid",
    "versionLabel": "v1.2",
    "fileName": "insurance_rfp_v1.2.pdf",
    "fileSize": 2458624,
    "checksum": "sha256:a1b2c3...",
    "uploadedBy": { "id": "uuid", "name": "Kim PM" },
    "uploadedAt": "2026-02-08T14:30:00Z"
  },
  "versionCount": 3,
  "kpi": {
    "derivedRequirements": 47,
    "confirmedRequirements": 42,
    "epicLinkRate": 0.89,
    "changeImpact": {
      "level": "MEDIUM",
      "impactedEpics": 3,
      "impactedTasks": 12
    }
  },
  "latestRun": {
    "id": "uuid",
    "modelName": "gemma-3-12b",
    "modelVersion": "Q5_K_M",
    "status": "COMPLETED",
    "startedAt": "2026-02-08T14:35:00Z",
    "finishedAt": "2026-02-08T14:42:00Z",
    "stats": {
      "totalCandidates": 52,
      "ambiguityCount": 7,
      "avgConfidence": 0.83
    }
  },
  "createdBy": { "id": "uuid", "name": "Kim PM" },
  "createdAt": "2026-02-01T09:00:00Z",
  "updatedAt": "2026-02-08T14:42:00Z"
}
```

### 8.8 Candidate 리스트 응답 스키마 (ExtractionReview 화면용)

> `GET /api/v2/projects/{projectId}/rfps/{rfpId}/extractions/latest` 응답의 핵심 구조.

```json
{
  "run": {
    "id": "uuid",
    "rfpVersionId": "uuid",
    "modelName": "gemma-3-12b",
    "modelVersion": "Q5_K_M",
    "promptVersion": "v2.1",
    "schemaVersion": "v1.0",
    "generationParams": { "temperature": 0.3, "top_p": 0.9 },
    "status": "COMPLETED",
    "isActive": true,
    "startedAt": "2026-02-08T14:35:00Z",
    "finishedAt": "2026-02-08T14:42:00Z",
    "stats": {
      "totalCount": 52,
      "ambiguityCount": 7,
      "avgConfidence": 0.83,
      "categoryBreakdown": {
        "FUNCTIONAL": 35,
        "NON_FUNCTIONAL": 12,
        "CONSTRAINT": 5
      }
    }
  },
  "candidates": [
    {
      "id": "uuid",
      "reqKey": "RFP-REQ-001",
      "text": "...",
      "category": "FUNCTIONAL",
      "priorityHint": "MUST",
      "confidence": 0.92,
      "sourceParagraphId": "3.2.1-p2",
      "sourceQuote": "...(max 300 chars)",
      "isAmbiguous": false,
      "ambiguityQuestions": [],
      "duplicateRefs": [],
      "status": "PROPOSED",
      "editedText": null,
      "reviewedBy": null,
      "reviewedAt": null
    }
  ],
  "summary": {
    "proposed": 45,
    "accepted": 0,
    "rejected": 0,
    "edited": 0,
    "lowConfidenceTop5": ["RFP-REQ-012", "RFP-REQ-031", "..."],
    "ambiguousTop5": ["RFP-REQ-007", "RFP-REQ-019", "..."]
  },
  "pagination": {
    "page": 0,
    "size": 50,
    "totalElements": 52,
    "totalPages": 2
  }
}
```

### 8.9 Evidence 응답 스키마 (Audit Mode용)

> `GET /api/v2/projects/{projectId}/rfps/{rfpId}/evidence?requirementId={reqId}` 응답.

```json
{
  "requirementId": "uuid",
  "requirementTitle": "...",
  "requirementStatus": "CONFIRMED",
  "sourceEvidence": {
    "rfpTitle": "보험심사 시스템 구축 RFP",
    "rfpVersionLabel": "v1.2",
    "section": "3.2.1",
    "paragraphId": "3.2.1-p2",
    "snippet": "...(max 300 chars)",
    "fileUri": "s3://...",
    "fileChecksum": "sha256:a1b2c3...",
    "integrityStatus": "VERIFIED"
  },
  "aiEvidence": {
    "extractionRunId": "uuid",
    "modelName": "gemma-3-12b",
    "modelVersion": "Q5_K_M",
    "promptVersion": "v2.1",
    "schemaVersion": "v1.0",
    "generationParams": { "temperature": 0.3, "top_p": 0.9 },
    "confidence": 0.92,
    "originalCandidateText": "...",
    "wasEdited": true,
    "editedText": "..."
  },
  "changeEvidence": [
    {
      "id": "uuid",
      "changeType": "EDIT",
      "reason": "...",
      "changedBy": { "id": "uuid", "name": "..." },
      "changedAt": "2026-02-09T10:00:00Z",
      "beforeSnapshot": {},
      "afterSnapshot": {}
    }
  ],
  "impactEvidence": {
    "impactedEpics": [{ "id": "uuid", "title": "..." }],
    "impactedWbs": [{ "id": "uuid", "title": "..." }],
    "impactedTests": [{ "id": "uuid", "title": "..." }],
    "impactedSprints": [{ "id": "uuid", "name": "Sprint 5" }]
  }
}
```

---

## 9. 전체 흐름 시퀀스

### 9.1 전체 흐름 한 줄 요약

> RFP는 문서가 아니라 '의도와 제약의 집합'이며,
> 요구사항·Epic·WBS는 그 의도를 점점 실행 단위로 구체화한 결과다.

### 9.2 단계별 전개 흐름

```
STEP 0. Origin 결정
  └─ 외부 RFP / 내부 기획 / 고도화
  └─ 이 선택이 AI 분석 전략, 감사 기준, 변경 관리 정책을 결정

STEP 1. RFP 분석 (AI + 규칙)
  └─ 입력: PDF / DOC / 텍스트
  └─ AI 추출: Functional Requirements, Non-Functional Constraints, Scope In/Out, Ambiguities
  └─ 결과: Draft Requirement Pool

STEP 2. 요구사항 확정 (Human-in-the-loop)
  └─ 요구사항 관리 화면에서: 채택 / 수정 / 병합 / 폐기
  └─ 각 요구사항은 반드시 source_rfp_id, confidence_score를 가짐

STEP 3. Epic 분해
  └─ 요구사항 → Epic (1:N)
  └─ Epic = 기능 묶음 / 사업 단위 / 릴리스 단위
  └─ 여기서 범위 팽창(Scope Creep) 감지 가능

STEP 4. WBS & 일정 전개
  └─ Epic → WBS Task Tree
  └─ 이 시점부터 일정, 자원, 비용이 붙음
```

### 9.3 시퀀스: 외부 RFP 업로드 기반 (런타임 흐름)

```
 1. User → Frontend: RFP 업로드
 2. Frontend → Backend(API): POST /rfps (file metadata + originType)
 3. Backend → Object Storage: 파일 저장 (s3/minio 등)
 4. Backend → DB(Postgres): rfp 레코드 생성 (status=UPLOADED)
 5. Backend → Async Job Queue: RFP_PARSE_JOB enqueue
 6. Worker → Storage: 파일 다운로드
 7. Worker → Parser: text extraction + sectionization + paragraph_id 부여
 8. Worker → DB: rfp_document_chunk 저장 (section/paragraph 단위)
 9. Worker → LLM Service: extract_requirements(schema) 호출
10. LLM → Worker: JSON 결과 (requirements[], constraints[], ambiguities[])
11. Worker → DB:
    • rfp_extraction_run 생성 (model/prompt version 포함)
    • rfp_requirement_candidate 저장 (draft)
    • rfp.status = EXTRACTED
12. User → Frontend: 추출 결과 검토
13. Frontend → Backend: GET /rfps/:id/extractions/latest
14. User: 채택/수정/폐기
15. Frontend → Backend: POST /rfps/:id/candidates/confirm (candidate→requirement)
16. Backend → DB:
    • requirement 생성 (source_rfp_id, source_paragraph_id)
    • 상태 DRAFT 또는 CONFIRMED
17. Backend → Neo4j:
    • (RFP)-[:DERIVES]→(REQ) trace link 생성
18. User: 요구사항을 Epic으로 매핑
19. Backend → DB/Neo4j:
    • Epic 생성/연결
    • (REQ)-[:SATISFIED_BY]→(EPIC)
20. Epic → WBS 전개
21. Backend → DB/Neo4j:
    • WBS item 생성
    • (EPIC)-[:BROKEN_DOWN_TO]→(WBS)
22. 이후 Sprint/Task/Test로 연결
23. 감사/라인리지 화면에서 전체 체인 조회 가능
```

### 9.4 핵심 불변 규칙 (Integrity Invariants)

- **Requirement**는 반드시 `source_origin` 또는 `source_rfp_id`를 가진다
- **Epic**은 최소 1개 이상의 Requirement와 연결되어야 "정상"으로 간주된다
- **WBS**는 반드시 Epic 아래에 존재한다
- **Trace Link**는 쓰기 시점(생성/변경)에 강제되어야 한다 (나중에 배치로 맞추면 감사 때 빈 구멍 생김)

---

## 10. AI 분석 파이프라인 설계

### 10.1 전체 파이프라인 개요

```
Upload → Pre-Parse → AI Extraction → Structuring → Review → Persist
```

### 10.2 단계별 상세

#### (1) Pre-Parse

| 항목 | 설명 |
|------|------|
| 입력 | PDF / DOC |
| 처리 | 텍스트 추출, 표/목차/조항 분리 |
| 출력 | 문단 ID 부여 (lineage 대비) |

#### (2) AI Extraction

LLM 역할:
- 요구사항 후보 추출
- 제약 조건 식별
- 애매한 표현 탐지

**출력 JSON Schema (고정 계약):**

```json
{
  "rfp_summary": {
    "project_goal": "string",
    "scope_in": ["string"],
    "scope_out": ["string"],
    "key_constraints": ["string"],
    "risks": ["string"]
  },
  "requirements": [
    {
      "req_key": "RFP-REQ-###",
      "text": "string",
      "category": "FUNCTIONAL|NON_FUNCTIONAL|CONSTRAINT",
      "priority_hint": "MUST|SHOULD|COULD|UNKNOWN",
      "confidence": 0.0,
      "source": {
        "section": "string",
        "paragraph_id": "string",
        "quote": "string"
      },
      "ambiguity": {
        "is_ambiguous": true,
        "questions": ["string"]
      },
      "duplicates": ["RFP-REQ-###"]
    }
  ]
}
```

**포인트:**
- `source.paragraph_id`를 강제하면 나중에 Evidence가 "추정"이 아니라 "지정"이 된다
- `quote`는 길이 제한(예: 300자)로 저장 (원문 전체는 스토리지에)

#### (3) Structuring

- 중복 제거
- 유사 요구사항 클러스터링
- 기존 요구사항과 비교 (Diff)

#### (4) Human Review

- UI: "AI 제안" vs "확정"
- confidence 낮은 항목 강조
- 질문 필요 항목 표시

#### (5) Persist

DB 저장 시 반드시 포함:
- `rfp_id`
- `extraction_run_id`
- `model_version`
- `prompt_version`

→ **AI 책임성의 핵심**

### 10.3 파이프라인 단계별 품질 게이트

| Gate | 조건 | 실패 시 동작 |
|------|------|------------|
| **Parse Gate** | 텍스트 추출률(페이지 대비) 낮으면 | 실패 처리 + 재업로드 유도 |
| **Extraction Gate** | requirements가 0개면 | "RFP 유형 재확인" UX로 전환 (내부 기획일 수 있음) |
| **Consistency Gate** | MUST가 과도하게 많으면 | 경고(문서 특성) / 중복률 너무 높으면 클러스터링 재시도 |
| **Persist Gate** | run_id / model_version / prompt_version 없으면 | 저장 금지 (감사 시 재현성 붕괴 방지) |

### 10.4 재분석(Reanalysis) 정책

재분석은 단순히 "다시 돌리기"가 아니라 **버전/변경관리 이벤트**다.

**재분석 트리거:**
- 새 버전 업로드
- 파서 업그레이드
- 프롬프트 버전 변경
- 모델 변경
- 사람이 "분석 품질 불만"으로 수동 요청

**재분석 결과 저장:**
- 기존 run은 유지 (삭제 금지)
- 최신 run을 active로 지정
- Diff/Impact 계산을 자동 생성

### 10.5 구성 요소 (권장)

| 구성 요소 | 역할 |
|---------|------|
| Parser Service | PDF/DOC → text + structure |
| LLM Service | extraction tool-calling / JSON schema |
| Job Worker | 비동기 실행, 재시도, 멱등성 |
| Postgres | 원장(ground truth) |
| Neo4j | trace/impact 그래프 |
| Object Storage | 원문 파일 및 파싱 결과 아카이브 |

### 10.6 Neo4j 연계 포인트

| 시점 | 생성되는 관계 |
|------|------------|
| 추출 직후 | `(RFP)-[:HAS_RUN]→(RUN)`, `(RUN)-[:PROPOSES]→(REQ_CANDIDATE)` |
| 확정 시 | `(RFP)-[:DERIVES]→(REQ)` |
| 변경 시 | `(REQ)-[:CHANGED_BY]→(CHANGE_EVENT)` |
| 영향 분석 | 변경된 REQ에서 downstream traversal로 Epic/WBS/Sprint/Test 영향 계산 |

---

## 11. 외부 감사 대응 RFP Evidence 모델

### 11.1 감사자가 묻는 질문

1. 이 요구사항은 어디서 나왔나요?
2. 원문 근거를 보여주세요
3. 언제, 누가, 왜 변경했나요?
4. 변경 영향은 무엇이었나요?
5. AI가 개입했다면 그 근거는?

### 11.2 감사 질문을 데이터로 "즉시 답"하게 만드는 5요소

| # | 요소 | 데이터 소스 |
|---|------|------------|
| 1 | **출처** | RFP/Origin |
| 2 | **근거** | section/paragraph/snippet |
| 3 | **변경** | change log |
| 4 | **영향** | impact graph |
| 5 | **AI 개입** | run metadata |

### 11.3 Candidate vs Requirement 모델 결정

> **결정: Candidate 테이블 분리 (옵션 A)**

| 항목 | 결정 |
|------|------|
| 모델 구조 | `rfp_requirement_candidate`는 `requirement`와 분리된 중간 엔티티 |
| 승격 규칙 | `confirm` API 호출 시 candidate → requirement로 복사 생성 (candidate는 상태만 ACCEPTED로 변경) |
| 전역 검색/집계 | **Candidate는 전역 요구사항 검색/집계에서 제외** (또는 별도 탭으로 분리 집계) |
| 감사 추적 | Candidate의 원래 텍스트/confidence가 보존되어 "AI가 무엇을 제안했고 사람이 무엇을 바꿨는지" 추적 가능 |
| 삭제 정책 | Candidate는 **삭제 불가** (감사 증거로 영구 보존), status로만 관리 |

### 11.4 Postgres 테이블 설계 (핵심)

#### `rfp`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| project_id | UUID (FK) | 프로젝트 |
| title | VARCHAR(500) | RFP 제목 |
| origin_type | ENUM | `EXTERNAL_RFP` / `INTERNAL_INITIATIVE` / `MODERNIZATION` / `MIXED` |
| status | ENUM | 4.1 상태 모델 참조 |
| previous_status | ENUM | ON_HOLD 해제 시 복원용 |
| failure_reason | TEXT | FAILED 상태일 때 원인 |
| current_version_id | UUID (FK) | 현재 활성 버전 |
| created_by | UUID (FK) | 생성자 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `rfp_version`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| rfp_id | UUID (FK) | |
| version_label | VARCHAR(20) | v1.0, v1.1 |
| file_uri | TEXT | Object Storage 경로 |
| file_name | VARCHAR(500) | 원본 파일명 |
| file_size | BIGINT | 바이트 |
| checksum | VARCHAR(128) | SHA-256 (원문 불변성 증명) |
| uploaded_by | UUID (FK) | |
| uploaded_at | TIMESTAMPTZ | |

#### `rfp_document_chunk`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| rfp_version_id | UUID (FK) | |
| section | VARCHAR(50) | 섹션 번호 (예: "3.2.1") |
| paragraph_id | VARCHAR(100) | 문단 식별자 (lineage 키) |
| content_text | TEXT | 본문 |
| page_no | INT | 페이지 번호 |
| hash | VARCHAR(128) | 내용 해시 (SHA-256, 불변성 증명) |

#### `rfp_extraction_run`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| rfp_version_id | UUID (FK) | |
| model_name | VARCHAR(100) | AI 모델명 (예: gemma-3-12b) |
| model_version | VARCHAR(50) | 모델 버전 |
| prompt_version | VARCHAR(50) | 프롬프트 버전 |
| schema_version | VARCHAR(50) | JSON Schema 버전 |
| generation_params | JSONB | temperature, top_p 등 생성 파라미터 (재현성) |
| started_at | TIMESTAMPTZ | |
| finished_at | TIMESTAMPTZ | |
| status | ENUM | `RUNNING` / `COMPLETED` / `FAILED` |
| is_active | BOOLEAN | 현재 활성 run 여부 (최신 1개만 true) |
| stats_json | JSONB | 통계 (total_count, ambiguity_count, avg_confidence 등) |

#### `rfp_requirement_candidate`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| run_id | UUID (FK) | extraction_run |
| req_key | VARCHAR(50) | RFP-REQ-001 등 |
| text | TEXT | 요구사항 본문 |
| category | ENUM | `FUNCTIONAL` / `NON_FUNCTIONAL` / `CONSTRAINT` |
| priority_hint | ENUM | `MUST` / `SHOULD` / `COULD` / `UNKNOWN` |
| confidence | DECIMAL(3,2) | 0.00~1.00 |
| source_paragraph_id | VARCHAR(100) | 원문 문단 (FK to chunk) |
| source_quote | VARCHAR(300) | 원문 인용 (300자 제한) |
| is_ambiguous | BOOLEAN | |
| ambiguity_questions | JSONB | 질문 목록 |
| duplicate_refs | JSONB | 중복 candidate key 목록 |
| status | ENUM | `PROPOSED` / `ACCEPTED` / `REJECTED` / `EDITED` |
| edited_text | TEXT | 사람이 수정한 텍스트 (원본 보존) |
| reviewed_by | UUID (FK) | |
| reviewed_at | TIMESTAMPTZ | |

#### `requirement` (확장)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| project_id | UUID (FK) | |
| title | VARCHAR(500) | |
| text | TEXT | 본문 |
| category | ENUM | `FUNCTIONAL` / `NON_FUNCTIONAL` / `CONSTRAINT` / `AI` / `SI` / `COMMON` / `TECHNICAL` / `BUSINESS` |
| priority | ENUM | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` |
| status | ENUM | `DRAFT` / `CONFIRMED` / `CHANGED` / `DEPRECATED` |
| source_type | ENUM | `RFP` / `INTERNAL` / `IMPORT` |
| source_rfp_id | UUID (FK, nullable) | Origin 정책에 따라 필수 |
| source_paragraph_id | VARCHAR(100, nullable) | 원문 문단 |
| source_candidate_id | UUID (FK, nullable) | 원본 candidate (감사 추적) |
| confidence | DECIMAL(3,2) | AI 추출 시 신뢰도 |
| created_by | UUID (FK) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `requirement_change_event`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| requirement_id | UUID (FK) | |
| change_type | ENUM | `EDIT` / `SPLIT` / `MERGE` / `DEPRECATE` |
| reason | TEXT | 변경 사유 (필수) |
| changed_by | UUID (FK) | |
| changed_at | TIMESTAMPTZ | |
| before_snapshot | JSONB | 변경 전 스냅샷 |
| after_snapshot | JSONB | 변경 후 스냅샷 |

#### `impact_snapshot`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| change_event_id | UUID (FK) | |
| impacted_epics_count | INT | |
| impacted_wbs_count | INT | |
| impacted_tests_count | INT | |
| impacted_sprints_count | INT | |
| details_json | JSONB | 영향받는 엔티티 ID 목록 |
| computed_at | TIMESTAMPTZ | |

### 11.5 원문 불변성 (Immutability) 증명

| 항목 | 구현 |
|------|------|
| `rfp_version.checksum` | SHA-256, 업로드 시 서버에서 계산 후 저장. **파일 재다운로드 시 검증 가능** |
| `rfp_document_chunk.hash` | SHA-256, chunk 저장 시 계산. **파싱 결과 변조 감지 가능** |
| Evidence View 표시 | 감사 모드에서 "문서 무결성: 검증됨/미검증" 배지 표시 |
| 정책 | 버전 파일은 **수정/덮어쓰기 불가** (새 버전만 추가), Object Storage 버킷에 불변 정책 적용 |

### 11.6 추출 재현성 (Reproducibility) 최소 요건

| 항목 | 구현 |
|------|------|
| 필수 메타데이터 | `model_name`, `model_version`, `prompt_version`, `schema_version` |
| 권장 메타데이터 | `generation_params` (temperature, top_p, max_tokens 등) |
| 재실행 정책 | 과거 run을 **덮어쓰지 않고** 새 run 생성 + diff 자동 계산 |
| 감사 답변 | "AI가 왜 이렇게 뽑았는가?" → run 메타데이터 + 원문 스니펫 + 프롬프트 버전으로 답변 |

### 11.7 Neo4j 노드/관계 (감사/영향의 본체)

**Nodes:**

```
(:RFP {id})
(:RFPVersion {id})
(:Chunk {paragraph_id})
(:ExtractionRun {id})
(:Requirement {id})
(:Epic {id})
(:WbsItem {id})
(:TestCase {id})
(:ChangeEvent {id})
```

**Relationships:**

```
(RFP)-[:HAS_VERSION]→(RFPVersion)
(RFPVersion)-[:HAS_CHUNK]→(Chunk)
(RFPVersion)-[:HAS_RUN]→(ExtractionRun)
(ExtractionRun)-[:PROPOSES]→(Requirement)    // 후보도 Requirement로 만들거나 Candidate 노드로 분리
(RFP)-[:DERIVES]→(Requirement)
(Requirement)-[:SATISFIED_BY]→(Epic)
(Epic)-[:BROKEN_DOWN_TO]→(WbsItem)
(WbsItem)-[:VERIFIED_BY]→(TestCase)
(Requirement)-[:CHANGED_BY]→(ChangeEvent)
```

### 11.8 Lineage & History 연계

```
RFP → Requirement → Epic → WBS → Test Case
```

이 체인이 **Neo4j 그래프**로 그대로 연결됨

감사 시: 클릭 몇 번으로 전 과정 재현

### 11.9 Evidence View (UI에 뿌릴 데이터 계약)

감사 화면에서 Requirement 하나를 클릭하면 아래를 1번에 보여줘야 함:

| 구분 | 내용 |
|------|------|
| **Requirement 본문 + 상태** | 현재 확정된 텍스트 |
| **Source Evidence** | RFP명/버전, section / paragraph_id, snippet(원문 일부), file 링크, **문서 무결성(체크섬)** |
| **AI Evidence** | extraction run id, model/prompt/schema version, confidence, **generation_params** |
| **Change Evidence** | 변경 이력 타임라인, 변경 사유(reason), 승인/결정 링크(Decision/Risk로 연결) |
| **Impact Evidence** | 영향을 받는 Epic/WBS/Test/Sprint 리스트, 영향 스냅샷(숫자 요약) |

→ 이게 갖춰지면 외부 감사 질문에 "말"이 아니라 **"근거 데이터"로 답이 가능**해진다.

---

## 12. Role × Capability × Screen 매트릭스

### 12.1 Capability 정의

| Capability | 설명 |
|------------|------|
| `view_rfp` | RFP 목록/상세 조회 |
| `manage_rfp_upload` | RFP 업로드/버전 추가/Origin 설정 |
| `run_rfp_analysis` | AI 분석 실행/재분석 트리거 |
| `review_rfp_candidates` | 추출 후보 리뷰 (채택/보류/폐기/수정) |
| `confirm_requirements` | 후보 → 요구사항 확정 (trace 생성 포함) |
| `view_rfp_evidence` | Evidence/감사 뷰 접근 |
| `export_rfp_evidence` | 감사 데이터 Export (CSV/PDF) |

### 12.2 Role × Capability 매핑

| Role | `view_rfp` | `manage_rfp_upload` | `run_rfp_analysis` | `review_rfp_candidates` | `confirm_requirements` | `view_rfp_evidence` | `export_rfp_evidence` |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Sponsor** | R | - | - | - | - | R | R |
| **PMO Head** | R | - | R | R | - | R | R |
| **PM** | R | W | W | W | W | R | R |
| **Business Analyst** | R | W | W | W | W | R | - |
| **Developer** | R | - | - | - | - | R (제한) | - |
| **QA** | R | - | - | - | - | R (제한) | - |
| **Auditor** | R | - | - | - | - | R | R |
| **Admin** | R | W | W | W | W | R | R |

> R = 읽기, W = 읽기+쓰기, - = 접근 불가

### 12.3 화면 요소별 Capability 매핑

| 화면 요소 | 필요 Capability | 설명 |
|---------|----------------|------|
| RFP 목록 조회 | `view_rfp` | 모든 역할 |
| "RFP 업로드/등록" 버튼 | `manage_rfp_upload` | PM, BA, Admin만 표시 |
| "AI 분석" 버튼 | `run_rfp_analysis` | PMO, PM, BA, Admin |
| ExtractionReview 화면 | `review_rfp_candidates` | PMO, PM, BA, Admin |
| "확정" 버튼 | `confirm_requirements` | PM, BA, Admin |
| Evidence View 탭 | `view_rfp_evidence` | 모든 역할 (Dev/QA는 제한) |
| "Export" 버튼 | `export_rfp_evidence` | Sponsor, PMO, PM, Auditor, Admin |
| Origin 설정 | `manage_rfp_upload` | PM, BA, Admin (최초 설정) |
| Origin 변경 | `manage_rfp_upload` + 승인 | PM 요청 + PMO 승인 |

---

## 13. FilterSpec / Deep-link 규칙

### 13.1 RFP 화면 내부 Deep-link

| Parameter | 예시 | 동작 |
|-----------|------|------|
| `?rfpId={id}` | `?rfpId=rfp-001` | Detail Drawer 자동 오픈 |
| `?rfpId={id}&tab={mode}` | `?rfpId=rfp-001&tab=evidence` | 특정 탭으로 Drawer 오픈 |
| `?originType={type}` | `?originType=EXTERNAL_RFP` | 해당 Origin 타입으로 필터 |
| `?status={status}` | `?status=NEEDS_REANALYSIS` | 상태 필터 적용 |
| `?runId={id}` | `?runId=run-003` | ExtractionReview 직접 오픈 |
| `?auditMode=true` | `?auditMode=true` | Evidence View 모드로 진입 |
| `?wizard=true` | `?wizard=true` | Upload Wizard 자동 오픈 |
| `?wizard=true&step={n}` | `?wizard=true&step=3` | Wizard 특정 Step으로 이동 |

### 13.2 외부 화면으로의 Deep-link (RFP → 요구사항)

| 시나리오 | 생성되는 URL | 설명 |
|---------|-----------|------|
| "이 RFP에서 추출된 요구사항 보기" | `/requirements?sourceRfpId={rfpId}` | 요구사항 화면에 RFP 필터 적용 |
| "이 요구사항의 원문 보기" | `/rfp?rfpId={rfpId}&tab=evidence&requirementId={reqId}` | Evidence에서 특정 요구사항 하이라이트 |
| "변경 영향 확인" | `/rfp?rfpId={rfpId}&tab=impact&changeEventId={eventId}` | Impact 탭에서 특정 이벤트 포커스 |
| "Lineage 보기" | `/lineage?rootType=RFP&rootId={rfpId}` | Lineage 화면에서 RFP 기준 트리 표시 |

### 13.3 AI 어시스턴트 연동

AI 어시스턴트에서 다음 질의 시 자동으로 딥링크 생성:

| 사용자 질의 | AI 응답에 포함될 딥링크 |
|-----------|-------------------|
| "이 RFP에서 나온 요구사항 보여줘" | `/requirements?sourceRfpId={rfpId}` |
| "RFP 분석 상태 확인" | `/rfp?rfpId={rfpId}&tab=extraction_runs` |
| "변경 영향 분석 결과 보여줘" | `/rfp?rfpId={rfpId}&tab=impact` |
| "감사 근거 보여줘" | `/rfp?rfpId={rfpId}&tab=evidence&auditMode=true` |

---

## 14. 스프린트별 구현 계획

### Sprint 1 — 화면 뼈대 + 상태모델 + 리스트/Empty (2주)

| # | Task | 산출물 | 완료 기준 |
|---|------|--------|---------|
| 1.1 | RFP 상태 모델 구현 (백엔드) | Enum + 전이 validator | 모든 전이가 규칙대로만 가능 |
| 1.2 | Origin API 구현 | `POST/GET /origin` | Origin 설정/조회 동작 |
| 1.3 | OriginSummaryStrip UI | React 컴포넌트 | Mock 데이터로 KPI 표시 |
| 1.4 | Empty OriginSelect UI | Origin 선택 카드 3개 | 선택 → Origin API 저장 |
| 1.5 | RFP List Card UI | RfpCard 컴포넌트 + 그리드 | Mock 데이터로 카드 리스트 |
| 1.6 | RightPanel (overview 탭) | Detail Drawer | 클릭 → 우측 패널 |
| 1.7 | 상태 배지/필터 | RfpStatusBadge + 필터 | 상태별 필터링 동작 |

### Sprint 2 — 업로드 / 파싱 / Chunk 저장 (2주)

| # | Task | 산출물 | 완료 기준 |
|---|------|--------|---------|
| 2.1 | Upload Wizard Step 1~2 UI | Wizard 컴포넌트 | RFP 메타데이터 입력 + 정책 확인 + 파일 업로드 |
| 2.2 | 파일 업로드 API | `POST /rfps` + `POST /versions` | Object Storage 저장 + checksum 생성 |
| 2.3 | Parser Worker 연결 | Worker + Parser Service | PDF → chunk 변환 + hash 생성 |
| 2.4 | `rfp_document_chunk` 저장 | chunk 테이블 + 조회 API | 파싱 결과 DB 저장 |
| 2.5 | 상태 전이 (UPLOADED→PARSING→PARSED) | Worker 상태 업데이트 | 자동 전이 동작 |
| 2.6 | FAILED 처리 + 재업로드 UX | 에러 UI + 재시도 버튼 | 실패 원인 표시 + 재시도 |

### Sprint 3 — 추출 / 리뷰 / 확정 (핵심, 2주)

| # | Task | 산출물 | 완료 기준 |
|---|------|--------|---------|
| 3.1 | Wizard Step 3~4 UI | AI 분석 미리보기 + 전개 옵션 | 요약/질문/경고 표시 |
| 3.2 | LLM 추출 Worker | JSON Schema 기반 추출 | candidate 생성 + stats 집계 |
| 3.3 | `rfp_extraction_run` + `rfp_requirement_candidate` 저장 | DB 스키마 + API | run/candidate CRUD |
| 3.4 | ExtractionReview UI | 리뷰 테이블 + 벌크 액션 | 채택/보류/폐기 + 편집 동작 |
| 3.5 | Candidate → Requirement 승격 API | `POST /candidates/confirm` | requirement 생성 + source 필드 자동 채움 |
| 3.6 | Neo4j DERIVES/SATISFIED_BY 생성 | Trace link 자동 생성 | 확정 시 trace link 즉시 생성 |
| 3.7 | 상태 전이 (PARSED→EXTRACTING→EXTRACTED→REVIEWING→CONFIRMED) | 전체 파이프라인 | E2E 동작 |

### Sprint 4 — Diff / Impact / Evidence + 감사 모드 (2주)

| # | Task | 산출물 | 완료 기준 |
|---|------|--------|---------|
| 4.1 | 버전 비교 (Diff Compare) | `GET /diff` + UI | 두 버전 간 변경사항 표시 |
| 4.2 | Impact Snapshot | `requirement_change_event` + `impact_snapshot` + graph traversal | 변경 시 영향 자동 계산 |
| 4.3 | Evidence View UI | Audit Mode 화면 | 읽기 전용 근거 카드 표시 |
| 4.4 | 체크섬 검증 UI | 무결성 배지 | 감사 모드에서 "검증됨" 표시 |
| 4.5 | Export API | `GET /audit/export` | CSV/PDF 감사 보고서 |
| 4.6 | NEEDS_REANALYSIS 전이 | 새 버전 업로드 시 자동 | 재분석 흐름 E2E |
| 4.7 | Preset별 차등 표시 | 역할별 UI 분기 | 5개 Preset 검증 |
| 4.8 | Deep-link 전체 연결 | URL 파라미터 처리 | AI 어시스턴트 연동 포함 |

---

## 15. 테스트 시나리오

### 15.1 핵심 시나리오 (필수, 12개)

| # | 시나리오 | 기대 결과 | 검증 포인트 |
|---|---------|---------|-----------|
| T-01 | Empty → Origin 선택 (외부 RFP) → 업로드 위저드 진입 | Origin 저장 + Wizard 오픈 | origin_type=EXTERNAL_RFP 저장, 정책 자동 설정 |
| T-02 | 파일 업로드 → 파싱 성공 → chunk 생성 | UPLOADED→PARSING→PARSED | chunk 개수 > 0, hash 생성 |
| T-03 | 파일 업로드 → **파싱 실패** | UPLOADED→PARSING→FAILED | failure_reason 저장, "재업로드" UX 표시 |
| T-04 | 추출 실행 → candidate 생성 | PARSED→EXTRACTING→EXTRACTED | candidate 수 > 0, run 메타데이터 완전 |
| T-05 | 추출 결과 **0개** → "유형 재확인" UX 표시 | 추출 0건 경고 + Origin 재선택 유도 | EXTRACTION_GATE 동작 |
| T-06 | Candidate 대량 확정 → requirement 생성 + trace 생성 | REVIEWING→CONFIRMED | requirement.source_rfp_id 채움, Neo4j DERIVES 존재 |
| T-07 | Candidate 편집 후 확정 → 원본 보존 | edited_text ≠ text, 둘 다 저장 | 감사 추적: AI 원본 vs 사람 수정 |
| T-08 | 새 버전 업로드 → NEEDS_REANALYSIS 전이 + diff 생성 | 상태 전이 + diff API 응답 | 기존 run 유지, 새 run 생성 |
| T-09 | AUDIT_EVIDENCE 프리셋에서 Evidence View 표시 | 읽기 전용 + 체크섬 표시 | 편집/삭제 버튼 없음, 무결성 배지 |
| T-10 | 권한 없는 사용자의 export 접근 차단 | 403 응답 | Developer가 export 시도 → 거부 |
| T-11 | AI 어시스턴트에서 "이 RFP의 요구사항 보여줘" → 딥링크 | `/requirements?sourceRfpId=...` | 딥링크 정확, 필터 동작 |
| T-12 | ON_HOLD 전환 → 해제 → 이전 상태 복원 | previous_status 복원 | CONFIRMED → ON_HOLD → CONFIRMED |

### 15.2 보안 시나리오 (필수, 4개)

| # | 시나리오 | 기대 결과 |
|---|---------|---------|
| S-01 | Developer가 "RFP 업로드" 시도 | 버튼 미표시 + API 403 |
| S-02 | QA가 "후보 확정" 시도 | 버튼 미표시 + API 403 |
| S-03 | 프로젝트 A의 RFP를 프로젝트 B에서 접근 시도 | API 404 또는 403 (tenant isolation) |
| S-04 | Export에 민감 정보 마스킹 확인 | 사용자 개인정보 마스킹 |

### 15.3 엣지 케이스 (권장, 4개)

| # | 시나리오 | 기대 결과 |
|---|---------|---------|
| E-01 | 동시에 2명이 같은 RFP의 candidate를 확정 | 충돌 감지 + 후속 확정자에게 경고 |
| E-02 | 파싱 중 서버 재시작 → 상태 복구 | PARSING 상태인 RFP를 FAILED로 전환 + 재시도 |
| E-03 | 100페이지 PDF 업로드 (대용량) | 비동기 처리 + 진행률 표시 |
| E-04 | Origin 변경 (EXTERNAL → MODERNIZATION) | 승인 플로우 + 기존 데이터 유지 + 정책 전환 |

### 15.4 통합 테스트 시나리오 (필수, 8개)

> Frontend-Backend E2E 연결이 정확히 동작하는지 검증하는 시나리오.
> "mock fallback에 의존하지 않고 실제 DB 데이터로 동작"하는 것이 핵심.

| # | 시나리오 | 기대 결과 | 검증 포인트 |
|---|---------|---------|-----------|
| I-01 | Backend 정상, JWT 없음 → Origin GET 호출 | UI에 "인증 필요" 화면 표시 (Empty State가 아님) | 401이 mock/null로 흡수되지 않음 |
| I-02 | Backend 정상, JWT 유효 → Origin GET (미설정 프로젝트) | 404 → UI에 Origin 선택 Empty State 표시 | 404만 "데이터 없음"으로 해석 |
| I-03 | Origin 선택 → POST → GET 재호출 | DB에 저장 + GET이 저장된 값 반환 + UI 전환 | `rfp.origin_policies` 1행 생성, UI가 OriginSummaryStrip으로 전환 |
| I-04 | Origin 설정 후 새로고침 | Origin 유지 (DB에서 조회) | mock이 아닌 실제 DB 데이터로 렌더링 |
| I-05 | RFP 업로드 → DB 저장 → 카드 목록 표시 | `project.rfps` 1행 생성 + 카드 렌더링 | title, status, origin_type 일치 |
| I-06 | Backend 다운 → Frontend mock 모드 전환 | "서버 연결 불가" 알림 + mock 데이터로 동작 | 5xx/네트워크 에러만 mock 허용 |
| I-07 | Dev 프로필에서 permitAll → RFP CRUD 전체 동작 | 인증 없이 Origin/RFP/Requirement API 정상 | `SPRING_PROFILES_ACTIVE=dev` |
| I-08 | Prod 프로필에서 JWT 없이 RFP API 호출 | 401 반환 + UI "인증 필요" | permitAll 적용 안 됨 확인 |

---

## 16. Frontend-Backend 통합 정책

> 이 섹션은 v2.2까지 암묵적이었던 "Frontend가 Backend 응답을 어떻게 해석하는가"를 **명시적 계약**으로 확정한다.
> 이 계약이 없으면 401/404/5xx가 모두 동일한 결과(null/mock)로 합쳐져서 UI가 "데이터 없음"과 "접근 차단"을 구분할 수 없다.

### 16.1 장애의 본질 (v2.2까지의 구조적 결함)

> "데이터가 없음(null)"과 "접근이 막힘(401)"이 동일한 결과(null)로 합쳐져서,
> UI가 데이터 없음으로 오판하고 Empty State를 정상 플로우로 확정해버린 상태

**구체적 발생 경로:**

```
1. getProjectOrigin() 호출
2. Backend 401 반환 (JWT 없음)
3. fetchWithFallback catch → mock fallback { data: null } 반환
4. UI: origin === null → Empty State (Origin 선택 화면)
5. 사용자 Origin 클릭 → setProjectOrigin() POST
6. Backend 401 반환 → mock fallback (성공처럼 보이는 데이터) 반환
7. onSuccess → invalidateQueries → getProjectOrigin() 재호출
8. 다시 2번으로 → 무한 반복
```

**근본 원인**: `fetchWithFallback`의 catch 블록이 **모든 에러를 동일하게 mock으로 흡수**하는 구조

### 16.2 API 응답 해석 정책 (HTTP Status → Frontend 행동)

> 이 테이블은 `fetchWithFallback` (또는 후속 `fetchResult`)의 **정책 명세**다.

| HTTP Status | 의미 | Frontend 행동 | mock fallback 허용 |
|:-----------:|------|--------------|:-----------------:|
| **200** | 정상 응답 | `ApiResponse.data` 추출 후 반환 | N/A |
| **201** | 생성 성공 | `ApiResponse.data` 추출 후 반환 | N/A |
| **204** | 성공 (본문 없음) | `null` 반환 | N/A |
| **400** | 요청 오류 | **throw** — UI에서 입력 검증 에러로 표시 | **금지** |
| **401** | 인증 필요 | **throw `AUTH_REQUIRED`** — UI에서 로그인 유도 | **금지** |
| **403** | 권한 없음 | **throw `FORBIDDEN`** — UI에서 권한 부족 안내 | **금지** |
| **404** | 데이터 없음 | **mockData 반환** (정상적인 "없음") | **허용** (유일하게) |
| **409** | 충돌 | **throw** — 이미 존재 등 충돌 안내 | **금지** |
| **5xx** | 서버 오류 | 개발: mock fallback + 경고 배너 / 운영: **throw** | **개발만 허용** |
| 네트워크 에러 | 연결 불가 | 개발: mock fallback + 경고 배너 / 운영: **throw** | **개발만 허용** |

### 16.3 `fetchWithFallback` 수정 명세

**현재 (v2.2 — 문제 있는 구조):**

```typescript
// 모든 에러를 catch에서 mock으로 흡수 → 401도 null로 변환
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
// ... catch → return mockData (모든 에러에 대해)
```

**변경 (v2.3):**

```typescript
if (!response.ok) {
  // 404: 정상적인 "데이터 없음" → mock/null 반환 허용
  if (response.status === 404) return mockData;

  // 401/403: 인증/권한 문제 → 절대 mock 반환 금지, throw
  if (response.status === 401 || response.status === 403) {
    throw new Error(`AUTH_REQUIRED:${response.status}`);
  }

  // 그 외 (400, 409, 5xx): throw
  throw new Error(`HTTP_ERROR:${response.status}`);
}
```

**catch 블록도 수정:**

```typescript
catch (error) {
  // AUTH 에러는 절대 mock으로 흡수하지 않음 → rethrow
  if (error instanceof Error && error.message.startsWith('AUTH_REQUIRED:')) {
    throw error;
  }

  // 네트워크/타임아웃/서버 에러만 mock fallback 허용
  console.warn(`[API] ${endpoint}: fallback to mock`, error);
  return mockData;
}
```

### 16.4 Double Unwrapping 제거

> `fetchWithFallback` 내부(line 166-168)에서 이미 `ApiResponse.data`를 추출하므로,
> 개별 API 메서드에서 다시 `.data`를 꺼내면 **이중 추출** → 타입 붕괴.

**제거 대상 (3개 메서드):**

| 메서드 | 현재 (이중 추출) | 변경 (단일 반환) |
|--------|---------------|----------------|
| `getProjectOrigin()` | `response.data` 재추출 | `return await this.fetchWithFallback(..., null)` |
| `setProjectOrigin()` | `response.data` 재추출 | `return await this.fetchWithFallback(...)` |
| `getOriginSummary()` | `response.data` 재추출 | `return await this.fetchWithFallback(...)` |

### 16.5 UI 상태 머신 (Origin 화면 4-상태)

> 현재 `if (!origin)` 하나로 Empty State를 결정하는 구조는 너무 강력하다.
> origin이 없는 정상 케이스, 로딩 중, 에러, 인증 문제가 전부 "Empty"로 고정되기 때문이다.

**최소 4-상태 분기:**

```
┌──────────┐     ┌────────────────┐     ┌───────────────────┐
│ loading  │     │ origin === null│     │ origin exists     │
│ (로딩중) │     │ (진짜 Empty)   │     │ (정상 플로우)     │
└──────────┘     └────────────────┘     └───────────────────┘

┌──────────────────────────────────┐
│ error / authRequired             │
│ (인증 필요 / 서버 오류)          │
└──────────────────────────────────┘
```

**컴포넌트 렌더링 분기:**

```typescript
function RfpManagement() {
  const { data: origin, isLoading, error } = useProjectOrigin(projectId);

  // 1. 로딩
  if (isLoading) return <RfpSkeleton />;

  // 2. 인증/권한 에러 (401/403이 throw되어 error에 담긴 경우)
  if (error?.message?.startsWith('AUTH_REQUIRED:'))
    return <AuthRequiredPanel returnTo="/rfp" />;

  // 3. 기타 에러 (서버 오류 등)
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  // 4. 데이터 없음 (404 → null) — 진짜 Empty State
  if (!origin) return <OriginSelectionScreen onOriginSelected={handleSet} />;

  // 5. 정상 — RFP 관리 화면
  return <RfpMainContent origin={origin} />;
}
```

**핵심 원칙**: "Empty State는 origin이 **정상적으로** 존재하지 않을 때만 표시한다"

---

## 17. 인증/보안 개발 전략

> 개발 편의와 운영 안전을 동시에 잡기 위한 Profile 기반 분기 전략.

### 17.1 Spring Profile 기반 보안 분기

**문제**: `@PreAuthorize("isAuthenticated()")`가 모든 RFP 엔드포인트에 걸려 있어서,
JWT 없이는 개발/테스트가 불가능하다.
단순히 `@PreAuthorize`를 제거하면 운영에서 보안 회귀가 확정된다.

**해결**: Spring Profile로 Dev/Prod 보안 설정을 분리한다.

```
                ┌─────────────────┐
                │ SecurityConfig  │
                └────────┬────────┘
                         │
           ┌─────────────┼─────────────┐
           │                           │
  ┌────────▼─────────┐   ┌────────────▼───────────┐
  │ @Profile("dev")  │   │ @Profile("!dev")       │
  │ DevSecurity      │   │ ProdSecurity           │
  │                  │   │                        │
  │ RFP API:         │   │ RFP API:               │
  │   permitAll      │   │   authenticated +      │
  │                  │   │   @PreAuthorize 유지    │
  └──────────────────┘   └────────────────────────┘
```

### 17.2 Dev 프로필 SecurityConfig

```java
@Profile("dev")
@Configuration
@EnableWebFluxSecurity
public class ReactiveSecurityConfigDev {

    @Bean
    public SecurityWebFilterChain devSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .cors(/* ... */)
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchanges -> exchanges
                // 개발 환경: RFP 관련 API는 인증 없이 허용
                .pathMatchers("/api/v2/projects/*/origin/**").permitAll()
                .pathMatchers("/api/v2/projects/*/rfps/**").permitAll()
                .pathMatchers("/api/v2/projects/*/requirements/**").permitAll()
                // 나머지는 기존과 동일
                .pathMatchers("/api/auth/**", "/api/config", "/api/chat/**").permitAll()
                .anyExchange().authenticated()
            )
            .build();
    }
}
```

### 17.3 Prod 프로필 SecurityConfig

```java
@Profile("!dev")
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class ReactiveSecurityConfig {
    // 기존 v2.2 그대로 유지
    // anyExchange().authenticated()
    // + JwtWebFilter
    // + @PreAuthorize on controllers
}
```

### 17.4 Controller @AuthenticationPrincipal null-safe 처리

> Dev 프로필에서는 JWT가 없으므로 `@AuthenticationPrincipal UserDetails user`가 **null**이 된다.
> Controller/Service 모두에서 NPE가 발생하지 않아야 한다.

**정책:**

| 환경 | `user` 값 | `createdBy`/`updatedBy` 저장값 |
|------|----------|-------------------------------|
| Dev (JWT 없음) | `null` | `"dev-user"` |
| Prod (JWT 유효) | `UserDetails` | `user.getUsername()` |

**Service 레이어에서 표준화:**

```java
// 모든 Service 메서드에서 actor 파라미터 처리
public Mono<OriginPolicyDto> setOrigin(String projectId, SetOriginRequest req, String actor) {
    String safeActor = (actor != null && !actor.isBlank()) ? actor : "dev-user";
    // ... safeActor를 createdBy/updatedBy에 사용
}
```

**Controller에서 null-safe 전달:**

```java
@PostMapping
public Mono<ResponseEntity<ApiResponse<OriginPolicyDto>>> setOrigin(
        @PathVariable String projectId,
        @Valid @RequestBody SetOriginRequest request,
        @AuthenticationPrincipal @Nullable UserDetails user) {
    String actor = (user != null) ? user.getUsername() : null;
    return originService.setOrigin(projectId, request, actor)
            .map(dto -> ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Origin set", dto)));
}
```

### 17.5 "dev-user" 데이터 오염 경계

> Dev 환경에서 생성된 데이터가 운영으로 흘러가지 않도록 경계를 명확히 한다.

| 항목 | 정책 |
|------|------|
| `createdBy = "dev-user"` 허용 범위 | 로컬 개발 DB, 테스트 환경만 |
| 운영 배포 전 검증 | `SELECT COUNT(*) FROM rfp.origin_policies WHERE created_by = 'dev-user'` → 0이어야 함 |
| 시드 데이터 | `dev-user`는 시드 데이터 전용으로만 사용, 운영 시드에는 실제 사용자 ID 사용 |

### 17.6 Docker Compose 프로필 설정

```yaml
backend:
  environment:
    SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-dev}   # 기본: dev
    # 운영 배포 시: SPRING_PROFILES_ACTIVE=prod
```

---

## 18. E2E 통합 장애 진단 및 해결

> 이 섹션은 v2.2 기준 구현 상태를 진단하고, Backend E2E 연결을 위한 구체적 해결 절차를 기술한다.

### 18.1 현재 구현 상태 요약

| 영역 | 구현률 | 상태 |
|------|:------:|------|
| Frontend UI 컴포넌트 (14개) | ~85% | 전체 존재, mock fallback으로 동작 |
| Backend API 레이어 (5 Controller + 7 Service) | ~75% | 전체 구현, 인증 벽으로 접근 불가 |
| DB 스키마 (rfp.* + project.rfps) | ~80% | 마이그레이션 존재, 적용 여부 확인 필요 |
| AI 추출 파이프라인 (LLM Service) | ~10% | `/api/rfp/extract` 엔드포인트 미구현 |
| Neo4j Lineage 연동 | ~5% | 필드만 존재, 실제 그래프 연동 없음 |
| **E2E 통합 (실제 동작)** | **~0%** | 401 → mock → null 순환으로 전체 차단 |

### 18.2 해결 실행 순서 (승리 루트)

> 시간을 최소화하면서 가장 빠르게 E2E 동작을 확인하는 순서.

```
Step 1. Frontend fetchWithFallback 401/403 rethrow + 404 null 처리
        → "왜 Empty인지" 화면에서 구분 시작 (디버깅 속도 급상승)

Step 2. Backend Dev Profile permitAll 적용
        → 실제 DB로 origin 저장/조회 E2E 즉시 가능

Step 3. Double unwrap 제거 (api.ts 3개 메서드)
        → 데이터 구조 안정화, 이후 모든 RFP API도 동일 패턴

Step 4. UI 4-상태 분기 (loading/auth/error/null)
        → Empty State 무한 루프 구조적 차단

Step 5. DB 마이그레이션/스키마 검증
        → 로컬 환경 편차 제거
```

### 18.3 DB 스키마 검증 체크리스트

**실행 명령:**

```bash
# 1. rfp 스키마 존재 확인
docker exec pms-postgres psql -U pms_user -d pms_db -c "\dn rfp"

# 2. 핵심 테이블 존재 확인
docker exec pms-postgres psql -U pms_user -d pms_db -c "\dt rfp.*"
docker exec pms-postgres psql -U pms_user -d pms_db -c "\dt project.rfps"

# 3. origin_policies UNIQUE 제약 확인 (프로젝트당 1개 정책)
docker exec pms-postgres psql -U pms_user -d pms_db -c "\d rfp.origin_policies"

# 4. project.rfps에 v2.3 확장 컬럼 존재 확인
docker exec pms-postgres psql -U pms_user -d pms_db \
  -c "SELECT column_name FROM information_schema.columns
      WHERE table_schema='project' AND table_name='rfps'
      ORDER BY ordinal_position;"

# 5. Flyway 마이그레이션 이력 확인 (사용 시)
docker exec pms-postgres psql -U pms_user -d pms_db \
  -c "SELECT version, description, success
      FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 20;"
```

**필수 확인 항목:**

| 항목 | 기대값 | 실패 시 조치 |
|------|--------|------------|
| `rfp` 스키마 존재 | EXISTS | `CREATE SCHEMA IF NOT EXISTS rfp;` |
| `rfp.origin_policies` 테이블 | EXISTS | V20260236_05 마이그레이션 수동 실행 |
| `origin_policies.project_id` UNIQUE 제약 | UNIQUE | `ALTER TABLE rfp.origin_policies ADD CONSTRAINT ... UNIQUE(project_id);` |
| `project.rfps.origin_type` 컬럼 | EXISTS | V20260236_05 마이그레이션의 ALTER TABLE 부분 실행 |
| `project.rfps.previous_status` 컬럼 | EXISTS | 동상 |
| `project.rfps.failure_reason` 컬럼 | EXISTS | 동상 |

### 18.4 Backend API 검증 순서

```bash
# 0. Backend 상태 확인
curl -s http://localhost:8083/api/config | jq .
# 기대: {"useMockData": false}

# 1. Origin 미설정 상태 확인 (Dev 프로필 적용 후)
curl -s http://localhost:8083/api/v2/projects/{projectId}/origin
# 기대: 404 (origin 미설정)

# 2. Origin 설정
curl -s -X POST http://localhost:8083/api/v2/projects/{projectId}/origin \
  -H "Content-Type: application/json" \
  -d '{"originType":"EXTERNAL_RFP"}'
# 기대: 201 + OriginPolicyDto

# 3. Origin 재조회
curl -s http://localhost:8083/api/v2/projects/{projectId}/origin
# 기대: 200 + OriginPolicyDto (2번과 동일 데이터)

# 4. Origin Summary
curl -s http://localhost:8083/api/v2/projects/{projectId}/origin/summary
# 기대: 200 + OriginSummaryDto (KPI 포함)

# 5. RFP 생성
curl -s -X POST http://localhost:8083/api/v2/projects/{projectId}/rfps \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트 RFP","content":"테스트 내용","status":"UPLOADED"}'
# 기대: 201 + RfpDetailDto

# 6. RFP 목록 조회
curl -s http://localhost:8083/api/v2/projects/{projectId}/rfps
# 기대: 200 + [RfpDetailDto] (5번에서 생성한 RFP 포함)
```

### 18.5 수정 대상 파일 목록

| 파일 | 수정 내용 | 영향 범위 |
|------|---------|---------|
| `ReactiveSecurityConfig.java` | Dev/Prod Profile 분기 | 전체 인증 |
| `ReactiveOriginController.java` | `@AuthenticationPrincipal @Nullable` | Origin API |
| `ReactiveRfpController.java` | 동일 | RFP CRUD API |
| `ReactiveRfpExtractionController.java` | 동일 | 추출/리뷰 API |
| `ReactiveRequirementController.java` | 동일 | 요구사항 API |
| `ReactiveOriginService.java` | actor null-safe 처리 | Origin 비즈니스 로직 |
| `api.ts` (Frontend) | 401/403 rethrow + 404 처리 + double unwrap 제거 | 전체 API 호출 |
| `RfpManagement.tsx` (Frontend) | 4-상태 분기 (loading/auth/error/null) | RFP 메인 화면 |

### 18.6 성공 기준

**Phase 1 성공 (Origin 선택 E2E):**

- [ ] RFP 관리 진입 → Origin 선택 화면 표시 (mock이 아닌 실제 404 기반)
- [ ] "외부 고객 RFP 기반" 클릭 → DB 저장 (`rfp.origin_policies` 1행)
- [ ] 화면 전환: OriginSummaryStrip + "RFP 업로드/등록" 버튼 표시
- [ ] 새로고침 → Origin 유지 (DB 조회 기반)

**Phase 2 성공 (RFP CRUD E2E):**

- [ ] "RFP 업로드/등록" → Wizard → 등록 → DB 저장 (`project.rfps` 1행)
- [ ] 카드 목록에 새 RFP 표시
- [ ] 카드 클릭 → Right Panel 상세 표시

**Phase 3 성공 (인증 복구 안전):**

- [ ] Dev Profile → Prod Profile 전환 시, JWT 없는 요청에 401 반환
- [ ] Frontend: 401 → "인증 필요" 화면 (Empty State가 아님)
- [ ] 404 → 여전히 Origin 선택 Empty State (회귀 없음)

---

## 19. 구현 상태 재평가 (가치 사슬 관점)

> 이 섹션은 v2.3까지의 "기능별 구현률" 평가를 넘어서, **가치 사슬(Value Chain) 관점**에서 "어디서 끊겼는지"를 분석하고 우선순위를 재정의한다.
> "UI가 있다 ≠ 제품이 작동한다"는 착시를 숫자와 구조로 분해한다.

### 19.1 구현의 3개 층위

현재 RFP 모듈은 사실상 **3개의 서로 다른 제품**을 동시에 구축하고 있다:

| 층위 | 정의 | 구현률 | 체감 기여도 |
|------|------|:------:|:-----------:|
| **UI 제품** (보여지는 것) | 화면, 컴포넌트, 위저드, RightPanel, 필터, 배지, 프리셋 분기 | ~85% | 높음 (시각적) |
| **CRUD 제품** (저장/조회되는 것) | Origin/RFP/Requirement/Candidate/ExtractionRun 등 DB-backed API | ~75% | 중간 (데이터) |
| **증거 기반 Source-of-Truth 제품** (핵심 가치) | AI 파이프라인 + Lineage + Impact + Audit Evidence | ~10% | **핵심 (가치)** |

**결론**: 1)과 2)는 상당히 진척됐고, 3)이 비어 있어서 **"겉보기 60% / 체감 25%"**가 나오는 구조다.

### 19.2 "RFP = Source of Truth"가 되려면 필요한 4축

설계 문서의 핵심 메시지가 "RFP = 모든 요구사항의 원천(Source of Truth)"이라면, CRUD만으로는 부족하다.
Source of Truth가 되려면 최소한 다음 4가지가 반드시 있어야 한다:

| 축 | 정의 | 현재 상태 |
|----|------|----------|
| **Provenance (출처)** | 어떤 문서의 어느 부분에서 이 요구사항이 나왔는가 | chunk/evidence 구조 존재, 실제 생성 파이프라인 미연결 |
| **Traceability (추적)** | 요구사항이 Epic/WBS/Test로 어떻게 이어졌는가 | Neo4j 스키마만 존재, 실제 그래프 연동 없음 |
| **Impact (영향)** | 문서/요구사항 변경이 무엇을 흔드는가 | impact traversal 미구현 |
| **Auditability (감사)** | 누가 언제 무엇을 확정/변경했는가 + 출력물 | audit export 미구현 |

이 4축이 Section 14 Sprint 2~4의 "완전히 빠진 핵심 기능"에 해당하며, 여기서 끊겨 있어 E2E 체감이 낮다.

### 19.3 가치 사슬 끊김 지점 3곳

```
RFP Origin ✅
  ↓
RFP Upload (PDF) ✅
  ↓
┌─── 끊김 A ──────────────────────────────────────────────┐
│ Parsing → Chunk 생성                                      │
│ UI 업로드 위저드 ✅ / Extraction controller ✅             │
│ chunk 테이블/엔티티 ✅ / 파서 워커 트리거 ❌               │
│ → "파일 업로드는 되는데 다음 단계로 아무 일도 안 일어남"   │
└─────────────────────────────────────────────────────────┘
  ↓
┌─── 끊김 B ──────────────────────────────────────────────┐
│ LLM Extraction → Candidate 생성                          │
│ extraction_run/candidate 저장 구조 ✅ / Review UI ✅      │
│ confirm/reject/update ✅ / LLM 추출 엔드포인트 ❌         │
│ → "리뷰 테이블은 있는데 들어올 데이터가 없음"             │
└─────────────────────────────────────────────────────────┘
  ↓
┌─── 끊김 C ──────────────────────────────────────────────┐
│ Requirement → Evidence + Lineage                         │
│ requirement 승격 로직 ✅ / Evidence View UI ✅            │
│ diff/impact/audit 일부 UI ✅ / Neo4j 연동 ❌             │
│ → "원천 문서 기반 전체 프로젝트 흐름 연결" 미실현         │
└─────────────────────────────────────────────────────────┘
  ↓
Impact / Audit ❌
```

### 19.4 AI 파이프라인은 '부가 기능'이 아니라 '엔진'이다

> **RFP 모듈에서 AI 파이프라인은 데이터가 흐르기 시작하게 만드는 '동력(엔진)'이다.
> 엔진이 없으면 나머지는 전시용 UI가 된다.**

현재 구조는 리뷰/확정/배지/전이/증빙이 모두 **"AI가 만든 후보가 존재한다"를 전제**로 설계돼 있다.
따라서 AI 파이프라인이 없으면 Sprint 3~4의 상당 부분이 의미를 잃거나 데모에서 빈 화면으로 남는다.

| 의존 관계 | AI 파이프라인 없을 때 |
|-----------|---------------------|
| ExtractionReviewTable | 빈 테이블 |
| Candidate confirm/reject | 동작할 대상 없음 |
| Requirement 승격 | 승격할 후보 없음 |
| Evidence View | 증거 없음 |
| Impact Analysis | 분석 대상 없음 |
| NEEDS_REANALYSIS 전이 | 재분석할 기존 분석 없음 |

### 19.5 "10% 미구현" 주장에 대한 올바른 프레임

| 관점 | 평가 |
|------|------|
| UI/스캐폴딩 기준 | 이미 **60% 이상** |
| 작동하는 E2E 기준 | **25~30%** 수준 |
| "10%"의 출처 | E2E의 '핵심 가치 축(추출/라인리지/임팩트)'만 보고 전체를 평가한 오류 |

**올바른 표현:**

- "기반 구축은 상당히 완료 (Sprint 1 완료, Sprint 2~3도 다수 완료)"
- "다만 엔진(추출)과 연결(라인리지/임팩트)이 빠져 체감 가치가 낮다"

이 프레임은 상대의 문제의식(E2E가 안 돌아감)을 인정하면서도, 팀의 성과(UI/백엔드 레이어가 이미 존재)를 정당하게 평가한다.

---

## 20. E2E 회복 실행 계획 (체감 E2E 25% → 60%+)

> **목표**: "RFP = 모든 요구사항의 Source of Truth"라는 설계 메시지를 사용자가 **실제로 체감**할 수 있는 E2E 흐름으로 복구
>
> **비목표**: UI 추가 구현 ❌ / 상태 모델 재설계 ❌ / 대규모 리팩토링 ❌
>
> 이미 있는 **UI/상태/스키마를 '살리는 연결'**에 집중한다.

### 20.1 Sprint 재구성 원칙

기존 Sprint 번호(Section 14)는 유지하되, **"체감 E2E 회복률" 기준**으로 실행 우선순위를 재배치한다.

| 원칙 | 설명 |
|------|------|
| 엔진 우선 | AI 파이프라인은 부가 기능이 아니라 핵심 동력 — 가장 먼저 연결 |
| 최소 연결 | 완전 구현보다 "한 줄이라도 흐르게" — MVP 연결 우선 |
| 증명 가능 | 모든 단계는 로그/상태/ID로 증명 가능해야 함 — 구두 확인 금지 |

### 20.2 Sprint A (최우선) — Upload → Chunk 자동 연결

> **끊김 A 해소**: 업로드 후 아무 일도 안 일어나는 상태 제거
> 사용자가 "문서를 넣으면 시스템이 움직인다"를 체감하게 만들기

#### A-1. Parsing Worker Trigger 연결

| 항목 | 내용 |
|------|------|
| 트리거 시점 | 파일 업로드 완료 시 파싱 워커 자동 트리거 |
| 초기 방식 | 동기 호출 OK (후속: 비동기 큐로 전환 가능) |
| 상태 전이 | `UPLOADED → PARSING (worker 시작) → PARSED (chunk 생성 완료)` |
| 실패 시 | `→ FAILED (예외 발생 시)` + `failure_reason` 저장 |

#### A-2. `rfp_document_chunk` 실제 생성

| 컬럼 (기존 스키마) | 역할 |
|---------------------|------|
| `chunk_id` | PK |
| `rfp_id` | FK → `project.rfps` |
| `page_no` | 원문 페이지 번호 |
| `content` | 청크 텍스트 |
| `checksum` | 무결성 해시 |
| `created_at` | 생성 시각 |

**최소 로직**: PDF → page 단위 or N-token 단위 split → chunk 개수 ≥ 1이면 성공

#### A-3. 실패/재시도 실동작 연결

| API | 동작 |
|-----|------|
| `POST /rfps/{id}/fail` | 상태 → FAILED, `failure_reason` 저장 |
| `POST /rfps/{id}/resume` | 이전 chunk 삭제 or 버전 분리 명확화 + 재파싱 |

**재시도 조건**: resume 시 이전 chunk 정리 + 상태 로그 남김 (runId 추적 가능)

#### Sprint A Definition of Done (강력)

- [ ] PDF 1건 업로드
- [ ] 1분 이내 `rfp_document_chunk` ≥ 1건 생성
- [ ] 상태: `UPLOADED → PARSING → PARSED` 자동 전이
- [ ] 실패 시 `FAILED` 전이 + resume로 재시도 가능
- [ ] 로그로 `runId` / `chunkCount` 확인 가능
- [ ] RightPanel/Evidence에서 "문서 조각이 보이는 상태"

> **이 Sprint 하나만 끝나도 체감 E2E는 40% 이상 상승**

### 20.3 Sprint B — Chunk → Candidate 생성 (LLM Extraction 최소 연결)

> **끊김 B 해소**: ExtractionReviewTable에 실제 데이터가 나타나게 만들기
> Sprint 3 UI/Service 구현물을 "살리는" 스프린트

#### B-1. LLM Extraction 최소 엔드포인트 구현

**LLM 서비스 (`/api/rfp/extract`)**

입력:
```json
{
  "rfpId": "...",
  "chunks": [
    { "chunkId": "...", "content": "..." }
  ]
}
```

출력 (최소):
```json
{
  "candidates": [
    {
      "text": "요구사항 문장",
      "confidence": 0.72,
      "sourceChunkId": "..."
    }
  ]
}
```

> 품질 중요도: **낮음** — 이 단계에서는 "동작 + 데이터 생성"이 목적

#### B-2. Backend Extraction Worker 연결

**처리 흐름:**

```text
PARSED
 → extraction_run 생성 (runId, modelVersion, startedAt)
 → LLM 호출 (chunks → candidates)
 → candidate N건 저장 (rfp_requirement_candidates)
 → 상태: PARSED → EXTRACTING → EXTRACTED
```

**저장 테이블:**

- `rfp_extraction_runs` — run 메타데이터
- `rfp_requirement_candidates` — AI가 추출한 후보 목록

#### B-3. Wizard Step 3/4 실제 데이터 연결

| UI 요소 | 연결 대상 |
|---------|---------|
| AI 미리보기 (Wizard Step 3) | `POST /api/rfp/extract` 결과 preview |
| ExtractionReviewTable | `GET /extraction-runs/latest` → candidate 목록 |
| bulk confirm/reject/edit | `POST /candidates/confirm`, `POST /candidates/reject` |

#### Sprint B Definition of Done (강력)

- [ ] 업로드한 문서 → candidate ≥ 10개 자동 생성
- [ ] ExtractionReviewTable에 candidate 표시
- [ ] confirm 시 `requirement` 생성 (DB에 1행 추가)
- [ ] requirement 리스트에 즉시 반영
- [ ] `extraction_run`에 runId, modelVersion, candidateCount 기록

> **이 시점에서 "RFP는 그냥 문서가 아니다"가 체감됨**

### 20.4 Sprint C — Requirement → Evidence + 최소 Lineage

> **끊김 C 부분 해소**: "이 요구사항은 어디서 왔는가?"에 즉시 답할 수 있게 만들기
> Source of Truth의 **최소 증명 완성**

#### C-1. Requirement ↔ Chunk Evidence 연결 확정

**데이터 계약:**

- requirement에 `sourceChunkIds[]` + `extractionRunId` 필드 필수
- confirm 시 자동 채움 (candidate의 sourceChunkId 상속)

**UI 동작:**

```text
Requirement 클릭
  → Evidence View 열림
  → chunk 원문 표시
  → page 번호 표시
  → 원문 내 위치 하이라이트
```

#### C-2. Neo4j 최소 그래프 연결 (MVP)

**최소 그래프 (기원 증명용):**
```cypher
(RFP)-[:DERIVES]->(Requirement)
```

> Epic/WBS/Test까지는 후순위 — "기원 증명"만으로도 충분한 가치

**연결 시점:**
- candidate confirm → requirement 생성과 동시에 Neo4j 노드/관계 생성
- Section 10.6의 `(RFP)-[:DERIVES]->(REQ)` 패턴 그대로 적용

#### C-3. Diff / NEEDS_REANALYSIS 실제 트리거

| 이벤트 | 동작 |
|--------|------|
| 새 버전 업로드 (chunk 변경) | 관련 requirement → `NEEDS_REANALYSIS` 자동 전이 |
| UI 배지 | NEEDS_REANALYSIS 배지 즉시 반영 |
| Diff API | `GET /diff` 두 버전 간 변경사항 반환 |

#### Sprint C Definition of Done (강력)

- [ ] requirement 1건 클릭 → 출처 chunk 즉시 확인
- [ ] Neo4j에서 `(RFP)-[:DERIVES]->(Requirement)` 그래프 조회 가능
- [ ] 변경 시 `NEEDS_REANALYSIS` 자동 전이 + UI 배지
- [ ] Lineage 화면에서 최소 그래프 탐색 가능 (초기 버전)

> **이 시점에서 설계 문서의 핵심 메시지 "RFP = Source of Truth"가 현실화**

### 20.5 Sprint 우선순위 vs 기존 Sprint 14 매핑

| 회복 Sprint | 기존 Sprint 14 매핑 | 체감 E2E 상승 예상 |
|:-----------:|:-------------------:|:------------------:|
| **A** | Sprint 2 (2.3~2.6) | 25% → **40%** |
| **B** | Sprint 3 (3.2~3.5) | 40% → **55%** |
| **C** | Sprint 4 (4.2~4.4, 4.6) 일부 | 55% → **65%+** |

> 3개 Sprint = **약 6주**면 체감 E2E를 2배 이상 올릴 수 있다.

### 20.6 Deep-link 최소 구현 (후순위이나 빠른 이득)

> 완전한 Deep-link + AI 어시스턴트 연동은 Sprint 4.8 범위이다.
> 그러나 **최소 URL 파라미터 복원**은 중간에 넣는 것이 QA/디버깅/데모 효율을 급상승시킨다.

**최소 Deep-link 예시:**
```
/rfp?projectId=...&rfpId=...&tab=requirements
/rfp?projectId=...&origin=EXTERNAL_RFP
/rfp?projectId=...&rfpId=...&panel=evidence
```

**가치:**
- QA가 시나리오 재현을 즉시 수행
- 버그 리포트에 URL 첨부 → 재현 비용 제로
- AI 어시스턴트 연동의 사전 인프라

**구현 시점:** Sprint B 완료 후 ~ Sprint C 시작 전 (1~2일 작업량)

---

## 21. 관측/검증 포인트 및 의사결정 요약

> 각 Sprint마다 "됐다/안됐다"를 **논쟁하지 않기 위한 증거**를 남긴다.

### 21.1 필수 로그/메트릭

모든 파이프라인 단계에서 다음이 기록되어야 한다:

| 메트릭 | 기록 위치 | 용도 |
|--------|---------|------|
| `runId` | extraction_run | 실행 추적 (어떤 분석 세션인가) |
| 상태 전이 타임라인 | rfps.status + `updated_at` | 각 전이가 언제 발생했는가 |
| `chunkCount` | extraction_run 또는 로그 | 파싱 결과 양 (0이면 실패) |
| `candidateCount` | extraction_run | 추출 결과 양 |
| `confirmCount` | extraction_run 또는 집계 | 확정된 요구사항 수 |
| `failed/retry` 횟수 | 로그 + rfps.failure_reason | 장애 패턴 분석 |
| `asOf` (타임스탬프) | 각 저장 시점 | 감사 시 시간 증명 |
| `modelVersion` | extraction_run | AI 재현성 (어떤 모델로 추출했는가) |
| `promptVersion` | extraction_run | AI 재현성 (어떤 프롬프트로 추출했는가) |
| `warnings[]` | extraction_run | 품질 이슈 사전 기록 |

### 21.2 Sprint별 QA 시나리오 (공통 패턴)

모든 Sprint의 QA는 다음 5단계를 공통으로 포함한다:

| Step | 검증 내용 | 실패 시 조치 |
|------|---------|------------|
| 1 | 입력 동작 (업로드/트리거/확정) | 에러 메시지 확인 → 로그 추적 |
| 2 | 상태 변화 확인 (DB 직접 조회) | `SELECT status FROM project.rfps WHERE id = ?` |
| 3 | 데이터 생성 확인 (chunk/candidate/requirement) | `SELECT count(*) FROM rfp.* WHERE rfp_id = ?` |
| 4 | UI 반영 확인 (화면에 보이는가) | 브라우저 DevTools → Network tab 확인 |
| 5 | 새로고침 후 상태 유지 확인 | F5 → 동일 화면 유지 (mock fallback이 아님) |

### 21.3 "파싱/추출 워커가 실제로 돌았는가"의 증명 계약

파이프라인의 각 단계가 "돌았음"을 증명하기 위한 최소 계약:

```json
{
  "runId": "uuid",
  "rfpId": "uuid",
  "status": "COMPLETED | FAILED",
  "startedAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "asOf": "ISO-8601",
  "metrics": {
    "chunkCount": 42,
    "candidateCount": 18,
    "confirmCount": 0,
    "failedRetryCount": 0
  },
  "model": {
    "modelVersion": "gemma-3-12b-Q5_K_M",
    "promptVersion": "rfp-extract-v1.0"
  },
  "warnings": [
    "chunk #7: 텍스트 추출률 낮음 (이미지 페이지 추정)"
  ],
  "statusTimeline": [
    { "status": "PARSING", "at": "..." },
    { "status": "PARSED", "at": "..." },
    { "status": "EXTRACTING", "at": "..." },
    { "status": "EXTRACTED", "at": "..." }
  ]
}
```

> 이 계약을 `extraction_run` 테이블에 저장하면, 이후 "이 분석은 언제 어떤 모델로 돌렸고, 결과가 뭐였는가"를 논쟁 없이 증명 가능

### 21.4 의사결정용 한 페이지 요약

| 항목 | 내용 |
|------|------|
| **현 상태** | UI/상태/CRUD: **55~60%** 완료 / 체감 E2E: **25~30%** |
| **문제 본질** | AI 파이프라인 + Lineage 미연결 — 설계는 살아 있으나 엔진이 멈춤 |
| **해결 전략** | Sprint A: Upload→Chunk / Sprint B: Chunk→Candidate / Sprint C: Requirement→Evidence+최소Lineage |
| **기대 효과** | 2~3 Sprint(약 6주) 내 체감 E2E **60% 이상** |
| **핵심 메시지** | "RFP = Source of Truth"를 **실제로 증명 가능**하게 만드는 최소 연결 |
| **10% 논쟁 결론** | "10%"는 핵심 엔진만 보고 전체를 평가한 **과소평가** — 정확한 평가는 "기반 구축은 상당히 완료, 핵심 가치 엔진이 미연결" |

---

## 이 화면이 바뀌면 PMS 전체가 달라지는 이유

이 RFP 화면을 제대로 만들면:

- 요구사항 신뢰성 문제가 **구조적으로 사라짐**
- AI의 판단 근거가 **명확해짐**
- 감사/거버넌스 대응이 **자동화됨**
- "왜 이걸 만들고 있지?"라는 질문에 **항상 답 가능**

반대로 지금 상태로 두면:

- RFP는 곧 잊히는 문서
- AI는 표면적인 도우미
- PMS는 관리 도구 이상이 되지 못함
