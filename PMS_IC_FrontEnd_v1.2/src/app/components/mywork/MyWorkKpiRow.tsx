import { Card, CardContent } from '../ui/card';
import { Activity, AlertTriangle, Ban, CheckCircle, ListChecks, Zap } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export interface MyWorkKpiStats {
  myTasksTotal: number;
  myTasksInProgress: number;
  myBlockedCount: number;
  myOverdueCount: number;
  myCompletedToday: number;
  mySprintRemainingSp: number;
}

interface MyWorkKpiRowProps {
  stats: MyWorkKpiStats;
}

// ── Component ──────────────────────────────────────────────

export function MyWorkKpiRow({ stats }: MyWorkKpiRowProps) {
  const cards = [
    {
      key: 'inProgress',
      label: 'In Progress',
      value: stats.myTasksInProgress,
      icon: <Activity size={18} />,
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: stats.myOverdueCount,
      icon: <AlertTriangle size={18} />,
      iconColor: 'text-red-600',
      valueColor: stats.myOverdueCount > 0 ? 'text-red-600' : 'text-gray-900',
    },
    {
      key: 'blocked',
      label: 'Blocked',
      value: stats.myBlockedCount,
      icon: <Ban size={18} />,
      iconColor: 'text-orange-600',
      valueColor: stats.myBlockedCount > 0 ? 'text-orange-600' : 'text-gray-900',
    },
    {
      key: 'completedToday',
      label: 'Completed Today',
      value: stats.myCompletedToday,
      icon: <CheckCircle size={18} />,
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
    {
      key: 'totalTasks',
      label: 'Total Tasks',
      value: stats.myTasksTotal,
      icon: <ListChecks size={18} />,
      iconColor: 'text-gray-600',
      valueColor: 'text-gray-900',
    },
    {
      key: 'sprintRemainingSp',
      label: 'Sprint Remaining SP',
      value: stats.mySprintRemainingSp,
      icon: <Zap size={18} />,
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
      suffix: 'SP',
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map((card) => (
        <Card key={card.key} className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={card.iconColor}>{card.icon}</span>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
            <p className={`text-2xl font-semibold mt-1 ${card.valueColor}`}>
              {card.value}
              {'suffix' in card && card.suffix ? (
                <span className="text-sm ml-1 font-normal">{card.suffix}</span>
              ) : null}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
