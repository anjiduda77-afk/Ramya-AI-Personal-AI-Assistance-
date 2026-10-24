/**
 * RAMYA AI — SHARED SYSTEM CONTRACTS & CLEAN PUBLIC API SCHEMAS
 * Enforces strict frontend-backend isolation. Public contracts expose only
 * user-facing statuses, natural responses, and formatted cards without
 * internal prompts, model names, provider routing, or database connection details.
 */

// 1. User-Facing Assistant States & Orb Dynamics
export type UserFacingStatus =
  | 'ready'
  | 'listening'
  | 'understanding'
  | 'working'
  | 'reading_doc'
  | 'analyzing_screen'
  | 'waiting_approval'
  | 'speaking'
  | 'completed'
  | 'cancelled'
  | 'needs_attention';

// Backward compatibility alias for legacy components
export type OrbState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'success'
  | 'error'
  | UserFacingStatus;

export type PermissionLevel = 'read_only' | 'low_risk' | 'medium_risk' | 'high_risk';

export interface VoiceStatus {
  isListening: boolean;
  isSpeaking: boolean;
  orbState: OrbState;
  userFacingStatus: UserFacingStatus;
  wakeWordDetected: boolean;
  activeLanguage: string;
  transcript: string;
  partialTranscript: string;
  volumeLevel: number;
}

// 2. Command Intents & Request Schemas
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

// 3. User-Facing Response Cards & Grounded Sources
export interface PublicCard {
  type: 'weather' | 'stock' | 'task' | 'reminder' | 'document' | 'screen' | 'quiz' | 'media';
  title: string;
  data: Record<string, any>;
}

export interface GroundedSource {
  title: string;
  reference?: string; // e.g., "Page 3" or "Slide 4"
  snippet?: string;
}

/**
 * Clean Public Assistant Response
 * Exposes only verified, user-centric outcomes without backend implementation leaks.
 */
export interface PublicAssistantResponse {
  status: 'success' | 'needs_approval' | 'attention_required' | 'cancelled';
  message: string;
  spoken_response: string;
  task_id: string;
  intent: IntentType;
  card?: PublicCard;
  sources?: GroundedSource[];
  requires_approval?: boolean;
  approval_prompt?: string;
  timestamp: string;

  // Compatibility fields for existing views
  id?: string;
  query?: string;
  spokenResponse?: string;
  detailedText?: string;
  toolResult?: any;
}

// Alias for general assistant response
export type AssistantResponse = PublicAssistantResponse;

// 4. Screen Intelligence (User-Facing)
export interface ScreenAnalysisRequest {
  mode: 'full_screen' | 'active_window' | 'selection';
  prompt?: string;
}

export interface ScreenAnalysisResult {
  timestamp: string;
  activeWindowName: string;
  extractedText: string;
  summary: string;
  suggestedActions: string[];
  screenshotBase64?: string;
}

// 5. Document & Knowledge RAG
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

// 6. Productivity Items
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

// 7. Live Weather & Stocks
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

// 8. Public Service Health (No Internal Secrets / Model Names Leaked)
export interface PublicServiceHealth {
  status: 'ready' | 'offline' | 'needs_attention';
  service: string;
  version: string;
  isOnline: boolean;
  voiceReady: boolean;
  storageReady: boolean;
  systemMetrics: {
    cpuPercent: number;
    ramPercent: number;
    batteryPercent?: number;
    isOnline: boolean;
  };
  timestamp?: string;

  // Compatibility fields (optional, sanitized)
  localModelAvailable?: boolean;
  ollamaRunning?: boolean;
  cloudProviderConfigured?: boolean;
  databaseConnected?: boolean;
  voiceEngineReady?: boolean;
}

export type HealthData = PublicServiceHealth;

// 9. Developer-Only Diagnostics (Protected & Admin Only)
export interface DeveloperDiagnostics {
  status: string;
  internalProvider: string;
  localModelName: string;
  cloudProviderName: string;
  databasePath: string;
  uptimeSeconds: number;
  recentAuditLogsCount: number;
  memoryUsageMb: number;
}

// 10. Quiz & Interactive Learning
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
