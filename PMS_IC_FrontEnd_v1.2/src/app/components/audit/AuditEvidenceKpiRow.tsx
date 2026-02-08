import { ShieldCheck, AlertTriangle, Clock, Download } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export interface AuditEvidenceMetrics {
  submissionReadyCoverage: number;
  missingEvidenceCount: number;
  pendingApprovals: number;
  exportCount: number;
}

interface AuditEvidenceKpiRowProps {
  metrics?: AuditEvidenceMetrics;
}

export function AuditEvidenceKpiRow({ metrics }: AuditEvidenceKpiRowProps) {
  const submissionReadyCoverage = metrics?.submissionReadyCoverage ?? 0;
  const missingEvidenceCount = metrics?.missingEvidenceCount ?? 0;
  const pendingApprovals = metrics?.pendingApprovals ?? 0;
  const exportCount = metrics?.exportCount ?? 0;

  const missingIsWarning = missingEvidenceCount > 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Coverage */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600">
              <ShieldCheck size={18} />
            </span>
            <p className="text-sm text-gray-500">Coverage</p>
          </div>
          <p className="text-2xl font-semibold text-green-700 mt-1">
            {submissionReadyCoverage}%
          </p>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500 bg-green-500"
              style={{ width: `${submissionReadyCoverage}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Submission-ready</p>
        </CardContent>
      </Card>

      {/* Missing */}
      <Card
        className={`border shadow-sm ${
          missingIsWarning ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={missingIsWarning ? 'text-amber-600' : 'text-gray-500'}>
              <AlertTriangle size={18} />
            </span>
            <p className="text-sm text-gray-500">Missing</p>
          </div>
          <p
            className={`text-2xl font-semibold mt-1 ${
              missingIsWarning ? 'text-amber-700' : 'text-gray-700'
            }`}
          >
            {missingEvidenceCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Evidence items</p>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-600">
              <Clock size={18} />
            </span>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <p className="text-2xl font-semibold text-orange-700 mt-1">{pendingApprovals}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
        </CardContent>
      </Card>

      {/* Export Count */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-600">
              <Download size={18} />
            </span>
            <p className="text-sm text-gray-500">Exports</p>
          </div>
          <p className="text-2xl font-semibold text-blue-700 mt-1">{exportCount}</p>
          <p className="text-xs text-gray-400 mt-1">Total packages</p>
        </CardContent>
      </Card>
    </div>
  );
}
