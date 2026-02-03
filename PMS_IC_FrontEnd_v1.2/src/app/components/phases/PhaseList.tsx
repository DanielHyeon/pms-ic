import { CheckCircle2, Circle, Clock, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Phase } from './types';

interface PhaseListProps {
  phases: Phase[];
  parentPhase?: Phase;
  selectedPhaseId: string;
  canManagePhases: boolean;
  onPhaseSelect: (phase: Phase) => void;
  onEditPhase: (phase: Phase) => void;
}

export function PhaseList({
  phases,
  parentPhase,
  selectedPhaseId,
  canManagePhases,
  onPhaseSelect,
  onEditPhase,
}: PhaseListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // If no parent phase, render flat list (backward compatible)
  if (!parentPhase) {
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

  // Render hierarchical tree structure
  return (
    <div className="space-y-2">
      {/* Parent Phase Header */}
      <div
        className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 cursor-pointer hover:border-blue-300 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button type="button" className="p-1 hover:bg-blue-100 rounded transition-colors">
          {isExpanded ? (
            <ChevronDown className="text-blue-600" size={20} />
          ) : (
            <ChevronRight className="text-blue-600" size={20} />
          )}
        </button>
        <PhaseStatusIcon status={parentPhase.status} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{parentPhase.name}</h3>
          <p className="text-xs text-gray-500">{parentPhase.description}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>전체 진행률</span>
              <span className="font-medium">{parentPhase.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${parentPhase.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Child Phases (Sub-phases) */}
      {isExpanded && (
        <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-2">
          {phases.map((phase, index) => (
            <div key={phase.id} className="relative">
              {/* Tree connector line */}
              <div className="absolute -left-4 top-1/2 w-4 h-px bg-blue-200" />
              <PhaseCard
                phase={phase}
                isSelected={selectedPhaseId === phase.id}
                canManagePhases={canManagePhases}
                onSelect={() => onPhaseSelect(phase)}
                onEdit={() => onEditPhase(phase)}
                isChild={true}
              />
            </div>
          ))}
        </div>
      )}
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
  isChild?: boolean;
}

function PhaseCard({ phase, isSelected, canManagePhases, onSelect, onEdit, isChild = false }: PhaseCardProps) {
  return (
    <div
      className={`relative w-full text-left rounded-xl border-2 transition-all ${
        isChild ? 'p-3' : 'p-4'
      } ${
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
