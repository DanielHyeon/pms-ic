import { useState, useCallback } from 'react';
import {
  X,
  Eye,
  FileText,
  History,
  CheckCircle,
  Upload,
  Info,
  Clock,
  User,
  Tag,
  Link2,
  ArrowRight,
  UploadCloud,
  File,
  Lock,
  AlertCircle,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import StatusBadge from '../common/StatusBadge';

// ── Types ──────────────────────────────────────────────────

export type DeliverablePanelMode =
  | 'none'
  | 'preview'
  | 'detail'
  | 'version'
  | 'approval'
  | 'upload';

export interface DeliverableRightPanelProps {
  mode: DeliverablePanelMode;
  deliverable?: any;
  preset: ViewModePreset;
  onClose: () => void;
  onModeChange: (mode: DeliverablePanelMode) => void;
  canEdit: boolean;
}

// ── Sub-panels ─────────────────────────────────────────────

function PreviewPanel({ deliverable }: { deliverable: any }) {
  return (
    <div className="space-y-5">
      {/* Name and status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{deliverable.name}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={deliverable.status} />
          {deliverable.type && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {deliverable.type}
            </span>
          )}
          {deliverable.version && (
            <span className="text-xs text-gray-500">v{deliverable.version}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {deliverable.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Info size={12} />
            설명
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {deliverable.description}
          </p>
        </div>
      )}

      {/* File info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Tag size={12} />
            분류
          </p>
          <p className="text-sm text-gray-700">{deliverable.category || deliverable.type || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <FileText size={12} />
            파일명
          </p>
          <p className="text-sm text-gray-700">{deliverable.fileName || 'N/A'}</p>
        </div>
      </div>

      {/* Phase info */}
      {deliverable.phaseName && (
        <div>
          <p className="text-xs text-gray-500 mb-1">단계</p>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-sm">
            {deliverable.phaseName}
          </span>
        </div>
      )}

      {/* Trace links */}
      <div>
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Link2 size={12} />
          추적 연결
        </p>
        <div className="flex items-center justify-center h-16 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
          {/* TODO: Replace with real trace link data */}
          연결된 항목 없음
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ deliverable, canEdit }: { deliverable: any; canEdit: boolean }) {
  return (
    <div className="space-y-5">
      {/* Title and badges */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{deliverable.name}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={deliverable.status} />
          {deliverable.type && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {deliverable.type}
            </span>
          )}
          {deliverable.version && (
            <span className="text-xs text-gray-500">v{deliverable.version}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {deliverable.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1">설명</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {deliverable.description}
          </p>
        </div>
      )}

      {/* People */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <User size={12} />
            업로더
          </p>
          <p className="text-sm text-gray-700">{deliverable.uploadedBy || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">승인자</p>
          <p className="text-sm text-gray-700">{deliverable.approvedBy || deliverable.approver || 'N/A'}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Clock size={12} />
            업로드일
          </p>
          <p className="text-sm text-gray-700">
            {deliverable.uploadedAt
              ? new Date(deliverable.uploadedAt).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">마감일</p>
          <p className="text-sm text-gray-700">
            {deliverable.dueDate
              ? new Date(deliverable.dueDate).toLocaleDateString()
              : '미설정'}
          </p>
        </div>
      </div>

      {/* Approval info */}
      {deliverable.approvedAt && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <CheckCircle size={12} />
            승인일
          </p>
          <p className="text-sm text-gray-700">
            {new Date(deliverable.approvedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* File details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">분류</p>
          <p className="text-sm text-gray-700">{deliverable.category || deliverable.type || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">파일명</p>
          <p className="text-sm text-gray-700">{deliverable.fileName || 'N/A'}</p>
        </div>
      </div>

      {/* Phase */}
      {deliverable.phaseName && (
        <div>
          <p className="text-xs text-gray-500 mb-1">단계</p>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-sm">
            {deliverable.phaseName}
          </span>
        </div>
      )}

      {/* Trace links */}
      <div>
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Link2 size={12} />
          추적 연결
        </p>
        <div className="flex items-center justify-center h-16 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
          {/* TODO: Replace with real trace link data */}
          연결된 항목 없음
        </div>
      </div>

      {/* Quick actions */}
      {canEdit && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            수정
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            승인 요청
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function VersionPanel({ deliverable }: { deliverable: any }) {
  // TODO: Replace with real API data for version history
  const mockVersions = [
    {
      version: deliverable.version || '1.0',
      uploadedAt: deliverable.uploadedAt || '2026-02-09T10:00:00Z',
      uploadedBy: deliverable.uploadedBy || 'Unknown',
      status: deliverable.status || 'DRAFT',
      changeNote: 'Initial version',
    },
    {
      version: '0.2',
      uploadedAt: '2026-02-05T14:30:00Z',
      uploadedBy: 'Park Jihoon',
      status: 'REJECTED',
      changeNote: 'Review feedback addressed',
    },
    {
      version: '0.1',
      uploadedAt: '2026-01-28T09:15:00Z',
      uploadedBy: 'Park Jihoon',
      status: 'DRAFT',
      changeNote: 'Initial draft',
    },
  ];

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <History size={16} className="text-indigo-600" />
        버전 이력
      </h3>

      {/* Current file */}
      <div className="bg-indigo-50 rounded-lg p-3">
        <p className="text-xs text-indigo-600 font-medium mb-1">현재 문서</p>
        <p className="text-sm text-gray-800 font-medium">{deliverable.name}</p>
      </div>

      {/* Version timeline */}
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
        <ul className="space-y-4">
          {mockVersions.map((v, index) => (
            <li key={v.version} className="relative pl-8">
              {/* Timeline dot */}
              <div
                className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 ${
                  index === 0
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white border-gray-300'
                }`}
              />

              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    v{v.version}
                  </span>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  {new Date(v.uploadedAt).toLocaleDateString()} by {v.uploadedBy}
                </p>
                <p className="text-xs text-gray-600">{v.changeNote}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ApprovalPanel({ deliverable, canEdit }: { deliverable: any; canEdit: boolean }) {
  const [comment, setComment] = useState('');

  // TODO: Replace with real approval chain data
  const approvalSteps = [
    {
      role: '제출자',
      name: deliverable.uploadedBy || 'Park Jihoon',
      status: 'completed' as const,
      date: deliverable.uploadedAt || '2026-02-07T10:00:00Z',
    },
    {
      role: '검토자',
      name: 'Kim Sujin',
      status: (deliverable.status === 'IN_REVIEW' || deliverable.status === 'APPROVED' || deliverable.status === 'LOCKED'
        ? 'completed'
        : deliverable.status === 'SUBMITTED'
          ? 'active'
          : 'pending') as 'completed' | 'active' | 'pending',
      date: deliverable.status !== 'DRAFT' && deliverable.status !== 'SUBMITTED'
        ? '2026-02-08T14:00:00Z'
        : undefined,
    },
    {
      role: '승인자',
      name: deliverable.approvedBy || deliverable.approver || 'Lee Donghyuk',
      status: (deliverable.status === 'APPROVED' || deliverable.status === 'LOCKED'
        ? 'completed'
        : deliverable.status === 'IN_REVIEW'
          ? 'active'
          : 'pending') as 'completed' | 'active' | 'pending',
      date: deliverable.approvedAt || undefined,
    },
  ];

  const handleApprove = () => {
    // TODO: Wire to real approval API
    console.log('Approved:', { deliverableId: deliverable.id, comment });
  };

  const handleReject = () => {
    // TODO: Wire to real rejection API
    console.log('Rejected:', { deliverableId: deliverable.id, comment });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600" />
        승인 절차
      </h3>

      {/* Current status */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">현재 상태</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-800 font-medium">{deliverable.name}</p>
          <StatusBadge status={deliverable.status} />
        </div>
      </div>

      {/* Approval chain */}
      <div className="space-y-3">
        {approvalSteps.map((step, index) => (
          <div key={step.role}>
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                step.status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : step.status === 'active'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.status === 'completed'
                    ? 'bg-green-600 text-white'
                    : step.status === 'active'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.status === 'completed' ? (
                  <CheckCircle size={14} />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{step.role}</p>
                <p className="text-sm font-medium text-gray-800">{step.name}</p>
              </div>
              {step.date && (
                <p className="text-xs text-gray-400">
                  {new Date(step.date).toLocaleDateString()}
                </p>
              )}
            </div>
            {index < approvalSteps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight size={14} className="text-gray-300 rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comment and action buttons */}
      {canEdit && deliverable.status !== 'APPROVED' && deliverable.status !== 'LOCKED' && (
        <>
          <div>
            <label className="text-xs text-gray-600 block mb-1.5">
              코멘트
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="승인 또는 반려 사유를 입력하세요..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              승인
            </button>
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              반려
            </button>
          </div>
        </>
      )}

      {/* Lock button for approved items */}
      {canEdit && deliverable.status === 'APPROVED' && (
        <button className="w-full px-4 py-2 text-sm font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2">
          <Lock size={14} />
          확정(잠금)
        </button>
      )}
    </div>
  );
}

function UploadPanel({ deliverable }: { deliverable: any }) {
  const [isDragOver, setIsDragOver] = useState(false);
  // TODO: Replace with real upload progress state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // TODO: Wire to real upload API
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 500);
  }, []);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Upload size={16} className="text-blue-600" />
        파일 업로드
      </h3>

      {/* Current deliverable info */}
      {deliverable && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">산출물</p>
          <p className="text-sm text-gray-800 font-medium">{deliverable.name}</p>
          {deliverable.version && (
            <p className="text-xs text-gray-500 mt-0.5">
              현재 버전: v{deliverable.version}
            </p>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <UploadCloud
          size={36}
          className={isDragOver ? 'text-blue-500' : 'text-gray-400'}
        />
        <p className="text-sm text-gray-600 mt-2">
          파일을 여기에 드래그하거나
        </p>
        <button className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
          파일 선택
        </button>
        <p className="text-xs text-gray-400 mt-2">
          PDF, DOCX, XLSX, ZIP (최대 50MB)
        </p>
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <File size={14} className="text-gray-500" />
            <span className="text-sm text-gray-700 flex-1 truncate">uploaded_file.pdf</span>
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {uploadProgress === 100 && (
            <div className="flex items-center gap-1 text-green-600 text-xs">
              <CheckCircle size={12} />
              업로드 완료
            </div>
          )}
        </div>
      )}

      {/* Version note */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">
          변경 사항 메모
        </label>
        <textarea
          rows={2}
          placeholder="이번 버전의 변경 사항을 입력하세요..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        disabled={uploadProgress === null || uploadProgress < 100}
        className="w-full px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        업로드 제출
      </button>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────

export function DeliverableRightPanel({
  mode,
  deliverable,
  preset: _preset,
  onClose,
  onModeChange,
  canEdit,
}: DeliverableRightPanelProps) {
  if (mode === 'none') return null;

  const tabs: { mode: DeliverablePanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'preview', label: '미리보기', icon: <Eye size={14} /> },
    { mode: 'detail', label: '상세', icon: <FileText size={14} /> },
    { mode: 'version', label: '버전', icon: <History size={14} /> },
    { mode: 'approval', label: '승인', icon: <CheckCircle size={14} /> },
    { mode: 'upload', label: '업로드', icon: <Upload size={14} /> },
  ];

  const renderContent = () => {
    if (!deliverable) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          산출물을 선택하세요
        </div>
      );
    }

    switch (mode) {
      case 'preview':
        return <PreviewPanel deliverable={deliverable} />;
      case 'detail':
        return <DetailPanel deliverable={deliverable} canEdit={canEdit} />;
      case 'version':
        return <VersionPanel deliverable={deliverable} />;
      case 'approval':
        return <ApprovalPanel deliverable={deliverable} canEdit={canEdit} />;
      case 'upload':
        return <UploadPanel deliverable={deliverable} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[380px] border border-gray-200 bg-white rounded-xl shadow-sm flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">산출물 상세</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 px-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              mode === tab.mode
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
