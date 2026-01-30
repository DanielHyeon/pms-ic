// Model information types

export interface ModelInfo {
  name: string;
  displayName: string;
  size: string;
  description: string;
  category: 'lightweight' | 'medium';
}

export interface VllmModelInfo {
  modelId: string;
  displayName: string;
  size: string;
  description: string;
  category: 'lightweight' | 'medium';
  supportsToolCalling: boolean;
  supportsJsonSchema: boolean;
}

export interface OCREngineInfo {
  id: string;
  name: string;
  description: string;
  license: string;
  commercialUse: boolean;
  accuracy: string;
}

// Engine mode for LLM settings
export type EngineMode = 'gguf' | 'vllm' | 'both';

// Tab types for SystemSettings
export type SettingsTab = 'llm' | 'ocr' | 'rag' | 'db';

// Status message type
export interface StatusMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

// RAG types
export interface RagDocument {
  doc_id: string;
  title?: string;
  file_name?: string;
  chunk_count?: number;
  category?: string;
}

export interface RagFile {
  name: string;
  size_mb: number;
}

export interface RagStats {
  document_count: number;
  chunk_count: number;
}

export interface RagLoadingStatus {
  is_loading: boolean;
  progress?: number;
  current_file?: string;
}
