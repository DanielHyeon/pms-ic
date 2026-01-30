import type { ModelInfo, VllmModelInfo, OCREngineInfo } from './types';

// GGUF model definitions
export const AVAILABLE_MODELS: ModelInfo[] = [
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

// vLLM model definitions (HuggingFace format)
export const VLLM_MODELS: VllmModelInfo[] = [
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

// OCR engine definitions
export const OCR_ENGINES: OCREngineInfo[] = [
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

// Derived constants
export const LIGHTWEIGHT_MODELS = AVAILABLE_MODELS.filter(m => m.category === 'lightweight');
export const MEDIUM_MODELS = AVAILABLE_MODELS.filter(m => m.category === 'medium');
export const VLLM_LIGHTWEIGHT_MODELS = VLLM_MODELS.filter(m => m.category === 'lightweight');
export const VLLM_MEDIUM_MODELS = VLLM_MODELS.filter(m => m.category === 'medium');
