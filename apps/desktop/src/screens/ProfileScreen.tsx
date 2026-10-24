import React, { useState, useEffect } from 'react';
import { api, UserProfile, SyncStatus } from '../services/api';
import { authService, isSupabaseConfigured } from '../services/supabase';

interface ProfileScreenProps {
  onOpenAuthModal: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenAuthModal }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayNameInput, setDisplayNameInput] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const res = await api.getUserProfile();
      setProfile(res.profile);
      setSyncStatus(res.sync);
      setDisplayNameInput(res.profile.display_name);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setStatusMsg({ text: 'Failed to load profile data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();

    // Subscribe to auth service events
    const unsub = authService.onProfileChange((updated) => {
      if (updated) {
        setProfile(updated);
        setDisplayNameInput(updated.display_name);
      } else {
        loadProfileData();
      }
    });

    return () => unsub();
  }, []);

  const handleSaveProfile = async () => {
    if (!displayNameInput.trim()) return;
    try {
      setStatusMsg({ text: 'Updating profile...', type: 'info' });
      const res = await api.updateUserProfile(displayNameInput.trim());
      if (res.success) {
        setProfile(res.profile);
        setIsEditing(false);
        setStatusMsg({ text: 'Profile updated successfully.', type: 'success' });
      }
    } catch (e: any) {
      setStatusMsg({ text: 'Update failed: ' + e?.message, type: 'error' });
    }
  };

  const handleFlushSync = async () => {
    try {
      setIsSyncing(true);
      setStatusMsg({ text: 'Flushing offline outbox queue to cloud...', type: 'info' });
      const session = authService.getSession();
      const res = await api.flushSync(session?.access_token);
      setStatusMsg({ text: res.message || 'Synchronization complete.', type: 'success' });
      const updatedSync = await api.getSyncStatus();
      setSyncStatus(updatedSync);
    } catch (e: any) {
      setStatusMsg({ text: 'Sync failed: ' + e?.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = async () => {
    try {
      setStatusMsg({ text: 'Preparing data export...', type: 'info' });
      const data = await api.exportMemories();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ramya_ai_data_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMsg({ text: 'Personal data backup downloaded successfully.', type: 'success' });
    } catch (e: any) {
      setStatusMsg({ text: 'Export failed: ' + e?.message, type: 'error' });
    }
  };

  const handleSignOut = async () => {
    try {
      setStatusMsg({ text: 'Signing out...', type: 'info' });
      await authService.signOut();
      await loadProfileData();
      setStatusMsg({ text: 'Signed out. Operating in offline Guest mode.', type: 'info' });
    } catch (e: any) {
      setStatusMsg({ text: 'Sign out failed: ' + e?.message, type: 'error' });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setStatusMsg({ text: 'Deleting account and local data...', type: 'info' });
      const res = await api.deleteAccount();
      setShowDeleteConfirm(false);
      await loadProfileData();
      setStatusMsg({ text: res.message || 'Account successfully deleted.', type: 'success' });
    } catch (e: any) {
      setStatusMsg({ text: 'Deletion failed: ' + e?.message, type: 'error' });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', color: 'var(--neon-cyan)', fontFamily: 'Rajdhani, sans-serif' }}>
        Loading user profile & synchronization telemetry...
      </div>
    );
  }

  const isAuthenticated = profile?.is_authenticated;
  const isCloudConfigured = isSupabaseConfigured();

  return (
    <div style={{
      padding: '24px',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      color: '#fff',
      fontFamily: 'Rajdhani, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{
            margin: '0 0 4px 0',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '1.45rem',
            color: 'var(--neon-cyan)',
            letterSpacing: '1px'
          }}>
            USER PROFILE & CROSS-DEVICE SYNC
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Verified identity, session management, and offline-first SQLite outbox synchronization
          </p>
        </div>

        {!isAuthenticated && (
          <button
            onClick={onOpenAuthModal}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(157, 0, 255, 0.2))',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Rajdhani, sans-serif',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
            }}
          >
            🔑 Sign In with Google
          </button>
        )}
      </div>

      {/* Status Alert Notification */}
      {statusMsg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          background: statusMsg.type === 'error' ? 'rgba(255, 0, 85, 0.15)' : statusMsg.type === 'success' ? 'rgba(0, 255, 157, 0.15)' : 'rgba(0, 240, 255, 0.15)',
          border: `1px solid ${statusMsg.type === 'error' ? 'var(--neon-pink)' : statusMsg.type === 'success' ? 'var(--neon-green)' : 'var(--neon-cyan)'}`,
          color: statusMsg.type === 'error' ? 'var(--neon-pink)' : statusMsg.type === 'success' ? 'var(--neon-green)' : 'var(--neon-cyan)',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Grid: Profile Card + Sync Status Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        
        {/* 1. Verified Identity Card */}
        <div style={{
          background: 'rgba(10, 16, 28, 0.85)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Avatar Photo */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--neon-cyan)',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
              background: 'rgba(0, 240, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem' }}>👤</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--neon-cyan)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontFamily: 'Rajdhani, sans-serif',
                        fontWeight: 700,
                        flex: 1
                      }}
                    />
                    <button
                      onClick={handleSaveProfile}
                      style={{
                        background: 'var(--neon-cyan)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--text-muted)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>
                      {profile?.display_name || 'Cybernetic Operator'}
                    </h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      title="Edit Display Name"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--neon-cyan)',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                {profile?.email}
              </div>

              {/* Verified Badge */}
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  background: isAuthenticated ? 'rgba(0, 255, 157, 0.15)' : 'rgba(255, 170, 0, 0.15)',
                  border: `1px solid ${isAuthenticated ? 'var(--neon-green)' : '#ffa'}`,
                  color: isAuthenticated ? 'var(--neon-green)' : '#ffa'
                }}>
                  {isAuthenticated ? '✓ Google Verified Session' : '🛡️ Offline Guest Mode'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Details Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account Created:</span>
              <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active session'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Authentication Provider:</span>
              <span style={{ textTransform: 'capitalize' }}>{profile?.provider || 'Guest'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Local Identity Key:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--neon-cyan)', fontSize: '0.78rem' }}>{profile?.id}</span>
            </div>
          </div>

          {/* Sign Out Button */}
          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              style={{
                marginTop: 'auto',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              Sign Out (Switch to Guest Mode)
            </button>
          )}
        </div>

        {/* 2. Cross-Device Synchronisation Card */}
        <div style={{
          background: 'rgba(10, 16, 28, 0.85)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', fontSize: '1.05rem', color: 'var(--neon-cyan)' }}>
              DATABASE SYNCHRONISATION
            </h3>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
              background: syncStatus?.mode === 'hybrid' ? 'rgba(0, 255, 157, 0.15)' : 'rgba(0, 240, 255, 0.15)',
              color: syncStatus?.mode === 'hybrid' ? 'var(--neon-green)' : 'var(--neon-cyan)',
              border: `1px solid ${syncStatus?.mode === 'hybrid' ? 'var(--neon-green)' : 'var(--neon-cyan)'}`
            }}>
              {syncStatus?.mode === 'hybrid' ? 'Hybrid Supabase Cloud' : 'Local SQLite Priority'}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Local-first architecture keeps all your memories and conversation history responsive and safe on-device. When cloud connectivity is present, changes sync securely via PostgreSQL Row-Level Security.
          </p>

          {/* Sync Stats Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 8px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>
                {syncStatus?.pending_count || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending Outbox</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 8px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--neon-green)', fontFamily: 'Orbitron, sans-serif' }}>
                {syncStatus?.synced_count || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Synced Cloud</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 8px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: syncStatus?.failed_count ? 'var(--neon-pink)' : 'var(--text-dim)', fontFamily: 'Orbitron, sans-serif' }}>
                {syncStatus?.failed_count || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Failed Retries</div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Last cloud synchronization: {syncStatus?.last_synced_at ? new Date(syncStatus.last_synced_at).toLocaleString() : 'Never / Offline'}
          </div>

          {/* Flush Outbox Button */}
          <button
            onClick={handleFlushSync}
            disabled={isSyncing}
            style={{
              marginTop: 'auto',
              padding: '11px',
              background: isSyncing ? 'rgba(0, 240, 255, 0.1)' : 'var(--neon-cyan)',
              color: isSyncing ? 'var(--neon-cyan)' : '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isSyncing ? (
              <>
                <span className="spinner-border" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--neon-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Synchronizing Records...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Sync Now (Flush Outbox)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Data Ownership & Privacy Safeguards */}
      <div style={{
        background: 'rgba(10, 16, 28, 0.85)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', fontSize: '1.05rem', color: 'var(--neon-cyan)' }}>
          DATA PRIVACY, EXPORT & ACCOUNT LIFECYCLE
        </h3>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          You retain complete ownership over your personal memories, learning records, and chat history. You can export everything at any moment or purge your local database with one click.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {/* Export Button */}
          <button
            onClick={handleExportData}
            style={{
              padding: '10px 18px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📥</span>
            <span>Export Complete Personal Data (JSON)</span>
          </button>

          {/* Delete Account Button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '10px 18px',
                background: 'rgba(255, 0, 85, 0.1)',
                border: '1px solid var(--neon-pink)',
                color: 'var(--neon-pink)',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🗑️</span>
              <span>Delete Account & Purge Data</span>
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              background: 'rgba(255, 0, 85, 0.2)',
              border: '1px solid var(--neon-pink)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Confirm permanent purge?</span>
              <button
                onClick={handleDeleteAccount}
                style={{
                  background: 'var(--neon-pink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, Purge Everything
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid #fff',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
