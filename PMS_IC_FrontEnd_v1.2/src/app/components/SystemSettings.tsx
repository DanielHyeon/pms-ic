import { useState, useEffect } from 'react';
import { UserRole } from '../App';
import { Cpu, AlertCircle, FileText, Database, HardDrive } from 'lucide-react';
import { apiService } from '../../services/api';
import DatabaseSettings from './DatabaseSettings';
import { LLMSettingsTab, OCRSettingsTab, RAGSettingsTab } from './settings';
import {
  LIGHTWEIGHT_MODELS,
  MEDIUM_MODELS,
  VLLM_LIGHTWEIGHT_MODELS,
  VLLM_MEDIUM_MODELS,
  AVAILABLE_MODELS,
  VLLM_MODELS,
  OCR_ENGINES,
} from './settings/constants';
import type { EngineMode, SettingsTab, StatusMessage, RagDocument, RagFile, RagStats, RagLoadingStatus } from './settings/types';

interface SystemSettingsProps {
  userRole: UserRole;
}

/**
 * SystemSettings - Main coordinator component for system configuration
 *
 * Provides tabs for:
 * 1. LLM Model settings (GGUF and vLLM)
 * 2. OCR Engine settings
 * 3. RAG Knowledge Base management
 * 4. Database management
 */
export default function SystemSettings({ userRole }: SystemSettingsProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm');
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  // GGUF State
  const [currentLightweightModel, setCurrentLightweightModel] = useState<string>('');
  const [currentMediumModel, setCurrentMediumModel] = useState<string>('');
  const [selectedLightweightModel, setSelectedLightweightModel] = useState<string>('');
  const [selectedMediumModel, setSelectedMediumModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isChangingLightweight, setIsChangingLightweight] = useState(false);
  const [isChangingMedium, setIsChangingMedium] = useState(false);

  // Engine Mode State
  const [engineMode, setEngineMode] = useState<EngineMode>('gguf');

  // vLLM State
  const [currentVllmLightweight, setCurrentVllmLightweight] = useState<string>('');
  const [currentVllmMedium, setCurrentVllmMedium] = useState<string>('');
  const [selectedVllmLightweight, setSelectedVllmLightweight] = useState<string>('');
  const [selectedVllmMedium, setSelectedVllmMedium] = useState<string>('');
  const [vllmEnabled, setVllmEnabled] = useState(false);
  const [vllmLoading, setVllmLoading] = useState(false);
  const [isChangingVllmLightweight, setIsChangingVllmLightweight] = useState(false);
  const [isChangingVllmMedium, setIsChangingVllmMedium] = useState(false);

  // OCR State
  const [currentOCR, setCurrentOCR] = useState<string>('varco');
  const [selectedOCR, setSelectedOCR] = useState<string>('varco');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isChangingOCR, setIsChangingOCR] = useState(false);

  // RAG State
  const [ragDocuments, setRagDocuments] = useState<RagDocument[]>([]);
  const [ragFiles, setRagFiles] = useState<RagFile[]>([]);
  const [ragStats, setRagStats] = useState<RagStats | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragLoadingStatus, setRagLoadingStatus] = useState<RagLoadingStatus | null>(null);
  const [selectedRagFiles, setSelectedRagFiles] = useState<string[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [isLoadingRag, setIsLoadingRag] = useState(false);
  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  // Constants
  const canAccessSystemSettings = userRole === 'admin' || userRole === 'pmo_head';
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const extractModelName = (modelPath?: string) => {
    if (!modelPath) return '';
    const parts = modelPath.split('/');
    return parts[parts.length - 1];
  };

  const getModelDisplayName = (modelPath: string): string => {
    const model = AVAILABLE_MODELS.find(m => m.name === modelPath);
    return model ? model.displayName : modelPath;
  };

  const getVllmModelDisplayName = (modelId: string): string => {
    const model = VLLM_MODELS.find(m => m.modelId === modelId);
    return model ? model.displayName : modelId;
  };

  // Initial data loading
  useEffect(() => {
    if (canAccessSystemSettings) {
      fetchCurrentModels();
      fetchCurrentOCR();
      fetchVllmConfig();
    }
  }, [canAccessSystemSettings]);

  // Fetch RAG data when RAG tab is active
  useEffect(() => {
    if (activeTab === 'rag' && canAccessSystemSettings) {
      fetchRagData();
    }
  }, [activeTab, canAccessSystemSettings]);

  // Poll for loading status when RAG is loading
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (ragLoadingStatus?.is_loading) {
      interval = setInterval(fetchRagLoadingStatus, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ragLoadingStatus?.is_loading]);

  // ============ Fetch Functions ============

  const fetchCurrentModels = async () => {
    try {
      setLoading(true);
      const [lightweightRes, mediumRes] = await Promise.all([
        fetch(`${apiBaseUrl}/llm/model/lightweight`, { headers: { ...getAuthHeaders() } }),
        fetch(`${apiBaseUrl}/llm/model/medium`, { headers: { ...getAuthHeaders() } })
      ]);

      if (lightweightRes.ok) {
        const data = await lightweightRes.json();
        const modelName = extractModelName(data?.data?.currentModel || data?.currentModel);
        setCurrentLightweightModel(modelName);
        setSelectedLightweightModel(modelName);
      } else {
        const defaultLightweight = LIGHTWEIGHT_MODELS[0]?.name || '';
        setCurrentLightweightModel(defaultLightweight);
        setSelectedLightweightModel(defaultLightweight);
      }

      if (mediumRes.ok) {
        const data = await mediumRes.json();
        const modelName = extractModelName(data?.data?.currentModel || data?.currentModel);
        setCurrentMediumModel(modelName);
        setSelectedMediumModel(modelName);
      } else {
        const defaultMedium = MEDIUM_MODELS[0]?.name || '';
        setCurrentMediumModel(defaultMedium);
        setSelectedMediumModel(defaultMedium);
      }
    } catch (error) {
      console.error('Failed to fetch current models:', error);
      setCurrentLightweightModel(LIGHTWEIGHT_MODELS[0]?.name || '');
      setSelectedLightweightModel(LIGHTWEIGHT_MODELS[0]?.name || '');
      setCurrentMediumModel(MEDIUM_MODELS[0]?.name || '');
      setSelectedMediumModel(MEDIUM_MODELS[0]?.name || '');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentOCR = async () => {
    try {
      setOcrLoading(true);
      const response = await fetch(`${apiBaseUrl}/llm/ocr`, {
        headers: { ...getAuthHeaders() },
      });
      if (response.ok) {
        const data = await response.json();
        const ocrEngine = data?.data?.ocrEngine || data?.ocrEngine || 'varco';
        setCurrentOCR(ocrEngine);
        setSelectedOCR(ocrEngine);
      }
    } catch (error) {
      console.error('Failed to fetch current OCR:', error);
      setCurrentOCR('varco');
      setSelectedOCR('varco');
    } finally {
      setOcrLoading(false);
    }
  };

  const fetchVllmConfig = async () => {
    try {
      setVllmLoading(true);
      const response = await fetch(`${apiBaseUrl}/llm/vllm/config`, {
        headers: { ...getAuthHeaders() },
      });
      if (response.ok) {
        const data = await response.json();
        const config = data?.data || data;
        const lightweightModel = config?.lightweightModel || config?.currentModel || '';
        const mediumModel = config?.mediumModel || config?.currentModel || '';
        setCurrentVllmLightweight(lightweightModel);
        setCurrentVllmMedium(mediumModel);
        setSelectedVllmLightweight(lightweightModel);
        setSelectedVllmMedium(mediumModel);
        setVllmEnabled(config?.enabled || false);
        if (config?.enabled) {
          setEngineMode('vllm');
        }
      }
    } catch (error) {
      console.error('Failed to fetch vLLM config:', error);
      setCurrentVllmLightweight(VLLM_LIGHTWEIGHT_MODELS[0]?.modelId || '');
      setCurrentVllmMedium(VLLM_MEDIUM_MODELS[0]?.modelId || '');
      setSelectedVllmLightweight(VLLM_LIGHTWEIGHT_MODELS[0]?.modelId || '');
      setSelectedVllmMedium(VLLM_MEDIUM_MODELS[0]?.modelId || '');
    } finally {
      setVllmLoading(false);
    }
  };

  const fetchRagData = async () => {
    setRagLoading(true);
    try {
      const [docs, files, stats, status] = await Promise.all([
        apiService.getRagDocuments(),
        apiService.getRagFiles(),
        apiService.getRagStats(),
        apiService.getRagLoadingStatus(),
      ]);
      setRagDocuments(docs?.documents || []);
      setRagFiles(files?.files || []);
      setRagStats(stats);
      setRagLoadingStatus(status);
    } catch (error) {
      console.error('Failed to fetch RAG data:', error);
      setStatusMessage({ type: 'error', text: 'RAG 데이터 조회에 실패했습니다.' });
    } finally {
      setRagLoading(false);
    }
  };

  const fetchRagLoadingStatus = async () => {
    try {
      const status = await apiService.getRagLoadingStatus();
      setRagLoadingStatus(status);
      if (!status?.is_loading && isLoadingRag) {
        setIsLoadingRag(false);
        fetchRagData();
        setStatusMessage({ type: 'success', text: 'RAG 문서 로딩이 완료되었습니다.' });
      }
    } catch (error) {
      console.error('Failed to fetch RAG loading status:', error);
    }
  };

  // ============ Handler Functions ============

  const handleEngineModeChange = async (mode: EngineMode) => {
    setEngineMode(mode);
    try {
      await fetch(`${apiBaseUrl}/llm/vllm/enabled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ enabled: mode === 'vllm' || mode === 'both' }),
      });
      setVllmEnabled(mode === 'vllm' || mode === 'both');
    } catch (error) {
      console.error('Failed to update engine mode:', error);
    }
  };

  const handleLightweightModelChange = async () => {
    if (!selectedLightweightModel || selectedLightweightModel === currentLightweightModel) return;

    setIsChangingLightweight(true);
    setStatusMessage({ type: 'info', text: '경량 모델을 변경하는 중입니다. 잠시만 기다려주세요...' });

    try {
      const response = await fetch(`${apiBaseUrl}/llm/model/lightweight`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ modelPath: selectedLightweightModel }),
      });

      if (response.ok) {
        const data = await response.json();
        const modelName = extractModelName(data?.data?.currentModel || selectedLightweightModel);
        setCurrentLightweightModel(modelName);
        setSelectedLightweightModel(modelName);
        setStatusMessage({ type: 'success', text: `경량 모델이 변경되었습니다: ${getModelDisplayName(selectedLightweightModel)}` });
      } else {
        const error = await response.json();
        setStatusMessage({ type: 'error', text: `경량 모델 변경 실패: ${error.message || '알 수 없는 오류'}` });
      }
    } catch (error) {
      console.error('Failed to change lightweight model:', error);
      setStatusMessage({ type: 'error', text: '경량 모델 변경 중 오류가 발생했습니다.' });
    } finally {
      setIsChangingLightweight(false);
    }
  };

  const handleMediumModelChange = async () => {
    if (!selectedMediumModel || selectedMediumModel === currentMediumModel) return;

    setIsChangingMedium(true);
    setStatusMessage({ type: 'info', text: '중형 모델을 변경하는 중입니다. 잠시만 기다려주세요...' });

    try {
      const response = await fetch(`${apiBaseUrl}/llm/model/medium`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ modelPath: selectedMediumModel }),
      });

      if (response.ok) {
        const data = await response.json();
        const modelName = extractModelName(data?.data?.currentModel || selectedMediumModel);
        setCurrentMediumModel(modelName);
        setSelectedMediumModel(modelName);
        setStatusMessage({ type: 'success', text: `중형 모델이 변경되었습니다: ${getModelDisplayName(selectedMediumModel)}` });
      } else {
        const error = await response.json();
        setStatusMessage({ type: 'error', text: `중형 모델 변경 실패: ${error.message || '알 수 없는 오류'}` });
      }
    } catch (error) {
      console.error('Failed to change medium model:', error);
      setStatusMessage({ type: 'error', text: '중형 모델 변경 중 오류가 발생했습니다.' });
    } finally {
      setIsChangingMedium(false);
    }
  };

  const handleVllmLightweightChange = async () => {
    if (!selectedVllmLightweight || selectedVllmLightweight === currentVllmLightweight) return;

    setIsChangingVllmLightweight(true);
    setStatusMessage({ type: 'info', text: 'vLLM 경량 모델을 변경하는 중입니다...' });

    try {
      const response = await fetch(`${apiBaseUrl}/llm/vllm/model/lightweight`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ modelId: selectedVllmLightweight }),
      });

      if (response.ok) {
        setCurrentVllmLightweight(selectedVllmLightweight);
        const modelName = getVllmModelDisplayName(selectedVllmLightweight);
        setStatusMessage({ type: 'success', text: `vLLM 경량 모델이 변경되었습니다: ${modelName}` });
      } else {
        let errorMessage = '알 수 없는 오류';
        if (response.status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해 주세요.';
        } else if (response.status === 403) {
          errorMessage = '권한이 없습니다.';
        } else if (response.status === 404) {
          errorMessage = 'API 엔드포인트를 찾을 수 없습니다.';
        } else {
          try {
            const error = await response.json();
            errorMessage = error.message || `HTTP ${response.status}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        setStatusMessage({ type: 'error', text: `vLLM 경량 모델 변경 실패: ${errorMessage}` });
      }
    } catch (error) {
      console.error('Failed to change vLLM lightweight model:', error);
      setStatusMessage({ type: 'error', text: 'vLLM 경량 모델 변경 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.' });
    } finally {
      setIsChangingVllmLightweight(false);
    }
  };

  const handleVllmMediumChange = async () => {
    if (!selectedVllmMedium || selectedVllmMedium === currentVllmMedium) return;

    setIsChangingVllmMedium(true);
    setStatusMessage({ type: 'info', text: 'vLLM 중형 모델을 변경하는 중입니다...' });

    try {
      const response = await fetch(`${apiBaseUrl}/llm/vllm/model/medium`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ modelId: selectedVllmMedium }),
      });

      if (response.ok) {
        setCurrentVllmMedium(selectedVllmMedium);
        const modelName = getVllmModelDisplayName(selectedVllmMedium);
        setStatusMessage({ type: 'success', text: `vLLM 중형 모델이 변경되었습니다: ${modelName}` });
      } else {
        let errorMessage = '알 수 없는 오류';
        if (response.status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해 주세요.';
        } else if (response.status === 403) {
          errorMessage = '권한이 없습니다.';
        } else if (response.status === 404) {
          errorMessage = 'API 엔드포인트를 찾을 수 없습니다.';
        } else {
          try {
            const error = await response.json();
            errorMessage = error.message || `HTTP ${response.status}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        setStatusMessage({ type: 'error', text: `vLLM 중형 모델 변경 실패: ${errorMessage}` });
      }
    } catch (error) {
      console.error('Failed to change vLLM medium model:', error);
      setStatusMessage({ type: 'error', text: 'vLLM 중형 모델 변경 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.' });
    } finally {
      setIsChangingVllmMedium(false);
    }
  };

  const handleOCRChange = async () => {
    if (!selectedOCR || selectedOCR === currentOCR) return;

    setIsChangingOCR(true);
    setStatusMessage({ type: 'info', text: 'OCR 엔진을 변경하는 중입니다...' });

    try {
      const response = await fetch(`${apiBaseUrl}/llm/ocr`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ ocrEngine: selectedOCR }),
      });

      if (response.ok) {
        setCurrentOCR(selectedOCR);
        const engineName = OCR_ENGINES.find(e => e.id === selectedOCR)?.name || selectedOCR;
        setStatusMessage({ type: 'success', text: `OCR 엔진이 변경되었습니다: ${engineName}` });
      } else {
        const error = await response.json();
        setStatusMessage({ type: 'error', text: `OCR 변경 실패: ${error.message || '알 수 없는 오류'}` });
      }
    } catch (error) {
      console.error('Failed to change OCR:', error);
      setStatusMessage({ type: 'error', text: 'OCR 엔진 변경 중 오류가 발생했습니다.' });
    } finally {
      setIsChangingOCR(false);
    }
  };

  // RAG handlers
  const handleLoadRagDocuments = async () => {
    setIsLoadingRag(true);
    setStatusMessage({ type: 'info', text: 'RAG 문서를 로딩 중입니다...' });
    try {
      const filesToLoad = selectedRagFiles.length > 0 ? selectedRagFiles : undefined;
      await apiService.loadRagDocuments(filesToLoad, clearExisting);
      setSelectedRagFiles([]);
      setTimeout(fetchRagLoadingStatus, 1000);
    } catch (error) {
      console.error('Failed to load RAG documents:', error);
      setStatusMessage({ type: 'error', text: 'RAG 문서 로딩에 실패했습니다.' });
      setIsLoadingRag(false);
    }
  };

  const handleDeleteRagDocument = async (docId: string) => {
    try {
      await apiService.deleteRagDocument(docId);
      setStatusMessage({ type: 'success', text: `문서 '${docId}'가 삭제되었습니다.` });
      setDeleteConfirmDocId(null);
      fetchRagData();
    } catch (error) {
      console.error('Failed to delete RAG document:', error);
      setStatusMessage({ type: 'error', text: '문서 삭제에 실패했습니다.' });
    }
  };

  const handleClearAllRagDocuments = async () => {
    try {
      const result = await apiService.clearAllRagDocuments();
      setStatusMessage({ type: 'success', text: `${result?.deleted_count || 0}개의 문서가 삭제되었습니다.` });
      setClearAllConfirm(false);
      fetchRagData();
    } catch (error) {
      console.error('Failed to clear RAG documents:', error);
      setStatusMessage({ type: 'error', text: '전체 삭제에 실패했습니다.' });
    }
  };

  const toggleFileSelection = (fileName: string) => {
    setSelectedRagFiles(prev =>
      prev.includes(fileName)
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  // Access denied for non-admin users
  if (!canAccessSystemSettings) {
    return <AccessDenied />;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Header />
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'llm' && (
          <LLMSettingsTab
            engineMode={engineMode}
            onEngineModeChange={handleEngineModeChange}
            currentLightweightModel={currentLightweightModel}
            currentMediumModel={currentMediumModel}
            selectedLightweightModel={selectedLightweightModel}
            selectedMediumModel={selectedMediumModel}
            onSelectLightweightModel={setSelectedLightweightModel}
            onSelectMediumModel={setSelectedMediumModel}
            onChangeLightweightModel={handleLightweightModelChange}
            onChangeMediumModel={handleMediumModelChange}
            isChangingLightweight={isChangingLightweight}
            isChangingMedium={isChangingMedium}
            currentVllmLightweight={currentVllmLightweight}
            currentVllmMedium={currentVllmMedium}
            selectedVllmLightweight={selectedVllmLightweight}
            selectedVllmMedium={selectedVllmMedium}
            onSelectVllmLightweight={setSelectedVllmLightweight}
            onSelectVllmMedium={setSelectedVllmMedium}
            onChangeVllmLightweight={handleVllmLightweightChange}
            onChangeVllmMedium={handleVllmMediumChange}
            isChangingVllmLightweight={isChangingVllmLightweight}
            isChangingVllmMedium={isChangingVllmMedium}
            loading={loading}
            vllmLoading={vllmLoading}
            onRefresh={() => { fetchCurrentModels(); fetchVllmConfig(); }}
          />
        )}

        {activeTab === 'ocr' && (
          <OCRSettingsTab
            currentOCR={currentOCR}
            selectedOCR={selectedOCR}
            onSelectOCR={setSelectedOCR}
            onChangeOCR={handleOCRChange}
            isChangingOCR={isChangingOCR}
            ocrLoading={ocrLoading}
            onRefresh={fetchCurrentOCR}
          />
        )}

        {activeTab === 'rag' && (
          <RAGSettingsTab
            ragDocuments={ragDocuments}
            ragFiles={ragFiles}
            ragStats={ragStats}
            ragLoadingStatus={ragLoadingStatus}
            ragLoading={ragLoading}
            isLoadingRag={isLoadingRag}
            selectedRagFiles={selectedRagFiles}
            clearExisting={clearExisting}
            deleteConfirmDocId={deleteConfirmDocId}
            clearAllConfirm={clearAllConfirm}
            onToggleFileSelection={toggleFileSelection}
            onSetClearExisting={setClearExisting}
            onLoadRagDocuments={handleLoadRagDocuments}
            onDeleteRagDocument={handleDeleteRagDocument}
            onClearAllRagDocuments={handleClearAllRagDocuments}
            onSetDeleteConfirmDocId={setDeleteConfirmDocId}
            onSetClearAllConfirm={setClearAllConfirm}
            onRefresh={fetchRagData}
          />
        )}

        {activeTab === 'db' && <DatabaseSettings />}

        {/* Status Message */}
        {statusMessage && <StatusMessageDisplay message={statusMessage} />}

        {/* Info Section */}
        <InfoFooter />
      </div>
    </div>
  );
}

// ============ Sub-components ============

function AccessDenied() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-red-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-red-700">시스템 설정은 관리자 또는 PMO Head만 접근할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 설정</h1>
      <p className="text-gray-600">AI 모델, OCR 엔진, RAG 지식베이스 및 데이터베이스를 관리합니다.</p>
    </div>
  );
}

interface TabNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'llm', label: 'AI 모델', icon: <Cpu size={18} /> },
    { id: 'ocr', label: 'OCR 엔진', icon: <FileText size={18} /> },
    { id: 'rag', label: 'RAG 지식베이스', icon: <Database size={18} /> },
    { id: 'db', label: 'DB 관리', icon: <HardDrive size={18} /> },
  ];

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface StatusMessageDisplayProps {
  message: StatusMessage;
}

function StatusMessageDisplay({ message }: StatusMessageDisplayProps) {
  return (
    <div
      className={`mt-6 p-4 rounded-lg ${
        message.type === 'success'
          ? 'bg-green-50 border border-green-200'
          : message.type === 'error'
          ? 'bg-red-50 border border-red-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      <p className={`text-sm ${
        message.type === 'success'
          ? 'text-green-700'
          : message.type === 'error'
          ? 'text-red-700'
          : 'text-blue-700'
      }`}>
        {message.text}
      </p>
    </div>
  );
}

function InfoFooter() {
  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <p className="text-sm text-gray-600">
        <strong>참고:</strong> 모델 변경 시 LLM 서비스가 재시작되므로 약 10-30초 정도 소요될 수 있습니다.
        OCR 엔진 변경은 즉시 적용됩니다.
      </p>
    </div>
  );
}
