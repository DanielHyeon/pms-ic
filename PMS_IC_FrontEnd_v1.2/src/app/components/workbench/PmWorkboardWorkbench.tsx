import React from 'react';
import { usePmWorkboardView } from '../../../hooks/api/useViews';
import { CapabilityGate } from '../common/CapabilityGate';
import { CAPABILITIES } from '../../../hooks/api/useProjectAuth';

interface Props {
  projectId: string;
}

export function PmWorkboardWorkbench({ projectId }: Props) {
  const { data, isLoading, error } = usePmWorkboardView(projectId);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading PM Workboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#dc2626' }}>Failed to load: {String(error)}</div>;
  if (!data) return <div style={{ padding: '2rem', color: '#6b7280' }}>No data available.</div>;

  const { summary, activeSprint, backlogStories, warnings, scopedPartIds } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Scope indicator */}
      {scopedPartIds && scopedPartIds.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Scoped to parts: {scopedPartIds.join(', ')}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <SummaryCard label="Total Stories" value={summary.totalStories} />
          <SummaryCard label="In Sprint" value={summary.inSprintStories} color="#3b82f6" />
          <SummaryCard label="Backlog" value={summary.backlogStories} color="#6b7280" />
          <SummaryCard label="Active Sprint" value={summary.activeSprintName || 'None'} />
          <SummaryCard label="Velocity" value={`${summary.sprintVelocity} pts`} />
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

      {/* Active Sprint Board */}
      {activeSprint && activeSprint.id && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              {activeSprint.name} ({activeSprint.completedPoints}/{activeSprint.totalPoints} pts)
            </h3>
            <CapabilityGate required={[CAPABILITIES.MANAGE_SPRINT]}>
              <button style={{
                padding: '0.375rem 0.75rem', fontSize: '0.75rem', background: '#dbeafe',
                border: '1px solid #93c5fd', borderRadius: '0.25rem', cursor: 'pointer',
              }}>
                Complete Sprint
              </button>
            </CapabilityGate>
          </div>

          {/* Sprint progress bar */}
          <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '1rem' }}>
            <div style={{
              height: '100%', borderRadius: '4px', background: '#3b82f6',
              width: `${activeSprint.totalPoints > 0 ? (activeSprint.completedPoints / activeSprint.totalPoints * 100) : 0}%`,
            }} />
          </div>

          {/* Sprint stories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {activeSprint.stories?.map((story: any) => (
              <div key={story.id} style={{
                padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                background: '#fff', borderLeft: `3px solid ${statusColor(story.status)}`,
              }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{story.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  <StatusBadge status={story.status} />
                  {story.storyPoints && <span>{story.storyPoints} pts</span>}
                  {story.partName && <span>{story.partName}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backlog Stories */}
      {backlogStories && backlogStories.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Backlog Stories</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Title</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Points</th>
                <th style={{ padding: '0.5rem' }}>Part</th>
                <th style={{ padding: '0.5rem' }}>Ready</th>
                <th style={{ padding: '0.5rem' }}>
                  <CapabilityGate required={[CAPABILITIES.ASSIGN_TASK]}>
                    Actions
                  </CapabilityGate>
                </th>
              </tr>
            </thead>
            <tbody>
              {backlogStories.map((story: any) => (
                <tr key={story.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem' }}>{story.title}</td>
                  <td style={{ padding: '0.5rem' }}><StatusBadge status={story.status} /></td>
                  <td style={{ padding: '0.5rem' }}>{story.storyPoints || '-'}</td>
                  <td style={{ padding: '0.5rem' }}>{story.partName || <span style={{ color: '#dc2626' }}>Unassigned</span>}</td>
                  <td style={{ padding: '0.5rem' }}>{story.readyForSprint ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <CapabilityGate required={[CAPABILITIES.ASSIGN_TASK]}>
                      <button style={{
                        padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#dbeafe',
                        border: '1px solid #93c5fd', borderRadius: '0.25rem', cursor: 'pointer',
                      }}>
                        Add to Sprint
                      </button>
                    </CapabilityGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Part Workload */}
      {summary?.partWorkload && Object.keys(summary.partWorkload).length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Part Workload</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(summary.partWorkload).map(([partId, wl]: [string, any]) => (
              <div key={partId} style={{
                padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{partId}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {wl.stories} stories | {wl.storyPoints} pts | {wl.members} members
                </div>
              </div>
            ))}
          </div>
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
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: color || '#111827' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    BACKLOG: '#6b7280', READY: '#8b5cf6', IN_SPRINT: '#3b82f6',
    IN_PROGRESS: '#f59e0b', REVIEW: '#a855f7', DONE: '#16a34a', CANCELLED: '#dc2626',
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

function statusColor(status: string): string {
  const map: Record<string, string> = {
    BACKLOG: '#6b7280', READY: '#8b5cf6', IN_SPRINT: '#3b82f6',
    IN_PROGRESS: '#f59e0b', REVIEW: '#a855f7', DONE: '#16a34a',
  };
  return map[status] || '#6b7280';
}
