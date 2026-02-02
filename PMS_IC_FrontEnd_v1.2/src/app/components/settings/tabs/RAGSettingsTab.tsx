import { Database, FileText, FolderOpen, Loader, Trash2, Upload } from 'lucide-react';
import type { RagDocument, RagFile, RagStats, RagLoadingStatus } from '../types';

interface RAGSettingsTabProps {
  ragDocuments: RagDocument[];
  ragFiles: RagFile[];
  ragStats: RagStats | null;
  ragLoadingStatus: RagLoadingStatus | null;
  ragLoading: boolean;
  isLoadingRag: boolean;
  selectedRagFiles: string[];
  clearExisting: boolean;
  deleteConfirmDocId: string | null;
  clearAllConfirm: boolean;
  onToggleFileSelection: (fileName: string) => void;
  onSetClearExisting: (value: boolean) => void;
  onLoadRagDocuments: () => void;
  onDeleteRagDocument: (docId: string) => void;
  onClearAllRagDocuments: () => void;
  onSetDeleteConfirmDocId: (docId: string | null) => void;
  onSetClearAllConfirm: (value: boolean) => void;
  onRefresh: () => void;
}

export function RAGSettingsTab({
  ragDocuments,
  ragFiles,
  ragStats,
  ragLoadingStatus,
  ragLoading,
  isLoadingRag,
  selectedRagFiles,
  clearExisting,
  deleteConfirmDocId,
  clearAllConfirm,
  onToggleFileSelection,
  onSetClearExisting,
  onLoadRagDocuments,
  onDeleteRagDocument,
  onClearAllRagDocuments,
  onSetDeleteConfirmDocId,
  onSetClearAllConfirm,
  onRefresh,
}: RAGSettingsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Database className="text-indigo-600" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">RAG 지식베이스 관리</h2>
            <p className="text-sm text-gray-600">AI 어시스턴트가 사용하는 지식 문서를 관리합니다</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {ragLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <>
            {/* Stats Section */}
            <RAGStatsSection ragStats={ragStats} ragFilesCount={ragFiles.length} />

            {/* Loading Status */}
            {ragLoadingStatus?.is_loading && (
              <RAGLoadingProgress ragLoadingStatus={ragLoadingStatus} />
            )}

            {/* Available Files Section */}
            <AvailableFilesSection
              ragFiles={ragFiles}
              selectedRagFiles={selectedRagFiles}
              clearExisting={clearExisting}
              isLoadingRag={isLoadingRag}
              ragLoadingStatus={ragLoadingStatus}
              onToggleFileSelection={onToggleFileSelection}
              onSetClearExisting={onSetClearExisting}
              onLoadRagDocuments={onLoadRagDocuments}
            />

            {/* Loaded Documents Section */}
            <LoadedDocumentsSection
              ragDocuments={ragDocuments}
              deleteConfirmDocId={deleteConfirmDocId}
              clearAllConfirm={clearAllConfirm}
              onDeleteRagDocument={onDeleteRagDocument}
              onClearAllRagDocuments={onClearAllRagDocuments}
              onSetDeleteConfirmDocId={onSetDeleteConfirmDocId}
              onSetClearAllConfirm={onSetClearAllConfirm}
            />

            {/* Refresh Button */}
            <div className="mt-4">
              <button
                onClick={onRefresh}
                disabled={ragLoading}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                새로고침
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components

interface RAGStatsSectionProps {
  ragStats: RagStats | null;
  ragFilesCount: number;
}

function RAGStatsSection({ ragStats, ragFilesCount }: RAGStatsSectionProps) {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div className="text-sm font-medium text-indigo-900">총 문서 수</div>
        <p className="text-2xl font-bold text-indigo-700">{ragStats?.document_count || 0}</p>
      </div>
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-sm font-medium text-green-900">총 청크 수</div>
        <p className="text-2xl font-bold text-green-700">{ragStats?.chunk_count || 0}</p>
      </div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm font-medium text-blue-900">사용 가능한 파일</div>
        <p className="text-2xl font-bold text-blue-700">{ragFilesCount}</p>
      </div>
    </div>
  );
}

interface RAGLoadingProgressProps {
  ragLoadingStatus: RagLoadingStatus;
}

function RAGLoadingProgress({ ragLoadingStatus }: RAGLoadingProgressProps) {
  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <Loader className="animate-spin text-yellow-600" size={20} />
        <span className="font-medium text-yellow-900">문서 로딩 중...</span>
      </div>
      <div className="w-full bg-yellow-200 rounded-full h-2">
        <div
          className="bg-yellow-600 h-2 rounded-full transition-all"
          style={{ width: `${ragLoadingStatus.progress || 0}%` }}
        />
      </div>
      <div className="mt-2 text-sm text-yellow-700">
        {ragLoadingStatus.current_file && (
          <span>현재 파일: {ragLoadingStatus.current_file}</span>
        )}
        <span className="ml-4">진행률: {ragLoadingStatus.progress || 0}%</span>
      </div>
    </div>
  );
}

interface AvailableFilesSectionProps {
  ragFiles: RagFile[];
  selectedRagFiles: string[];
  clearExisting: boolean;
  isLoadingRag: boolean;
  ragLoadingStatus: RagLoadingStatus | null;
  onToggleFileSelection: (fileName: string) => void;
  onSetClearExisting: (value: boolean) => void;
  onLoadRagDocuments: () => void;
}

function AvailableFilesSection({
  ragFiles,
  selectedRagFiles,
  clearExisting,
  isLoadingRag,
  ragLoadingStatus,
  onToggleFileSelection,
  onSetClearExisting,
  onLoadRagDocuments,
}: AvailableFilesSectionProps) {
  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen className="text-blue-600" size={18} />
        <h3 className="font-semibold text-gray-900">사용 가능한 PDF 파일</h3>
        <span className="text-xs text-gray-500">(ragdata 디렉토리)</span>
      </div>
      {ragFiles.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">사용 가능한 PDF 파일이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {ragFiles.map((file) => (
            <div
              key={file.name}
              onClick={() => onToggleFileSelection(file.name)}
              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedRagFiles.includes(file.name)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRagFiles.includes(file.name)}
                    onChange={() => onToggleFileSelection(file.name)}
                    aria-label={`Select ${file.name}`}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <FileText size={16} className="text-gray-500" />
                  <span className="font-medium text-gray-900">{file.name}</span>
                </div>
                <span className="text-xs text-gray-500">{file.size_mb} MB</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load Options */}
      <div className="mt-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={clearExisting}
            onChange={(e) => onSetClearExisting(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded"
          />
          <span>기존 문서 삭제 후 로딩</span>
        </label>
      </div>

      {/* Load Button */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={onLoadRagDocuments}
          disabled={isLoadingRag || ragLoadingStatus?.is_loading || ragFiles.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            isLoadingRag || ragLoadingStatus?.is_loading || ragFiles.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          <Upload size={16} />
          <span>
            {selectedRagFiles.length > 0
              ? `선택한 ${selectedRagFiles.length}개 파일 로딩`
              : '전체 파일 로딩'}
          </span>
        </button>
      </div>
    </div>
  );
}

interface LoadedDocumentsSectionProps {
  ragDocuments: RagDocument[];
  deleteConfirmDocId: string | null;
  clearAllConfirm: boolean;
  onDeleteRagDocument: (docId: string) => void;
  onClearAllRagDocuments: () => void;
  onSetDeleteConfirmDocId: (docId: string | null) => void;
  onSetClearAllConfirm: (value: boolean) => void;
}

function LoadedDocumentsSection({
  ragDocuments,
  deleteConfirmDocId,
  clearAllConfirm,
  onDeleteRagDocument,
  onClearAllRagDocuments,
  onSetDeleteConfirmDocId,
  onSetClearAllConfirm,
}: LoadedDocumentsSectionProps) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="text-indigo-600" size={18} />
          <h3 className="font-semibold text-gray-900">로딩된 문서 목록</h3>
          <span className="text-xs text-gray-500">({ragDocuments.length}개)</span>
        </div>
        {ragDocuments.length > 0 && (
          <button
            onClick={() => onSetClearAllConfirm(true)}
            className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-all"
          >
            <Trash2 size={14} />
            전체 삭제
          </button>
        )}
      </div>

      {/* Clear All Confirmation */}
      {clearAllConfirm && (
        <ClearAllConfirmation
          onConfirm={onClearAllRagDocuments}
          onCancel={() => onSetClearAllConfirm(false)}
        />
      )}

      {ragDocuments.length === 0 ? (
        <EmptyDocumentsPlaceholder />
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {ragDocuments.map((doc) => (
            <DocumentRow
              key={doc.doc_id}
              doc={doc}
              isConfirmingDelete={deleteConfirmDocId === doc.doc_id}
              onDelete={() => onDeleteRagDocument(doc.doc_id)}
              onConfirmDelete={() => onSetDeleteConfirmDocId(doc.doc_id)}
              onCancelDelete={() => onSetDeleteConfirmDocId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ClearAllConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function ClearAllConfirmation({ onConfirm, onCancel }: ClearAllConfirmationProps) {
  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-700 mb-3">
        정말로 모든 RAG 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          확인
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function EmptyDocumentsPlaceholder() {
  return (
    <div className="text-center py-8">
      <Database className="mx-auto text-gray-300" size={48} />
      <p className="text-gray-500 mt-2">로딩된 문서가 없습니다.</p>
      <p className="text-gray-400 text-sm">위에서 PDF 파일을 선택하여 로딩하세요.</p>
    </div>
  );
}

interface DocumentRowProps {
  doc: RagDocument;
  isConfirmingDelete: boolean;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function DocumentRow({
  doc,
  isConfirmingDelete,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: DocumentRowProps) {
  return (
    <div className="p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-500 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{doc.title || doc.doc_id}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            {doc.file_name && <span>{doc.file_name}</span>}
            <span className="px-1.5 py-0.5 bg-gray-100 rounded">{doc.chunk_count} 청크</span>
            {doc.category && (
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                {doc.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {isConfirmingDelete ? (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                확인
              </button>
              <button
                onClick={onCancelDelete}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={onConfirmDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
              title="삭제"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
