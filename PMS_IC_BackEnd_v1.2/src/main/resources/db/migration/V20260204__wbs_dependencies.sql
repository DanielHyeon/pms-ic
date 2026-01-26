-- WBS Dependencies table for predecessor/successor relationships
-- This enables Gantt chart dependency visualization

CREATE TABLE IF NOT EXISTS project.wbs_dependencies (
    id VARCHAR(36) PRIMARY KEY,

    -- Source item (predecessor)
    predecessor_type VARCHAR(20) NOT NULL,  -- 'GROUP', 'ITEM', 'TASK'
    predecessor_id VARCHAR(36) NOT NULL,

    -- Target item (successor)
    successor_type VARCHAR(20) NOT NULL,    -- 'GROUP', 'ITEM', 'TASK'
    successor_id VARCHAR(36) NOT NULL,

    -- Dependency type (Finish-to-Start, Start-to-Start, etc.)
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',

    -- Lag time in days (can be negative for lead time)
    lag_days INTEGER DEFAULT 0,

    -- Project ID for efficient filtering
    project_id VARCHAR(50) NOT NULL,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),

    -- Prevent duplicate dependencies
    CONSTRAINT uk_wbs_dependency UNIQUE (predecessor_id, successor_id),

    -- Foreign key to project
    CONSTRAINT fk_wbs_dependency_project
        FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_wbs_dep_predecessor ON project.wbs_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_successor ON project.wbs_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_project ON project.wbs_dependencies(project_id);

COMMENT ON TABLE project.wbs_dependencies IS 'WBS item dependencies (predecessor/successor relationships)';
COMMENT ON COLUMN project.wbs_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';

-- Insert sample dependencies for demo project
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
SELECT
    gen_random_uuid()::text,
    'ITEM',
    wi1.id,
    'ITEM',
    wi2.id,
    'FS',
    0,
    p.project_id,
    'system'
FROM project.wbs_items wi1
JOIN project.wbs_items wi2 ON wi1.group_id = wi2.group_id AND wi1.order_num + 1 = wi2.order_num
JOIN project.phases p ON wi1.phase_id = p.id
WHERE wi1.order_num < 3
LIMIT 5
ON CONFLICT DO NOTHING;
