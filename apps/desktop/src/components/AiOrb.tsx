import React from 'react';
import { OrbState } from '../services/websocket';

interface AiOrbProps {
  state: OrbState;
  size?: number;
  onClick?: () => void;
  onCancel?: () => void;
  showRings?: boolean;
  showWaveform?: boolean;
}

export const AiOrb: React.FC<AiOrbProps> = ({
  state,
  size = 200,
  onClick,
  onCancel,
  showRings = true,
  showWaveform = true
}) => {
  const stateLabels: Record<string, string> = {
    ready: 'READY',
    idle: 'RAMYA',
    listening: 'LISTENING...',
    understanding: 'UNDERSTANDING...',
    working: 'WORKING...',
    processing: 'WORKING...',
    reading_doc: 'READING DOC...',
    analyzing_screen: 'ANALYZING SCREEN...',
    waiting_approval: 'WAITING APPROVAL',
    speaking: 'SPEAKING',
    completed: 'COMPLETED',
    success: 'COMPLETED',
    cancelled: 'CANCELLED',
    needs_attention: 'ATTENTION',
    error: 'ATTENTION'
  };

  const isInteractiveState = state === 'listening' || state === 'speaking' || state === 'working' || state === 'processing' || state === 'understanding';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        className={`orb-container orb-${state}`}
        style={{ width: size, height: size }}
        onClick={onClick}
        title="Click to activate voice or push-to-talk"
      >
        {showRings && (
          <>
            <div className="orb-ring orb-ring-1" style={{ width: size * 0.85, height: size * 0.85 }} />
            <div className="orb-ring orb-ring-2" style={{ width: size * 1.05, height: size * 1.05 }} />
          </>
        )}

        {/* Main Core Orb */}
        <div
          className="orb-core"
          style={{ width: size * 0.65, height: size * 0.65 }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: size < 120 ? '0.65rem' : '0.8rem',
              fontWeight: 800,
              letterSpacing: '1.5px',
              color: '#fff',
              textShadow: '0 0 10px rgba(0,240,255,0.8)'
            }}>
              {stateLabels[state] || 'RAMYA'}
            </div>
            {size >= 140 && (
              <div style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '1px',
                marginTop: '2px'
              }}>
                ASSISTANT CORE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reactive Waveform Equalizer */}
      {showWaveform && (
        <div className={`waveform-visualizer ${isInteractiveState ? 'waveform-active' : ''}`}>
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
        </div>
      )}

      {/* Visible Cancel Action during Active State */}
      {onCancel && isInteractiveState && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          style={{
            marginTop: '10px',
            background: 'rgba(255, 51, 102, 0.15)',
            border: '1px solid var(--neon-red)',
            color: 'var(--neon-red)',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontFamily: 'Orbitron, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>✕</span>
          <span>STOP / CANCEL</span>
        </button>
      )}
    </div>
  );
};
