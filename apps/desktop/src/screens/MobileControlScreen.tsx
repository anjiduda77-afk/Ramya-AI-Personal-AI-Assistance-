import React, { useState } from 'react';

export const MobileControlScreen: React.FC = () => {
  const [phoneInput, setPhoneInput] = useState('+91 98765 43210');
  const [dialStatus, setDialStatus] = useState<string | null>(null);

  const handleDial = () => {
    if (!phoneInput.trim()) return;
    setDialStatus(`Initiated Android ACTION_DIAL intent for: ${phoneInput}`);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          ANDROID MOBILE COMPANION CONTROL
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Android foreground voice service, dialer intents, and notification synchronization
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Companion Device State */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            ANDROID DEVICE LINK
          </div>

          <div style={{ background: 'rgba(5, 7, 12, 0.6)', padding: '14px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Ramya Companion Node</span>
              <span style={{ color: 'var(--neon-green)', fontSize: '0.75rem' }}>CONNECTED</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px' }}>
              Foreground Mic Service: Active • MediaProjection: Authorized
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              TELEPHONY & DIALER INTENT DISPATCHER
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91..."
                style={{
                  flex: 1,
                  background: 'rgba(5, 7, 12, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '6px'
                }}
              />
              <button className="cyber-btn" onClick={handleDial}>
                DIAL
              </button>
            </div>
            {dialStatus && (
              <div style={{ marginTop: '8px', color: 'var(--neon-cyan)', fontSize: '0.8rem' }}>
                {dialStatus}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Capabilities Matrix */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            ANDROID PLATFORM CAPABILITY MATRIX
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <span>Foreground Mic Service</span>
              <span style={{ color: 'var(--neon-green)' }}>SUPPORTED (Android 14+)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <span>MediaProjection Capture</span>
              <span style={{ color: 'var(--neon-green)' }}>SUPPORTED (Explicit Consent)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <span>System Dialer Intent</span>
              <span style={{ color: 'var(--neon-green)' }}>SUPPORTED (ACTION_DIAL)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <span>Floating Overlay Orb</span>
              <span style={{ color: 'var(--neon-green)' }}>SUPPORTED (SYSTEM_ALERT_WINDOW)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
