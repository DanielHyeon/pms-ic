-- Add parent_id column to phases table for hierarchical structure
ALTER TABLE project.phases ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36) REFERENCES project.phases(id) ON DELETE CASCADE;

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_phases_parent_id ON project.phases(parent_id);

-- Insert methodology sub-phases under "AI 모델 개발" (phase-001-03)
INSERT INTO project.phases (id, project_id, parent_id, name, order_num, status, gate_status, start_date, end_date, progress, description, track_type, created_at, updated_at)
VALUES
    ('phase-001-03-01', 'proj-001', 'phase-001-03', '1단계: 업무 현황 진단/분석', 1, 'COMPLETED', 'APPROVED', '2025-01-02', '2025-02-15', 100, '지급심사 프로세스 현황 파악 및 AI 적용 타당성 검토', 'AI', NOW(), NOW()),
    ('phase-001-03-02', 'proj-001', 'phase-001-03', '2단계: 데이터 수집/정제', 2, 'COMPLETED', 'APPROVED', '2025-02-16', '2025-04-30', 100, '데이터 수집, 정제, 라벨링 및 피처 엔지니어링', 'AI', NOW(), NOW()),
    ('phase-001-03-03', 'proj-001', 'phase-001-03', '3단계: AI모델 설계/학습', 3, 'IN_PROGRESS', 'PENDING', '2025-05-01', '2025-08-31', 85, 'AI 모델 설계, 학습, 평가 및 하이브리드 로직 구축', 'AI', NOW(), NOW()),
    ('phase-001-03-04', 'proj-001', 'phase-001-03', '4단계: 업무시스템 연동/운영 자동화', 4, 'NOT_STARTED', NULL, '2025-09-01', '2025-10-31', 0, '기존 업무시스템과 AI 통합 및 MLOps 구축', 'AI', NOW(), NOW()),
    ('phase-001-03-05', 'proj-001', 'phase-001-03', '5단계: 효과 검증/운영고도화', 5, 'NOT_STARTED', NULL, '2025-11-01', '2025-11-30', 0, 'PoC 검증, 성능 평가 및 지속적 개선', 'AI', NOW(), NOW()),
    ('phase-001-03-06', 'proj-001', 'phase-001-03', '6단계: 조직/프로세스 변화관리', 6, 'NOT_STARTED', NULL, '2025-12-01', '2025-12-31', 0, '교육, 가이드라인, AI 거버넌스 체계 구축', 'AI', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;
