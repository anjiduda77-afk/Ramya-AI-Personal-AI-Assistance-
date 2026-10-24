/**
 * Supabase Client & Google OAuth Authentication Service for Ramya AI Desktop.
 * Uses only public publishable key (anon key) with RLS enforced in PostgreSQL.
 * Secrets, service-role keys, and AI provider credentials are NEVER included here.
 */
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { api, UserProfile } from './api';

// Configurable via Vite environment variables
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('placeholder') &&
    !SUPABASE_ANON_KEY.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export class SupabaseAuthService {
  private currentSession: Session | null = null;
  private authSubscribers: ((profile: UserProfile | null) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    if (!supabase) {
      console.info('[Ramya Auth] Running in Local Offline / Guest mode (Supabase not configured).');
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        this.currentSession = data.session;
        await this.syncSessionWithBackend(data.session.access_token);
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[Ramya Auth] Auth state event: ${event}`);
        this.currentSession = session;
        if (session?.access_token) {
          await this.syncSessionWithBackend(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          await api.signOut();
          this.notifySubscribers(null);
        }
      });
    } catch (err) {
      console.warn('[Ramya Auth] Session initialization error (offline fallback active):', err);
    }
  }

  /**
   * Triggers Google OAuth sign-in flow.
   * Desktop windows redirects to local window loopback or callback url.
   */
  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured yet. To connect, please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      };
    }

    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google OAuth failed to initialize.' };
    }
  }

  /**
   * Verifies access token with trusted backend and updates local verified profile.
   */
  async syncSessionWithBackend(token: string): Promise<UserProfile | null> {
    try {
      const res = await api.verifyAuthSession(token);
      if (res.success && res.profile) {
        this.notifySubscribers(res.profile);
        // Also trigger sync outbox flush
        api.flushSync(token).catch(e => console.debug('Sync flush notice:', e));
        return res.profile;
      }
      return null;
    } catch (e) {
      console.error('[Ramya Auth] Backend token verification failed:', e);
      return null;
    }
  }

  /**
   * Signs out current user from Supabase and clears backend auth state.
   */
  async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.debug('Supabase signout notice:', e);
      }
    }
    await api.signOut();
    this.currentSession = null;
    this.notifySubscribers(null);
  }

  /**
   * Switches to offline Guest session.
   */
  async continueAsGuest(): Promise<UserProfile> {
    const res = await api.enterGuestMode();
    this.notifySubscribers(res.profile);
    return res.profile;
  }

  getSession(): Session | null {
    return this.currentSession;
  }

  onProfileChange(cb: (profile: UserProfile | null) => void) {
    this.authSubscribers.push(cb);
    return () => {
      this.authSubscribers = this.authSubscribers.filter(s => s !== cb);
    };
  }

  private notifySubscribers(profile: UserProfile | null) {
    this.authSubscribers.forEach(cb => cb(profile));
  }
}

export const authService = new SupabaseAuthService();
