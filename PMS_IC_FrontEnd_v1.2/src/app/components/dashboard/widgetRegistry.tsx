import type { ReactNode } from 'react';
import type { WidgetKey } from './presetLayouts';
import type { WidgetProps } from './widgets/types';

// KPI widgets
import { KpiHealthCard } from './widgets/KpiHealthCard';
import { KpiProgressCard } from './widgets/KpiProgressCard';
import { KpiRiskCard } from './widgets/KpiRiskCard';
import { KpiBudgetCard } from './widgets/KpiBudgetCard';
import { KpiIssueCard } from './widgets/KpiIssueCard';
import { KpiSprintCard } from './widgets/KpiSprintCard';
import { KpiPendingCard } from './widgets/KpiPendingCard';
import { KpiDeviationCard } from './widgets/KpiDeviationCard';
import { KpiProjectCountCard } from './widgets/KpiProjectCountCard';
import { KpiMyTasksCard } from './widgets/KpiMyTasksCard';
import { KpiWeeklyDoneCard } from './widgets/KpiWeeklyDoneCard';

// Main area widgets
import { PhaseTimeline } from './widgets/PhaseTimeline';
import { PhaseHealthSummary } from './widgets/PhaseHealthSummary';
import { PhaseDeviationChart } from './widgets/PhaseDeviationChart';
import { RiskSummaryWidget } from './widgets/RiskSummaryWidget';
import { DecisionSummaryWidget } from './widgets/DecisionSummaryWidget';
import { SprintBurndownMini } from './widgets/SprintBurndownMini';
import { AiInsightWidget } from './widgets/AiInsightWidget';
import { PortfolioTable } from './widgets/PortfolioTable';
import { MyWorkPreview } from './widgets/MyWorkPreview';
import { MyIssuesWidget } from './widgets/MyIssuesWidget';
import { TrackProgressWidget } from './widgets/TrackProgressWidget';
import { PartLeadersWidget } from './widgets/PartLeadersWidget';
import { SprintVelocityWidget } from './widgets/SprintVelocityWidget';
import { RecentActivitiesWidget } from './widgets/RecentActivitiesWidget';
import { ApprovalListWidget } from './widgets/ApprovalListWidget';

// Right panel widgets
import { ActionItemsPanel } from './widgets/ActionItemsPanel';
import { PmoDetailPanel } from './widgets/PmoDetailPanel';
import { ApprovalDetailPanel } from './widgets/ApprovalDetailPanel';

/**
 * Maps a WidgetKey to its corresponding React component.
 * All widgets receive the same WidgetProps for consistency.
 */
export function renderWidget(key: WidgetKey, props: WidgetProps): ReactNode {
  switch (key) {
    // KPI widgets
    case 'KPI_HEALTH':
      return <KpiHealthCard {...props} />;
    case 'KPI_PROGRESS':
      return <KpiProgressCard {...props} />;
    case 'KPI_RISK':
      return <KpiRiskCard {...props} />;
    case 'KPI_BUDGET':
      return <KpiBudgetCard {...props} />;
    case 'KPI_ISSUE':
      return <KpiIssueCard {...props} />;
    case 'KPI_SPRINT':
      return <KpiSprintCard {...props} />;
    case 'KPI_PENDING':
      return <KpiPendingCard {...props} />;
    case 'KPI_DEVIATION':
      return <KpiDeviationCard {...props} />;
    case 'KPI_PROJECT_COUNT':
      return <KpiProjectCountCard {...props} />;
    case 'KPI_MY_TASKS':
      return <KpiMyTasksCard {...props} />;
    case 'KPI_WEEKLY_DONE':
      return <KpiWeeklyDoneCard {...props} />;

    // Main area widgets
    case 'PHASE_TIMELINE':
      return <PhaseTimeline {...props} />;
    case 'PHASE_HEALTH':
      return <PhaseHealthSummary {...props} />;
    case 'PHASE_DEVIATION_CHART':
      return <PhaseDeviationChart {...props} />;
    case 'RISK_SUMMARY':
      return <RiskSummaryWidget {...props} />;
    case 'DECISION_SUMMARY':
      return <DecisionSummaryWidget {...props} />;
    case 'SPRINT_BURNDOWN_MINI':
      return <SprintBurndownMini {...props} />;
    case 'AI_INSIGHT':
      return <AiInsightWidget {...props} />;
    case 'PORTFOLIO_TABLE':
      return <PortfolioTable {...props} />;
    case 'MY_WORK_PREVIEW':
      return <MyWorkPreview {...props} />;
    case 'MY_ISSUES':
      return <MyIssuesWidget {...props} />;
    case 'TRACK_PROGRESS':
      return <TrackProgressWidget {...props} />;
    case 'PART_LEADERS':
      return <PartLeadersWidget {...props} />;
    case 'SPRINT_VELOCITY':
      return <SprintVelocityWidget {...props} />;
    case 'RECENT_ACTIVITIES':
      return <RecentActivitiesWidget {...props} />;
    case 'APPROVAL_LIST':
      return <ApprovalListWidget {...props} />;

    // Right panel widgets
    case 'ACTION_ITEMS_PANEL':
      return <ActionItemsPanel {...props} />;
    case 'PMO_DETAIL_PANEL':
      return <PmoDetailPanel {...props} />;
    case 'APPROVAL_DETAIL':
      return <ApprovalDetailPanel {...props} />;

    default: {
      // Exhaustive check: TypeScript will error here if a new WidgetKey is added
      // but not handled in the switch
      const _exhaustiveCheck: never = key;
      return (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-400">Unknown widget: {_exhaustiveCheck}</p>
        </div>
      );
    }
  }
}
