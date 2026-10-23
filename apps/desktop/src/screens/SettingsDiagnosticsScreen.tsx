import React, { useState, useEffect } from 'react';
import { api, HealthData } from '../services/api';

export const SettingsDiagnosticsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    wake_phrase: 'Hey Ramya',
    voice_name: 'en-IN-NeerjaNeural',
    default_provider: 'ollama',
    ollama_model: 'gemma3:4b',
    theme: 'cyberpunk-neon'
  });
  const [healthResult, setHealthResult] = useState<HealthData | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.warn);
  }, []);

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      setSaveStatus('Settings updated successfully.');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e: any) {
      setSaveStatus(`Failed to save: ${e.message}`);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunningDiag(true);
    try {
      const h = await api.getHealth();
      setHealthResult(h);
    } catch (e) {
      console.warn('Diagnostics error:', e);
    } finally {
      setRunningDiag(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          SETTINGS & SYSTEM DIAGNOSTICS
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Configure primary wake phrases, local model endpoints, voice synthesis, and run system health checks
        </div>
      </div>

      {saveStatus && (
        <div style={{ padding: '10px 14px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--neon-cyan)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>
          {saveStatus}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Settings Form */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            CONFIGURATION PARAMETERS
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              PRIMARY WAKE PHRASE
            </label>
            <input
              type="text"
              value={settings.wake_phrase || 'Hey Ramya'}
              onChange={(e) => setSettings({ ...settings, wake_phrase: e.target.value })}
              style={{ width: '100%', background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              LOCAL MODEL NAME (OLLAMA)
            </label>
            <input
              type="text"
              value={settings.ollama_model || 'gemma3:4b'}
              onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
              style={{ width: '100%', background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              SPEECH SYNTHESIS VOICE
            </label>
            <input
              type="text"
              value={settings.voice_name || 'en-IN-NeerjaNeural'}
              onChange={(e) => setSettings({ ...settings, voice_name: e.target.value })}
              style={{ width: '100%', background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '10px', borderRadius: '6px' }}
            />
          </div>

          <button className="cyber-btn" onClick={handleSave} style={{ marginTop: '8px' }}>
            SAVE SETTINGS
          </button>
        </div>

        {/* Diagnostics & Subsystem Health Card */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
              SUBSYSTEM DIAGNOSTICS TEST
            </span>
            <button className="cyber-btn" onClick={handleRunDiagnostics} disabled={runningDiag}>
              {runningDiag ? 'TESTING...' : 'RUN SELF-TEST'}
            </button>
          </div>

          {healthResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span>Local Ollama Server</span>
                <span style={{ color: healthResult.ollamaRunning ? 'var(--neon-green)' : 'var(--neon-amber)' }}>
                  {healthResult.ollamaRunning ? 'ONLINE (127.0.0.1:11434)' : 'OFFLINE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span>Local Model Installed</span>
                <span style={{ color: healthResult.localModelAvailable ? 'var(--neon-green)' : 'var(--neon-amber)' }}>
                  {healthResult.localModelName} ({healthResult.localModelAvailable ? 'READY' : 'NOT FOUND'})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span>SQLite Migrations Engine</span>
                <span style={{ color: healthResult.databaseConnected ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                  {healthResult.databaseConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span>Voice Pipeline Core</span>
                <span style={{ color: healthResult.voiceEngineReady ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                  {healthResult.voiceEngineReady ? 'ACTIVE' : 'ERROR'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '30px 0' }}>
              Click "Run Self-Test" to inspect local Ollama model availability, database integrity, and voice services.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
