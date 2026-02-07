import React from 'react';
import { useDataQuality, DataQualityResponse, CategoryScore, DataQualityMetric, DataIssue, HistoryEntry } from '../../../hooks/api/useDataQuality';

interface Props {
  projectId: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#16a34a',
  B: '#2563eb',
  C: '#d97706',
  D: '#dc2626',
  F: '#991b1b',
};

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  OK: { color: '#16a34a', bg: '#f0fdf4', icon: '●' },
  WARNING: { color: '#d97706', bg: '#fffbeb', icon: '▲' },
  DANGER: { color: '#dc2626', bg: '#fef2f2', icon: '▼' },
};

const CATEGORY_LABELS: Record<string, string> = {
  integrity: 'Referential Integrity',
  readiness: 'Relationship Completeness',
  traceability: 'Scope Traceability',
};

export function DataQualityDashboard({ projectId }: Props) {
  const { data, isLoading, error } = useDataQuality(projectId);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading data quality metrics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        Failed to load data quality metrics.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header: Grade + Overall Score */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem', background: '#fff', borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Data Quality Dashboard</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            3-tier scoring: Integrity (40%) + Readiness (35%) + Traceability (25%)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700,
            color: '#fff', background: GRADE_COLORS[data.grade] || '#6b7280',
          }}>
            {data.grade}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {data.overallScore}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>/ 100</div>
          </div>
        </div>
      </div>

      {/* Category Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {(['integrity', 'readiness', 'traceability'] as const).map(key => {
          const cat = data.categories[key];
          if (!cat) return null;
          return (
            <CategoryCard
              key={key}
              name={CATEGORY_LABELS[key]}
              category={cat}
            />
          );
        })}
      </div>

      {/* Metric Details */}
      <div style={{
        background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
        padding: '1.25rem',
      }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Metric Details</h3>
        {(['integrity', 'readiness', 'traceability'] as const).map(key => {
          const cat = data.categories[key];
          if (!cat) return null;
          return (
            <div key={key} style={{ marginBottom: '1.25rem' }}>
              <h4 style={{
                margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600,
                color: '#374151',
              }}>
                [{CATEGORY_LABELS[key]}]
              </h4>
              {cat.metrics.map((m: DataQualityMetric) => (
                <MetricRow key={m.id} metric={m} />
              ))}
            </div>
          );
        })}
      </div>

      {/* History Trend */}
      {data.history.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
          padding: '1.25rem',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Score Trend</h3>
          <HistoryTable entries={data.history} />
        </div>
      )}

      {/* Issues / Action Items */}
      {data.issues.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
          padding: '1.25rem',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Action Items</h3>
          {data.issues.map((issue: DataIssue, idx: number) => (
            <IssueRow key={idx} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ name, category }: { name: string; category: CategoryScore }) {
  const scoreColor = category.score >= 80 ? '#16a34a'
    : category.score >= 60 ? '#d97706' : '#dc2626';

  return (
    <div style={{
      background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
      padding: '1rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
        {name}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: scoreColor }}>
        {category.score}%
      </div>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
        Weight: {(category.weight * 100).toFixed(0)}%
      </div>
    </div>
  );
}

function MetricRow({ metric }: { metric: DataQualityMetric }) {
  const style = STATUS_STYLES[metric.status] || STATUS_STYLES.OK;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.4rem 0.75rem', margin: '0.25rem 0',
      background: style.bg, borderRadius: '4px', fontSize: '0.85rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: style.color, fontWeight: 600 }}>{style.icon}</span>
        <span>{metric.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 600, color: style.color }}>
          {metric.value}% ({metric.numerator}/{metric.denominator})
        </span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          Target: {metric.target}%
        </span>
      </div>
    </div>
  );
}

function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
          <th style={{ padding: '0.5rem', textAlign: 'left', color: '#6b7280' }}>Date</th>
          <th style={{ padding: '0.5rem', textAlign: 'right', color: '#6b7280' }}>Overall</th>
          <th style={{ padding: '0.5rem', textAlign: 'right', color: '#6b7280' }}>Integrity</th>
          <th style={{ padding: '0.5rem', textAlign: 'right', color: '#6b7280' }}>Readiness</th>
          <th style={{ padding: '0.5rem', textAlign: 'right', color: '#6b7280' }}>Traceability</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(e => (
          <tr key={e.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '0.5rem' }}>{e.date}</td>
            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{e.score}</td>
            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{e.integrity}</td>
            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{e.readiness}</td>
            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{e.traceability}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IssueRow({ issue }: { issue: DataIssue }) {
  const isDanger = issue.severity === 'DANGER';
  return (
    <div style={{
      padding: '0.75rem', margin: '0.5rem 0',
      background: isDanger ? '#fef2f2' : '#fffbeb',
      borderLeft: `3px solid ${isDanger ? '#dc2626' : '#d97706'}`,
      borderRadius: '4px', fontSize: '0.85rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{
          display: 'inline-block', padding: '0.1rem 0.4rem',
          borderRadius: '3px', fontSize: '0.7rem', fontWeight: 700,
          color: '#fff', background: isDanger ? '#dc2626' : '#d97706',
        }}>
          {issue.severity}
        </span>
        <span style={{ fontWeight: 600 }}>{issue.description}</span>
      </div>
      <div style={{ color: '#6b7280', paddingLeft: '1rem' }}>
        → {issue.suggestedAction}
      </div>
    </div>
  );
}
