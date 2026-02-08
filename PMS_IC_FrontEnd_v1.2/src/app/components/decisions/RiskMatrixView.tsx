import { useMemo } from 'react';
import type { RiskItem, RiskSeverity } from './types';
import { getSeverityFromScore } from './types';

// ── Types ──────────────────────────────────────────────────

interface RiskMatrixViewProps {
  risks: RiskItem[];
  onSelect: (risk: RiskItem) => void;
  selectedRiskId?: string | null;
}

// ── Cell color mapping ─────────────────────────────────────

const SEVERITY_CELL_COLORS: Record<RiskSeverity, string> = {
  critical: 'bg-red-100 border-red-200',
  high: 'bg-orange-100 border-orange-200',
  medium: 'bg-amber-100 border-amber-200',
  low: 'bg-green-100 border-green-200',
};

const SEVERITY_TEXT_COLORS: Record<RiskSeverity, string> = {
  critical: 'text-red-700',
  high: 'text-orange-700',
  medium: 'text-amber-700',
  low: 'text-green-700',
};

const SEVERITY_BADGE_COLORS: Record<RiskSeverity, string> = {
  critical: 'bg-red-200 text-red-800',
  high: 'bg-orange-200 text-orange-800',
  medium: 'bg-amber-200 text-amber-800',
  low: 'bg-green-200 text-green-800',
};

// ── Impact/Probability labels ──────────────────────────────

const IMPACT_LABELS = ['', 'Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
const PROBABILITY_LABELS = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

// ── Component ──────────────────────────────────────────────

export function RiskMatrixView({
  risks,
  onSelect,
  selectedRiskId,
}: RiskMatrixViewProps) {
  // Group risks by impact-probability cell
  const risksByCell = useMemo(() => {
    const map: Record<string, RiskItem[]> = {};
    for (const risk of risks) {
      const key = `${risk.impact}-${risk.probability}`;
      if (!map[key]) map[key] = [];
      map[key].push(risk);
    }
    return map;
  }, [risks]);

  // Impact rows go top=5 to bottom=1
  const impactRows = [5, 4, 3, 2, 1];
  const probabilityCols = [1, 2, 3, 4, 5];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Risk Matrix (Impact x Probability)
      </h3>

      <div className="overflow-auto">
        <div className="min-w-[600px]">
          {/* Matrix grid */}
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex flex-col items-center justify-center mr-2 w-8">
              <span
                className="text-xs font-medium text-gray-500 whitespace-nowrap"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                Impact
              </span>
            </div>

            <div className="flex-1">
              {/* Matrix rows */}
              {impactRows.map((impact) => (
                <div key={impact} className="flex">
                  {/* Row label */}
                  <div className="w-24 flex items-center justify-end pr-2 shrink-0">
                    <span className="text-xs text-gray-500">
                      {impact} - {IMPACT_LABELS[impact]}
                    </span>
                  </div>

                  {/* Cells */}
                  {probabilityCols.map((prob) => {
                    const score = impact * prob;
                    const severity = getSeverityFromScore(score);
                    const cellKey = `${impact}-${prob}`;
                    const cellRisks = risksByCell[cellKey] || [];

                    return (
                      <div
                        key={cellKey}
                        className={`flex-1 min-h-[80px] border ${SEVERITY_CELL_COLORS[severity]} m-0.5 rounded-lg p-1.5 relative`}
                      >
                        {/* Score badge */}
                        <span
                          className={`absolute top-1 right-1 text-[10px] font-bold ${SEVERITY_TEXT_COLORS[severity]} opacity-60`}
                        >
                          {score}
                        </span>

                        {/* Risk items in cell */}
                        <div className="flex flex-col gap-1 mt-3">
                          {cellRisks.map((risk) => (
                            <button
                              key={risk.id}
                              onClick={() => onSelect(risk)}
                              className={`text-left px-1.5 py-1 rounded text-[11px] font-medium truncate transition-all ${
                                selectedRiskId === risk.id
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : `${SEVERITY_BADGE_COLORS[severity]} hover:opacity-80`
                              }`}
                              title={`${risk.code}: ${risk.title}`}
                            >
                              {risk.code}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* X-axis labels */}
              <div className="flex mt-1">
                <div className="w-24 shrink-0" />
                {probabilityCols.map((prob) => (
                  <div
                    key={prob}
                    className="flex-1 text-center text-xs text-gray-500 px-1"
                  >
                    {prob} - {PROBABILITY_LABELS[prob]}
                  </div>
                ))}
              </div>

              {/* X-axis title */}
              <div className="text-center mt-2">
                <span className="text-xs font-medium text-gray-500">
                  Probability
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
        <span className="text-xs text-gray-500 font-medium">Legend:</span>
        {(
          [
            ['low', 'Low (1-3)'],
            ['medium', 'Medium (4-9)'],
            ['high', 'High (10-16)'],
            ['critical', 'Critical (17-25)'],
          ] as [RiskSeverity, string][]
        ).map(([sev, label]) => (
          <div key={sev} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded ${SEVERITY_CELL_COLORS[sev]}`}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
