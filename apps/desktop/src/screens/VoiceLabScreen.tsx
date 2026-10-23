import React, { useState } from 'react';
import { api } from '../services/api';

export const VoiceLabScreen: React.FC = () => {
  const [testText, setTestText] = useState('Hello! I am Ramya AI, speaking in natural Indian English.');
  const [selectedVoice, setSelectedVoice] = useState('en-IN-NeerjaNeural');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const voices = [
    { id: 'en-IN-NeerjaNeural', name: 'Indian English — Neerja (Natural Female)' },
    { id: 'en-IN-PrabhatNeural', name: 'Indian English — Prabhat (Natural Male)' },
    { id: 'en-US-JennyNeural', name: 'US English — Jenny (Standard)' }
  ];

  const handleSynthesize = async () => {
    if (!testText.trim()) return;
    setIsSynthesizing(true);
    try {
      const res = await api.synthesizeVoice(testText, selectedVoice);
      if (res.success && res.url) {
        const fullUrl = `http://127.0.0.1:8000${res.url}`;
        setAudioUrl(fullUrl);
        const audio = new Audio(fullUrl);
        audio.play();
      } else {
        alert(res.message || 'TTS generation failed.');
      }
    } catch (e: any) {
      alert(`Synthesis error: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          VOICE LAB & ACOUSTIC STUDIO
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Edge-TTS synthesis, acoustic voice profiles, wake phrase calibration, and microphone controls
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left: Text-to-Speech Studio */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            VOICE SYNTHESIS CALIBRATOR
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              TARGET VOICE MODEL
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(5, 7, 12, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px',
                borderRadius: '6px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              SPEECH TEST TEXT
            </label>
            <textarea
              rows={4}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(5, 7, 12, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem',
                resize: 'none'
              }}
            />
          </div>

          <button
            className="cyber-btn"
            onClick={handleSynthesize}
            disabled={isSynthesizing}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSynthesizing ? 'GENERATING AUDIO...' : '▶ TEST SPEECH OUTPUT'}
          </button>

          {audioUrl && (
            <audio controls src={audioUrl} style={{ width: '100%', marginTop: '8px' }} />
          )}
        </div>

        {/* Right: Wake Word and Microphone Metrics */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            WAKE-WORD DETECTION & VAD
          </div>

          <div style={{ background: 'rgba(5, 7, 12, 0.6)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>PRIMARY WAKE PHRASE</div>
            <div style={{ fontSize: '1.1rem', color: 'var(--neon-green)', fontWeight: 700 }}>"Hey Ramya"</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              SUPPORTED VARIANTS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['Hey Ramya', 'Hello Ramya', 'Ramya', 'Okey Ramya'].map((phrase) => (
                <span
                  key={phrase}
                  style={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              VOICE ACTIVITY ENERGY SENSITIVITY
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: 'var(--neon-cyan)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>Silence Threshold: 0.02 RMS</span>
              <span>Endpointing: 1.2s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
