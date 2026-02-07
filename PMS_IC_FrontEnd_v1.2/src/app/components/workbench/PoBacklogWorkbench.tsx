import React from 'react';
import { usePoBacklogView } from '../../../hooks/api/useViews';
import { CapabilityGate } from '../common/CapabilityGate';
import { CAPABILITIES } from '../../../hooks/api/useProjectAuth';

interface Props {
  projectId: string;
}

export function PoBacklogWorkbench({ projectId }: Props) {
  const { data, isLoading, error } = usePoBacklogView(projectId);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading PO Backlog View...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#dc2626' }}>Failed to load: {String(error)}</div>;
  if (!data) return <div style={{ padding: '2rem', color: '#6b7280' }}>No data available.</div>;

  const { summary, backlogItems, epics, unlinkedStories, warnings } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <SummaryCard label="Backlog Items" value={summary.totalBacklogItems} />
          <SummaryCard label="Approved" value={summary.approvedItems} color="#16a34a" />
          <SummaryCard label="Pending" value={summary.pendingItems} color="#f59e0b" />
          <SummaryCard label="Req Coverage" value={`${summary.requirementCoverage}%`}
            color={summary.requirementCoverage >= 80 ? '#16a34a' : '#dc2626'} />
          <SummaryCard label="Epics" value={summary.epicCount} />
          <SummaryCard label="Decomposition" value={`${summary.storyDecompositionRate}%`}
            color={summary.storyDecompositionRate >= 70 ? '#16a34a' : '#f59e0b'} />
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

      {/* Epic Progress */}
      {epics && epics.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Epic Progress</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {epics.map((epic: any) => (
              <div key={epic.id} style={{
                padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{epic.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {epic.storyCount} stories | {epic.completedStoryRate}% done
                </div>
                <div style={{ marginTop: '0.5rem', height: '6px', background: '#e5e7eb', borderRadius: '3px' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px', background: '#3b82f6',
                    width: `${Math.min(epic.completedStoryRate || epic.progress || 0, 100)}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backlog Items Table */}
      {backlogItems && backlogItems.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Backlog Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>ID</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Stories</th>
                <th style={{ padding: '0.5rem' }}>Points</th>
                <th style={{ padding: '0.5rem' }}>
                  <CapabilityGate required={[CAPABILITIES.EDIT_BACKLOG_ITEM]} mode="all">
                    Actions
                  </CapabilityGate>
                </th>
              </tr>
            </thead>
            <tbody>
              {backlogItems.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem' }}>{item.id}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>{item.completedStoryCount}/{item.storyCount}</td>
                  <td style={{ padding: '0.5rem' }}>{item.completedStoryPoints}/{item.totalStoryPoints}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <CapabilityGate required={[CAPABILITIES.APPROVE_BACKLOG_ITEM]}>
                      <button style={{
                        padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#dbeafe',
                        border: '1px solid #93c5fd', borderRadius: '0.25rem', cursor: 'pointer',
                      }}>
                        Approve
                      </button>
                    </CapabilityGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unlinked Stories */}
      {unlinkedStories && unlinkedStories.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.5rem' }}>
            {unlinkedStories.length} Unlinked Stories
          </div>
          {unlinkedStories.map((s: any) => (
            <div key={s.id} style={{ fontSize: '0.75rem', color: '#7f1d1d' }}>
              {s.id}: {s.title} ({s.status})
            </div>
          ))}
        </div>
      )}
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    BACKLOG: '#6b7280', IN_SPRINT: '#3b82f6', IN_PROGRESS: '#f59e0b',
    DONE: '#16a34a', COMPLETED: '#16a34a', CANCELLED: '#dc2626',
  };
  return (
    <span style={{
      padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem',
      background: `${colors[status] || '#6b7280'}20`, color: colors[status] || '#6b7280',
      fontWeight: 500,
    }}>
      {status}
    </span>
  );
}
