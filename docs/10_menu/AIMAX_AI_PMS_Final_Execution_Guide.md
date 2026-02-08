# AIMAX AI-PMS 최종 실행 설계서 (확정본)

## 목적

본 문서는 AIMAX PMS의 최종 실행 기준 문서이다. 기존 엑셀 요구사항,
UI/데이터 불일치 문제, 다양한 사용자(Role) 요구를 하나의 논리로 통합하여
**실행 가능한 단일 기준**을 정의한다.

------------------------------------------------------------------------

## 1. 시스템 핵심 원칙

### 1.1 객체 분리 원칙

  객체                   목적
  ---------------------- --------------------
  Requirement            계약·RFP·고객 요구
  Backlog (Epic/Story)   실행 단위
  Issue                  문제·리스크·결정
  Deliverable            산출물·증빙
  Evidence Pack          감사 제출용 패키지

### 1.2 ID 기반 단일 진실

-   모든 관계는 ID 기반
-   name은 표시용
-   name으로 조인 금지

### 1.3 권한 모델

권한 = Capability(행위) + Scope(범위)

### 1.4 감사/승인 분리

-   감사: 증빙 생성
-   고객PM: 승인/반려
-   실행과 UI 분리

------------------------------------------------------------------------

## 2. IA (Information Architecture)

### 2.1 좌측 메뉴 구조

    Dashboard
    Requirements
    Execution
    Control & Quality
    Governance
    Audit
    Admin

------------------------------------------------------------------------

## 3. 주요 화면 설계 요약

### 3.1 Backlog

-   Epic/Story ID 기반 조인
-   Tree는 렌더링만 담당
-   필터링은 상위에서 1회

### 3.2 Kanban

-   manage_kanban 없으면 drag-drop 완전 차단
-   읽기 전용 배너 표시

### 3.3 Issue & Decision

-   issue_create/comment/triage/resolve/approve/reject/export 분리
-   Customer PM은 Approve/Reject만 가능

### 3.4 Deliverables

-   Upload → Review → Approval → Locked

### 3.5 Audit Evidence Export

-   Lineage와 분리된 전용 화면
-   PDF/ZIP Export

------------------------------------------------------------------------

## 4. Role 요약

  Role           특징
  -------------- -----------
  Sponsor        결정/보고
  PMO            통제/감사
  PM             계획/조정
  DevReader      파트 책임
  DEV            실행
  Customer PM    승인
  Auditor        증빙
  System Admin   운영

------------------------------------------------------------------------

## 5. 실행 로드맵

### PR-1 Foundation

-   Capability 모델 확정
-   메뉴/CTA 권한 적용

### PR-2 Execution

-   Kanban drag-drop 차단
-   ID 정규화

### PR-3 Decision

-   승인 상태 분리
-   Customer PM 전용 UI

### PR-4 Audit

-   Evidence Export 화면

------------------------------------------------------------------------

## 결론

본 문서는 AIMAX PMS의 **단일 실행 기준**이다. 본 기준을 따를 경우 UI,
데이터, 권한 불일치 문제는 재발하지 않는다.
