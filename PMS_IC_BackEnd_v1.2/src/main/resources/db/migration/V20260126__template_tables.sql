-- Template Tables Migration
-- Version: 20260126
-- Description: Create Template tables for Phase Template System (TemplateSet, PhaseTemplate, WbsGroupTemplate, WbsItemTemplate)

-- ============================================
-- 1. Template Sets Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.template_sets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    version VARCHAR(20) DEFAULT '1.0',
    is_default BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uk_template_set_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_template_sets_category ON project.template_sets(category);
CREATE INDEX IF NOT EXISTS idx_template_sets_status ON project.template_sets(status);
CREATE INDEX IF NOT EXISTS idx_template_sets_is_default ON project.template_sets(is_default);

COMMENT ON TABLE project.template_sets IS 'Template Set - Container for Phase/WBS templates';
COMMENT ON COLUMN project.template_sets.category IS 'INSURANCE_DEVELOPMENT, INSURANCE_MAINTENANCE, SI_PROJECT, AI_PROJECT, CUSTOM';
COMMENT ON COLUMN project.template_sets.status IS 'ACTIVE, INACTIVE, ARCHIVED';
COMMENT ON COLUMN project.template_sets.is_default IS 'Whether this is the default template set for its category';


-- ============================================
-- 2. Phase Templates Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.phase_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_set_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_duration_days INTEGER,
    color VARCHAR(20),
    track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phase_template_set FOREIGN KEY (template_set_id)
        REFERENCES project.template_sets(id) ON DELETE CASCADE,
    CONSTRAINT uk_template_phase_order UNIQUE (template_set_id, relative_order)
);

CREATE INDEX IF NOT EXISTS idx_phase_templates_template_set_id ON project.phase_templates(template_set_id);
CREATE INDEX IF NOT EXISTS idx_phase_templates_order ON project.phase_templates(relative_order);

COMMENT ON TABLE project.phase_templates IS 'Phase Template - Phase definition within a Template Set';
COMMENT ON COLUMN project.phase_templates.relative_order IS 'Order within the template set (0-indexed)';
COMMENT ON COLUMN project.phase_templates.default_duration_days IS 'Default duration for this phase when template is applied';
COMMENT ON COLUMN project.phase_templates.track_type IS 'AI, SI, COMMON - Track type for multi-track projects';


-- ============================================
-- 3. WBS Group Templates Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_group_templates (
    id VARCHAR(36) PRIMARY KEY,
    phase_template_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_weight INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbs_group_template_phase FOREIGN KEY (phase_template_id)
        REFERENCES project.phase_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_phase_template_wbs_group_order UNIQUE (phase_template_id, relative_order)
);

CREATE INDEX IF NOT EXISTS idx_wbs_group_templates_phase_template_id ON project.wbs_group_templates(phase_template_id);
CREATE INDEX IF NOT EXISTS idx_wbs_group_templates_order ON project.wbs_group_templates(relative_order);

COMMENT ON TABLE project.wbs_group_templates IS 'WBS Group Template - WBS Group definition within a Phase Template';
COMMENT ON COLUMN project.wbs_group_templates.default_weight IS 'Default weight for progress calculation';


-- ============================================
-- 4. WBS Item Templates Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_item_templates (
    id VARCHAR(36) PRIMARY KEY,
    group_template_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_weight INTEGER DEFAULT 100,
    estimated_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbs_item_template_group FOREIGN KEY (group_template_id)
        REFERENCES project.wbs_group_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_group_template_wbs_item_order UNIQUE (group_template_id, relative_order)
);

CREATE INDEX IF NOT EXISTS idx_wbs_item_templates_group_template_id ON project.wbs_item_templates(group_template_id);
CREATE INDEX IF NOT EXISTS idx_wbs_item_templates_order ON project.wbs_item_templates(relative_order);

COMMENT ON TABLE project.wbs_item_templates IS 'WBS Item Template - WBS Item definition within a WBS Group Template';
COMMENT ON COLUMN project.wbs_item_templates.estimated_hours IS 'Default estimated hours for this item';


-- ============================================
-- 5. WBS Task Templates Table (optional - for detailed templates)
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_task_templates (
    id VARCHAR(36) PRIMARY KEY,
    item_template_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_weight INTEGER DEFAULT 100,
    estimated_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbs_task_template_item FOREIGN KEY (item_template_id)
        REFERENCES project.wbs_item_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_item_template_wbs_task_order UNIQUE (item_template_id, relative_order)
);

CREATE INDEX IF NOT EXISTS idx_wbs_task_templates_item_template_id ON project.wbs_task_templates(item_template_id);
CREATE INDEX IF NOT EXISTS idx_wbs_task_templates_order ON project.wbs_task_templates(relative_order);

COMMENT ON TABLE project.wbs_task_templates IS 'WBS Task Template - WBS Task definition within a WBS Item Template';


-- ============================================
-- 6. Template Application History Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.template_applications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_set_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(36),
    phases_created INTEGER DEFAULT 0,
    wbs_groups_created INTEGER DEFAULT 0,
    wbs_items_created INTEGER DEFAULT 0,
    notes TEXT,
    CONSTRAINT fk_template_application_set FOREIGN KEY (template_set_id)
        REFERENCES project.template_sets(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_application_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_applications_template_set_id ON project.template_applications(template_set_id);
CREATE INDEX IF NOT EXISTS idx_template_applications_project_id ON project.template_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_template_applications_applied_at ON project.template_applications(applied_at);

COMMENT ON TABLE project.template_applications IS 'Audit log for template applications to projects';


-- ============================================
-- 7. Insert Default Insurance Development Template Set
-- ============================================

INSERT INTO project.template_sets (id, name, description, category, status, version, is_default, tags)
VALUES (
    gen_random_uuid()::text,
    '보험 시스템 개발 표준 템플릿',
    '보험 시스템 개발 프로젝트를 위한 표준 Phase 및 WBS 구조',
    'INSURANCE_DEVELOPMENT',
    'ACTIVE',
    '1.0',
    TRUE,
    ARRAY['insurance', 'development', 'standard']
)
ON CONFLICT (name) DO NOTHING;

-- Get the template set ID for subsequent inserts
DO $$
DECLARE
    v_template_set_id VARCHAR(36);
    v_phase1_id VARCHAR(36);
    v_phase2_id VARCHAR(36);
    v_phase3_id VARCHAR(36);
    v_phase4_id VARCHAR(36);
    v_phase5_id VARCHAR(36);
    v_group_id VARCHAR(36);
BEGIN
    -- Get the template set ID
    SELECT id INTO v_template_set_id
    FROM project.template_sets
    WHERE name = '보험 시스템 개발 표준 템플릿';

    IF v_template_set_id IS NOT NULL THEN
        -- Insert Phase Templates
        v_phase1_id := gen_random_uuid()::text;
        v_phase2_id := gen_random_uuid()::text;
        v_phase3_id := gen_random_uuid()::text;
        v_phase4_id := gen_random_uuid()::text;
        v_phase5_id := gen_random_uuid()::text;

        INSERT INTO project.phase_templates (id, template_set_id, name, description, relative_order, default_duration_days, color)
        VALUES
            (v_phase1_id, v_template_set_id, '분석', '요구사항 분석 및 현행 시스템 분석', 0, 30, '#3B82F6'),
            (v_phase2_id, v_template_set_id, '설계', '시스템 설계 및 아키텍처 정의', 1, 30, '#8B5CF6'),
            (v_phase3_id, v_template_set_id, '개발', '시스템 개발 및 단위 테스트', 2, 60, '#10B981'),
            (v_phase4_id, v_template_set_id, '테스트', '통합 테스트 및 사용자 테스트', 3, 30, '#F59E0B'),
            (v_phase5_id, v_template_set_id, '이행', '시스템 배포 및 안정화', 4, 14, '#EF4444')
        ON CONFLICT DO NOTHING;

        -- Insert WBS Group Templates for Phase 1 (분석)
        v_group_id := gen_random_uuid()::text;
        INSERT INTO project.wbs_group_templates (id, phase_template_id, name, description, relative_order, default_weight)
        VALUES
            (v_group_id, v_phase1_id, '요구사항 분석', '비즈니스 요구사항 수집 및 분석', 0, 40),
            (gen_random_uuid()::text, v_phase1_id, '현행 분석', '현행 시스템 및 프로세스 분석', 1, 30),
            (gen_random_uuid()::text, v_phase1_id, '분석서 작성', '분석 산출물 작성', 2, 30)
        ON CONFLICT DO NOTHING;

        -- Insert WBS Item Templates for 요구사항 분석 group
        INSERT INTO project.wbs_item_templates (id, group_template_id, name, description, relative_order, default_weight, estimated_hours)
        VALUES
            (gen_random_uuid()::text, v_group_id, '요구사항 수집', 'RFP 검토 및 인터뷰', 0, 30, 40),
            (gen_random_uuid()::text, v_group_id, '요구사항 정의', '요구사항 명세 작성', 1, 40, 60),
            (gen_random_uuid()::text, v_group_id, '요구사항 검증', '고객 검증 및 확정', 2, 30, 20)
        ON CONFLICT DO NOTHING;

        -- Insert WBS Group Templates for Phase 2 (설계)
        INSERT INTO project.wbs_group_templates (id, phase_template_id, name, description, relative_order, default_weight)
        VALUES
            (gen_random_uuid()::text, v_phase2_id, '아키텍처 설계', '시스템 아키텍처 정의', 0, 35),
            (gen_random_uuid()::text, v_phase2_id, '상세 설계', '상세 설계 및 인터페이스 정의', 1, 45),
            (gen_random_uuid()::text, v_phase2_id, '설계서 작성', '설계 산출물 작성', 2, 20)
        ON CONFLICT DO NOTHING;

        -- Insert WBS Group Templates for Phase 3 (개발)
        INSERT INTO project.wbs_group_templates (id, phase_template_id, name, description, relative_order, default_weight)
        VALUES
            (gen_random_uuid()::text, v_phase3_id, '공통 모듈 개발', '공통 기능 및 프레임워크 개발', 0, 25),
            (gen_random_uuid()::text, v_phase3_id, '업무 모듈 개발', '업무 기능 개발', 1, 50),
            (gen_random_uuid()::text, v_phase3_id, '단위 테스트', '개발 단위 테스트 수행', 2, 25)
        ON CONFLICT DO NOTHING;

        -- Insert WBS Group Templates for Phase 4 (테스트)
        INSERT INTO project.wbs_group_templates (id, phase_template_id, name, description, relative_order, default_weight)
        VALUES
            (gen_random_uuid()::text, v_phase4_id, '통합 테스트', '시스템 통합 테스트', 0, 40),
            (gen_random_uuid()::text, v_phase4_id, '사용자 테스트', 'UAT 수행', 1, 35),
            (gen_random_uuid()::text, v_phase4_id, '결함 관리', '결함 수정 및 재테스트', 2, 25)
        ON CONFLICT DO NOTHING;

        -- Insert WBS Group Templates for Phase 5 (이행)
        INSERT INTO project.wbs_group_templates (id, phase_template_id, name, description, relative_order, default_weight)
        VALUES
            (gen_random_uuid()::text, v_phase5_id, '이행 준비', '이행 계획 및 준비', 0, 30),
            (gen_random_uuid()::text, v_phase5_id, '시스템 배포', '운영 환경 배포', 1, 40),
            (gen_random_uuid()::text, v_phase5_id, '안정화', '초기 안정화 지원', 2, 30)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
