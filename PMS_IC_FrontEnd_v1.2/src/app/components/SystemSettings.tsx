import { useState, useEffect } from 'react';
import { UserRole } from '../App';
import { Cpu, AlertCircle, CheckCircle, Loader, RefreshCw, FileText, Zap, Scale, Database, Trash2, Upload, FolderOpen, HardDrive, Server } from 'lucide-react';
import { apiService } from '../../services/api';
import DatabaseSettings from './DatabaseSettings';

interface SystemSettingsProps {
  userRole: UserRole;
}

interface ModelInfo {
  name: string;
  displayName: string;
  size: string;
  description: string;
  category: 'lightweight' | 'medium';
}

interface VllmModelInfo {
  modelId: string;
  displayName: string;
  size: string;
  description: string;
  category: 'lightweight' | 'medium';
  supportsToolCalling: boolean;
  supportsJsonSchema: boolean;
}

interface OCREngineInfo {
  id: string;
  name: string;
  description: string;
  license: string;
  commercialUse: boolean;
  accuracy: string;
}

const availableModels: ModelInfo[] = [
  // Lightweight models
  {
    name: 'LFM2-2.6B-Uncensored-X64.i1-Q6_K.gguf',
    displayName: 'LFM2 2.6B',
    size: '2.6B',
    description: '가벼운 모델로 빠른 응답 속도를 제공합니다. 간단한 질문에 적합합니다.',
    category: 'lightweight'
  },
  {
    name: 'Qwen3-4B-Q4_K_M.gguf',
    displayName: 'Qwen3 4B (권장)',
    size: '4B',
    description: '빠른 속도와 우수한 품질. Thinking Mode 지원, 일반 업무에 권장됩니다.',
    category: 'lightweight'
  },
  // Medium models
  {
    name: 'Qwen3-8B-Q5_K_M.gguf',
    displayName: 'Qwen3 8B',
    size: '8B',
    description: '강력한 추론 능력과 한국어 성능을 제공합니다. 복잡한 업무에 적합합니다.',
    category: 'medium'
  },
  {
    name: 'google.gemma-3-12b-pt.Q5_K_M.gguf',
    displayName: 'Gemma 3 12B Q5',
    size: '12B',
    description: '속도와 성능의 균형을 제공합니다. 복잡한 분석 작업에 적합합니다.',
    category: 'medium'
  },
  {
    name: 'google.gemma-3-12b-pt.Q6_K.gguf',
    displayName: 'Gemma 3 12B Q6',
    size: '12B',
    description: '최고 품질의 응답을 제공합니다. 고급 분석 및 보고서 작성에 적합합니다.',
    category: 'medium'
  }
];

// vLLM models (HuggingFace format)
const vllmModels: VllmModelInfo[] = [
  // Lightweight vLLM models
  {
    modelId: 'Qwen/Qwen3-4B',
    displayName: 'Qwen3 4B (권장)',
    size: '4B',
    description: '빠른 속도와 Thinking Mode 지원. 일반 업무에 권장됩니다.',
    category: 'lightweight',
    supportsToolCalling: true,
    supportsJsonSchema: true
  },
  // Medium vLLM models
  {
    modelId: 'Qwen/Qwen3-8B',
    displayName: 'Qwen3 8B (권장)',
    size: '8B',
    description: '강력한 추론 능력과 한국어 성능. Tool calling 지원.',
    category: 'medium',
    supportsToolCalling: true,
    supportsJsonSchema: true
  },
  {
    modelId: 'google/gemma-3-12b-it',
    displayName: 'Gemma 3 12B',
    size: '12B',
    description: '128K 컨텍스트, 높은 품질. HuggingFace 라이선스 동의 필요.',
    category: 'medium',
    supportsToolCalling: true,
    supportsJsonSchema: true
  },
  {
    modelId: 'Qwen/Qwen2.5-7B-Instruct',
    displayName: 'Qwen2.5 7B (Legacy)',
    size: '7B',
    description: '이전 세대 모델. 안정적이고 검증됨.',
    category: 'medium',
    supportsToolCalling: true,
    supportsJsonSchema: true
  }
];

// Filtered vLLM models
const vllmLightweightModels = vllmModels.filter(m => m.category === 'lightweight');
const vllmMediumModels = vllmModels.filter(m => m.category === 'medium');

type EngineMode = 'gguf' | 'vllm' | 'both';

const ocrEngines: OCREngineInfo[] = [
  {
    id: 'varco',
    name: 'VARCO-VISION (고정밀)',
    description: 'NCSOFT VARCO-VISION-2.0-1.7B-OCR. 한국어 OCR 최고 정확도 (97%).',
    license: 'CC-BY-NC-4.0',
    commercialUse: false,
    accuracy: '97%'
  },
  {
    id: 'paddle',
    name: 'PaddleOCR (상업용)',
    description: 'Baidu PaddleOCR 한국어 + PP-Structure. 테이블/레이아웃 분석 지원.',
    license: 'Apache 2.0',
    commercialUse: true,
    accuracy: '88%'
  },
  {
    id: 'tesseract',
    name: 'Tesseract (경량)',
    description: 'Google Tesseract OCR. CPU 전용, 가장 가벼운 옵션.',
    license: 'Apache 2.0',
    commercialUse: true,
    accuracy: '75%'
  },
  {
    id: 'pypdf',
    name: '직접 추출 (OCR 없음)',
    description: 'PDF에서 텍스트 직접 추출. 네이티브 PDF 전용.',
    license: 'MIT',
    commercialUse: true,
    accuracy: '-'
  }
];

export default function SystemSettings({ userRole }: SystemSettingsProps) {
  // GGUF State
  const [currentLightweightModel, setCurrentLightweightModel] = useState<string>('');
  const [currentMediumModel, setCurrentMediumModel] = useState<string>('');
  const [selectedLightweightModel, setSelectedLightweightModel] = useState<string>('');
  const [selectedMediumModel, setSelectedMediumModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isChangingLightweight, setIsChangingLightweight] = useState(false);
  const [isChangingMedium, setIsChangingMedium] = useState(false);

  // OCR State
  const [currentOCR, setCurrentOCR] = useState<string>('varco');
  const [selectedOCR, setSelectedOCR] = useState<string>('varco');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isChangingOCR, setIsChangingOCR] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'llm' | 'ocr' | 'rag' | 'db'>('llm');

  // Engine Mode State
  const [engineMode, setEngineMode] = useState<EngineMode>('gguf');

  // vLLM State (lightweight + medium)
  const [currentVllmLightweight, setCurrentVllmLightweight] = useState<string>('');
  const [currentVllmMedium, setCurrentVllmMedium] = useState<string>('');
  const [selectedVllmLightweight, setSelectedVllmLightweight] = useState<string>('');
  const [selectedVllmMedium, setSelectedVllmMedium] = useState<string>('');
  const [vllmEnabled, setVllmEnabled] = useState(false);
  const [vllmLoading, setVllmLoading] = useState(false);
  const [isChangingVllmLightweight, setIsChangingVllmLightweight] = useState(false);
  const [isChangingVllmMedium, setIsChangingVllmMedium] = useState(false);

  // RAG State
  const [ragDocuments, setRagDocuments] = useState<any[]>([]);
  const [ragFiles, setRagFiles] = useState<any[]>([]);
  const [ragStats, setRagStats] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragLoadingStatus, setRagLoadingStatus] = useState<any>(null);
  const [selectedRagFiles, setSelectedRagFiles] = useState<string[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [isLoadingRag, setIsLoadingRag] = useState(false);
  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  // Admin or PMO_HEAD can access system settings
  const canAccessSystemSettings = userRole === 'admin' || userRole === 'pmo_head';
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const extractModelName = (modelPath?: string) => {
    if (!modelPath) return '';
    const parts = modelPath.split('/');
    return parts[parts.length - 1];
  };

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
        const defaultLightweight = lightweightModels[0]?.name || '';
        setCurrentLightweightModel(defaultLightweight);
        setSelectedLightweightModel(defaultLightweight);
      }

      if (mediumRes.ok) {
        const data = await mediumRes.json();
        const modelName = extractModelName(data?.data?.currentModel || data?.currentModel);
        setCurrentMediumModel(modelName);
        setSelectedMediumModel(modelName);
      } else {
        const defaultMedium = mediumModels[0]?.name || '';
        setCurrentMediumModel(defaultMedium);
        setSelectedMediumModel(defaultMedium);
      }
    } catch (error) {
      console.error('Failed to fetch current models:', error);
      setCurrentLightweightModel(lightweightModels[0]?.name || '');
      setSelectedLightweightModel(lightweightModels[0]?.name || '');
      setCurrentMediumModel(mediumModels[0]?.name || '');
      setSelectedMediumModel(mediumModels[0]?.name || '');
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
      setCurrentVllmLightweight(vllmLightweightModels[0]?.modelId || '');
      setCurrentVllmMedium(vllmMediumModels[0]?.modelId || '');
      setSelectedVllmLightweight(vllmLightweightModels[0]?.modelId || '');
      setSelectedVllmMedium(vllmMediumModels[0]?.modelId || '');
    } finally {
      setVllmLoading(false);
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
        // Handle different error status codes
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
        // Handle different error status codes
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

  const getVllmModelDisplayName = (modelId: string): string => {
    const model = vllmModels.find(m => m.modelId === modelId);
    return model ? model.displayName : modelId;
  };

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
        const engineName = ocrEngines.find(e => e.id === selectedOCR)?.name || selectedOCR;
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

  const getModelDisplayName = (modelPath: string): string => {
    const model = availableModels.find(m => m.name === modelPath);
    return model ? model.displayName : modelPath;
  };

  const lightweightModels = availableModels.filter(m => m.category === 'lightweight');
  const mediumModels = availableModels.filter(m => m.category === 'medium');

  // Access denied for non-admin users
  if (!canAccessSystemSettings) {
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

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 설정</h1>
          <p className="text-gray-600">AI 모델, OCR 엔진, RAG 지식베이스 및 데이터베이스를 관리합니다.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'llm'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Cpu size={18} />
            AI 모델
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'ocr'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText size={18} />
            OCR 엔진
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'rag'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database size={18} />
            RAG 지식베이스
          </button>
          <button
            onClick={() => setActiveTab('db')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'db'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <HardDrive size={18} />
            DB 관리
          </button>
        </div>

        {/* LLM Model Settings Tab */}
        {activeTab === 'llm' && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Cpu className="text-purple-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">AI 모델 설정</h2>
                  <p className="text-sm text-gray-600">사용할 LLM 모델을 선택하세요</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading || vllmLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="animate-spin text-gray-400" size={32} />
                </div>
              ) : (
                <>
                  {/* Engine Selection */}
                  <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50">
                    <h3 className="font-semibold text-gray-900 mb-3">LLM 엔진 선택</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div
                        onClick={() => handleEngineModeChange('gguf')}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          engineMode === 'gguf'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Cpu className={engineMode === 'gguf' ? 'text-green-600' : 'text-gray-400'} size={20} />
                          <span className="font-medium">GGUF 전용</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">로컬 GGUF 모델만 사용 (CPU/GPU)</p>
                      </div>
                      <div
                        onClick={() => handleEngineModeChange('vllm')}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          engineMode === 'vllm'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Server className={engineMode === 'vllm' ? 'text-purple-600' : 'text-gray-400'} size={20} />
                          <span className="font-medium">vLLM 전용</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">HuggingFace 모델, Tool Calling 지원</p>
                      </div>
                      <div
                        onClick={() => handleEngineModeChange('both')}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          engineMode === 'both'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Scale className={engineMode === 'both' ? 'text-blue-600' : 'text-gray-400'} size={20} />
                          <span className="font-medium">자동 선택</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">상황에 따라 최적 엔진 자동 선택</p>
                      </div>
                    </div>
                  </div>

                  {/* GGUF Models Section */}
                  {(engineMode === 'gguf' || engineMode === 'both') && (
                    <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50/30">
                      <div className="flex items-center gap-2 mb-4">
                        <Cpu className="text-green-600" size={20} />
                        <h3 className="font-semibold text-gray-900">GGUF 모델 설정</h3>
                        <span className="text-xs text-gray-500">(로컬 양자화 모델)</span>
                      </div>

                      {/* GGUF Lightweight Models */}
                      <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="text-green-600" size={16} />
                          <h4 className="font-medium text-gray-900">경량 모델</h4>
                          <span className="text-xs text-gray-500">(빠른 응답)</span>
                          <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            {getModelDisplayName(currentLightweightModel) || '미설정'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {lightweightModels.map((model) => (
                            <div
                              key={model.name}
                              onClick={() => setSelectedLightweightModel(model.name)}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedLightweightModel === model.name
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{model.displayName}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{model.size}</span>
                                  {currentLightweightModel === model.name && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">현재</span>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedLightweightModel === model.name ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                }`} />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleLightweightModelChange}
                            disabled={isChangingLightweight || selectedLightweightModel === currentLightweightModel}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                              isChangingLightweight || selectedLightweightModel === currentLightweightModel
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isChangingLightweight ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                            <span>{isChangingLightweight ? '변경 중...' : '변경'}</span>
                          </button>
                        </div>
                      </div>

                      {/* GGUF Medium Models */}
                      <div className="p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Scale className="text-orange-600" size={16} />
                          <h4 className="font-medium text-gray-900">중형 모델</h4>
                          <span className="text-xs text-gray-500">(고품질)</span>
                          <span className="ml-auto text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                            {getModelDisplayName(currentMediumModel) || '미설정'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {mediumModels.map((model) => (
                            <div
                              key={model.name}
                              onClick={() => setSelectedMediumModel(model.name)}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedMediumModel === model.name
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{model.displayName}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{model.size}</span>
                                  {currentMediumModel === model.name && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">현재</span>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedMediumModel === model.name ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                                }`} />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleMediumModelChange}
                            disabled={isChangingMedium || selectedMediumModel === currentMediumModel}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                              isChangingMedium || selectedMediumModel === currentMediumModel
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                          >
                            {isChangingMedium ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                            <span>{isChangingMedium ? '변경 중...' : '변경'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* vLLM Models Section */}
                  {(engineMode === 'vllm' || engineMode === 'both') && (
                    <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50/30">
                      <div className="flex items-center gap-2 mb-4">
                        <Server className="text-purple-600" size={20} />
                        <h3 className="font-semibold text-gray-900">vLLM 모델 설정</h3>
                        <span className="text-xs text-gray-500">(HuggingFace, Tool Calling 지원)</span>
                      </div>

                      {/* vLLM Lightweight Models */}
                      <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="text-purple-600" size={16} />
                          <h4 className="font-medium text-gray-900">경량 모델</h4>
                          <span className="text-xs text-gray-500">(빠른 응답)</span>
                          <span className="ml-auto text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {getVllmModelDisplayName(currentVllmLightweight) || '미설정'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {vllmLightweightModels.map((model) => (
                            <div
                              key={model.modelId}
                              onClick={() => setSelectedVllmLightweight(model.modelId)}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedVllmLightweight === model.modelId
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-900">{model.displayName}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{model.size}</span>
                                  {model.supportsToolCalling && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Tool</span>
                                  )}
                                  {currentVllmLightweight === model.modelId && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">현재</span>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedVllmLightweight === model.modelId ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                }`} />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                              <p className="text-xs text-gray-400 font-mono">{model.modelId}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleVllmLightweightChange}
                            disabled={isChangingVllmLightweight || selectedVllmLightweight === currentVllmLightweight}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                              isChangingVllmLightweight || selectedVllmLightweight === currentVllmLightweight
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            {isChangingVllmLightweight ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                            <span>{isChangingVllmLightweight ? '변경 중...' : '변경'}</span>
                          </button>
                        </div>
                      </div>

                      {/* vLLM Medium Models */}
                      <div className="p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Scale className="text-purple-600" size={16} />
                          <h4 className="font-medium text-gray-900">중형 모델</h4>
                          <span className="text-xs text-gray-500">(고품질)</span>
                          <span className="ml-auto text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {getVllmModelDisplayName(currentVllmMedium) || '미설정'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {vllmMediumModels.map((model) => (
                            <div
                              key={model.modelId}
                              onClick={() => setSelectedVllmMedium(model.modelId)}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedVllmMedium === model.modelId
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-900">{model.displayName}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{model.size}</span>
                                  {model.supportsToolCalling && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Tool</span>
                                  )}
                                  {currentVllmMedium === model.modelId && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">현재</span>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedVllmMedium === model.modelId ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                }`} />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                              <p className="text-xs text-gray-400 font-mono">{model.modelId}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleVllmMediumChange}
                            disabled={isChangingVllmMedium || selectedVllmMedium === currentVllmMedium}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                              isChangingVllmMedium || selectedVllmMedium === currentVllmMedium
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            {isChangingVllmMedium ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                            <span>{isChangingVllmMedium ? '변경 중...' : '변경'}</span>
                          </button>
                        </div>
                      </div>

                      {/* vLLM Info */}
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={14} />
                          <p className="text-xs text-purple-700">
                            vLLM은 HuggingFace 모델을 사용하며 Tool Calling과 JSON Schema를 지원합니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refresh All Button */}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => { fetchCurrentModels(); fetchVllmConfig(); }}
                      disabled={isChangingLightweight || isChangingMedium || isChangingVllmLightweight || isChangingVllmMedium}
                      className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-all"
                    >
                      전체 새로고침
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* OCR Engine Settings Tab */}
        {activeTab === 'ocr' && (
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
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-blue-600" size={16} />
                      <span className="text-sm font-medium text-blue-900">현재 OCR 엔진</span>
                    </div>
                    <p className="text-blue-700 font-semibold">
                      {ocrEngines.find(e => e.id === currentOCR)?.name || currentOCR}
                    </p>
                  </div>

                  {/* OCR Engine Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-3">OCR 엔진 선택</label>
                    {ocrEngines.map((engine) => (
                      <div
                        key={engine.id}
                        onClick={() => setSelectedOCR(engine.id)}
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

                  {/* Warning for non-commercial OCR */}
                  {selectedOCR === 'varco' && (
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
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleOCRChange}
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
                      onClick={fetchCurrentOCR}
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
        )}

        {/* RAG Knowledge Base Settings Tab */}
        {activeTab === 'rag' && (
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
                      <p className="text-2xl font-bold text-blue-700">{ragFiles.length}</p>
                    </div>
                  </div>

                  {/* Loading Status */}
                  {ragLoadingStatus?.is_loading && (
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
                  )}

                  {/* Available Files Section */}
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
                        {ragFiles.map((file: any) => (
                          <div
                            key={file.name}
                            onClick={() => toggleFileSelection(file.name)}
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
                                  onChange={() => toggleFileSelection(file.name)}
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
                          onChange={(e) => setClearExisting(e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                        <span>기존 문서 삭제 후 로딩</span>
                      </label>
                    </div>

                    {/* Load Button */}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={handleLoadRagDocuments}
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

                  {/* Loaded Documents Section */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="text-indigo-600" size={18} />
                        <h3 className="font-semibold text-gray-900">로딩된 문서 목록</h3>
                        <span className="text-xs text-gray-500">({ragDocuments.length}개)</span>
                      </div>
                      {ragDocuments.length > 0 && (
                        <button
                          onClick={() => setClearAllConfirm(true)}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 size={14} />
                          전체 삭제
                        </button>
                      )}
                    </div>

                    {/* Clear All Confirmation */}
                    {clearAllConfirm && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 mb-3">
                          정말로 모든 RAG 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleClearAllRagDocuments}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setClearAllConfirm(false)}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}

                    {ragDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <Database className="mx-auto text-gray-300" size={48} />
                        <p className="text-gray-500 mt-2">로딩된 문서가 없습니다.</p>
                        <p className="text-gray-400 text-sm">위에서 PDF 파일을 선택하여 로딩하세요.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {ragDocuments.map((doc: any) => (
                          <div
                            key={doc.doc_id}
                            className="p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all"
                          >
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
                                {deleteConfirmDocId === doc.doc_id ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDeleteRagDocument(doc.doc_id)}
                                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                      확인
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmDocId(null)}
                                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirmDocId(doc.doc_id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    title="삭제"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <div className="mt-4">
                    <button
                      onClick={fetchRagData}
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
        )}

        {/* Database Settings Tab */}
        {activeTab === 'db' && (
          <DatabaseSettings />
        )}

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              statusMessage.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : statusMessage.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <p className={`text-sm ${
              statusMessage.type === 'success'
                ? 'text-green-700'
                : statusMessage.type === 'error'
                ? 'text-red-700'
                : 'text-blue-700'
            }`}>
              {statusMessage.text}
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>참고:</strong> 모델 변경 시 LLM 서비스가 재시작되므로 약 10-30초 정도 소요될 수 있습니다.
            OCR 엔진 변경은 즉시 적용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
