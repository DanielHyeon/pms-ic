import { useState, useCallback } from 'react';
import { ViewModePreset } from '../types/menuOntology';
import { roleDefaultPreset } from '../config/presetPolicies';

/**
 * Manages the active ViewMode preset (lens) for the current session.
 *
 * The preset determines UI density, panel visibility, filters, and
 * suggested actions — but never escalates capabilities.
 *
 * @param userRole - The current user's role key (e.g. "PM", "DEVELOPER")
 * @returns Preset state and transition helpers
 */
export function usePreset(userRole: string) {
  const defaultPreset = roleDefaultPreset[userRole] || 'DEV_EXECUTION';
  const [currentPreset, setCurrentPreset] = useState<ViewModePreset>(defaultPreset);

  const switchPreset = useCallback((preset: ViewModePreset) => {
    setCurrentPreset(preset);
  }, []);

  const resetToDefault = useCallback(() => {
    setCurrentPreset(defaultPreset);
  }, [defaultPreset]);

  return { currentPreset, switchPreset, resetToDefault, defaultPreset };
}
