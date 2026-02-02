-- Part Change History Table Migration
-- Version: 20260215
-- Description: Track Part assignment changes for entities (Feature, UserStory, Task)
-- This enables:
--   - Audit trail when work items move between Parts
--   - Time-sliced RAG queries ("What was assigned to Part X last month?")
--   - Part workload analysis over time

-- Part Change History Table
CREATE TABLE IF NOT EXISTS project.part_change_history (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    -- Entity being tracked
    entity_type VARCHAR(50) NOT NULL,  -- FEATURE, USER_STORY, TASK
    entity_id VARCHAR(50) NOT NULL,
    entity_name VARCHAR(500),  -- Denormalized for quick reference
    -- Part assignment change
    previous_part_id VARCHAR(50),  -- NULL if first assignment
    previous_part_name VARCHAR(200),  -- Denormalized
    new_part_id VARCHAR(50) NOT NULL,  -- GLOBAL or actual Part ID
    new_part_name VARCHAR(200),  -- Denormalized
    -- Context
    project_id VARCHAR(50) NOT NULL,
    change_reason TEXT,  -- Optional: why was this moved?
    -- Who made the change
    changed_by_user_id VARCHAR(50),
    changed_by_user_name VARCHAR(100),
    -- Effective date range for time-sliced queries
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP,  -- NULL means currently active
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    CONSTRAINT fk_part_history_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_part_history_prev_part FOREIGN KEY (previous_part_id)
        REFERENCES project.parts(id) ON DELETE SET NULL,
    CONSTRAINT chk_valid_entity_type CHECK (entity_type IN ('FEATURE', 'USER_STORY', 'TASK'))
);

-- Note: new_part_id does not have FK constraint because it can be 'GLOBAL'

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_part_history_entity ON project.part_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_part_history_new_part ON project.part_change_history(new_part_id);
CREATE INDEX IF NOT EXISTS idx_part_history_prev_part ON project.part_change_history(previous_part_id);
CREATE INDEX IF NOT EXISTS idx_part_history_project ON project.part_change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_part_history_effective ON project.part_change_history(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_part_history_created ON project.part_change_history(created_at);

-- Composite index for time-sliced queries
CREATE INDEX IF NOT EXISTS idx_part_history_part_time
    ON project.part_change_history(new_part_id, effective_from, effective_to);

-- Comments
COMMENT ON TABLE project.part_change_history IS 'Audit trail for Part assignment changes on Features, UserStories, and Tasks';
COMMENT ON COLUMN project.part_change_history.entity_type IS 'Type of entity: FEATURE, USER_STORY, TASK';
COMMENT ON COLUMN project.part_change_history.effective_from IS 'When this Part assignment became active';
COMMENT ON COLUMN project.part_change_history.effective_to IS 'When this Part assignment ended (NULL = current)';
COMMENT ON COLUMN project.part_change_history.new_part_id IS 'The Part ID or GLOBAL for project-wide visibility';

-- Function to get effective Part for an entity at a specific point in time
CREATE OR REPLACE FUNCTION project.get_effective_part_id(
    p_entity_type VARCHAR,
    p_entity_id VARCHAR,
    p_as_of TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT new_part_id
        FROM project.part_change_history
        WHERE entity_type = p_entity_type
          AND entity_id = p_entity_id
          AND effective_from <= p_as_of
          AND (effective_to IS NULL OR effective_to > p_as_of)
        ORDER BY effective_from DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION project.get_effective_part_id IS 'Get the effective Part ID for an entity at a specific point in time';

-- View for current Part assignments (convenience view)
CREATE OR REPLACE VIEW project.current_part_assignments AS
SELECT
    entity_type,
    entity_id,
    entity_name,
    new_part_id AS current_part_id,
    new_part_name AS current_part_name,
    project_id,
    effective_from AS assigned_at,
    changed_by_user_name AS assigned_by
FROM project.part_change_history
WHERE effective_to IS NULL
ORDER BY effective_from DESC;

COMMENT ON VIEW project.current_part_assignments IS 'Current Part assignments for all tracked entities';
