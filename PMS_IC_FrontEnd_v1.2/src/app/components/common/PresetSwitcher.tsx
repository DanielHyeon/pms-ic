import { Eye } from 'lucide-react';
import { ViewModePreset } from '../../../types/menuOntology';
import { cn } from '../ui/utils';

const PRESET_META: Record<ViewModePreset, { label: string; short: string; color: string }> = {
  EXEC_SUMMARY: { label: 'Executive Summary', short: 'EXEC', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  PMO_CONTROL: { label: 'PMO Control', short: 'PMO', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  PM_WORK: { label: 'PM Work', short: 'PM', color: 'bg-green-100 text-green-800 border-green-300' },
  DEV_EXECUTION: { label: 'Dev Execution', short: 'DEV', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  CUSTOMER_APPROVAL: { label: 'Customer Approval', short: 'CUST', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  AUDIT_EVIDENCE: { label: 'Audit Evidence', short: 'AUDIT', color: 'bg-red-100 text-red-800 border-red-300' },
};

interface PresetSwitcherProps {
  currentPreset: ViewModePreset;
  availablePresets?: ViewModePreset[];
  onSwitch: (preset: ViewModePreset) => void;
  compact?: boolean;
}

export function PresetSwitcher({
  currentPreset,
  availablePresets,
  onSwitch,
  compact = false,
}: PresetSwitcherProps) {
  const presets = availablePresets || (Object.keys(PRESET_META) as ViewModePreset[]);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Eye size={14} className="text-gray-500" />
        <div className="flex gap-1">
          {presets.map((preset) => {
            const meta = PRESET_META[preset];
            const isActive = preset === currentPreset;
            return (
              <button
                key={preset}
                onClick={() => onSwitch(preset)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded border transition-all',
                  isActive ? meta.color + ' font-semibold' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                )}
                title={meta.label}
              >
                {meta.short}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Eye size={14} />
        View
      </span>
      <div className="flex gap-1">
        {presets.map((preset) => {
          const meta = PRESET_META[preset];
          const isActive = preset === currentPreset;
          return (
            <button
              key={preset}
              onClick={() => onSwitch(preset)}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-all',
                isActive ? meta.color + ' font-semibold shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
