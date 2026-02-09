"""
SQL Query Templates for AI Briefing Metrics.

Used by g6_ai_briefing workflow to fetch project metrics
when called directly from Flask (not via Spring Boot).
"""

from __future__ import annotations

BRIEFING_OVERDUE_TASKS = """
SELECT t.id, t.title, t.assignee_id,
       COALESCE(u.name, u.username, 'Unassigned') AS assignee_name,
       t.due_date,
       (CURRENT_DATE - t.due_date) AS delay_days
FROM task.tasks t
LEFT JOIN auth.users u ON t.assignee_id = u.id
WHERE t.project_id = %(project_id)s
  AND t.due_date < CURRENT_DATE
  AND t.status NOT IN ('DONE', 'TESTING')
ORDER BY delay_days DESC
"""

BRIEFING_SPRINT_PROGRESS = """
SELECT s.id AS sprint_id, s.name AS sprint_name,
       s.start_date, s.end_date,
       COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) AS completed,
       COUNT(t.id) AS total,
       CASE WHEN COUNT(t.id) > 0
            THEN ROUND(COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::numeric
                       / COUNT(t.id) * 100, 1)
            ELSE 0 END AS progress_pct
FROM task.sprints s
LEFT JOIN task.tasks t ON t.sprint_id = s.id
WHERE s.project_id = %(project_id)s
  AND s.status = 'ACTIVE'
GROUP BY s.id, s.name, s.start_date, s.end_date
LIMIT 1
"""

BRIEFING_ASSIGNEE_WORKLOAD = """
SELECT t.assignee_id,
       COALESCE(u.name, u.username, 'Unknown') AS assignee_name,
       COUNT(*) AS active_tasks
FROM task.tasks t
JOIN auth.users u ON t.assignee_id = u.id
WHERE t.project_id = %(project_id)s
  AND t.status IN ('TODO', 'IN_PROGRESS', 'REVIEW')
  AND t.assignee_id IS NOT NULL
GROUP BY t.assignee_id, u.name, u.username
ORDER BY active_tasks DESC
"""

BRIEFING_OPEN_ISSUES = """
SELECT i.id, i.title, i.priority AS severity, i.status, i.created_at
FROM project.issues i
WHERE i.project_id = %(project_id)s
  AND i.status NOT IN ('CLOSED', 'RESOLVED', 'VERIFIED')
ORDER BY
  CASE i.priority
    WHEN 'CRITICAL' THEN 0
    WHEN 'HIGH' THEN 1
    WHEN 'MEDIUM' THEN 2
    ELSE 3
  END
"""
