import { useMemo } from 'react';
import { cn } from '../ui/utils';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { Phase } from './types';

// ─── Health status types ─────────────────────────────────

type HealthStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'PLANNED';

// ─── Health derivation logic ─────────────────────────────

/**
 * Derive health status from phase data.
 *
 * - status === 'completed' -> NORMAL
 * - progress >= 90% of planned -> NORMAL
 * - progress between 70-89% of planned -> WARNING
 * - progress < 70% of planned -> CRITICAL
 * - status === 'pending' -> PLANNED (no health)
 *
 * NOTE: "planned progress" is not available from the current API,
 * so we use the raw progress value as a proxy. When the API provides
 * planned vs actual progress, replace the threshold logic below.
 */
function deriveHealth(phase: Phase): HealthStatus {
  if (phase.status === 'completed') return 'NORMAL';
  if (phase.status === 'pending') return 'PLANNED';

  // For inProgress phases, use progress as proxy for health
  // TODO: Replace with (actual / planned) ratio when API provides planned progress
  if (phase.progress >= 90) return 'NORMAL';
  if (phase.progress >= 70) return 'WARNING';
  return 'CRITICAL';
}

// ─── Status chip color mapping ───────────────────────────

const HEALTH_COLORS: Record<HealthStatus, { bg: string; text: string; border: string; label: string }> = {
  NORMAL: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-300',
    label: 'OK',
  },
  WARNING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    label: 'WARN',
  },
  CRITICAL: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'CRIT',
  },
  PLANNED: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-300',
    label: '--',
  },
};

// ─── Component ───────────────────────────────────────────

interface HealthSummaryStripProps {
  phases: Phase[];
  selectedPhaseId: string;
  onPhaseSelect: (phase: Phase) => void;
  preset: ViewModePreset;
}

export function HealthSummaryStrip({
  phases,
  selectedPhaseId,
  onPhaseSelect,
  preset,
}: HealthSummaryStripProps) {
  const isCompact = preset === 'EXEC_SUMMARY';

  const phaseHealthData = useMemo(
    () =>
      phases.map((phase) => ({
        phase,
        health: deriveHealth(phase),
      })),
    [phases]
  );

  if (phases.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium mr-1">Health</span>
        {phaseHealthData.map(({ phase, health }) => {
          const colors = HEALTH_COLORS[health];
          const isSelected = phase.id === selectedPhaseId;

          return (
            <button
              key={phase.id}
              onClick={() => onPhaseSelect(phase)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-all',
                colors.bg,
                colors.text,
                colors.border,
                isSelected && 'ring-2 ring-blue-400 ring-offset-1 font-semibold',
                !isSelected && 'hover:shadow-sm'
              )}
              title={`${phase.name} - ${colors.label} (${phase.progress}%)`}
            >
              {!isCompact && (
                <span className="truncate max-w-[100px]">{phase.name}</span>
              )}
              <span
                className={cn(
                  'inline-block rounded px-1 py-0.5 text-[10px] font-bold leading-none',
                  health === 'NORMAL' && 'bg-green-200 text-green-800',
                  health === 'WARNING' && 'bg-amber-200 text-amber-800',
                  health === 'CRITICAL' && 'bg-red-200 text-red-800',
                  health === 'PLANNED' && 'bg-gray-200 text-gray-600'
                )}
              >
                {colors.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
