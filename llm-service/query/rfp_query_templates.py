"""
SQL Query Templates for RFP Metrics.

Used by the backend for RFP-related aggregation queries
when the LLM service needs to fetch RFP context from the database.
"""

from __future__ import annotations

RFP_ORIGIN_SUMMARY = """
SELECT
    op.origin_type,
    COUNT(DISTINCT r.id) as active_rfp_count,
    COUNT(DISTINCT req.id) as total_requirements,
    COUNT(DISTINCT CASE WHEN req.status = 'APPROVED' THEN req.id END) as confirmed_requirements
FROM rfp.origin_policies op
LEFT JOIN project.rfps r ON r.project_id = op.project_id
LEFT JOIN project.requirements req ON req.project_id = op.project_id
WHERE op.project_id = %(project_id)s
GROUP BY op.origin_type
"""

RFP_EXTRACTION_STATS = """
SELECT
    er.id as run_id,
    er.model_name,
    er.status,
    er.total_candidates,
    er.ambiguity_count,
    er.avg_confidence,
    er.started_at,
    er.finished_at
FROM rfp.rfp_extraction_runs er
WHERE er.rfp_id = %(rfp_id)s
ORDER BY er.created_at DESC
LIMIT 10
"""

RFP_REQUIREMENTS_BY_CATEGORY = """
SELECT
    req.category,
    req.priority_hint,
    COUNT(*) as count,
    AVG(req.confidence) as avg_confidence
FROM rfp.extraction_candidates req
WHERE req.run_id = %(run_id)s
GROUP BY req.category, req.priority_hint
ORDER BY req.category, req.priority_hint
"""

RFP_AMBIGUOUS_REQUIREMENTS = """
SELECT
    req.req_key,
    req.text,
    req.category,
    req.confidence,
    req.ambiguity_questions
FROM rfp.extraction_candidates req
WHERE req.run_id = %(run_id)s
  AND req.is_ambiguous = TRUE
ORDER BY req.confidence ASC
"""
