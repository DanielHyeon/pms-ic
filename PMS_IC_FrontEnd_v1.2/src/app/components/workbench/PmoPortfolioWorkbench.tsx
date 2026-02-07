import React from 'react';
import { usePmoPortfolioView } from '../../../hooks/api/useViews';
import { CapabilityGate } from '../common/CapabilityGate';
import { CAPABILITIES } from '../../../hooks/api/useProjectAuth';
import { DataQualityDashboard } from './DataQualityDashboard';

interface Props {
  projectId: string;
}

export function PmoPortfolioWorkbench({ projectId }: Props) {
  const { data, isLoading, error } = usePmoPortfolioView(projectId);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading PMO Portfolio...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#dc2626' }}>Failed to load: {String(error)}</div>;
  if (!data) return <div style={{ padding: '2rem', color: '#6b7280' }}>No data available.</div>;

  const { summary, kpis, dataQuality, partComparison, warnings } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <SummaryCard label="Overall Progress" value={`${summary.overallProgress}%`}
            color={summary.overallProgress >= 50 ? '#16a34a' : '#f59e0b'} />
          <SummaryCard label="Req Traceability" value={`${summary.requirementTraceability}%`}
            color={summary.requirementTraceability >= 80 ? '#16a34a' : '#dc2626'} />
          <SummaryCard label="Decomposition" value={`${summary.storyDecompositionRate}%`}
            color={summary.storyDecompositionRate >= 70 ? '#16a34a' : '#f59e0b'} />
          <SummaryCard label="Epic Coverage" value={`${summary.epicCoverage}%`}
            color={summary.epicCoverage >= 80 ? '#16a34a' : '#f59e0b'} />
          <SummaryCard label="Data Quality" value={summary.dataQualityScore}
            color={summary.dataQualityScore >= 80 ? '#16a34a' : summary.dataQualityScore >= 50 ? '#f59e0b' : '#dc2626'} />
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fbbf24' }}>
          {warnings.map((w: any, i: number) => (
            <div key={i} style={{ fontSize: '0.875rem', color: '#92400e' }}>{w.message}</div>
          ))}
        </div>
      )}

      {/* Coverage KPIs */}
      {kpis?.coverage && kpis.coverage.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Coverage KPIs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {kpis.coverage.map((kpi: any, i: number) => (
              <KpiCard key={i} kpi={kpi} />
            ))}
          </div>
        </div>
      )}

      {/* Operational KPIs */}
      {kpis?.operational && kpis.operational.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Operational KPIs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {kpis.operational.map((kpi: any, i: number) => (
              <KpiCard key={i} kpi={kpi} />
            ))}
          </div>
        </div>
      )}

      {/* Data Quality Panel */}
      {dataQuality && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Data Quality</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <ScorePanel label="Integrity" score={dataQuality.score?.integrityScore} maxLabel="No invalid references" />
            <ScorePanel label="Readiness" score={dataQuality.score?.readinessScore} maxLabel="All entities linked" />
            <ScorePanel label="Total" score={dataQuality.score?.total} maxLabel="Weighted (I*0.6 + R*0.4)" />
          </div>

          {dataQuality.readiness && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <ReadinessRow label="Stories without Epic" value={dataQuality.readiness.nullEpicIdStories} />
                  <ReadinessRow label="Stories without Part" value={dataQuality.readiness.nullPartIdStories} />
                  <ReadinessRow label="Unlinked Stories" value={dataQuality.readiness.unlinkedStories} />
                  <ReadinessRow label="Unlinked Backlog Items" value={dataQuality.readiness.unlinkedBacklogItems} />
                </tbody>
              </table>
            </div>
          )}

          {dataQuality.issues && dataQuality.issues.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              {dataQuality.issues.map((issue: any, i: number) => (
                <div key={i} style={{
                  padding: '0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem', marginBottom: '0.25rem',
                  background: issue.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                  color: issue.severity === 'CRITICAL' ? '#991b1b' : '#92400e',
                }}>
                  [{issue.severity}] {issue.issue}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Part Comparison */}
      {partComparison && partComparison.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Part Comparison</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Part</th>
                <th style={{ padding: '0.5rem' }}>Stories</th>
                <th style={{ padding: '0.5rem' }}>Points</th>
                <th style={{ padding: '0.5rem' }}>Completed</th>
                <th style={{ padding: '0.5rem' }}>Rate</th>
                <th style={{ padding: '0.5rem' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {partComparison.map((part: any) => (
                <tr key={part.partId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 500 }}>{part.partName}</td>
                  <td style={{ padding: '0.5rem' }}>{part.stories}</td>
                  <td style={{ padding: '0.5rem' }}>{part.storyPoints}</td>
                  <td style={{ padding: '0.5rem' }}>{part.completedPoints}</td>
                  <td style={{ padding: '0.5rem' }}>{part.completionRate}%</td>
                  <td style={{ padding: '0.5rem' }}>{part.memberCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Phase 4: Detailed Data Quality Dashboard (3-tier) */}
      <CapabilityGate required={[CAPABILITIES.VIEW_DATA_QUALITY]}>
        <DataQualityDashboard projectId={projectId} />
      </CapabilityGate>

      {/* Capability-gated actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <CapabilityGate required={[CAPABILITIES.VIEW_AUDIT_LOG]}>
          <button style={{
            padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db',
            borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem',
          }}>
            View Audit Log
          </button>
        </CapabilityGate>
        <CapabilityGate required={[CAPABILITIES.EXPORT_REPORT]}>
          <button style={{
            padding: '0.5rem 1rem', background: '#dbeafe', border: '1px solid #93c5fd',
            borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem',
          }}>
            Export Report
          </button>
        </CapabilityGate>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div style={{
      padding: '1rem', background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: '0.5rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || '#111827' }}>{value}</div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: any }) {
  const statusColors: Record<string, string> = {
    OK: '#16a34a', WARNING: '#f59e0b', DANGER: '#dc2626',
  };
  return (
    <div style={{
      padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff',
      borderLeft: `3px solid ${statusColors[kpi.status] || '#6b7280'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{kpi.name}</span>
        <span style={{
          padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600,
          background: `${statusColors[kpi.status] || '#6b7280'}20`,
          color: statusColors[kpi.status] || '#6b7280',
        }}>
          {kpi.status}
        </span>
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0' }}>
        {kpi.value}{kpi.unit}
      </div>
      <div style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
        Threshold: {kpi.threshold}{kpi.unit} | {kpi.description}
      </div>
    </div>
  );
}

function ScorePanel({ label, score, maxLabel }: { label: string; score: number; maxLabel: string }) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626';
  return (
    <div style={{
      padding: '1rem', background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: '0.5rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{score ?? 0}</div>
      <div style={{ fontSize: '0.625rem', color: '#9ca3af' }}>{maxLabel}</div>
    </div>
  );
}

function ReadinessRow({ label, value }: { label: string; value: number }) {
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '0.375rem 0.5rem' }}>{label}</td>
      <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontWeight: 600, color: value > 0 ? '#dc2626' : '#16a34a' }}>
        {value}
      </td>
    </tr>
  );
}
