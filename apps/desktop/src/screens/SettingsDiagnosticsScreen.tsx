import React, { useState, useEffect } from 'react';
import { api, PrivacyPreferences, DeveloperDiagnostics } from '../services/api';
import { audioPlayer } from '../services/audioPlayer';

export const SettingsDiagnosticsScreen: React.FC = () => {
  // Ordinary User Settings State
  const [settings, setSettings] = useState<Record<string, string>>({
    wake_phrase: 'Hey Ramya',
    voice_name: 'en-IN-NeerjaNeural',
    speech_speed: '+0%',
    voice_responses_enabled: 'true',
    auto_listen_after_reply: 'true',
    wake_word_listening: 'true',
    continuous_listening: 'true',
    speech_recognition_lang: 'en-IN',
    silence_threshold_ms: '850',
    theme: 'cyberpunk-neon',
    animation_intensity: 'full'
  });

  const [privacy, setPrivacy] = useState<PrivacyPreferences>({
    offlineOnly: false,
    cloudConsent: false,
    voiceRetentionDays: 30,
    allowScreenAnalysis: true
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Developer Gate State
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [devPasscode, setDevPasscode] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const [devDiagnostics, setDevDiagnostics] = useState<DeveloperDiagnostics | null>(null);
  const [devError, setDevError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [s, p, vs] = await Promise.all([
        api.getSettings(),
        api.getPrivacy(),
        api.getVoiceSettings().catch(() => null)
      ]);
      if (s && Object.keys(s).length > 0) setSettings((prev) => ({ ...prev, ...s }));
      if (vs) {
        setSettings((prev) => ({
          ...prev,
          voice_responses_enabled: String(vs.voice_responses_enabled),
          voice_name: vs.preferred_voice || 'en-IN-NeerjaNeural',
          speech_speed: vs.speech_speed || '+0%',
          auto_listen_after_reply: String(vs.auto_listen_after_reply ?? true),
          wake_word_listening: String(vs.wake_word_listening ?? true),
          continuous_listening: String(vs.continuous_listening ?? true),
          speech_recognition_lang: vs.speech_recognition_lang || 'en-IN',
          silence_threshold_ms: String(vs.silence_threshold_ms || 850)
        }));
      }
      if (p) setPrivacy(p);
    } catch (e) {
      console.warn('Failed to load user settings');
    }
  };

  const handleSaveUserSettings = async () => {
    try {
      await Promise.all([
        api.updateSettings(settings),
        api.updateVoiceSettings({
          voice_responses_enabled: settings.voice_responses_enabled === 'true',
          preferred_voice: settings.voice_name,
          speech_speed: settings.speech_speed,
          auto_listen_after_reply: settings.auto_listen_after_reply === 'true',
          wake_word_listening: settings.wake_word_listening === 'true',
          continuous_listening: settings.continuous_listening === 'true',
          speech_recognition_lang: settings.speech_recognition_lang || 'en-IN',
          silence_threshold_ms: parseInt(settings.silence_threshold_ms || '850', 10)
        }),
        api.updatePrivacy(privacy)
      ]);
      setSaveStatus('Preferences saved successfully.');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e: any) {
      setSaveStatus("Failed to save preferences. Please try again.");
    }
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    try {
      const res = await api.synthesizeVoice(
        "Namaste! I am Ramya, your personal voice-first assistant. I am ready to assist you.",
        settings.voice_name || 'en-IN-NeerjaNeural',
        settings.speech_speed || '+0%'
      );
      if (res.success && res.url) {
        audioPlayer.playSpeech(
          `http://127.0.0.1:8000${res.url}`,
          "Namaste! I am Ramya, your personal voice-first assistant. I am ready to assist you.",
          () => setIsTestingVoice(false),
          () => setIsTestingVoice(false)
        );
      } else {
        setIsTestingVoice(false);
      }
    } catch {
      setIsTestingVoice(false);
    }
  };

  const handlePurgeData = async () => {
    if (window.confirm("Are you sure you want to purge all conversation history and audit logs from this device? This cannot be undone.")) {
      try {
        await api.purgeData(true);
        setSaveStatus("Local conversation history purged successfully.");
        setTimeout(() => setSaveStatus(''), 3500);
      } catch {
        setSaveStatus("Failed to purge data.");
      }
    }
  };

  const handleUnlockDeveloperMode = async () => {
    setDevError('');
    try {
      const res = await api.unlockDeveloperMode(devPasscode);
      if (res.authenticated && res.token) {
        setIsDevUnlocked(true);
        setDevToken(res.token);
        const diag = await api.getDeveloperDiagnostics(res.token);
        setDevDiagnostics(diag);
      }
    } catch {
      setDevError('Invalid passcode. Developer access is restricted.');
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1.5px' }}>
          PREFERENCES & PRIVACY SHIELD
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
          Customize voice, wake phrase, visual aesthetic, and local privacy controls
        </div>
      </div>

      {saveStatus && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid var(--neon-cyan)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: 'var(--neon-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✓</span>
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Grid: Ordinary Settings & Privacy */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Card 1: Voice & Wake Controls */}
        <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 700, letterSpacing: '1px' }}>
              VOICE & ACOUSTIC SETTINGS
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)', background: 'rgba(0, 255, 157, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Speech Pipeline Active
            </span>
          </div>

          {/* 1. Voice Replies On/Off Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(5, 7, 12, 0.6)', borderRadius: '6px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>Spoken Voice Replies</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Speak assistant responses aloud</div>
            </div>
            <button
              onClick={() => {
                const next = settings.voice_responses_enabled !== 'true';
                setSettings({ ...settings, voice_responses_enabled: String(next) });
              }}
              style={{
                background: settings.voice_responses_enabled === 'true' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                color: settings.voice_responses_enabled === 'true' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {settings.voice_responses_enabled === 'true' ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 2. Preferred Voice Model */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              PREFERRED VOICE (INDIAN ENGLISH & OFFLINE)
            </label>
            <select
              value={settings.voice_name || 'en-IN-NeerjaNeural'}
              onChange={(e) => setSettings({ ...settings, voice_name: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(8, 12, 22, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            >
              <option value="en-IN-NeerjaNeural">Indian English Female — Neerja (Natural High-Fi)</option>
              <option value="en-IN-PrabhatNeural">Indian English Male — Prabhat (Natural High-Fi)</option>
              <option value="sarah">Ultra-Realistic Cloud — Sarah (OpenRouter ElevenLabs)</option>
              <option value="en-US-JennyNeural">US English Female — Jenny (Standard)</option>
              <option value="piper-lessac">Offline Piper Neural Voice (100% Offline ONNX Engine)</option>
              <option value="windows-local-sapi5">Native Windows SAPI5 (100% Offline Local Voice)</option>
            </select>
          </div>

          {/* 3. Speech Speed */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              SPEECH SPEED / PACING
            </label>
            <select
              value={settings.speech_speed || '+0%'}
              onChange={(e) => setSettings({ ...settings, speech_speed: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(8, 12, 22, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            >
              <option value="-20%">Slow & Deliberate (0.8x)</option>
              <option value="+0%">Normal Conversational (1.0x)</option>
              <option value="+15%">Brisk (1.15x)</option>
              <option value="+30%">Fast (1.3x)</option>
            </select>
          </div>

          {/* 4. Auto-Listen After Reply */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(5, 7, 12, 0.6)', borderRadius: '6px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>Auto-Listen After Reply</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resume microphone automatically for continuous conversation</div>
            </div>
            <button
              onClick={() => {
                const next = settings.auto_listen_after_reply === 'true' ? 'false' : 'true';
                setSettings({ ...settings, auto_listen_after_reply: next });
              }}
              style={{
                background: settings.auto_listen_after_reply === 'true' ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)',
                color: settings.auto_listen_after_reply === 'true' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {settings.auto_listen_after_reply === 'true' ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 5. Wake Phrase Listening */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(5, 7, 12, 0.6)', borderRadius: '6px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>Wake Phrase ("Hey Ramya")</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Spot wake word in voice commands</div>
            </div>
            <button
              onClick={() => {
                const next = settings.wake_word_listening === 'true' ? 'false' : 'true';
                setSettings({ ...settings, wake_word_listening: next });
              }}
              style={{
                background: settings.wake_word_listening === 'true' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                color: settings.wake_word_listening === 'true' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {settings.wake_word_listening === 'true' ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 6. Speech Recognition Language / Locale */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              SPEECH RECOGNITION LANGUAGE & LOCALE
            </label>
            <select
              value={settings.speech_recognition_lang || 'en-IN'}
              onChange={(e) => setSettings({ ...settings, speech_recognition_lang: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(8, 12, 22, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            >
              <option value="en-IN">Indian English (en-IN) — Default & Preferred</option>
              <option value="te-IN">Telugu (te-IN) — Telugu & Mixed Telugu-English</option>
              <option value="en-US">US English (en-US) — Standard English</option>
            </select>
          </div>

          {/* 7. End-of-Speech Silence Threshold */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              END-OF-SPEECH SILENCE THRESHOLD (VAD DEBOUNCE)
            </label>
            <select
              value={settings.silence_threshold_ms || '850'}
              onChange={(e) => setSettings({ ...settings, silence_threshold_ms: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(8, 12, 22, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            >
              <option value="600">600 ms — Rapid (Minimal pause, fastest response)</option>
              <option value="850">850 ms — Natural Conversational (Recommended)</option>
              <option value="1200">1200 ms — Relaxed (Allows longer thinking pauses)</option>
            </select>
          </div>

          {/* 8. Continuous Listening & Persistent Follow-Up */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(5, 7, 12, 0.6)', borderRadius: '6px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>Continuous Listening / Follow-Up Loop</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Persistent conversation without re-triggering wake word</div>
            </div>
            <button
              onClick={() => {
                const next = settings.continuous_listening === 'true' ? 'false' : 'true';
                setSettings({ ...settings, continuous_listening: next });
              }}
              style={{
                background: settings.continuous_listening === 'true' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                color: settings.continuous_listening === 'true' ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {settings.continuous_listening === 'true' ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 6. Test Voice Button */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              className="cyber-btn"
              disabled={isTestingVoice}
              onClick={handleTestVoice}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <span>🔊</span> {isTestingVoice ? 'PLAYING TEST SPEECH...' : 'TEST VOICE OUTPUT'}
            </button>
          </div>
        </div>

        {/* Card 2: Privacy Shield & Offline Mode */}
        <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: 700, letterSpacing: '1px' }}>
            PRIVACY SHIELD & LOCAL INTELLIGENCE
          </div>

          {/* Offline-Only Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '12px 14px',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>Offline-Only Shield</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                Strictly enforce all operations, voice recognition, and documents remain 100% on this device.
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.offlineOnly}
              onChange={(e) => setPrivacy({ ...privacy, offlineOnly: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--neon-green)' }}
            />
          </div>

          {/* Cloud Intelligence Consent */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '8px 4px'
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>Cloud Intelligence Consent</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                Allow cloud reasoning for external research when the local model is insufficient.
              </div>
            </div>
            <input
              type="checkbox"
              disabled={privacy.offlineOnly}
              checked={!privacy.offlineOnly && privacy.cloudConsent}
              onChange={(e) => setPrivacy({ ...privacy, cloudConsent: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--neon-cyan)' }}
            />
          </div>

          {/* Screen Analysis Permission */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '8px 4px'
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>Allow Screen Understanding</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                Permit Ramya AI to capture active workspace screenshots upon explicit voice request.
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.allowScreenAnalysis}
              onChange={(e) => setPrivacy({ ...privacy, allowScreenAnalysis: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--neon-cyan)' }}
            />
          </div>

          {/* Local Data Purge */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Local Memory & Logs</span>
            <button
              onClick={handlePurgeData}
              style={{
                background: 'rgba(255, 51, 102, 0.1)',
                border: '1px solid var(--neon-red)',
                color: 'var(--neon-red)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontFamily: 'Orbitron, sans-serif',
                cursor: 'pointer'
              }}
            >
              PURGE CONVERSATIONS
            </button>
          </div>
        </div>
      </div>

      {/* Save Settings Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="cyber-btn"
          onClick={handleSaveUserSettings}
          style={{ padding: '12px 28px', fontSize: '0.85rem' }}
        >
          SAVE PREFERENCES
        </button>
      </div>

      {/* PROTECTED DEVELOPER GATE (ISOLATED LAYER) */}
      <div className="holo-card" style={{
        marginTop: '16px',
        padding: '24px',
        border: isDevUnlocked ? '1px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(5, 7, 12, 0.95)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>{isDevUnlocked ? '🔓' : '🔒'}</span>
            <span style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '0.85rem',
              color: isDevUnlocked ? 'var(--neon-cyan)' : 'var(--text-dim)',
              letterSpacing: '1px'
            }}>
              DEVELOPER GATEWAY {isDevUnlocked ? '(AUTHORIZED)' : '(RESTRICTED)'}
            </span>
          </div>
          {isDevUnlocked && (
            <button
              onClick={() => {
                setIsDevUnlocked(false);
                setDevDiagnostics(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--neon-amber)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              LOCK GATEWAY ✕
            </button>
          )}
        </div>

        {!isDevUnlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Developer diagnostics, system runtime telemetry, and database inspectors are protected. Enter developer passcode to authenticate:
            </div>
            <div style={{ display: 'flex', gap: '10px', maxWidth: '380px' }}>
              <input
                type="password"
                value={devPasscode}
                onChange={(e) => setDevPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockDeveloperMode()}
                placeholder="Developer Passcode (e.g., admin)"
                style={{
                  flex: 1,
                  background: 'rgba(8, 12, 22, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                className="cyber-btn cyber-btn-secondary"
                onClick={handleUnlockDeveloperMode}
              >
                UNLOCK
              </button>
            </div>
            {devError && (
              <div style={{ color: 'var(--neon-red)', fontSize: '0.78rem' }}>{devError}</div>
            )}
          </div>
        ) : (
          /* Developer Diagnostics Display */
          devDiagnostics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>INTERNAL ENGINE</div>
                <div style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {devDiagnostics.internalProvider}
                </div>
              </div>
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>LOCAL MODEL</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                  {devDiagnostics.localModelName}
                </div>
              </div>
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>MEMORY USAGE</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                  {devDiagnostics.memoryUsageMb} MB
                </div>
              </div>
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>AUDIT TRAIL LOGS</div>
                <div style={{ color: 'var(--neon-green)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {devDiagnostics.recentAuditLogsCount} entries
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
