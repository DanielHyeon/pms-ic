-- ============================================================
-- Phase G: Report System - Template Tables
-- Migration: V20260128__report_templates.sql
-- Description: Report templates and sections
-- ============================================================

-- ============================================================
-- 1. Report Templates Table
-- ============================================================
CREATE TABLE report.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic information
    name VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(30) NOT NULL,      -- WEEKLY, MONTHLY, PROJECT

    -- Scope/Ownership
    scope VARCHAR(30) NOT NULL,            -- SYSTEM, ORGANIZATION, PERSONAL
    organization_id VARCHAR(50),
    created_by VARCHAR(50),

    -- Target
    target_roles TEXT[],
    target_report_scopes TEXT[],           -- PROJECT, TEAM, INDIVIDUAL

    -- Template structure
    structure JSONB NOT NULL,

    -- Styling
    styling JSONB,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version INT DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_scope ON report.report_templates(scope);
CREATE INDEX idx_templates_type ON report.report_templates(report_type);
CREATE INDEX idx_templates_creator ON report.report_templates(created_by);
CREATE INDEX idx_templates_active ON report.report_templates(is_active) WHERE is_active = true;

-- ============================================================
-- 2. Template Sections Table
-- ============================================================
CREATE TABLE report.template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report.report_templates(id) ON DELETE CASCADE,

    section_key VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    section_type VARCHAR(30) NOT NULL,     -- AI_GENERATED, DATA_TABLE, DATA_LIST, MANUAL_INPUT, METRIC_CHART

    -- Configuration
    config JSONB NOT NULL,

    is_required BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sections_template ON report.template_sections(template_id);
CREATE INDEX idx_sections_order ON report.template_sections(template_id, display_order);

-- ============================================================
-- 3. User Template Preferences Table
-- ============================================================
CREATE TABLE report.user_template_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,

    preferred_template_id UUID REFERENCES report.report_templates(id) ON DELETE SET NULL,
    section_overrides JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, report_type)
);

CREATE INDEX idx_user_prefs_user ON report.user_template_preferences(user_id);

-- ============================================================
-- 4. Default System Templates
-- ============================================================

-- Developer Weekly Report Template
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure)
VALUES
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
);

-- PM Weekly Report Template
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure, is_default)
VALUES
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
    }'::jsonb,
    true
);

-- Team Lead Weekly Report Template
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure)
VALUES
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

-- Sponsor Monthly Report Template
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure)
VALUES
(
    'a1b2c3d4-0001-0001-0001-000000000004',
    '월간 경영 보고서 (스폰서)',
    '스폰서/경영진용 월간 프로젝트 현황 보고서',
    'MONTHLY',
    'SYSTEM',
    ARRAY['sponsor', 'pmo_head'],
    ARRAY['PROJECT'],
    '{
        "header": {
            "showProjectName": true,
            "showPeriod": true,
            "showAuthor": true,
            "titleTemplate": "{{project.name}} {{month}}월 현황 보고"
        },
        "sections": [
            {
                "key": "executive_summary",
                "title": "1. Executive Summary",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "경영진 관점에서 이번 달 프로젝트 핵심 성과와 이슈를 요약해주세요. 전략적 의사결정에 필요한 정보를 포함하세요.",
                    "maxLength": 1000
                },
                "required": true,
                "order": 1
            },
            {
                "key": "kpi_trends",
                "title": "2. KPI 추이",
                "type": "METRIC_CHART",
                "config": {
                    "metrics": ["completion_rate", "velocity", "quality_score", "budget_utilization"],
                    "chartType": "trend",
                    "period": "3months"
                },
                "required": true,
                "order": 2
            },
            {
                "key": "milestone_status",
                "title": "3. 마일스톤 현황",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "milestones.status",
                    "columns": ["name", "plannedDate", "actualDate", "status", "variance"]
                },
                "required": true,
                "order": 3
            },
            {
                "key": "budget_analysis",
                "title": "4. 예산 분석",
                "type": "METRIC_CHART",
                "config": {
                    "metrics": ["budget_planned", "budget_actual", "budget_forecast"],
                    "chartType": "bar"
                },
                "required": true,
                "order": 4
            },
            {
                "key": "strategic_risks",
                "title": "5. 전략적 리스크",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "risks.strategic",
                    "fields": ["title", "impact", "probability", "mitigation"]
                },
                "required": true,
                "order": 5
            },
            {
                "key": "next_month_focus",
                "title": "6. 다음 달 중점 사항",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "다음 달 핵심 목표와 주의해야 할 사항을 정리해주세요."
                },
                "required": true,
                "order": 6
            }
        ],
        "footer": {
            "showGeneratedAt": true,
            "showConfidentialNotice": true,
            "confidentialText": "본 보고서는 내부 경영 자료로 외부 유출을 금합니다."
        }
    }'::jsonb
);

-- BA Requirements Report Template
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure)
VALUES
(
    'a1b2c3d4-0001-0001-0001-000000000005',
    '요구사항 현황 보고서 (BA)',
    '비즈니스 분석가용 요구사항 추적 보고서',
    'WEEKLY',
    'SYSTEM',
    ARRAY['business_analyst', 'pm'],
    ARRAY['PROJECT'],
    '{
        "header": {
            "showProjectName": true,
            "showPeriod": true,
            "showAuthor": true,
            "titleTemplate": "{{project.name}} 요구사항 현황 보고"
        },
        "sections": [
            {
                "key": "requirement_summary",
                "title": "1. 요구사항 현황 요약",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "이번 주 요구사항 정의 및 변경 현황을 요약해주세요."
                },
                "required": true,
                "order": 1
            },
            {
                "key": "requirements_status",
                "title": "2. 요구사항 상태",
                "type": "METRIC_CHART",
                "config": {
                    "metrics": ["total_requirements", "approved", "in_review", "draft"],
                    "chartType": "pie"
                },
                "required": true,
                "order": 2
            },
            {
                "key": "story_mapping",
                "title": "3. 스토리 매핑 현황",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "requirements.mapping",
                    "columns": ["requirement", "epic", "stories", "coverage"]
                },
                "required": true,
                "order": 3
            },
            {
                "key": "changes_this_week",
                "title": "4. 금주 변경 사항",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "requirements.changes",
                    "fields": ["requirement", "changeType", "reason", "impact"]
                },
                "required": true,
                "order": 4
            },
            {
                "key": "next_week_plan",
                "title": "5. 차주 계획",
                "type": "MANUAL_INPUT",
                "config": {
                    "placeholder": "다음 주 요구사항 관련 계획을 작성하세요.",
                    "inputType": "textarea"
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

-- QA Test Report Template
INSERT INTO report.report_templates
(id, name, description, report_type, scope, target_roles, target_report_scopes, structure)
VALUES
(
    'a1b2c3d4-0001-0001-0001-000000000006',
    '테스트 현황 보고서 (QA)',
    'QA용 테스트 현황 및 품질 보고서',
    'WEEKLY',
    'SYSTEM',
    ARRAY['qa'],
    ARRAY['INDIVIDUAL', 'TEAM'],
    '{
        "header": {
            "showProjectName": true,
            "showPeriod": true,
            "showAuthor": true,
            "titleTemplate": "{{project.name}} 테스트 현황 보고"
        },
        "sections": [
            {
                "key": "test_summary",
                "title": "1. 테스트 요약",
                "type": "AI_GENERATED",
                "config": {
                    "prompt": "이번 주 테스트 진행 현황과 주요 발견 사항을 요약해주세요."
                },
                "required": true,
                "order": 1
            },
            {
                "key": "test_metrics",
                "title": "2. 테스트 지표",
                "type": "METRIC_CHART",
                "config": {
                    "metrics": ["test_cases_total", "passed", "failed", "blocked", "coverage"],
                    "chartType": "dashboard"
                },
                "required": true,
                "order": 2
            },
            {
                "key": "bugs_found",
                "title": "3. 발견된 버그",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "bugs.found",
                    "columns": ["title", "severity", "feature", "status"]
                },
                "required": true,
                "order": 3
            },
            {
                "key": "bugs_verified",
                "title": "4. 검증 완료 버그",
                "type": "DATA_TABLE",
                "config": {
                    "dataSource": "bugs.verified",
                    "columns": ["title", "severity", "verifiedAt"]
                },
                "required": true,
                "order": 4
            },
            {
                "key": "quality_risk",
                "title": "5. 품질 리스크",
                "type": "MANUAL_INPUT",
                "config": {
                    "placeholder": "현재 파악된 품질 리스크와 대응 방안을 작성하세요.",
                    "inputType": "textarea"
                },
                "required": false,
                "order": 5
            },
            {
                "key": "next_week_plan",
                "title": "6. 차주 테스트 계획",
                "type": "DATA_LIST",
                "config": {
                    "dataSource": "testPlans.next",
                    "fields": ["area", "testType", "priority"]
                },
                "required": true,
                "order": 6
            }
        ],
        "footer": {
            "showGeneratedAt": true
        }
    }'::jsonb
);

-- ============================================================
-- 5. Update triggers
-- ============================================================
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report.report_templates
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();

CREATE TRIGGER update_user_template_preferences_updated_at
    BEFORE UPDATE ON report.user_template_preferences
    FOR EACH ROW
    EXECUTE FUNCTION report.update_updated_at_column();
