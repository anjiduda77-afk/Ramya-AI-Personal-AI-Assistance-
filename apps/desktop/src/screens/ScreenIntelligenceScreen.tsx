import React, { useState } from 'react';
import { api } from '../services/api';

export const ScreenIntelligenceScreen: React.FC = () => {
  const [screenData, setScreenData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleCapture = async () => {
    setLoading(true);
    try {
      const res = await api.analyzeScreen(prompt || undefined);
      setScreenData(res);
    } catch (e: any) {
      alert(`Screen capture failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
            SCREEN INTELLIGENCE & OCR
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Permission-controlled real-time active window and screen analysis
          </div>
        </div>
        <button className="cyber-btn" onClick={handleCapture} disabled={loading}>
          <span>📸</span> {loading ? 'CAPTURING...' : 'CAPTURE SCREEN'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flex: 1 }}>
        {/* Left: Screenshot Preview */}
        <div className="holo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '12px' }}>
            AUTHORIZED SCREENSHOT CAPTURE PREVIEW
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(5, 7, 12, 0.9)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            minHeight: '300px'
          }}>
            {screenData?.image_base64 ? (
              <img
                src={screenData.image_base64}
                alt="Captured Screen"
                style={{ width: '100%', height: 'auto', borderRadius: '4px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🖥️</div>
                <div>No active capture. Click "Capture Screen" to inspect your display.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Insights & Extracted Content */}
        <div className="holo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            SCREEN METRICS & SUGGESTED ACTIONS
          </div>

          {screenData ? (
            <>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ACTIVE WINDOW TITLE</div>
                <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>{screenData.active_window}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>PROCESS</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neon-green)' }} className="mono-font">
                  {screenData.active_process || 'Detected'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SUMMARY</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {screenData.summary}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '8px' }}>SUGGESTED ACTIONS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {screenData.suggested_actions?.map((act: string, idx: number) => (
                    <button
                      key={idx}
                      className="cyber-btn"
                      style={{ fontSize: '0.7rem', padding: '6px 10px' }}
                      onClick={() => alert(`Triggering: ${act}`)}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Capture the screen to analyze UI elements, detect open document text, or generate contextual study notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
