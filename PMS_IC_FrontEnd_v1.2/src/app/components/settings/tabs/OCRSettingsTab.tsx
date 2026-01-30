import { FileText, Loader, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { OCR_ENGINES } from '../constants';

interface OCRSettingsTabProps {
  currentOCR: string;
  selectedOCR: string;
  onSelectOCR: (ocr: string) => void;
  onChangeOCR: () => void;
  isChangingOCR: boolean;
  ocrLoading: boolean;
  onRefresh: () => void;
}

export function OCRSettingsTab({
  currentOCR,
  selectedOCR,
  onSelectOCR,
  onChangeOCR,
  isChangingOCR,
  ocrLoading,
  onRefresh,
}: OCRSettingsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">OCR 엔진 설정</h2>
            <p className="text-sm text-gray-600">PDF 문서 텍스트 추출에 사용할 OCR 엔진을 선택하세요</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {ocrLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <>
            {/* Current OCR Info */}
            <CurrentOCRInfo currentOCR={currentOCR} />

            {/* OCR Engine Selection */}
            <OCREngineSelector
              currentOCR={currentOCR}
              selectedOCR={selectedOCR}
              onSelectOCR={onSelectOCR}
            />

            {/* Warning for non-commercial OCR */}
            {selectedOCR === 'varco' && <VarcoLicenseWarning />}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onChangeOCR}
                disabled={isChangingOCR || selectedOCR === currentOCR}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  isChangingOCR || selectedOCR === currentOCR
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isChangingOCR ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    <span>변경 중...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    <span>OCR 엔진 변경</span>
                  </>
                )}
              </button>
              <button
                onClick={onRefresh}
                disabled={isChangingOCR}
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

interface CurrentOCRInfoProps {
  currentOCR: string;
}

function CurrentOCRInfo({ currentOCR }: CurrentOCRInfoProps) {
  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="text-blue-600" size={16} />
        <span className="text-sm font-medium text-blue-900">현재 OCR 엔진</span>
      </div>
      <p className="text-blue-700 font-semibold">
        {OCR_ENGINES.find(e => e.id === currentOCR)?.name || currentOCR}
      </p>
    </div>
  );
}

interface OCREngineSelectorProps {
  currentOCR: string;
  selectedOCR: string;
  onSelectOCR: (ocr: string) => void;
}

function OCREngineSelector({ currentOCR, selectedOCR, onSelectOCR }: OCREngineSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-3">OCR 엔진 선택</label>
      {OCR_ENGINES.map((engine) => (
        <div
          key={engine.id}
          onClick={() => onSelectOCR(engine.id)}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedOCR === engine.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900">{engine.name}</h4>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  engine.commercialUse
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {engine.commercialUse ? '상업용 가능' : '비상업용'}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {engine.license}
                </span>
                {engine.accuracy !== '-' && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    정확도 {engine.accuracy}
                  </span>
                )}
                {currentOCR === engine.id && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">활성</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">{engine.description}</p>
            </div>
            <div className="ml-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOCR === engine.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}>
                {selectedOCR === engine.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VarcoLicenseWarning() {
  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
        <div>
          <p className="text-sm text-yellow-800 font-medium">라이선스 주의</p>
          <p className="text-sm text-yellow-700 mt-1">
            VARCO-VISION은 CC-BY-NC-4.0 라이선스로 <strong>비상업적 용도</strong>로만 사용할 수 있습니다.
            상업 서비스에는 PaddleOCR를 사용하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
