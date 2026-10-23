import React from 'react';
import { OrbState } from '../services/websocket';

interface AiOrbProps {
  state: OrbState;
  size?: number;
  onClick?: () => void;
  showRings?: boolean;
}

export const AiOrb: React.FC<AiOrbProps> = ({
  state,
  size = 200,
  onClick,
  showRings = true
}) => {
  const stateLabels: Record<OrbState, string> = {
    idle: 'RAMYA',
    listening: 'LISTENING',
    processing: 'ANALYZING',
    speaking: 'SPEAKING',
    success: 'VERIFIED',
    error: 'ALERT'
  };

  return (
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
            fontSize: size < 120 ? '0.65rem' : '0.85rem',
            fontWeight: 800,
            letterSpacing: '1.5px',
            color: '#fff',
            textShadow: '0 0 10px rgba(0,240,255,0.8)'
          }}>
            {stateLabels[state]}
          </div>
          {size >= 140 && (
            <div style={{
              fontSize: '0.6rem',
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '1px',
              marginTop: '2px'
            }}>
              VOICE CORE
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
