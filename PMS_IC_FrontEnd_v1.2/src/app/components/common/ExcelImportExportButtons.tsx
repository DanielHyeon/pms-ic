import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, ChevronDown, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ImportResult, ImportError } from '../../../services/api';

export interface ExcelImportExportButtonsProps {
  onDownloadTemplate: () => Promise<void | Blob | null>;
  onExport: () => Promise<void | Blob | null>;
  onImport: (file: File) => Promise<ImportResult>;
  isDownloadingTemplate?: boolean;
  isExporting?: boolean;
  isImporting?: boolean;
  disabled?: boolean;
  templateLabel?: string;
  exportLabel?: string;
  importLabel?: string;
}

/**
 * Reusable Excel import/export buttons component with dropdown menu
 */
export function ExcelImportExportButtons({
  onDownloadTemplate,
  onExport,
  onImport,
  isDownloadingTemplate = false,
  isExporting = false,
  isImporting = false,
  disabled = false,
  templateLabel = '템플릿 다운로드',
  exportLabel = 'Excel로 내보내기',
  importLabel = 'Excel에서 가져오기',
}: ExcelImportExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = isDownloadingTemplate || isExporting || isImporting;

  const handleDownloadTemplate = async () => {
    setIsOpen(false);
    setErrorMessage(null);
    try {
      await onDownloadTemplate();
    } catch (error) {
      console.error('Template download failed:', error);
      setErrorMessage('템플릿 다운로드에 실패했습니다. 서버 연결을 확인해주세요.');
    }
  };

  const handleExport = async () => {
    setIsOpen(false);
    setErrorMessage(null);
    try {
      await onExport();
    } catch (error) {
      console.error('Export failed:', error);
      setErrorMessage('Excel 내보내기에 실패했습니다. 서버 연결을 확인해주세요.');
    }
  };

  const handleImportClick = () => {
    setIsOpen(false);
    setErrorMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await onImport(file);
        setImportResult(result);
        setShowResultDialog(true);
      } catch (error) {
        console.error('Import failed:', error);
        setErrorMessage('Excel 가져오기에 실패했습니다. 파일 형식과 서버 연결을 확인해주세요.');
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={18} />
          )}
          <span>Excel</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isDownloadingTemplate ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : (
                  <Download size={18} className="text-gray-400" />
                )}
                <span>{templateLabel}</span>
              </button>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : (
                  <Download size={18} className="text-blue-500" />
                )}
                <span>{exportLabel}</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isImporting ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : (
                  <Upload size={18} className="text-green-500" />
                )}
                <span>{importLabel}</span>
              </button>
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600"
              title="닫기"
              aria-label="오류 메시지 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Import Result Dialog */}
      {showResultDialog && importResult && (
        <ImportResultDialog
          result={importResult}
          onClose={() => {
            setShowResultDialog(false);
            setImportResult(null);
          }}
        />
      )}
    </>
  );
}

interface ImportResultDialogProps {
  result: ImportResult;
  onClose: () => void;
}

/**
 * Dialog to show import results with success/error details
 */
export function ImportResultDialog({ result, onClose }: ImportResultDialogProps) {
  const isSuccess = result.errorCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${isSuccess ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle size={24} className="text-green-600" />
            ) : (
              <AlertCircle size={24} className="text-yellow-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {isSuccess ? '가져오기 완료' : '가져오기 완료 (일부 오류)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="닫기"
            aria-label="결과 대화상자 닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{result.totalRows}</div>
              <div className="text-sm text-gray-500">전체 행</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.successCount}</div>
              <div className="text-sm text-gray-500">성공</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.createCount}</div>
              <div className="text-sm text-gray-500">신규 생성</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{result.updateCount}</div>
              <div className="text-sm text-gray-500">업데이트</div>
            </div>
          </div>

          {result.errorCount > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{result.errorCount}</div>
              <div className="text-sm text-gray-500">오류</div>
            </div>
          )}
        </div>

        {/* Error Details */}
        {result.errors && result.errors.length > 0 && (
          <div className="px-6 py-4 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">오류 상세</h4>
            <div className="space-y-2">
              {result.errors.map((error: ImportError, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <span>행 {error.rowNumber}</span>
                    {error.column && (
                      <>
                        <span className="text-red-300">|</span>
                        <span>열: {error.column}</span>
                      </>
                    )}
                  </div>
                  <div className="text-red-600 mt-1">{error.message}</div>
                  {error.value && (
                    <div className="text-red-400 text-xs mt-1">
                      값: {error.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExcelImportExportButtons;
