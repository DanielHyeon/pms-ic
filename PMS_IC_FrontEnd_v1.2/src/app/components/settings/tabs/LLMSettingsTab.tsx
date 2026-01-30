import { Cpu, Server, Scale, Zap, Loader, RefreshCw, AlertCircle } from 'lucide-react';
import type { EngineMode, ModelInfo, VllmModelInfo } from '../types';
import {
  LIGHTWEIGHT_MODELS,
  MEDIUM_MODELS,
  VLLM_LIGHTWEIGHT_MODELS,
  VLLM_MEDIUM_MODELS,
  AVAILABLE_MODELS,
  VLLM_MODELS,
} from '../constants';

interface LLMSettingsTabProps {
  // Engine mode
  engineMode: EngineMode;
  onEngineModeChange: (mode: EngineMode) => void;

  // GGUF state
  currentLightweightModel: string;
  currentMediumModel: string;
  selectedLightweightModel: string;
  selectedMediumModel: string;
  onSelectLightweightModel: (model: string) => void;
  onSelectMediumModel: (model: string) => void;
  onChangeLightweightModel: () => void;
  onChangeMediumModel: () => void;
  isChangingLightweight: boolean;
  isChangingMedium: boolean;

  // vLLM state
  currentVllmLightweight: string;
  currentVllmMedium: string;
  selectedVllmLightweight: string;
  selectedVllmMedium: string;
  onSelectVllmLightweight: (model: string) => void;
  onSelectVllmMedium: (model: string) => void;
  onChangeVllmLightweight: () => void;
  onChangeVllmMedium: () => void;
  isChangingVllmLightweight: boolean;
  isChangingVllmMedium: boolean;

  // Loading states
  loading: boolean;
  vllmLoading: boolean;
  onRefresh: () => void;
}

export function LLMSettingsTab({
  engineMode,
  onEngineModeChange,
  currentLightweightModel,
  currentMediumModel,
  selectedLightweightModel,
  selectedMediumModel,
  onSelectLightweightModel,
  onSelectMediumModel,
  onChangeLightweightModel,
  onChangeMediumModel,
  isChangingLightweight,
  isChangingMedium,
  currentVllmLightweight,
  currentVllmMedium,
  selectedVllmLightweight,
  selectedVllmMedium,
  onSelectVllmLightweight,
  onSelectVllmMedium,
  onChangeVllmLightweight,
  onChangeVllmMedium,
  isChangingVllmLightweight,
  isChangingVllmMedium,
  loading,
  vllmLoading,
  onRefresh,
}: LLMSettingsTabProps) {
  const getModelDisplayName = (modelPath: string): string => {
    const model = AVAILABLE_MODELS.find(m => m.name === modelPath);
    return model ? model.displayName : modelPath;
  };

  const getVllmModelDisplayName = (modelId: string): string => {
    const model = VLLM_MODELS.find(m => m.modelId === modelId);
    return model ? model.displayName : modelId;
  };

  return (
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
            <EngineSelector engineMode={engineMode} onEngineModeChange={onEngineModeChange} />

            {/* GGUF Models Section */}
            {(engineMode === 'gguf' || engineMode === 'both') && (
              <GGUFModelsSection
                currentLightweightModel={currentLightweightModel}
                currentMediumModel={currentMediumModel}
                selectedLightweightModel={selectedLightweightModel}
                selectedMediumModel={selectedMediumModel}
                onSelectLightweightModel={onSelectLightweightModel}
                onSelectMediumModel={onSelectMediumModel}
                onChangeLightweightModel={onChangeLightweightModel}
                onChangeMediumModel={onChangeMediumModel}
                isChangingLightweight={isChangingLightweight}
                isChangingMedium={isChangingMedium}
                getModelDisplayName={getModelDisplayName}
              />
            )}

            {/* vLLM Models Section */}
            {(engineMode === 'vllm' || engineMode === 'both') && (
              <VLLMModelsSection
                currentVllmLightweight={currentVllmLightweight}
                currentVllmMedium={currentVllmMedium}
                selectedVllmLightweight={selectedVllmLightweight}
                selectedVllmMedium={selectedVllmMedium}
                onSelectVllmLightweight={onSelectVllmLightweight}
                onSelectVllmMedium={onSelectVllmMedium}
                onChangeVllmLightweight={onChangeVllmLightweight}
                onChangeVllmMedium={onChangeVllmMedium}
                isChangingVllmLightweight={isChangingVllmLightweight}
                isChangingVllmMedium={isChangingVllmMedium}
                getVllmModelDisplayName={getVllmModelDisplayName}
              />
            )}

            {/* Refresh All Button */}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={onRefresh}
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
  );
}

// Engine Selector Sub-component
interface EngineSelectorProps {
  engineMode: EngineMode;
  onEngineModeChange: (mode: EngineMode) => void;
}

function EngineSelector({ engineMode, onEngineModeChange }: EngineSelectorProps) {
  return (
    <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50">
      <h3 className="font-semibold text-gray-900 mb-3">LLM 엔진 선택</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          onClick={() => onEngineModeChange('gguf')}
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
          onClick={() => onEngineModeChange('vllm')}
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
          onClick={() => onEngineModeChange('both')}
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
  );
}

// GGUF Models Section Sub-component
interface GGUFModelsSectionProps {
  currentLightweightModel: string;
  currentMediumModel: string;
  selectedLightweightModel: string;
  selectedMediumModel: string;
  onSelectLightweightModel: (model: string) => void;
  onSelectMediumModel: (model: string) => void;
  onChangeLightweightModel: () => void;
  onChangeMediumModel: () => void;
  isChangingLightweight: boolean;
  isChangingMedium: boolean;
  getModelDisplayName: (modelPath: string) => string;
}

function GGUFModelsSection({
  currentLightweightModel,
  currentMediumModel,
  selectedLightweightModel,
  selectedMediumModel,
  onSelectLightweightModel,
  onSelectMediumModel,
  onChangeLightweightModel,
  onChangeMediumModel,
  isChangingLightweight,
  isChangingMedium,
  getModelDisplayName,
}: GGUFModelsSectionProps) {
  return (
    <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50/30">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="text-green-600" size={20} />
        <h3 className="font-semibold text-gray-900">GGUF 모델 설정</h3>
        <span className="text-xs text-gray-500">(로컬 양자화 모델)</span>
      </div>

      {/* GGUF Lightweight Models */}
      <ModelCategorySection
        title="경량 모델"
        subtitle="(빠른 응답)"
        icon={<Zap className="text-green-600" size={16} />}
        currentModel={currentLightweightModel}
        selectedModel={selectedLightweightModel}
        models={LIGHTWEIGHT_MODELS}
        onSelect={onSelectLightweightModel}
        onChange={onChangeLightweightModel}
        isChanging={isChangingLightweight}
        colorScheme="green"
        getDisplayName={getModelDisplayName}
      />

      {/* GGUF Medium Models */}
      <ModelCategorySection
        title="중형 모델"
        subtitle="(고품질)"
        icon={<Scale className="text-orange-600" size={16} />}
        currentModel={currentMediumModel}
        selectedModel={selectedMediumModel}
        models={MEDIUM_MODELS}
        onSelect={onSelectMediumModel}
        onChange={onChangeMediumModel}
        isChanging={isChangingMedium}
        colorScheme="orange"
        getDisplayName={getModelDisplayName}
        className="mt-4"
      />
    </div>
  );
}

// vLLM Models Section Sub-component
interface VLLMModelsSectionProps {
  currentVllmLightweight: string;
  currentVllmMedium: string;
  selectedVllmLightweight: string;
  selectedVllmMedium: string;
  onSelectVllmLightweight: (model: string) => void;
  onSelectVllmMedium: (model: string) => void;
  onChangeVllmLightweight: () => void;
  onChangeVllmMedium: () => void;
  isChangingVllmLightweight: boolean;
  isChangingVllmMedium: boolean;
  getVllmModelDisplayName: (modelId: string) => string;
}

function VLLMModelsSection({
  currentVllmLightweight,
  currentVllmMedium,
  selectedVllmLightweight,
  selectedVllmMedium,
  onSelectVllmLightweight,
  onSelectVllmMedium,
  onChangeVllmLightweight,
  onChangeVllmMedium,
  isChangingVllmLightweight,
  isChangingVllmMedium,
  getVllmModelDisplayName,
}: VLLMModelsSectionProps) {
  return (
    <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50/30">
      <div className="flex items-center gap-2 mb-4">
        <Server className="text-purple-600" size={20} />
        <h3 className="font-semibold text-gray-900">vLLM 모델 설정</h3>
        <span className="text-xs text-gray-500">(HuggingFace, Tool Calling 지원)</span>
      </div>

      {/* vLLM Lightweight Models */}
      <VLLMModelCategorySection
        title="경량 모델"
        subtitle="(빠른 응답)"
        icon={<Zap className="text-purple-600" size={16} />}
        currentModel={currentVllmLightweight}
        selectedModel={selectedVllmLightweight}
        models={VLLM_LIGHTWEIGHT_MODELS}
        onSelect={onSelectVllmLightweight}
        onChange={onChangeVllmLightweight}
        isChanging={isChangingVllmLightweight}
        getDisplayName={getVllmModelDisplayName}
      />

      {/* vLLM Medium Models */}
      <VLLMModelCategorySection
        title="중형 모델"
        subtitle="(고품질)"
        icon={<Scale className="text-purple-600" size={16} />}
        currentModel={currentVllmMedium}
        selectedModel={selectedVllmMedium}
        models={VLLM_MEDIUM_MODELS}
        onSelect={onSelectVllmMedium}
        onChange={onChangeVllmMedium}
        isChanging={isChangingVllmMedium}
        getDisplayName={getVllmModelDisplayName}
        className="mt-4"
      />

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
  );
}

// Generic Model Category Section for GGUF
interface ModelCategorySectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  currentModel: string;
  selectedModel: string;
  models: ModelInfo[];
  onSelect: (model: string) => void;
  onChange: () => void;
  isChanging: boolean;
  colorScheme: 'green' | 'orange';
  getDisplayName: (model: string) => string;
  className?: string;
}

function ModelCategorySection({
  title,
  subtitle,
  icon,
  currentModel,
  selectedModel,
  models,
  onSelect,
  onChange,
  isChanging,
  colorScheme,
  getDisplayName,
  className = '',
}: ModelCategorySectionProps) {
  const colors = {
    green: {
      badge: 'bg-green-100 text-green-700',
      border: 'border-green-500 bg-green-50',
      radio: 'border-green-500 bg-green-500',
      button: 'bg-green-600 hover:bg-green-700',
    },
    orange: {
      badge: 'bg-orange-100 text-orange-700',
      border: 'border-orange-500 bg-orange-50',
      radio: 'border-orange-500 bg-orange-500',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
  }[colorScheme];

  return (
    <div className={`p-3 border border-gray-200 rounded-lg bg-white ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className="text-xs text-gray-500">{subtitle}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${colors.badge}`}>
          {getDisplayName(currentModel) || '미설정'}
        </span>
      </div>
      <div className="space-y-2">
        {models.map((model) => (
          <div
            key={model.name}
            onClick={() => onSelect(model.name)}
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedModel === model.name
                ? colors.border
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{model.displayName}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{model.size}</span>
                {currentModel === model.name && (
                  <span className={`px-2 py-0.5 text-xs rounded ${colors.badge}`}>현재</span>
                )}
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedModel === model.name ? colors.radio : 'border-gray-300'
              }`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{model.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={onChange}
          disabled={isChanging || selectedModel === currentModel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            isChanging || selectedModel === currentModel
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : `${colors.button} text-white`
          }`}
        >
          {isChanging ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          <span>{isChanging ? '변경 중...' : '변경'}</span>
        </button>
      </div>
    </div>
  );
}

// vLLM Model Category Section
interface VLLMModelCategorySectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  currentModel: string;
  selectedModel: string;
  models: VllmModelInfo[];
  onSelect: (model: string) => void;
  onChange: () => void;
  isChanging: boolean;
  getDisplayName: (model: string) => string;
  className?: string;
}

function VLLMModelCategorySection({
  title,
  subtitle,
  icon,
  currentModel,
  selectedModel,
  models,
  onSelect,
  onChange,
  isChanging,
  getDisplayName,
  className = '',
}: VLLMModelCategorySectionProps) {
  return (
    <div className={`p-3 border border-gray-200 rounded-lg bg-white ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className="text-xs text-gray-500">{subtitle}</span>
        <span className="ml-auto text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
          {getDisplayName(currentModel) || '미설정'}
        </span>
      </div>
      <div className="space-y-2">
        {models.map((model) => (
          <div
            key={model.modelId}
            onClick={() => onSelect(model.modelId)}
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedModel === model.modelId
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
                {currentModel === model.modelId && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">현재</span>
                )}
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedModel === model.modelId ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
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
          onClick={onChange}
          disabled={isChanging || selectedModel === currentModel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            isChanging || selectedModel === currentModel
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isChanging ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          <span>{isChanging ? '변경 중...' : '변경'}</span>
        </button>
      </div>
    </div>
  );
}
