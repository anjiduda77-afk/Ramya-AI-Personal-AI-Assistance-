import React, { useState } from 'react';
import { api } from '../services/api';

export const DesktopControlScreen: React.FC = () => {
  const [feedback, setFeedback] = useState<string>('');
  const [loadingApp, setLoadingApp] = useState<string | null>(null);

  const apps = [
    { id: 'chrome', label: 'Google Chrome', icon: '🌐' },
    { id: 'notepad', label: 'Notepad Text Editor', icon: '📝' },
    { id: 'calculator', label: 'Windows Calculator', icon: '🧮' },
    { id: 'vscode', label: 'VS Code Editor', icon: '💻' },
    { id: 'explorer', label: 'File Explorer', icon: '📁' },
    { id: 'terminal', label: 'PowerShell / Terminal', icon: '⬛' },
    { id: 'youtube', label: 'YouTube Music / Videos', icon: '▶️' },
    { id: 'spotify', label: 'Spotify', icon: '🎵' }
  ];

  const handleLaunchApp = async (appId: string) => {
    setLoadingApp(appId);
    try {
      const res = await api.sendChat(`Open ${appId}`, 'keyboard', false);
      setFeedback(res.spokenResponse);
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    } finally {
      setLoadingApp(null);
    }
  };

  const handleMediaControl = async (action: string) => {
    try {
      const res = await api.sendChat(`Media ${action}`, 'keyboard', false);
      setFeedback(res.spokenResponse);
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          DESKTOP & WINDOWS OS CONTROL
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Allowlisted application launching, native media key emulation, and window management
        </div>
      </div>

      {feedback && (
        <div style={{ padding: '10px 14px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--neon-cyan)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>
          {feedback}
        </div>
      )}

      {/* Grid: Allowlisted App Launchers */}
      <div className="holo-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '14px' }}>
          VERIFIED ALLOWLISTED APPLICATIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {apps.map((a) => (
            <button
              key={a.id}
              className="cyber-btn"
              disabled={loadingApp === a.id}
              onClick={() => handleLaunchApp(a.id)}
              style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
              <span>{loadingApp === a.id ? 'LAUNCHING...' : a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Media Playback & Volume Control */}
      <div className="holo-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '14px' }}>
          NATIVE MEDIA PLAYBACK & AUDIO CONTROLS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button className="cyber-btn" onClick={() => handleMediaControl('play')}>▶ PLAY</button>
          <button className="cyber-btn" onClick={() => handleMediaControl('pause')}>⏸ PAUSE</button>
          <button className="cyber-btn" onClick={() => handleMediaControl('next')}>⏭ NEXT TRACK</button>
          <button className="cyber-btn" onClick={() => handleMediaControl('previous')}>⏮ PREVIOUS</button>
          <button className="cyber-btn" onClick={() => handleMediaControl('mute')}>🔇 MUTE</button>
          <button className="cyber-btn" onClick={() => handleMediaControl('volume_up')}>🔊 VOLUME +</button>
          <button className="cyber-btn" onClick={() => handleMediaControl('volume_down')}>🔉 VOLUME -</button>
        </div>
      </div>
    </div>
  );
};
