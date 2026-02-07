# Data Quality Rules Definition

## Warning Types

| Type | Severity | Description | Threshold | Category |
|---|---|---|---|---|
| LOW_DATA_QUALITY | DANGER | Total quality score below threshold | totalScore < 50 | score |
| LOW_REQUIREMENT_TRACE | WARNING | Requirement traceability insufficient | < 80% | coverage |
| LOW_STORY_DECOMPOSITION | WARNING | Story decomposition rate insufficient | < 70% | coverage |
| LOW_EPIC_COVERAGE | WARNING | Too many stories without epic | < 80% | coverage |
| LOW_PART_ASSIGNMENT | WARNING | Too many stories without part | < 90% | readiness |
| HIGH_REVIEW_DWELL | WARNING | REVIEW dwell time excessive (bottleneck) | > 30% | operational |
| LOW_SPRINT_COMPLETION | WARNING | Sprint completion rate insufficient | < 70% | operational |
| UNASSIGNED_PART | INFO | Individual story missing part assignment | - | readiness |
| INVALID_REFERENCE | CRITICAL | Reference to non-existent ID | > 0 count | integrity |
| MISMATCH_DETECTED | CRITICAL | Data mismatch detected | > 0 count | integrity |

## Score Calculation

```
integrityScore = max(0, 100 - (invalid_ref_count × 10) - (mismatch_count × 10))
readinessScore = max(0, 100 - (null_epic_count × 5) - (null_part_count × 5)
                              - (unlinked_story_count × 5) - (unlinked_backlog_count × 3))
totalScore = (integrityScore × 0.6) + (readinessScore × 0.4)
```

## CI Gate Integration (Phase 4)

| Condition | Action |
|---|---|
| integrityScore < 80 | HARD FAIL |
| readinessScore < 50 | WARNING |
| totalScore < 30 | HARD FAIL |
