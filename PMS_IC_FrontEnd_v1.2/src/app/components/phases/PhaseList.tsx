import { CheckCircle2, Circle, Clock, Settings } from 'lucide-react';
import type { Phase } from './types';

interface PhaseListProps {
  phases: Phase[];
  selectedPhaseId: string;
  canManagePhases: boolean;
  onPhaseSelect: (phase: Phase) => void;
  onEditPhase: (phase: Phase) => void;
}

export function PhaseList({
  phases,
  selectedPhaseId,
  canManagePhases,
  onPhaseSelect,
  onEditPhase,
}: PhaseListProps) {
  return (
    <div className="space-y-3">
      {phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          isSelected={selectedPhaseId === phase.id}
          canManagePhases={canManagePhases}
          onSelect={() => onPhaseSelect(phase)}
          onEdit={() => onEditPhase(phase)}
        />
      ))}
    </div>
  );
}

// Sub-components

interface PhaseCardProps {
  phase: Phase;
  isSelected: boolean;
  canManagePhases: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

function PhaseCard({ phase, isSelected, canManagePhases, onSelect, onEdit }: PhaseCardProps) {
  return (
    <div
      className={`relative w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {canManagePhases && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors z-10"
          title="단계 설정"
        >
          <Settings size={16} />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <PhaseStatusIcon status={phase.status} />
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-medium text-gray-900 text-sm">{phase.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{phase.description}</p>
            <ProgressBar progress={phase.progress} status={phase.status} />
          </div>
        </div>
      </button>
    </div>
  );
}

interface PhaseStatusIconProps {
  status: Phase['status'];
}

function PhaseStatusIcon({ status }: PhaseStatusIconProps) {
  return (
    <div className="mt-1">
      {status === 'completed' && <CheckCircle2 className="text-green-600" size={24} />}
      {status === 'inProgress' && <Clock className="text-blue-600" size={24} />}
      {status === 'pending' && <Circle className="text-gray-400" size={24} />}
    </div>
  );
}

interface ProgressBarProps {
  progress: number;
  status: Phase['status'];
}

function ProgressBar({ progress, status }: ProgressBarProps) {
  const getProgressColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'inProgress') return 'bg-blue-500';
    return 'bg-gray-400';
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>진행률</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
