import React, { useState } from 'react';
import { authService, isSupabaseConfigured } from '../services/supabase';
import { UserProfile } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Initiating secure Google authentication...');

    const res = await authService.signInWithGoogle();
    if (!res.success) {
      setLoading(false);
      setErrorMessage(res.error || 'Failed to initialize Google login.');
      setStatusMessage(null);
    } else {
      setStatusMessage('Redirecting to Google OAuth portal...');
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Activating local offline session...');
    try {
      const guest = await authService.continueAsGuest();
      onAuthenticated(guest);
      onClose();
    } catch (e: any) {
      setErrorMessage('Could not activate guest session: ' + e?.message);
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(2, 6, 12, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'linear-gradient(135deg, rgba(10, 16, 28, 0.98), rgba(6, 10, 18, 0.98))',
        border: '1px solid rgba(0, 240, 255, 0.35)',
        boxShadow: '0 0 35px rgba(0, 240, 255, 0.2), inset 0 0 20px rgba(0, 240, 255, 0.05)',
        borderRadius: '16px',
        padding: '32px 28px',
        position: 'relative',
        color: '#fff',
        fontFamily: 'Rajdhani, sans-serif'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.4rem',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          ✕
        </button>

        {/* Header Icon and Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(157, 0, 255, 0.2))',
            border: '2px solid var(--neon-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 14px auto',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
          }}>
            🔮
          </div>
          <h2 style={{
            margin: '0 0 6px 0',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '1.35rem',
            letterSpacing: '1px',
            color: '#fff'
          }}>
            RAMYA AI ACCESS
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            Authenticate to sync memory & preferences across Windows & Android
          </p>
        </div>

        {/* Status / Message Display */}
        {statusMessage && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid var(--neon-cyan)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: 'var(--neon-cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="spinner-border" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--neon-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255, 0, 85, 0.1)',
            border: '1px solid var(--neon-pink)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: 'var(--neon-pink)',
            lineHeight: 1.4
          }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Continue with Google Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 18px',
              background: '#ffffff',
              color: '#3c4043',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              fontFamily: 'Roboto, sans-serif',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)';
            }}
          >
            {/* Google Colorful G Logo */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '8px 0',
            color: 'var(--text-dim)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ padding: '0 12px' }}>or local operation</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {/* Guest Mode Button */}
          <button
            onClick={handleGuestMode}
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              color: 'var(--neon-cyan)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Rajdhani, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 240, 255, 0.16)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)';
            }}
          >
            🛡️ Continue as Local Guest (Offline Mode)
          </button>
        </div>

        {/* Configuration notice if Supabase credentials not set */}
        {!supabaseConfigured && (
          <div style={{
            marginTop: '18px',
            padding: '10px 12px',
            borderRadius: '6px',
            background: 'rgba(255, 170, 0, 0.08)',
            border: '1px solid rgba(255, 170, 0, 0.25)',
            fontSize: '0.72rem',
            color: '#ffa',
            lineHeight: 1.4
          }}>
            💡 <strong>Cloud Sync Note:</strong> Supabase environment variables are currently in template mode. You can use full offline AI, personal memory, and tools right now in Guest Mode. To enable cross-device cloud sync, add your Supabase URL & publishable anon key to <code>.env</code>.
          </div>
        )}

        {/* Security Footer Note */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '0.68rem',
          color: 'var(--text-dim)',
          lineHeight: 1.3
        }}>
          🔒 End-to-end local SQLite outbox pattern. Cloud sync uses Supabase Row-Level Security (RLS). No API keys or private certificates are ever stored on the frontend.
        </div>
      </div>
    </div>
  );
};
