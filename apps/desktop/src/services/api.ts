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

export interface VoiceSettings {
  voice_responses_enabled: boolean;
  preferred_voice: string;
  speech_speed: string;
  auto_listen_after_reply: boolean;
  wake_word_listening: boolean;
  continuous_listening?: boolean;
  speech_recognition_lang?: string;
  silence_threshold_ms?: number;
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

export interface UserProfile {
  id: string;
  supabase_user_id?: string | null;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  provider: string;
  is_authenticated: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SyncStatus {
  is_cloud_configured: boolean;
  pending_count: number;
  synced_count: number;
  failed_count: number;
  last_synced_at?: string | null;
  mode: 'hybrid' | 'offline_local';
}

export interface TaskPlan {
  plan_id: string;
  goal: string;
  steps: {
    step: number;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    output?: string;
  }[];
  status: string;
  message: string;
  spoken_response: string;
}

export interface DeviceCapability {
  id: string;
  name: string;
  description: string;
  supported_platforms: string[];
  min_os_version: string;
  required_permissions: string[];
  requires_internet: boolean;
  processing_mode: string;
  risk_level: string;
  requires_confirmation: boolean;
  is_enabled: boolean;
  is_platform_supported: boolean;
  status: string;
  os_settings_hint: string;
}

export interface UnifiedSearchResult {
  id: string;
  source: string;
  title: string;
  snippet: string;
  relevance_score: number;
  final_score?: number;
  timestamp: string;
  action_type: string;
  action_target: string;
  metadata?: Record<string, any>;
}

export interface Tracker {
  id: string;
  title: string;
  tracker_type: string;
  target: string;
  status: 'normal' | 'alert' | 'active' | 'paused';
  check_interval_seconds: number;
  last_checked: string;
  next_check: string;
  change_summary: string;
  notification_preference: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TrackerEvent {
  id: string;
  tracker_id: string;
  tracker_title: string;
  tracker_type: string;
  event_type: string;
  title: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
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

  async synthesizeVoice(text: string, voice?: string, rate?: string, forceOffline?: boolean) {
    const res = await fetch(`${API_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, rate, force_offline: forceOffline })
    });
    return res.json();
  },

  async getVoiceSettings(): Promise<VoiceSettings> {
    try {
      const res = await fetch(`${API_BASE}/voice/settings`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      voice_responses_enabled: true,
      preferred_voice: 'en-IN-NeerjaNeural',
      speech_speed: '+0%',
      auto_listen_after_reply: false,
      wake_word_listening: true,
      continuous_listening: true,
      speech_recognition_lang: 'en-IN',
      silence_threshold_ms: 850
    };
  },

  async updateVoiceSettings(settings: Partial<VoiceSettings>): Promise<any> {
    const res = await fetch(`${API_BASE}/voice/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async getAutomationTools(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/tools`);
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
  },

  // Authentication & Verified User Profile
  async getUserProfile(): Promise<{ profile: UserProfile; sync: SyncStatus }> {
    const res = await fetch(`${API_BASE}/auth/profile`);
    return res.json();
  },

  async verifyAuthSession(token: string): Promise<{ success: boolean; profile: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!res.ok) throw new Error('Authentication verification failed.');
    return res.json();
  },

  async updateUserProfile(displayName?: string, avatarUrl?: string): Promise<{ success: boolean; profile: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl })
    });
    return res.json();
  },

  async enterGuestMode(): Promise<{ success: boolean; profile: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/guest`, { method: 'POST' });
    return res.json();
  },

  async signOut(): Promise<{ success: boolean; profile: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/signout`, { method: 'POST' });
    return res.json();
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true })
    });
    return res.json();
  },

  // Synchronisation
  async getSyncStatus(): Promise<SyncStatus> {
    const res = await fetch(`${API_BASE}/sync/status`);
    return res.json();
  },

  async flushSync(token?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sync/flush`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return res.json();
  },

  // Multi-Step Task Planning
  async executePlan(goal: string, confirmed: boolean = false): Promise<TaskPlan> {
    const res = await fetch(`${API_BASE}/intelligence/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, confirmed })
    });
    return res.json();
  },

  // Context Awareness
  async getActiveContext(): Promise<any> {
    const res = await fetch(`${API_BASE}/intelligence/context`);
    return res.json();
  },

  // Security Capabilities
  async getCapabilities(): Promise<DeviceCapability[]> {
    const res = await fetch(`${API_BASE}/security/capabilities`);
    return res.json();
  },

  async toggleCapability(capabilityId: string, enabled: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/security/capabilities/${capabilityId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return res.json();
  },

  // Unified Search Engine
  async unifiedSearch(query: string, source: string = 'all', mode: string = 'hybrid'): Promise<any> {
    const params = new URLSearchParams({ q: query, source, mode });
    const res = await fetch(`${API_BASE}/search/unified?${params.toString()}`);
    return res.json();
  },

  // Accurate Tracking & Monitoring
  async getTrackingDashboard(): Promise<{ trackers: Tracker[]; events: TrackerEvent[]; total_active: number }> {
    const res = await fetch(`${API_BASE}/tracking`);
    return res.json();
  },

  async createTracker(data: { title: string; tracker_type: string; target: string; check_interval_seconds?: number; notification_preference?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async toggleTracker(trackerId: string, pause?: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/tracking/${trackerId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pause })
    });
    return res.json();
  },

  async deleteTracker(trackerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tracking/${trackerId}`, { method: 'DELETE' });
    return res.json();
  },

  async forceCheckTracker(trackerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tracking/${trackerId}/check`, { method: 'POST' });
    return res.json();
  },

  async markEventRead(eventId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tracking/events/${eventId}/read`, { method: 'POST' });
    return res.json();
  }
};
