// Preset (ViewMode) policies — maps roles to their default "lens"
// and defines the preset hierarchy for transition rules.
//
// A Preset is a *lens* (UI rendering policy), NOT a role.
// Switching to a higher-tier preset forces read-only mode;
// capabilities never escalate through preset changes.

import { ViewModePreset } from '../types/menuOntology';

/**
 * Maps each system/project role to its default ViewMode preset.
 * When a user first enters the app (or resets), this preset is applied.
 */
export const roleDefaultPreset: Record<string, ViewModePreset> = {
  SPONSOR: 'EXEC_SUMMARY',
  PMO_HEAD: 'PMO_CONTROL',
  PM: 'PM_WORK',
  DEVELOPER: 'DEV_EXECUTION',
  QA: 'DEV_EXECUTION',
  BUSINESS_ANALYST: 'PM_WORK',
  AUDITOR: 'AUDIT_EVIDENCE',
  ADMIN: 'PMO_CONTROL',
  MEMBER: 'DEV_EXECUTION',
};

/**
 * Preset hierarchy ordered from highest authority to lowest.
 * Used to determine transition direction:
 *   - Moving toward index 0 = "upward" = read-only enforced
 *   - Moving toward higher index = "downward" = full capability within user's own caps
 *   - AUDIT_EVIDENCE is locked — no transitions allowed from it
 */
export const presetHierarchy: ViewModePreset[] = [
  'EXEC_SUMMARY',
  'PMO_CONTROL',
  'PM_WORK',
  'DEV_EXECUTION',
  'CUSTOMER_APPROVAL',
  'AUDIT_EVIDENCE',
];
