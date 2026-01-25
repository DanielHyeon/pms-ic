# Phase G: 보고서 시스템 구현 계획

> **문서 버전**: 1.0
> **작성일**: 2026-01-26
> **상태**: 계획 수립 완료

---

## 1. 개요

### 1.1 목표
- TextToSQL 기반 자연어 쿼리 시스템 구현
- 시계열 데이터 저장 및 분석 기반 구축
- 역할별 맞춤 보고서 자동/수동 생성 시스템
- 템플릿 기반 보고서 커스터마이징

### 1.2 주요 기능
| 기능 | 설명 |
|------|------|
| TextToSQL | 자연어 질문을 SQL로 변환하여 데이터 조회 |
| 시계열 저장 | 주간/월간 메트릭 히스토리 저장 |
| 역할별 보고서 | PM/팀장/개발자 등 역할에 따른 범위 차별화 |
| 수동/자동 생성 | 사용자 설정 기반 자동 생성 + 온디맨드 수동 생성 |
| 템플릿 시스템 | 시스템/조직/개인 템플릿 관리 및 커스터마이징 |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ 보고서 목록  │  │ 보고서 생성  │  │ 템플릿 관리  │  │ 자동생성설정│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────────────┼────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend (Spring Boot)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ReportService│  │TemplateServ│  │SettingsServ │  │SchedulerSv │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                 │
│                    ┌──────────────┴──────────────┐                  │
│                    ▼                             ▼                  │
│            ┌─────────────┐               ┌─────────────┐            │
│            │ PostgreSQL  │               │ LLM Service │            │
│            └─────────────┘               └─────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LLM Service (Flask)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ TextToSQL   │  │ReportGenerat│  │  RAG Search │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 스키마

### 3.1 Migration 파일 목록

| 파일명 | 설명 |
|--------|------|
| `V20260127__report_tables.sql` | 보고서 기본 테이블 |
| `V20260128__report_templates.sql` | 템플릿 테이블 |
| `V20260129__report_settings.sql` | 사용자 설정 테이블 |

### 3.2 V20260127__report_tables.sql

```sql
-- ============================================================
-- 보고서 메인 테이블
-- ============================================================
CREATE SCHEMA IF NOT EXISTS report;

CREATE TABLE report.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 기본 정보
    project_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,      -- WEEKLY, MONTHLY, QUARTERLY
    report_scope VARCHAR(30) NOT NULL,     -- PROJECT, PHASE, TEAM, INDIVIDUAL
    title VARCHAR(500),

    -- 기간
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- 범위 지정 (역할에 따라)
    scope_phase_id VARCHAR(50),            -- PHASE 범위
    scope_team_id VARCHAR(50),             -- TEAM 범위
    scope_user_id VARCHAR(50),             -- INDIVIDUAL 범위

    -- 생성 정보
    created_by VARCHAR(50) NOT NULL,
    creator_role VARCHAR(30) NOT NULL,
    generation_mode VARCHAR(20) NOT NULL,  -- AUTO, MANUAL
    template_id UUID,                       -- 사용된 템플릿

    -- 상태
    status VARCHAR(20) DEFAULT 'DRAFT',    -- DRAFT, PUBLISHED, ARCHIVED

    -- 콘텐츠
    content JSONB NOT NULL,                -- 실제 보고서 콘텐츠

    -- 메트릭 스냅샷
    metrics_snapshot JSONB,                -- 생성 시점 메트릭

    -- LLM 메타데이터
    llm_generated_sections TEXT[],
    llm_model VARCHAR(100),
    llm_confidence_score DECIMAL(3,2),

    -- 감사
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,

    CONSTRAINT fk_report_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id)
);

-- 인덱스
CREATE INDEX idx_reports_project ON report.reports(project_id);
CREATE INDEX idx_reports_creator ON report.reports(created_by);
CREATE INDEX idx_reports_period ON report.reports(period_start, period_end);
CREATE INDEX idx_reports_type_scope ON report.reports(report_type, report_scope);
CREATE INDEX idx_reports_status ON report.reports(status);

-- ============================================================
-- 시계열 메트릭 테이블
-- ============================================================
CREATE TABLE report.report_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(50) NOT NULL,

    -- 시간 차원
    metric_date DATE NOT NULL,
    report_type VARCHAR(20) NOT NULL,      -- WEEKLY, MONTHLY
    fiscal_year INT,
    fiscal_quarter INT,
    fiscal_month INT,
    fiscal_week INT,

    -- 작업 메트릭
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    in_progress_tasks INT DEFAULT 0,
    blocked_tasks INT DEFAULT 0,
    delayed_tasks INT DEFAULT 0,

    -- 성과 메트릭
    completion_rate DECIMAL(5,2),
    velocity DECIMAL(10,2),
    story_points_completed INT DEFAULT 0,
    story_points_planned INT DEFAULT 0,

    -- 품질 메트릭
    bug_count INT DEFAULT 0,
    bug_resolved INT DEFAULT 0,
    test_coverage DECIMAL(5,2),

    -- 범위별 (선택적)
    scope_type VARCHAR(30),                -- PROJECT, PHASE, TEAM, USER
    scope_id VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, metric_date, report_type, scope_type, scope_id)
);

CREATE INDEX idx_metrics_project_date ON report.report_metrics_history(project_id, metric_date);
CREATE INDEX idx_metrics_fiscal ON report.report_metrics_history(fiscal_year, fiscal_quarter, fiscal_month);

-- ============================================================
-- 역할별 기본 보고서 설정
-- ============================================================
CREATE TABLE report.role_report_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role VARCHAR(30) NOT NULL,
    report_type VARCHAR(30) NOT NULL,

    default_scope VARCHAR(30) NOT NULL,
    default_sections TEXT[] NOT NULL,

    can_change_scope BOOLEAN DEFAULT false,
    can_select_sections BOOLEAN DEFAULT true,
    can_extend_period BOOLEAN DEFAULT false,
    max_period_days INT DEFAULT 7,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(role, report_type)
);

-- 기본 데이터 삽입
INSERT INTO report.role_report_defaults
(role, report_type, default_scope, default_sections, can_change_scope, can_select_sections, max_period_days)
VALUES
('sponsor', 'WEEKLY', 'PROJECT',
 ARRAY['executive_summary', 'kpi_overview', 'risks_issues', 'budget_status'],
 true, true, 30),
('pmo_head', 'WEEKLY', 'PROJECT',
 ARRAY['executive_summary', 'progress_overview', 'team_performance', 'risks_issues', 'resource_status'],
 true, true, 30),
('pm', 'WEEKLY', 'PROJECT',
 ARRAY['executive_summary', 'progress_overview', 'phase_status', 'team_performance', 'issues_risks', 'next_week_plan'],
 true, true, 14),
('team_lead', 'WEEKLY', 'TEAM',
 ARRAY['team_summary', 'member_status', 'completed_work', 'blockers', 'next_week'],
 true, true, 7),
('developer', 'WEEKLY', 'INDIVIDUAL',
 ARRAY['my_summary', 'completed_tasks', 'in_progress', 'blockers', 'next_week_plan'],
 false, true, 7),
('qa', 'WEEKLY', 'INDIVIDUAL',
 ARRAY['my_summary', 'test_status', 'bugs_found', 'bugs_verified', 'next_week_plan'],
 false, true, 7),
('business_analyst', 'WEEKLY', 'PROJECT',
 ARRAY['requirement_summary', 'story_mapping_status', 'changes', 'next_week_plan'],
 false, true, 7);
```

### 3.3 V20260128__report_templates.sql

```sql
-- ============================================================
-- 보고서 템플릿 테이블
-- ============================================================
CREATE TABLE report.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(30) NOT NULL,      -- WEEKLY, MONTHLY, PROJECT

    -- 범위/소유
    scope VARCHAR(30) NOT NULL,            -- SYSTEM, ORGANIZATION, PERSONAL
    organization_id VARCHAR(50),
    created_by VARCHAR(50),

    -- 대상
    target_roles TEXT[],
    target_report_scopes TEXT[],           -- PROJECT, TEAM, INDIVIDUAL

    -- 템플릿 구조
    structure JSONB NOT NULL,

    -- 스타일
    styling JSONB,

    -- 상태
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version INT DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_scope ON report.report_templates(scope);
CREATE INDEX idx_templates_type ON report.report_templates(report_type);
CREATE INDEX idx_templates_creator ON report.report_templates(created_by);

-- ============================================================
-- 템플릿 섹션 테이블
-- ============================================================
CREATE TABLE report.template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report.report_templates(id) ON DELETE CASCADE,

    section_key VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    section_type VARCHAR(30) NOT NULL,     -- AI_GENERATED, DATA_TABLE, DATA_LIST, MANUAL_INPUT, METRIC_CHART

    -- 설정
    config JSONB NOT NULL,

    is_required BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sections_template ON report.template_sections(template_id);

-- ============================================================
-- 사용자별 템플릿 선호 설정
-- ============================================================
CREATE TABLE report.user_template_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,

    preferred_template_id UUID REFERENCES report.report_templates(id),
    section_overrides JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, report_type)
);

-- ============================================================
-- 기본 시스템 템플릿
-- ============================================================
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure)
VALUES
-- 개발자용 주간 보고서
(
    'a1b2c3d4-0001-0001-0001-000000000001',
    '주간 업무 보고서 (개발자)',
    '개발자용 기본 주간 업무 보고서 템플릿',
    'WEEKLY',
    'SYSTEM',
    ARRAY['developer', 'qa'],
    ARRAY['INDIVIDUAL'],
    '{
        "header": {
            "showProjectName": true,
            "showPeriod": true,
            "showAuthor": true,
            "titleTemplate": "{{user.name}}님의 주간 업무 보고"
        },
        "sections": [
            {
                "key": "my_summary",
                "title": "1. 주간 업무 요약",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "개발자 관점에서 이번 주 완료한 업무와 진행 상황을 3문장으로 요약해주세요.",
                    "maxLength": 500
                },
                "required": true,
                "order": 1
            },
            {
                "key": "completed_tasks",
                "title": "2. 완료 업무",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "tasks.completed",
                    "columns": ["title", "story", "completedAt"],
                    "emptyMessage": "이번 주 완료된 업무가 없습니다."
                },
                "required": true,
                "order": 2
            },
            {
                "key": "in_progress",
                "title": "3. 진행 중 업무",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "tasks.inProgress",
                    "columns": ["title", "story", "progress", "dueDate"]
                },
                "required": true,
                "order": 3
            },
            {
                "key": "blockers",
                "title": "4. 이슈/블로커",
                "type": "MANUAL_INPUT",
                "config": {
                    "placeholder": "현재 업무 진행에 방해가 되는 사항을 작성하세요.",
                    "inputType": "textarea"
                },
                "required": false,
                "order": 4
            },
            {
                "key": "next_week_plan",
                "title": "5. 차주 계획",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "tasks.planned",
                    "fields": ["title", "priority"]
                },
                "required": true,
                "order": 5
            }
        ],
        "footer": {
            "showGeneratedAt": true,
            "showConfidentialNotice": false
        }
    }'::jsonb
),
-- PM용 주간 보고서
(
    'a1b2c3d4-0001-0001-0001-000000000002',
    '주간 프로젝트 현황 보고서 (PM)',
    'PM용 프로젝트 전체 현황 보고서 템플릿',
    'WEEKLY',
    'SYSTEM',
    ARRAY['pm', 'pmo_head'],
    ARRAY['PROJECT'],
    '{
        "header": {
            "showProjectName": true,
            "showPeriod": true,
            "showAuthor": true,
            "titleTemplate": "{{project.name}} 주간 현황 보고"
        },
        "sections": [
            {
                "key": "executive_summary",
                "title": "1. 경영진 요약",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "프로젝트 전체 진행 상황을 경영진 관점에서 요약해주세요. 주요 성과, 리스크, 다음 주 핵심 목표를 포함하세요.",
                    "maxLength": 800
                },
                "required": true,
                "order": 1
            },
            {
                "key": "progress_overview",
                "title": "2. 진행 현황",
                "type": "METRIC_CHART",
                "config": {
                    "metrics": ["completion_rate", "velocity", "burndown"],
                    "chartType": "combined"
                },
                "required": true,
                "order": 2
            },
            {
                "key": "phase_status",
                "title": "3. Phase별 현황",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "phases.status",
                    "columns": ["name", "progress", "status", "dueDate"]
                },
                "required": true,
                "order": 3
            },
            {
                "key": "team_performance",
                "title": "4. 팀별 성과",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "teams.performance",
                    "columns": ["team", "completedTasks", "velocity", "blockers"]
                },
                "required": true,
                "order": 4
            },
            {
                "key": "issues_risks",
                "title": "5. 이슈 및 리스크",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "issues.active",
                    "fields": ["title", "severity", "assignee", "status"]
                },
                "required": true,
                "order": 5
            },
            {
                "key": "next_week_plan",
                "title": "6. 차주 계획",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "다음 주 주요 마일스톤과 계획을 bullet point로 정리해주세요."
                },
                "required": true,
                "order": 6
            }
        ],
        "footer": {
            "showGeneratedAt": true,
            "showConfidentialNotice": true
        }
    }'::jsonb
),
-- 팀장용 팀 보고서
(
    'a1b2c3d4-0001-0001-0001-000000000003',
    '팀 주간 보고서 (팀장)',
    '팀장용 팀 업무 현황 보고서 템플릿',
    'WEEKLY',
    'SYSTEM',
    ARRAY['team_lead', 'pm'],
    ARRAY['TEAM'],
    '{
        "header": {
            "showProjectName": true,
            "showPeriod": true,
            "showAuthor": true,
            "titleTemplate": "{{team.name}} 팀 주간 보고"
        },
        "sections": [
            {
                "key": "team_summary",
                "title": "1. 팀 주간 요약",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "팀의 이번 주 업무를 요약하고, 주요 성과와 이슈를 정리해주세요."
                },
                "required": true,
                "order": 1
            },
            {
                "key": "member_status",
                "title": "2. 팀원별 현황",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "team.members",
                    "columns": ["name", "completedTasks", "inProgressTasks", "blockers"]
                },
                "required": true,
                "order": 2
            },
            {
                "key": "completed_work",
                "title": "3. 완료 업무",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "team.completedTasks",
                    "columns": ["title", "assignee", "completedAt"]
                },
                "required": true,
                "order": 3
            },
            {
                "key": "blockers",
                "title": "4. 블로커/이슈",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "team.blockers",
                    "fields": ["title", "assignee", "description"]
                },
                "required": false,
                "order": 4
            },
            {
                "key": "next_week",
                "title": "5. 차주 계획",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "team.plannedTasks",
                    "fields": ["title", "assignee", "priority"]
                },
                "required": true,
                "order": 5
            }
        ],
        "footer": {
            "showGeneratedAt": true
        }
    }'::jsonb
);
```

### 3.4 V20260129__report_settings.sql

```sql
-- ============================================================
-- 사용자별 보고서 자동 생성 설정
-- ============================================================
CREATE TABLE report.user_report_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50),                -- NULL이면 전체 프로젝트

    -- 주간 보고서 설정
    weekly_enabled BOOLEAN DEFAULT false,
    weekly_day_of_week INT DEFAULT 1,      -- 1=월요일
    weekly_time TIME DEFAULT '09:00:00',
    weekly_template_id UUID REFERENCES report.report_templates(id),
    weekly_sections TEXT[],
    weekly_use_ai_summary BOOLEAN DEFAULT true,

    -- 월간 보고서 설정
    monthly_enabled BOOLEAN DEFAULT false,
    monthly_day_of_month INT DEFAULT 1,
    monthly_time TIME DEFAULT '09:00:00',
    monthly_template_id UUID REFERENCES report.report_templates(id),
    monthly_sections TEXT[],
    monthly_use_ai_summary BOOLEAN DEFAULT true,

    -- 알림 설정
    notify_on_complete BOOLEAN DEFAULT true,
    notify_email BOOLEAN DEFAULT false,
    notify_email_address VARCHAR(255),
    notify_slack BOOLEAN DEFAULT false,
    notify_slack_channel VARCHAR(100),

    -- 생성 후 동작
    auto_publish BOOLEAN DEFAULT false,    -- 자동 발행 여부
    edit_after_generate BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, project_id)
);

CREATE INDEX idx_settings_user ON report.user_report_settings(user_id);
CREATE INDEX idx_settings_schedule ON report.user_report_settings(weekly_enabled, weekly_day_of_week, weekly_time);

-- ============================================================
-- 보고서 생성 로그
-- ============================================================
CREATE TABLE report.report_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id VARCHAR(50) NOT NULL,
    report_id UUID REFERENCES report.reports(id),

    generation_mode VARCHAR(20) NOT NULL,  -- AUTO, MANUAL
    template_id UUID,

    status VARCHAR(20) NOT NULL,           -- SUCCESS, FAILED, PARTIAL
    error_message TEXT,

    -- 성능 메트릭
    data_collection_ms INT,
    llm_generation_ms INT,
    total_duration_ms INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gen_logs_user ON report.report_generation_logs(user_id);
CREATE INDEX idx_gen_logs_status ON report.report_generation_logs(status);

-- ============================================================
-- TextToSQL 쿼리 로그 (감사/분석용)
-- ============================================================
CREATE TABLE report.text_to_sql_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50),
    user_role VARCHAR(30),

    -- 입력/출력
    natural_language_query TEXT NOT NULL,
    generated_sql TEXT,

    -- 실행 결과
    execution_status VARCHAR(20),          -- SUCCESS, FAILED, REJECTED
    result_count INT,
    error_message TEXT,

    -- 보안
    was_sanitized BOOLEAN DEFAULT false,
    sanitization_notes TEXT,

    -- 성능
    generation_ms INT,
    execution_ms INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sql_logs_user ON report.text_to_sql_logs(user_id);
CREATE INDEX idx_sql_logs_status ON report.text_to_sql_logs(execution_status);
```

---

## 4. Backend 구현

### 4.1 파일 구조

```
PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/report/
├── controller/
│   ├── ReportController.java
│   ├── ReportTemplateController.java
│   ├── ReportSettingsController.java
│   └── TextToSqlController.java
├── service/
│   ├── ReportService.java
│   ├── ReportGenerationService.java
│   ├── ReportTemplateService.java
│   ├── ReportSettingsService.java
│   ├── ReportSchedulerService.java
│   ├── ReportDataCollectorService.java
│   └── TextToSqlService.java
├── repository/
│   ├── ReportRepository.java
│   ├── ReportTemplateRepository.java
│   ├── ReportSettingsRepository.java
│   ├── ReportMetricsRepository.java
│   └── TextToSqlLogRepository.java
├── entity/
│   ├── Report.java
│   ├── ReportTemplate.java
│   ├── TemplateSection.java
│   ├── UserReportSettings.java
│   ├── ReportMetricsHistory.java
│   ├── RoleReportDefaults.java
│   └── TextToSqlLog.java
├── dto/
│   ├── ReportDto.java
│   ├── ReportGenerationRequest.java
│   ├── ReportTemplateDto.java
│   ├── ReportSettingsDto.java
│   ├── TextToSqlRequest.java
│   └── TextToSqlResponse.java
├── enums/
│   ├── ReportType.java
│   ├── ReportScope.java
│   ├── ReportStatus.java
│   ├── SectionType.java
│   └── TemplateScope.java
└── client/
    └── LlmServiceClient.java
```

### 4.2 Entity 클래스

#### Report.java
```java
package com.insuretech.pms.report.entity;

@Entity
@Table(schema = "report", name = "reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_scope", nullable = false)
    private ReportScope reportScope;

    private String title;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    // 범위 지정
    @Column(name = "scope_phase_id")
    private String scopePhaseId;

    @Column(name = "scope_team_id")
    private String scopeTeamId;

    @Column(name = "scope_user_id")
    private String scopeUserId;

    // 생성 정보
    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "creator_role", nullable = false)
    private String creatorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_mode", nullable = false)
    private GenerationMode generationMode;

    @Column(name = "template_id")
    private UUID templateId;

    @Enumerated(EnumType.STRING)
    private ReportStatus status = ReportStatus.DRAFT;

    // JSON 콘텐츠
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> content;

    @Type(JsonType.class)
    @Column(name = "metrics_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> metricsSnapshot;

    // LLM 메타데이터
    @Column(name = "llm_generated_sections")
    private String[] llmGeneratedSections;

    @Column(name = "llm_model")
    private String llmModel;

    @Column(name = "llm_confidence_score")
    private BigDecimal llmConfidenceScore;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;
}
```

#### ReportTemplate.java
```java
package com.insuretech.pms.report.entity;

@Entity
@Table(schema = "report", name = "report_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TemplateScope scope;

    @Column(name = "organization_id")
    private String organizationId;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "target_roles")
    private String[] targetRoles;

    @Column(name = "target_report_scopes")
    private String[] targetReportScopes;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> structure;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> styling;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "is_default")
    private Boolean isDefault = false;

    private Integer version = 1;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder")
    private List<TemplateSection> sections;
}
```

### 4.3 Service 클래스

#### ReportGenerationService.java
```java
package com.insuretech.pms.report.service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportGenerationService {

    private final ReportRepository reportRepository;
    private final ReportTemplateService templateService;
    private final ReportDataCollectorService dataCollector;
    private final LlmServiceClient llmClient;
    private final UserService userService;

    /**
     * 보고서 생성 (수동/자동 공통)
     */
    @Transactional
    public ReportDto generateReport(ReportGenerationRequest request, String userId) {
        User user = userService.findById(userId);

        // 1. 권한 검증
        validateScopeAccess(request.getScope(), user);

        // 2. 템플릿 로드 (지정된 경우)
        ReportTemplate template = request.getTemplateId() != null
            ? templateService.findById(request.getTemplateId())
            : templateService.getDefaultTemplate(request.getReportType(), user.getRole());

        // 3. 섹션 필터링 (역할 기반)
        List<String> allowedSections = filterAllowedSections(
            request.getSections(),
            template,
            user.getRole()
        );

        // 4. 데이터 수집
        ReportData data = dataCollector.collectData(
            request.getProjectId(),
            request.getScope(),
            request.getPeriodStart(),
            request.getPeriodEnd(),
            user
        );

        // 5. LLM 섹션 생성
        Map<String, String> llmContents = new HashMap<>();
        List<String> llmSections = new ArrayList<>();

        for (String sectionKey : allowedSections) {
            TemplateSection section = findSection(template, sectionKey);
            if (section != null && section.getSectionType() == SectionType.AI_GENERATED) {
                String content = generateLlmSection(section, data, user.getRole());
                llmContents.put(sectionKey, content);
                llmSections.add(sectionKey);
            }
        }

        // 6. 보고서 조립
        Report report = assembleReport(request, template, data, llmContents, user);
        report.setLlmGeneratedSections(llmSections.toArray(new String[0]));

        Report saved = reportRepository.save(report);

        // 7. 메트릭 스냅샷 저장
        saveMetricsSnapshot(saved, data);

        return ReportDto.from(saved);
    }

    /**
     * 범위별 데이터 수집
     */
    private void validateScopeAccess(ReportScopeRequest scope, User user) {
        RoleReportDefaults defaults = getRoleDefaults(user.getRole());

        if (!defaults.getCanChangeScope() &&
            !scope.getType().equals(defaults.getDefaultScope())) {
            throw new AccessDeniedException(
                "User role " + user.getRole() + " cannot access scope " + scope.getType()
            );
        }

        // INDIVIDUAL 범위에서 다른 사용자 조회 시 권한 검증
        if (scope.getType() == ReportScope.INDIVIDUAL &&
            scope.getUserId() != null &&
            !scope.getUserId().equals(user.getId())) {

            if (!hasTeamLeadAccess(user, scope.getUserId())) {
                throw new AccessDeniedException("Cannot access other user's report");
            }
        }
    }

    private String generateLlmSection(TemplateSection section, ReportData data, String role) {
        String prompt = buildPrompt(section, data, role);

        LlmRequest request = LlmRequest.builder()
            .prompt(prompt)
            .maxTokens(section.getConfig().getMaxLength() != null ?
                section.getConfig().getMaxLength() : 500)
            .temperature(0.7)
            .build();

        LlmResponse response = llmClient.generateContent(request);
        return response.getContent();
    }
}
```

#### ReportSchedulerService.java
```java
package com.insuretech.pms.report.service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportSchedulerService {

    private final UserReportSettingsRepository settingsRepository;
    private final ReportGenerationService reportGenerationService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * 매 시간 정각에 실행 - 해당 시간에 자동 생성 설정된 사용자 처리
     */
    @Scheduled(cron = "0 0 * * * *")
    public void processScheduledReports() {
        LocalTime currentHour = LocalTime.now().truncatedTo(ChronoUnit.HOURS);
        int dayOfWeek = LocalDate.now().getDayOfWeek().getValue();
        int dayOfMonth = LocalDate.now().getDayOfMonth();

        log.info("Processing scheduled reports for hour: {}, dayOfWeek: {}, dayOfMonth: {}",
            currentHour, dayOfWeek, dayOfMonth);

        // 주간 보고서
        processWeeklyReports(dayOfWeek, currentHour);

        // 월간 보고서
        processMonthlyReports(dayOfMonth, currentHour);
    }

    private void processWeeklyReports(int dayOfWeek, LocalTime time) {
        List<UserReportSettings> settings = settingsRepository
            .findByWeeklyEnabledAndWeeklyDayOfWeekAndWeeklyTime(true, dayOfWeek, time);

        for (UserReportSettings setting : settings) {
            try {
                generateWeeklyReportForUser(setting);
            } catch (Exception e) {
                log.error("Failed to generate weekly report for user: {}",
                    setting.getUserId(), e);
                notifyFailure(setting, e);
            }
        }
    }

    private void generateWeeklyReportForUser(UserReportSettings settings) {
        LocalDate endDate = LocalDate.now().minusDays(1);
        LocalDate startDate = endDate.minusDays(6);

        ReportGenerationRequest request = ReportGenerationRequest.builder()
            .projectId(settings.getProjectId())
            .reportType(ReportType.WEEKLY)
            .periodStart(startDate)
            .periodEnd(endDate)
            .templateId(settings.getWeeklyTemplateId())
            .sections(Arrays.asList(settings.getWeeklySections()))
            .useAiSummary(settings.getWeeklyUseAiSummary())
            .generationMode(GenerationMode.AUTO)
            .build();

        ReportDto report = reportGenerationService.generateReport(
            request,
            settings.getUserId()
        );

        // 알림 전송
        if (settings.getNotifyOnComplete()) {
            notificationService.sendReportReadyNotification(
                settings.getUserId(),
                report
            );
        }

        if (settings.getNotifyEmail() && settings.getNotifyEmailAddress() != null) {
            emailService.sendReportEmail(
                settings.getNotifyEmailAddress(),
                report
            );
        }

        log.info("Generated weekly report for user: {}, reportId: {}",
            settings.getUserId(), report.getId());
    }
}
```

### 4.4 Controller 클래스

#### ReportController.java
```java
package com.insuretech.pms.report.controller;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "보고서 관리 API")
public class ReportController {

    private final ReportService reportService;
    private final ReportGenerationService generationService;

    @GetMapping
    @Operation(summary = "보고서 목록 조회")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Page<ReportDto>> getReports(
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) ReportType reportType,
            @RequestParam(required = false) ReportScope scope,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate periodStart,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate periodEnd,
            @RequestParam(required = false) ReportStatus status,
            Pageable pageable,
            @AuthenticationPrincipal UserDetails user) {

        ReportSearchCriteria criteria = ReportSearchCriteria.builder()
            .projectId(projectId)
            .reportType(reportType)
            .scope(scope)
            .periodStart(periodStart)
            .periodEnd(periodEnd)
            .status(status)
            .userId(user.getUsername())
            .userRole(user.getAuthorities().stream().findFirst().get().getAuthority())
            .build();

        return ApiResponse.success(reportService.searchReports(criteria, pageable));
    }

    @GetMapping("/{reportId}")
    @Operation(summary = "보고서 상세 조회")
    @PreAuthorize("@reportSecurityService.canAccess(#reportId, authentication)")
    public ApiResponse<ReportDto> getReport(@PathVariable UUID reportId) {
        return ApiResponse.success(reportService.getReportById(reportId));
    }

    @PostMapping("/generate")
    @Operation(summary = "보고서 생성 (수동)")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ReportDto> generateReport(
            @Valid @RequestBody ReportGenerationRequest request,
            @AuthenticationPrincipal UserDetails user) {

        request.setGenerationMode(GenerationMode.MANUAL);
        return ApiResponse.created(
            generationService.generateReport(request, user.getUsername())
        );
    }

    @PutMapping("/{reportId}")
    @Operation(summary = "보고서 수정")
    @PreAuthorize("@reportSecurityService.canEdit(#reportId, authentication)")
    public ApiResponse<ReportDto> updateReport(
            @PathVariable UUID reportId,
            @Valid @RequestBody ReportUpdateRequest request) {
        return ApiResponse.success(reportService.updateReport(reportId, request));
    }

    @PostMapping("/{reportId}/publish")
    @Operation(summary = "보고서 발행")
    @PreAuthorize("@reportSecurityService.canEdit(#reportId, authentication)")
    public ApiResponse<ReportDto> publishReport(@PathVariable UUID reportId) {
        return ApiResponse.success(reportService.publishReport(reportId));
    }

    @DeleteMapping("/{reportId}")
    @Operation(summary = "보고서 삭제")
    @PreAuthorize("@reportSecurityService.canDelete(#reportId, authentication)")
    public ApiResponse<Void> deleteReport(@PathVariable UUID reportId) {
        reportService.deleteReport(reportId);
        return ApiResponse.success();
    }

    @GetMapping("/my-options")
    @Operation(summary = "내 역할의 보고서 생성 옵션 조회")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ReportOptionsDto> getMyReportOptions(
            @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.success(
            reportService.getReportOptionsForRole(
                user.getAuthorities().stream().findFirst().get().getAuthority()
            )
        );
    }
}
```

---

## 5. LLM Service 구현

### 5.1 파일 구조

```
llm-service/
├── routes/
│   ├── report_routes.py          # 보고서 생성 API
│   └── text_to_sql_routes.py     # TextToSQL API
├── services/
│   ├── report_generator.py       # 보고서 콘텐츠 생성
│   ├── text_to_sql.py           # TextToSQL 엔진
│   └── sql_validator.py         # SQL 검증/보안
└── prompts/
    ├── report_prompts.py         # 보고서 프롬프트
    └── sql_prompts.py           # SQL 생성 프롬프트
```

### 5.2 TextToSQL 구현

#### text_to_sql.py
```python
"""
TextToSQL Service - 자연어를 SQL로 변환
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import re
from llama_cpp import Llama

@dataclass
class SqlGenerationResult:
    sql: str
    explanation: str
    confidence: float
    parameters: List[any]
    was_sanitized: bool
    sanitization_notes: Optional[str] = None

class TextToSqlService:
    """자연어 질문을 안전한 SQL로 변환하는 서비스"""

    # 허용된 테이블/스키마
    ALLOWED_SCHEMAS = {
        "task": ["weekly_reports", "sprints", "tasks", "user_stories"],
        "project": ["phases", "deliverables", "epics", "features", "projects"],
        "report": ["reports", "report_metrics_history"]
    }

    # 역할별 컬럼 제한
    ROLE_COLUMN_RESTRICTIONS = {
        "developer": {
            "exclude": ["llm_confidence_score", "budget_info", "internal_notes"]
        },
        "qa": {
            "exclude": ["budget_info", "salary_info"]
        },
        "business_analyst": {
            "exclude": ["budget_info"]
        }
    }

    # 금지된 SQL 연산
    FORBIDDEN_PATTERNS = [
        r'\bDELETE\b',
        r'\bDROP\b',
        r'\bTRUNCATE\b',
        r'\bINSERT\b',
        r'\bUPDATE\b',
        r'\bALTER\b',
        r'\bCREATE\b',
        r'\bGRANT\b',
        r'\bREVOKE\b',
        r'--',  # SQL 주석
        r'/\*',  # 블록 주석
        r';.*;',  # 다중 쿼리
    ]

    def __init__(self, llm: Llama):
        self.llm = llm
        self.schema_info = self._load_schema_info()

    def generate_sql(
        self,
        natural_language: str,
        project_id: str,
        user_role: str,
        user_id: str
    ) -> SqlGenerationResult:
        """
        자연어 질문을 SQL로 변환

        Args:
            natural_language: 사용자의 자연어 질문
            project_id: 프로젝트 ID (멀티테넌시)
            user_role: 사용자 역할
            user_id: 사용자 ID

        Returns:
            SqlGenerationResult: 생성된 SQL 및 메타데이터
        """

        # 1. 프롬프트 구성
        prompt = self._build_prompt(natural_language, user_role)

        # 2. LLM으로 SQL 생성
        response = self.llm(
            prompt,
            max_tokens=500,
            temperature=0.1,  # 낮은 temperature로 일관성 확보
            stop=["```", "\n\n"]
        )

        raw_sql = self._extract_sql(response["choices"][0]["text"])

        # 3. 보안 검증 및 정제
        sanitized_sql, was_sanitized, notes = self._sanitize_sql(
            raw_sql,
            project_id,
            user_role
        )

        # 4. 파라미터 바인딩
        final_sql, parameters = self._parameterize_sql(
            sanitized_sql,
            project_id,
            user_id
        )

        # 5. 최종 검증
        self._validate_sql(final_sql)

        return SqlGenerationResult(
            sql=final_sql,
            explanation=self._generate_explanation(final_sql),
            confidence=self._calculate_confidence(response),
            parameters=parameters,
            was_sanitized=was_sanitized,
            sanitization_notes=notes
        )

    def _build_prompt(self, question: str, role: str) -> str:
        """SQL 생성 프롬프트 구성"""

        schema_desc = self._get_schema_description(role)

        return f"""당신은 PMS(프로젝트 관리 시스템)의 PostgreSQL 쿼리 전문가입니다.
자연어 질문을 안전한 파라미터화된 SELECT SQL로 변환하세요.

[스키마 정보]
{schema_desc}

[규칙]
1. SELECT 쿼리만 생성 (INSERT, UPDATE, DELETE 금지)
2. 반드시 project_id = $1 조건 포함 (멀티테넌시)
3. 파라미터는 $1, $2, $3 형식 사용
4. 허용된 테이블만 사용
5. 결과는 100행으로 제한 (LIMIT 100)

[사용자 질문]
{question}

[SQL]
```sql
"""

    def _sanitize_sql(
        self,
        sql: str,
        project_id: str,
        role: str
    ) -> Tuple[str, bool, Optional[str]]:
        """SQL 보안 검증 및 정제"""

        was_sanitized = False
        notes = []

        # 금지 패턴 검사
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, sql, re.IGNORECASE):
                raise SecurityException(f"Forbidden SQL pattern detected: {pattern}")

        # 허용된 테이블만 사용하는지 검사
        used_tables = self._extract_tables(sql)
        for table in used_tables:
            if not self._is_allowed_table(table):
                raise SecurityException(f"Access to table '{table}' is not allowed")

        # project_id 조건 강제 추가
        if "project_id" not in sql.lower():
            sql = self._inject_project_filter(sql)
            was_sanitized = True
            notes.append("Added project_id filter for multi-tenancy")

        # 역할별 컬럼 제한 적용
        restricted_columns = self._get_restricted_columns(role)
        for col in restricted_columns:
            if col.lower() in sql.lower():
                sql = self._remove_column(sql, col)
                was_sanitized = True
                notes.append(f"Removed restricted column: {col}")

        # LIMIT 강제
        if "limit" not in sql.lower():
            sql = sql.rstrip(";") + " LIMIT 100;"
            was_sanitized = True
            notes.append("Added LIMIT 100")

        return sql, was_sanitized, "; ".join(notes) if notes else None

    def _parameterize_sql(
        self,
        sql: str,
        project_id: str,
        user_id: str
    ) -> Tuple[str, List]:
        """SQL 파라미터화"""

        parameters = [project_id]

        # $1은 항상 project_id
        if "$2" in sql:
            parameters.append(user_id)

        return sql, parameters
```

#### report_generator.py
```python
"""
Report Content Generator - LLM 기반 보고서 콘텐츠 생성
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
import json

@dataclass
class SectionContent:
    key: str
    title: str
    content: str
    content_type: str  # text, table, list, chart
    metadata: Optional[Dict] = None

class ReportGenerator:
    """LLM 기반 보고서 콘텐츠 생성기"""

    ROLE_PROMPTS = {
        "developer": """
개발자 관점에서 업무를 요약합니다.
- 기술적 성과와 구현 내용 중심
- 코드 품질, 테스트, 기술 부채 언급
- 간결하고 명확한 표현
""",
        "pm": """
프로젝트 매니저 관점에서 현황을 요약합니다.
- 전체 진행률과 일정 준수 여부 중심
- 리소스, 리스크, 의사결정 사항 포함
- 경영진 보고에 적합한 톤
""",
        "team_lead": """
팀 리더 관점에서 팀 업무를 요약합니다.
- 팀원별 업무 현황과 협업 상태
- 팀 내 이슈와 해결 방안
- 팀 성과와 개선점
"""
    }

    def __init__(self, llm):
        self.llm = llm

    def generate_section(
        self,
        section_config: Dict,
        report_data: Dict,
        user_role: str
    ) -> SectionContent:
        """
        템플릿 섹션 설정에 따라 콘텐츠 생성
        """

        section_type = section_config.get("type")

        if section_type == "AI_GENERATED":
            return self._generate_ai_section(section_config, report_data, user_role)
        elif section_type == "DATA_TABLE":
            return self._generate_table_section(section_config, report_data)
        elif section_type == "DATA_LIST":
            return self._generate_list_section(section_config, report_data)
        elif section_type == "METRIC_CHART":
            return self._generate_chart_section(section_config, report_data)
        else:
            return self._generate_manual_section(section_config)

    def _generate_ai_section(
        self,
        config: Dict,
        data: Dict,
        role: str
    ) -> SectionContent:
        """AI 자동 생성 섹션"""

        base_prompt = config.get("config", {}).get("prompt", "업무를 요약해주세요.")
        role_context = self.ROLE_PROMPTS.get(role, "")
        max_length = config.get("config", {}).get("maxLength", 500)

        prompt = f"""
{role_context}

[데이터]
{json.dumps(data, ensure_ascii=False, indent=2)}

[요청]
{base_prompt}

[응답 형식]
- 한국어로 작성
- {max_length}자 이내
- 마크다운 형식 사용 가능
"""

        response = self.llm(
            prompt,
            max_tokens=max_length,
            temperature=0.7
        )

        content = response["choices"][0]["text"].strip()

        return SectionContent(
            key=config["key"],
            title=config["title"],
            content=content,
            content_type="text",
            metadata={
                "llm_generated": True,
                "prompt": base_prompt,
                "role": role
            }
        )

    def _generate_table_section(
        self,
        config: Dict,
        data: Dict
    ) -> SectionContent:
        """데이터 테이블 섹션"""

        data_source = config.get("config", {}).get("dataSource", "")
        columns = config.get("config", {}).get("columns", [])

        # 데이터 소스에서 데이터 추출
        table_data = self._extract_data(data, data_source)

        # 컬럼 필터링
        filtered_data = [
            {col: row.get(col) for col in columns}
            for row in table_data
        ]

        return SectionContent(
            key=config["key"],
            title=config["title"],
            content=json.dumps(filtered_data, ensure_ascii=False),
            content_type="table",
            metadata={
                "columns": columns,
                "row_count": len(filtered_data)
            }
        )
```

### 5.3 API Routes

#### report_routes.py
```python
"""
Report Generation API Routes
"""

from flask import Blueprint, request, jsonify
from services.report_generator import ReportGenerator
from services.text_to_sql import TextToSqlService

report_bp = Blueprint('report', __name__, url_prefix='/api/report')

@report_bp.route('/generate-section', methods=['POST'])
def generate_section():
    """
    보고서 섹션 콘텐츠 생성

    Request:
        section_config: 섹션 설정
        report_data: 보고서 데이터
        user_role: 사용자 역할
    """
    data = request.json

    generator = ReportGenerator(get_llm())

    result = generator.generate_section(
        section_config=data['section_config'],
        report_data=data['report_data'],
        user_role=data['user_role']
    )

    return jsonify({
        'success': True,
        'data': {
            'key': result.key,
            'title': result.title,
            'content': result.content,
            'content_type': result.content_type,
            'metadata': result.metadata
        }
    })

@report_bp.route('/generate-summary', methods=['POST'])
def generate_summary():
    """
    보고서 전체 요약 생성
    """
    data = request.json

    generator = ReportGenerator(get_llm())

    summary = generator.generate_executive_summary(
        report_data=data['report_data'],
        user_role=data['user_role'],
        report_type=data['report_type']
    )

    return jsonify({
        'success': True,
        'data': {
            'summary': summary,
            'llm_model': get_model_name(),
            'confidence': 0.85
        }
    })


@report_bp.route('/text-to-sql', methods=['POST'])
def text_to_sql():
    """
    자연어를 SQL로 변환

    Request:
        question: 자연어 질문
        project_id: 프로젝트 ID
        user_role: 사용자 역할
        user_id: 사용자 ID
    """
    data = request.json

    service = TextToSqlService(get_llm())

    try:
        result = service.generate_sql(
            natural_language=data['question'],
            project_id=data['project_id'],
            user_role=data['user_role'],
            user_id=data['user_id']
        )

        return jsonify({
            'success': True,
            'data': {
                'sql': result.sql,
                'explanation': result.explanation,
                'confidence': result.confidence,
                'parameters': result.parameters,
                'was_sanitized': result.was_sanitized,
                'sanitization_notes': result.sanitization_notes
            }
        })

    except SecurityException as e:
        return jsonify({
            'success': False,
            'error': 'security_violation',
            'message': str(e)
        }), 403
```

---

## 6. API 명세

### 6.1 보고서 API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/api/reports` | 보고서 목록 조회 | 인증 사용자 |
| GET | `/api/reports/{id}` | 보고서 상세 조회 | 소유자/관리자 |
| POST | `/api/reports/generate` | 보고서 생성 (수동) | 인증 사용자 |
| PUT | `/api/reports/{id}` | 보고서 수정 | 소유자 |
| POST | `/api/reports/{id}/publish` | 보고서 발행 | 소유자 |
| DELETE | `/api/reports/{id}` | 보고서 삭제 | 소유자/관리자 |
| GET | `/api/reports/my-options` | 역할별 옵션 조회 | 인증 사용자 |

### 6.2 템플릿 API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/api/reports/templates` | 템플릿 목록 | 인증 사용자 |
| GET | `/api/reports/templates/{id}` | 템플릿 상세 | 인증 사용자 |
| POST | `/api/reports/templates` | 템플릿 생성 | PM/PMO |
| PUT | `/api/reports/templates/{id}` | 템플릿 수정 | 소유자 |
| DELETE | `/api/reports/templates/{id}` | 템플릿 삭제 | 소유자 |
| POST | `/api/reports/templates/{id}/copy` | 템플릿 복사 | 인증 사용자 |

### 6.3 설정 API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/api/reports/settings/my` | 내 설정 조회 | 인증 사용자 |
| PUT | `/api/reports/settings/my` | 내 설정 저장 | 인증 사용자 |
| GET | `/api/reports/settings/schedule-preview` | 스케줄 미리보기 | 인증 사용자 |

### 6.4 TextToSQL API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/api/reports/query` | 자연어 쿼리 실행 | 인증 사용자 |
| GET | `/api/reports/query/history` | 쿼리 히스토리 | 인증 사용자 |

---

## 7. Frontend 구현

### 7.1 파일 구조

```
PMS_IC_FrontEnd_v1.2/src/
├── app/components/reports/
│   ├── ReportManagement.tsx        # 메인 페이지
│   ├── ReportList.tsx             # 보고서 목록
│   ├── ReportGenerator.tsx        # 보고서 생성 폼
│   ├── ReportViewer.tsx           # 보고서 조회/편집
│   ├── ReportSettings.tsx         # 자동 생성 설정
│   ├── TemplateList.tsx           # 템플릿 목록
│   ├── TemplateEditor.tsx         # 템플릿 편집기
│   └── NaturalLanguageQuery.tsx   # TextToSQL UI
├── hooks/api/
│   ├── useReports.ts              # 보고서 API 훅
│   ├── useReportTemplates.ts      # 템플릿 API 훅
│   └── useReportSettings.ts       # 설정 API 훅
└── types/
    └── report.ts                  # 타입 정의
```

### 7.2 주요 컴포넌트

#### ReportGenerator.tsx
```tsx
import React, { useState } from 'react';
import { useReportTemplates, useGenerateReport, useReportOptions } from '@/hooks/api/useReports';

interface ReportGeneratorProps {
  projectId: string;
  userRole: string;
  onComplete: (reportId: string) => void;
}

export function ReportGenerator({ projectId, userRole, onComplete }: ReportGeneratorProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const { data: templates } = useReportTemplates(userRole);
  const { data: options } = useReportOptions();
  const generateMutation = useGenerateReport();

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({
      projectId,
      templateId: selectedTemplate,
      periodStart: period.start,
      periodEnd: period.end,
      sections: selectedSections,
      useAiSummary: true
    });

    onComplete(result.id);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: 템플릿 선택 */}
      {step === 1 && (
        <TemplateSelector
          templates={templates}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          onNext={() => setStep(2)}
        />
      )}

      {/* Step 2: 기간 설정 */}
      {step === 2 && (
        <PeriodSelector
          period={period}
          onChange={setPeriod}
          maxDays={options?.maxPeriodDays || 7}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {/* Step 3: 섹션 선택 */}
      {step === 3 && (
        <SectionSelector
          template={templates?.find(t => t.id === selectedTemplate)}
          selected={selectedSections}
          onChange={setSelectedSections}
          onBack={() => setStep(2)}
          onGenerate={handleGenerate}
          isLoading={generateMutation.isPending}
        />
      )}
    </div>
  );
}
```

#### ReportSettings.tsx
```tsx
import React from 'react';
import { useReportSettings, useUpdateReportSettings } from '@/hooks/api/useReportSettings';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';

export function ReportSettings() {
  const { data: settings, isLoading } = useReportSettings();
  const updateMutation = useUpdateReportSettings();

  const handleChange = (field: string, value: any) => {
    updateMutation.mutate({
      ...settings,
      [field]: value
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">보고서 자동 생성 설정</h2>

      {/* 주간 보고서 설정 */}
      <section className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">주간 보고서</h3>
          <Switch
            checked={settings?.weeklyEnabled}
            onCheckedChange={(v) => handleChange('weeklyEnabled', v)}
          />
        </div>

        {settings?.weeklyEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="생성 요일"
                value={settings?.weeklyDayOfWeek}
                onChange={(v) => handleChange('weeklyDayOfWeek', v)}
                options={[
                  { value: 1, label: '월요일' },
                  { value: 2, label: '화요일' },
                  { value: 3, label: '수요일' },
                  { value: 4, label: '목요일' },
                  { value: 5, label: '금요일' },
                ]}
              />
              <Select
                label="생성 시간"
                value={settings?.weeklyTime}
                onChange={(v) => handleChange('weeklyTime', v)}
                options={[
                  { value: '08:00', label: '08:00' },
                  { value: '09:00', label: '09:00' },
                  { value: '10:00', label: '10:00' },
                ]}
              />
            </div>

            <SectionCheckboxes
              sections={settings?.availableSections}
              selected={settings?.weeklySections}
              onChange={(v) => handleChange('weeklySections', v)}
            />

            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.weeklyUseAiSummary}
                onCheckedChange={(v) => handleChange('weeklyUseAiSummary', v)}
              />
              <span>AI 요약 자동 생성</span>
            </div>
          </div>
        )}
      </section>

      {/* 알림 설정 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">알림 설정</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <Switch
              checked={settings?.notifyOnComplete}
              onCheckedChange={(v) => handleChange('notifyOnComplete', v)}
            />
            <span>생성 완료 시 알림</span>
          </label>

          <label className="flex items-center gap-2">
            <Switch
              checked={settings?.notifyEmail}
              onCheckedChange={(v) => handleChange('notifyEmail', v)}
            />
            <span>이메일로 보고서 전송</span>
          </label>

          {settings?.notifyEmail && (
            <input
              type="email"
              value={settings?.notifyEmailAddress || ''}
              onChange={(e) => handleChange('notifyEmailAddress', e.target.value)}
              placeholder="이메일 주소"
              className="w-full border rounded px-3 py-2"
            />
          )}
        </div>
      </section>

      {/* 다음 예정 */}
      <section className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-800">다음 자동 생성 예정</h4>
        <p className="text-blue-600">
          {settings?.nextScheduledAt
            ? new Date(settings.nextScheduledAt).toLocaleString('ko-KR')
            : '설정된 스케줄이 없습니다'}
        </p>
      </section>
    </div>
  );
}
```

### 7.3 메뉴 설정 업데이트

#### menuConfig.ts 수정
```typescript
// 기존 analytics 그룹 수정
{
  id: 'analytics',
  label: '분석 및 리포트',
  icon: BarChart3,
  zone: 'INSIGHT',
  defaultExpanded: false,
  items: [
    {
      id: 'lineage',
      path: '/lineage',
      label: 'Lineage & History',
      icon: History,
    },
    {
      id: 'reports',
      path: '/reports',
      label: '보고서 관리',  // 변경
      icon: FileText,
    },
    {
      id: 'report-templates',  // 추가
      path: '/report-templates',
      label: '보고서 템플릿',
      icon: LayoutTemplate,
    },
    {
      id: 'statistics',
      path: '/statistics',
      label: '통계 대시보드',
      icon: PieChart,
    },
  ],
}

// 역할별 접근 권한 수정 - developer, qa에 reports 추가
export const menuAccessByRole: Record<UserRole, string[]> = {
  // ...
  developer: [
    'dashboard',
    'requirements',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'ai-assistant',
    'education',
    'lineage',
    'reports',  // 추가
    'settings',
  ],
  qa: [
    'dashboard',
    'requirements',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'deliverables',
    'ai-assistant',
    'education',
    'lineage',
    'reports',  // 추가
    'settings',
  ],
  // ...
};
```

---

## 8. 구현 로드맵

### Phase 1: 기반 인프라 (Week 1)

| Day | 작업 | 담당 |
|-----|------|------|
| 1 | DB Migration 작성 및 적용 | Backend |
| 2 | Entity, Repository 클래스 생성 | Backend |
| 3 | 기본 Service 클래스 (CRUD) | Backend |
| 4 | Controller 및 API 엔드포인트 | Backend |
| 5 | API 테스트 및 문서화 | Backend |

### Phase 2: 템플릿 시스템 (Week 2)

| Day | 작업 | 담당 |
|-----|------|------|
| 1 | 템플릿 Service/Controller | Backend |
| 2 | 기본 시스템 템플릿 데이터 | Backend |
| 3 | Frontend 템플릿 목록/상세 | Frontend |
| 4 | Frontend 템플릿 편집기 | Frontend |
| 5 | 통합 테스트 | Full-stack |

### Phase 3: 보고서 생성 (Week 3)

| Day | 작업 | 담당 |
|-----|------|------|
| 1 | ReportDataCollector 구현 | Backend |
| 2 | LLM Service 연동 | Backend + LLM |
| 3 | report_generator.py 구현 | LLM |
| 4 | Frontend 보고서 생성 폼 | Frontend |
| 5 | Frontend 보고서 뷰어/편집 | Frontend |

### Phase 4: 자동 생성 & 설정 (Week 4)

| Day | 작업 | 담당 |
|-----|------|------|
| 1 | 스케줄러 서비스 구현 | Backend |
| 2 | 사용자 설정 API | Backend |
| 3 | Frontend 설정 UI | Frontend |
| 4 | 알림 서비스 연동 | Backend |
| 5 | E2E 테스트 | Full-stack |

### Phase 5: TextToSQL (Week 5)

| Day | 작업 | 담당 |
|-----|------|------|
| 1 | text_to_sql.py 구현 | LLM |
| 2 | SQL 검증/보안 모듈 | LLM |
| 3 | Backend 쿼리 실행 서비스 | Backend |
| 4 | Frontend 자연어 쿼리 UI | Frontend |
| 5 | 보안 테스트 및 최적화 | Full-stack |

---

## 9. 테스트 계획

### 9.1 단위 테스트

- [ ] ReportService 테스트
- [ ] ReportTemplateService 테스트
- [ ] ReportGenerationService 테스트
- [ ] TextToSqlService 테스트
- [ ] SQL Sanitizer 테스트

### 9.2 통합 테스트

- [ ] 보고서 생성 E2E
- [ ] 템플릿 적용 E2E
- [ ] 자동 생성 스케줄 테스트
- [ ] 역할별 접근 권한 테스트

### 9.3 보안 테스트

- [ ] SQL Injection 방어 테스트
- [ ] 역할별 데이터 접근 제한 테스트
- [ ] 멀티테넌시 격리 테스트

---

## 10. 참고 자료

- [기존 WeeklyReport 구현](../PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/task/service/WeeklyReportService.java)
- [LLM Service 아키텍처](../llm-service/README.md)
- [메뉴 설정](../PMS_IC_FrontEnd_v1.2/src/config/menuConfig.ts)
