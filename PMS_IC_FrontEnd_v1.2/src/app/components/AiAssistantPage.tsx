import { useState, useCallback, useMemo } from 'react';
import { Bot } from 'lucide-react';
import { UserRole } from '../../stores/authStore';
import { useProject } from '../../contexts/ProjectContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useAiBriefing, useRefreshBriefing, useLogDecisionTrace } from '../../hooks/api/useAiBriefing';
import { useAiChatBridgeStore } from '../../stores/aiChatBridgeStore';
import type { AiInsight, BriefingScope } from '../../types/aiBriefing';
import { resolvePresetByRole, PRESET_CONFIGS } from '../../types/aiBriefing';
import AiContextHeader from './ai/AiContextHeader';
import AiBriefingPanel from './ai/AiBriefingPanel';
import InsightCardList from './ai/InsightCardList';
import RecommendedActionPanel from './ai/RecommendedActionPanel';
import ExplainabilityDrawer from './ai/ExplainabilityDrawer';

function BriefingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-16 w-full" />
      <div className="bg-gray-200 rounded-lg h-32 w-full" />
      <div className="space-y-3">
        <div className="bg-gray-200 rounded-lg h-24 w-full" />
        <div className="bg-gray-200 rounded-lg h-24 w-full" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
          <Bot size={32} className="text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">프로젝트를 선택해 주세요</h2>
        <p className="text-sm text-gray-500">
          AI 의사결정 콘솔은 프로젝트 데이터를 분석하여 인사이트를 제공합니다.
          먼저 분석할 프로젝트를 선택하세요.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-sm text-red-700 mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}

export default function AiAssistantPage({ userRole }: { userRole: UserRole }) {
  const { currentProject } = useProject();
  const roleUpper = userRole.toUpperCase();
  const preset = resolvePresetByRole(userRole);
  const presetConfig = PRESET_CONFIGS[preset];
  const { capabilities } = useCapabilities(roleUpper);

  const [scope, setScope] = useState<BriefingScope>('current_sprint');

  const {
    data: briefing,
    isLoading,
    isError,
    error,
    refetch,
  } = useAiBriefing(currentProject?.id, roleUpper, scope);

  const refreshMutation = useRefreshBriefing();
  const traceLog = useLogDecisionTrace();
  const injectChat = useAiChatBridgeStore((s) => s.inject);

  const handleRefresh = useCallback(() => {
    if (!currentProject?.id) return;
    refreshMutation.mutate({ projectId: currentProject.id, role: roleUpper, scope });
  }, [currentProject?.id, roleUpper, scope, refreshMutation]);

  const handleAskChat = useCallback((insight: AiInsight) => {
    if (!currentProject?.id || !briefing) return;
    injectChat({
      mode: 'CONTEXTUAL',
      injectedContext: {
        insightId: insight.id,
        insightType: insight.type,
        insightTitle: insight.title,
        projectId: currentProject.id,
        asOf: briefing.context.asOf,
        evidenceRef: insight.evidence.entities,
        summary: insight.description,
      },
    });
    traceLog.mutate({
      projectId: currentProject.id,
      eventType: 'CHAT_CONTEXT_INJECTED',
      briefingId: `briefing-${currentProject.id}`,
      insightId: insight.id,
      insightType: insight.type,
      severity: insight.severity,
      confidence: insight.confidence,
    });
  }, [currentProject?.id, briefing, injectChat, traceLog]);

  const handleActionClick = useCallback((actionId: string, insightId?: string) => {
    if (!currentProject?.id) return;
    traceLog.mutate({
      projectId: currentProject.id,
      eventType: 'ACTION_CLICKED',
      briefingId: `briefing-${currentProject.id}`,
      insightId,
      actionId,
      actionResult: 'CLICKED',
    });
  }, [currentProject?.id, traceLog]);

  const capSet = useMemo(() => capabilities, [capabilities]);

  if (!currentProject) {
    return <EmptyState />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-1">
        <Bot size={22} className="text-purple-600" />
        <h1 className="text-xl font-bold text-gray-900">AI 의사결정 콘솔</h1>
      </div>

      {/* [A] Context Header */}
      <AiContextHeader
        projectName={currentProject.name || currentProject.id}
        role={roleUpper}
        asOf={briefing?.context.asOf || new Date().toISOString()}
        scope={scope}
        completeness={briefing?.context.completeness || 'UNKNOWN'}
        missingSignals={briefing?.context.missingSignals}
        onRefresh={handleRefresh}
        onScopeChange={setScope}
        isRefreshing={refreshMutation.isPending}
      />

      {/* Loading / Error / Content */}
      {isLoading ? (
        <BriefingSkeleton />
      ) : isError ? (
        <ErrorState
          message={error?.message || 'AI 브리핑을 불러오는 중 오류가 발생했습니다.'}
          onRetry={() => refetch()}
        />
      ) : briefing ? (
        <>
          {/* [B] Briefing Panel */}
          <AiBriefingPanel
            headline={briefing.summary.headline}
            signals={briefing.summary.signals}
            healthStatus={briefing.summary.healthStatus}
            confidence={briefing.summary.confidence}
            body={briefing.summary.body}
            completeness={briefing.context.completeness}
            missingSignals={briefing.context.missingSignals}
          />

          {/* [C] Insight Cards */}
          <InsightCardList
            insights={briefing.insights}
            actions={briefing.recommendedActions}
            userCapabilities={capSet}
            presetConfig={presetConfig}
            onAskChat={handleAskChat}
            onActionClick={handleActionClick}
          />

          {/* [D] Recommended Actions */}
          <RecommendedActionPanel
            actions={briefing.recommendedActions}
            userCapabilities={capSet}
            onActionClick={(actionId) => handleActionClick(actionId)}
          />

          {/* [E] Explainability Drawer */}
          <ExplainabilityDrawer data={briefing.explainability} />
        </>
      ) : null}
    </div>
  );
}
