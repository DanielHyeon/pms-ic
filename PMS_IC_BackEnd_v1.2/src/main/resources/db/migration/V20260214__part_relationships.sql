-- Part-to-Part Relationships Table Migration
-- Version: 20260214
-- Description: Create part_relationships table for cross-Part collaboration
-- This enables:
--   - DEPENDS_ON: Part A depends on Part B's work (upstream/downstream)
--   - COLLABORATES_WITH: Parts working together (bidirectional)

-- Part Relationships Table
CREATE TABLE IF NOT EXISTS project.part_relationships (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    source_part_id VARCHAR(50) NOT NULL,
    target_part_id VARCHAR(50) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,  -- DEPENDS_ON, COLLABORATES_WITH
    description TEXT,
    -- For DEPENDS_ON: what deliverable/output does source need from target?
    dependency_description TEXT,
    -- Strength/importance of the relationship
    strength VARCHAR(20) DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, CRITICAL
    -- Active status (can be temporarily disabled)
    active BOOLEAN DEFAULT TRUE,
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    -- Constraints
    CONSTRAINT fk_part_rel_source FOREIGN KEY (source_part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE,
    CONSTRAINT fk_part_rel_target FOREIGN KEY (target_part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE,
    -- Prevent self-reference
    CONSTRAINT chk_no_self_relation CHECK (source_part_id <> target_part_id),
    -- Unique relationship per pair and type
    CONSTRAINT uq_part_relationship UNIQUE (source_part_id, target_part_id, relationship_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_part_rel_source ON project.part_relationships(source_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_target ON project.part_relationships(target_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_type ON project.part_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_part_rel_active ON project.part_relationships(active);
CREATE INDEX IF NOT EXISTS idx_part_rel_updated ON project.part_relationships(updated_at);

-- Comments
COMMENT ON TABLE project.part_relationships IS 'Cross-Part relationships for dependency and collaboration tracking';
COMMENT ON COLUMN project.part_relationships.relationship_type IS 'DEPENDS_ON (upstream/downstream), COLLABORATES_WITH (bidirectional)';
COMMENT ON COLUMN project.part_relationships.strength IS 'Relationship importance: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN project.part_relationships.dependency_description IS 'For DEPENDS_ON: describes what output/deliverable is needed';

-- Sample data for demonstration (using existing Parts)
-- This will only insert if the Parts exist
INSERT INTO project.part_relationships (id, source_part_id, target_part_id, relationship_type, description, strength)
SELECT
    gen_random_uuid()::VARCHAR,
    p1.id,
    p2.id,
    'COLLABORATES_WITH',
    'Cross-team collaboration for integration',
    'MEDIUM'
FROM project.parts p1
JOIN project.parts p2 ON p1.project_id = p2.project_id AND p1.id < p2.id
WHERE p1.status = 'ACTIVE' AND p2.status = 'ACTIVE'
LIMIT 3
ON CONFLICT DO NOTHING;
