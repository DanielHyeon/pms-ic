-- V20260216: Add AI/SI track weights to projects table for weighted progress calculation
-- Default: AI 70% / SI 30% / Common 0%

-- Add weight columns to projects table
ALTER TABLE project.projects
ADD COLUMN IF NOT EXISTS ai_weight DECIMAL(5,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS si_weight DECIMAL(5,2) DEFAULT 0.30;

-- Add comments for documentation
COMMENT ON COLUMN project.projects.ai_weight IS 'AI track weight for weighted progress calculation (0.00-1.00). Default: 0.70 (70%)';
COMMENT ON COLUMN project.projects.si_weight IS 'SI track weight for weighted progress calculation (0.00-1.00). Default: 0.30 (30%)';

-- Note: Common weight is calculated as: 1 - ai_weight - si_weight
-- Constraint to ensure weights sum to 1.0 or less
ALTER TABLE project.projects
ADD CONSTRAINT chk_track_weights CHECK (ai_weight >= 0 AND si_weight >= 0 AND (ai_weight + si_weight) <= 1.00);

-- Update existing projects with default weights
UPDATE project.projects
SET ai_weight = 0.70, si_weight = 0.30
WHERE ai_weight IS NULL OR si_weight IS NULL;
