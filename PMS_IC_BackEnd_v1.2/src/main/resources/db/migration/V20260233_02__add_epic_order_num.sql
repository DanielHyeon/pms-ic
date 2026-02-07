-- Phase 2-2: Add order_num column to epics for frontend sorting

ALTER TABLE project.epics
ADD COLUMN IF NOT EXISTS order_num INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_epics_project_order
    ON project.epics(project_id, order_num, updated_at);
