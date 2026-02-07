-- Composite indexes for WBS tree performance optimization.
-- Covers JOIN + ORDER BY patterns used by findByProjectIdOrdered() queries.

-- phases: project_id + order_num (used in all project-level WBS queries)
CREATE INDEX IF NOT EXISTS idx_phases_project_order
    ON project.phases (project_id, order_num);

-- wbs_groups: phase_id + order_num (JOIN phases → groups + ORDER BY)
CREATE INDEX IF NOT EXISTS idx_wbs_groups_phase_order
    ON project.wbs_groups (phase_id, order_num);

-- wbs_items: group_id + order_num (JOIN groups → items + ORDER BY)
CREATE INDEX IF NOT EXISTS idx_wbs_items_group_order
    ON project.wbs_items (group_id, order_num);

-- wbs_items: phase_id + order_num (phase-level item queries)
CREATE INDEX IF NOT EXISTS idx_wbs_items_phase_order
    ON project.wbs_items (phase_id, order_num);

-- wbs_tasks: item_id + order_num (JOIN items → tasks + ORDER BY)
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item_order
    ON project.wbs_tasks (item_id, order_num);

-- wbs_tasks: group_id + order_num (group-level task queries)
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_group_order
    ON project.wbs_tasks (group_id, order_num);

-- wbs_tasks: phase_id + order_num (phase-level task queries)
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_order
    ON project.wbs_tasks (phase_id, order_num);
