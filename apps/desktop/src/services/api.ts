/**
 * Real API client connecting Ramya AI frontend to the local FastAPI backend.
 * Conforms to strict frontend-backend isolation and clean public contracts.
 */

const API_BASE = 'http://127.0.0.1:8000/api';

export interface PublicSystemMetrics {
  cpuPercent: number;
  ramPercent: number;
  batteryPercent?: number;
  isOnline: boolean;
}

export interface HealthData {
  status: 'ready' | 'offline' | 'needs_attention';
  service: string;
  version: string;
  isOnline: boolean;
  voiceReady: boolean;
  storageReady: boolean;
  systemMetrics: PublicSystemMetrics;
  
  // Optional compatibility flags
  localModelAvailable?: boolean;
  ollamaRunning?: boolean;
  cloudProviderConfigured?: boolean;
  databaseConnected?: boolean;
  voiceEngineReady?: boolean;
}

export interface PublicCard {
  type: 'weather' | 'stock' | 'task' | 'reminder' | 'document' | 'screen' | 'quiz' | 'media';
  title: string;
  data: Record<string, any>;
}

export interface GroundedSource {
  title: string;
  reference?: string;
  snippet?: string;
}

export interface AssistantResponse {
  status: 'success' | 'needs_approval' | 'attention_required' | 'cancelled';
  message: string;
  spoken_response: string;
  task_id: string;
  intent: string;
  card?: PublicCard | null;
  sources?: GroundedSource[];
  requires_approval?: boolean;
  approval_prompt?: string | null;
  timestamp: string;

  // Compatibility properties
  id?: string;
  query?: string;
  spokenResponse?: string;
  detailedText?: string;
  toolResult?: any;
}

export interface PrivacyPreferences {
  offlineOnly: boolean;
  cloudConsent: boolean;
  voiceRetentionDays: number;
  allowScreenAnalysis: boolean;
}

export interface DeveloperDiagnostics {
  status: string;
  internalProvider: string;
  localModelName: string;
  cloudProviderName: string;
  databasePath: string;
  recentAuditLogsCount: number;
  cloudUsageTokens: number;
  cloudUsageCostUsd: number;
  memoryUsageMb: number;
}

export const api = {
  async getHealth(): Promise<HealthData> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
    return res.json();
  },

  async sendChat(query: string, source: string = 'keyboard', confirmed: boolean = false): Promise<AssistantResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, source, confirmed })
    });
    if (!res.ok) throw new Error(`Chat request failed: HTTP ${res.status}`);
    return res.json();
  },

  async synthesizeVoice(text: string, voice?: string) {
    const res = await fetch(`${API_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    });
    return res.json();
  },

  async analyzeScreen(prompt?: string) {
    const res = await fetch(`${API_BASE}/screen/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },

  async getWeather(city: string = 'Hyderabad') {
    const res = await fetch(`${API_BASE}/live/weather?city=${encodeURIComponent(city)}`);
    return res.json();
  },

  async getStock(symbol: string) {
    const res = await fetch(`${API_BASE}/live/stock?symbol=${encodeURIComponent(symbol)}`);
    return res.json();
  },

  async getWatchlist() {
    const res = await fetch(`${API_BASE}/live/watchlist`);
    return res.json();
  },

  async getTasks(includeCompleted: boolean = true) {
    const res = await fetch(`${API_BASE}/productivity/tasks?include_completed=${includeCompleted}`);
    return res.json();
  },

  async createTask(title: string, priority: string = 'medium', description?: string) {
    const res = await fetch(`${API_BASE}/productivity/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, description })
    });
    return res.json();
  },

  async toggleTask(taskId: string) {
    const res = await fetch(`${API_BASE}/productivity/tasks/${taskId}/toggle`, { method: 'POST' });
    return res.json();
  },

  async deleteTask(taskId: string) {
    const res = await fetch(`${API_BASE}/productivity/tasks/${taskId}`, { method: 'DELETE' });
    return res.json();
  },

  async getReminders() {
    const res = await fetch(`${API_BASE}/productivity/reminders`);
    return res.json();
  },

  async setReminder(text: string, triggerTime: string) {
    const res = await fetch(`${API_BASE}/productivity/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, trigger_time: triggerTime })
    });
    return res.json();
  },

  async getNotes() {
    const res = await fetch(`${API_BASE}/productivity/notes`);
    return res.json();
  },

  async createNote(title: string, content: string, tags: string[] = []) {
    const res = await fetch(`${API_BASE}/productivity/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, tags })
    });
    return res.json();
  },

  async getDailyPlan() {
    const res = await fetch(`${API_BASE}/productivity/daily-plan`);
    return res.json();
  },

  async listDocuments() {
    const res = await fetch(`${API_BASE}/documents`);
    return res.json();
  },

  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  async queryRAG(query: string) {
    const res = await fetch(`${API_BASE}/documents/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  async getQuizQuestions(topic?: string) {
    const url = topic ? `${API_BASE}/quiz/questions?topic=${encodeURIComponent(topic)}` : `${API_BASE}/quiz/questions`;
    const res = await fetch(url);
    return res.json();
  },

  async verifyQuizAnswer(questionId: string, selectedIndex: number) {
    const res = await fetch(`${API_BASE}/quiz/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, selectedIndex })
    });
    return res.json();
  },

  // Privacy & Data Management
  async getPrivacy(): Promise<PrivacyPreferences> {
    const res = await fetch(`${API_BASE}/privacy`);
    return res.json();
  },

  async updatePrivacy(preferences: Partial<PrivacyPreferences>) {
    const res = await fetch(`${API_BASE}/privacy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
    return res.json();
  },

  async purgeData(confirmed: boolean = true) {
    const res = await fetch(`${API_BASE}/privacy/purge-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed })
    });
    return res.json();
  },

  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: Record<string, string>) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  // Developer Access Gate
  async unlockDeveloperMode(passcode: string): Promise<{ authenticated: boolean; token?: string }> {
    const res = await fetch(`${API_BASE}/developer/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    if (!res.ok) throw new Error('Developer authorization failed.');
    return res.json();
  },

  async getDeveloperDiagnostics(token: string): Promise<DeveloperDiagnostics> {
    const res = await fetch(`${API_BASE}/developer/diagnostics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorized.');
    return res.json();
  },

  async getAuditLogs(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/security/audit-logs`);
      return res.json();
    } catch {
      return [];
    }
  },

  // Personal Memory API
  async getMemories(category?: string, query?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('query', query);
    const url = params.toString() ? `${API_BASE}/memory?${params.toString()}` : `${API_BASE}/memory`;
    const res = await fetch(url);
    return res.json();
  },

  async createMemory(content: string, category: string = 'general', importance: number = 3): Promise<any> {
    const res = await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category, importance })
    });
    return res.json();
  },

  async updateMemory(memoryId: string, content: string, category?: string, importance?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/memory/${memoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category, importance })
    });
    return res.json();
  },

  async deleteMemory(memoryId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/memory/${memoryId}`, { method: 'DELETE' });
    return res.json();
  },

  async exportMemories(): Promise<any> {
    const res = await fetch(`${API_BASE}/memory/export`);
    return res.json();
  },

  async clearAllMemories(): Promise<any> {
    const res = await fetch(`${API_BASE}/memory/clear/all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true })
    });
    return res.json();
  },

  // English Learning Tutor API
  async getEnglishSession(): Promise<any> {
    const res = await fetch(`${API_BASE}/english-tutor/session`);
    return res.json();
  },

  async getEnglishProgress(): Promise<any> {
    const res = await fetch(`${API_BASE}/english-tutor/progress`);
    return res.json();
  },

  async sendEnglishChoice(choice: string): Promise<any> {
    const res = await fetch(`${API_BASE}/english-tutor/choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice })
    });
    return res.json();
  },

  async translateTeluguToEnglish(query: string): Promise<any> {
    const res = await fetch(`${API_BASE}/english-tutor/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Free Legal Music API
  async getMusicStreams(genre?: string): Promise<any[]> {
    const url = genre ? `${API_BASE}/music/streams?genre=${encodeURIComponent(genre)}` : `${API_BASE}/music/streams`;
    const res = await fetch(url);
    return res.json();
  },

  async playMusicStream(query: string = 'relaxing'): Promise<any> {
    const res = await fetch(`${API_BASE}/music/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  async launchMusicApp(app: string = 'youtube'): Promise<any> {
    const res = await fetch(`${API_BASE}/music/app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app })
    });
    return res.json();
  },

  // Web Search API
  async webSearch(q: string): Promise<any> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    return res.json();
  }
};
