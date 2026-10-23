/**
 * RAMYA AI — SHARED SYSTEM CONTRACTS
 * Defines all cross-platform interfaces, enums, states, and API contracts.
 */

// 1. Assistant State & Voice Engine
export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'success' | 'error';

export type PermissionLevel = 'read_only' | 'low_risk' | 'medium_risk' | 'high_risk';

export interface VoiceStatus {
  isListening: boolean;
  isSpeaking: boolean;
  orbState: OrbState;
  wakeWordDetected: boolean;
  activeLanguage: string;
  transcript: string;
  partialTranscript: string;
  volumeLevel: number;
}

// 2. Command Router & Intent Classification
export type IntentType =
  | 'system_app'
  | 'screen_analysis'
  | 'document_task'
  | 'productivity'
  | 'live_info'
  | 'quiz_learning'
  | 'conversation'
  | 'media_control'
  | 'settings';

export interface CommandRequest {
  query: string;
  source: 'voice' | 'keyboard' | 'shortcut' | 'api';
  language?: string;
  confirmed?: boolean;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  message: string;
  data?: Record<string, any>;
  requiresConfirmation?: boolean;
  permissionLevel: PermissionLevel;
  error?: string;
  timestamp: string;
}

export interface AssistantResponse {
  id: string;
  query: string;
  intent: IntentType;
  spokenResponse: string;
  detailedText: string;
  toolResult?: ToolExecutionResult;
  providerUsed: 'ollama' | 'cloud' | 'deterministic_router';
  modelUsed: string;
  isOffline: boolean;
  executionTimeMs: number;
  timestamp: string;
}

// 3. Screen Intelligence
export interface ScreenAnalysisRequest {
  mode: 'full_screen' | 'active_window' | 'selection';
  prompt?: string;
}

export interface ScreenAnalysisResult {
  timestamp: string;
  activeWindowName: string;
  extractedText: string;
  uiElements: Array<{
    type: string;
    text: string;
    bounds?: [number, number, number, number];
  }>;
  summary: string;
  suggestedActions: string[];
  screenshotBase64?: string;
}

// 4. Documents & RAG Knowledge Base
export interface DocumentMetadata {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt' | 'csv' | 'md';
  fileSize: number;
  totalPages?: number;
  indexedAt: string;
  chunkCount: number;
  summary?: string;
}

export interface RAGCitation {
  documentId: string;
  filename: string;
  pageOrSlideNumber?: number;
  snippet: string;
  relevanceScore: number;
}

export interface RAGQueryResponse {
  answer: string;
  citations: RAGCitation[];
  sufficientEvidence: boolean;
}

// 5. Personal Productivity
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

export interface ReminderItem {
  id: string;
  text: string;
  triggerTime: string;
  isAcknowledged: boolean;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

// 6. Live Information: Weather & Stocks
export interface WeatherData {
  location: string;
  temperatureC: number;
  condition: string;
  humidityPercent: number;
  windSpeedKmh: number;
  observationTime: string;
  provider: string;
  isLive: boolean;
}

export interface StockQuote {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  timestamp: string;
  isDelayed: boolean;
  provider: string;
}

// 7. System Health & Diagnostics
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'offline';
  localModelAvailable: boolean;
  localModelName: string;
  ollamaRunning: boolean;
  cloudProviderConfigured: boolean;
  cloudProviderName: string;
  databaseConnected: boolean;
  voiceEngineReady: boolean;
  systemMetrics: {
    cpuPercent: number;
    ramPercent: number;
    batteryPercent?: number;
    isOnline: boolean;
  };
  timestamp: string;
}

// 8. Quiz & Learning
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceDocId?: string;
}

export interface QuizSession {
  topic: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  isFinished: boolean;
}
