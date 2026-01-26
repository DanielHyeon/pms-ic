-- WBS Task Mock Dependencies for Critical Path Testing
-- Version: 20260207
-- Description: Add task-level dependencies to test Critical Path Method (CPM) calculation

-- ============================================
-- 1. Clean up auto-generated dependencies (optional - reset for clean test)
-- ============================================
-- DELETE FROM project.wbs_dependencies WHERE created_by = 'system';

-- ============================================
-- 2. Project 1 Phase 1: Requirements Analysis Dependencies
-- Critical Path: RFP Receipt -> RFP Analysis -> Requirements Extraction -> Functional Classification
-- ============================================

-- Chain: RFP Receipt -> RFP Structure Analysis
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-001', 'TASK', 'wt-001-01-01-01-01', 'TASK', 'wt-001-01-01-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: RFP Structure Analysis -> Requirements Extraction
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-002', 'TASK', 'wt-001-01-01-01-02', 'TASK', 'wt-001-01-01-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: Requirements Extraction -> Functional Classification
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-003', 'TASK', 'wt-001-01-01-01-03', 'TASK', 'wt-001-01-01-02-01', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: Functional Classification -> Priority Assignment
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-004', 'TASK', 'wt-001-01-01-02-01', 'TASK', 'wt-001-01-01-02-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: Priority Assignment -> Documentation (Parallel path merge)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-005', 'TASK', 'wt-001-01-01-02-02', 'TASK', 'wt-001-01-01-02-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Project 1 Phase 2: System Design Dependencies
-- Critical Path: Tech Investigation -> Tech Comparison -> Final Selection -> Component Definition
-- ============================================

-- Tech Stack Selection Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-006', 'TASK', 'wt-001-02-01-01-01', 'TASK', 'wt-001-02-01-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-007', 'TASK', 'wt-001-02-01-01-02', 'TASK', 'wt-001-02-01-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Tech Selection -> System Architecture (Critical)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-008', 'TASK', 'wt-001-02-01-01-03', 'TASK', 'wt-001-02-01-02-01', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- System Architecture Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-009', 'TASK', 'wt-001-02-01-02-01', 'TASK', 'wt-001-02-01-02-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-010', 'TASK', 'wt-001-02-01-02-02', 'TASK', 'wt-001-02-01-02-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-011', 'TASK', 'wt-001-02-01-02-03', 'TASK', 'wt-001-02-01-02-04', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Infrastructure Design Chain (Parallel to System Architecture)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-012', 'TASK', 'wt-001-02-01-03-01', 'TASK', 'wt-001-02-01-03-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-013', 'TASK', 'wt-001-02-01-03-02', 'TASK', 'wt-001-02-01-03-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- System Architecture -> Infrastructure Design (Cross-dependency)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-014', 'TASK', 'wt-001-02-01-02-02', 'TASK', 'wt-001-02-01-03-01', 'SS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ERD Design Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-015', 'TASK', 'wt-001-02-02-01-01', 'TASK', 'wt-001-02-02-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-016', 'TASK', 'wt-001-02-02-01-02', 'TASK', 'wt-001-02-02-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ERD -> Schema Definition
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-017', 'TASK', 'wt-001-02-02-01-03', 'TASK', 'wt-001-02-02-02-01', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Schema Definition Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-018', 'TASK', 'wt-001-02-02-02-01', 'TASK', 'wt-001-02-02-02-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-019', 'TASK', 'wt-001-02-02-02-02', 'TASK', 'wt-001-02-02-02-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- API Specification Chain (Depends on ERD completion)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-020', 'TASK', 'wt-001-02-02-01-03', 'TASK', 'wt-001-02-03-01-01', 'SS', 1, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-021', 'TASK', 'wt-001-02-03-01-01', 'TASK', 'wt-001-02-03-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-022', 'TASK', 'wt-001-02-03-01-02', 'TASK', 'wt-001-02-03-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. Project 2: Mobile App Dependencies
-- Critical Path: App Download -> Feature Analysis -> Comparison Matrix -> Report Research
-- ============================================

-- Competitor App Analysis Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-023', 'TASK', 'wt-002-01-01-01-01', 'TASK', 'wt-002-01-01-01-02', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-024', 'TASK', 'wt-002-01-01-01-02', 'TASK', 'wt-002-01-01-01-03', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Market Trend Research Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-025', 'TASK', 'wt-002-01-01-02-01', 'TASK', 'wt-002-01-01-02-02', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-026', 'TASK', 'wt-002-01-01-02-02', 'TASK', 'wt-002-01-01-02-03', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Competitor Analysis -> Market Trend (Parallel path, can start together)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-027', 'TASK', 'wt-002-01-01-01-03', 'TASK', 'wt-002-01-01-02-03', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Persona Definition Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-028', 'TASK', 'wt-002-01-02-01-01', 'TASK', 'wt-002-01-02-01-02', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Market Research -> Persona (Cross-dependency)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-029', 'TASK', 'wt-002-01-01-02-02', 'TASK', 'wt-002-01-02-01-01', 'SS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Cross-level Dependencies (Item -> Task for complex scenarios)
-- ============================================

-- WbsItem 1.1.3 (Requirements Extraction) -> WbsTask 2.1.1.1 (Tech Investigation)
-- Shows that Phase 1 completion gates Phase 2 start
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-cross-001', 'ITEM', 'wi-001-01-01-03', 'TASK', 'wt-001-02-01-01-01', 'FS', 1, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Summary of Dependencies for Critical Path Testing
-- ============================================
-- Total Task-to-Task dependencies: 27
-- Total Cross-level dependencies: 1
--
-- Dependency Types Used:
-- - FS (Finish-to-Start): 26 - Most common, strict sequencing
-- - SS (Start-to-Start): 3 - Parallel tasks that start together
-- - lag_days = 0: Immediate successor
-- - lag_days = 1: 1 day buffer between tasks
--
-- Critical Paths to Verify:
-- Project 1, Phase 1: wt-001-01-01-01-01 -> wt-001-01-01-01-02 -> wt-001-01-01-01-03 -> wt-001-01-01-02-01
-- Project 1, Phase 2: wt-001-02-01-01-01 -> ... -> wt-001-02-03-01-03
-- Project 2: wt-002-01-01-01-01 -> wt-002-01-01-01-02 -> wt-002-01-01-01-03 -> wt-002-01-01-02-03
--
-- Non-Critical Paths (with Float):
-- - Infrastructure design tasks (parallel to system architecture)
-- - Persona definition tasks (can start with market research)
-- ============================================
