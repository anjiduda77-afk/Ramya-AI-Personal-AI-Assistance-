import React from 'react';
import { AiOrb } from './AiOrb';
import { OrbState } from '../services/websocket';

interface FloatingOrbWindowProps {
  orbState: OrbState;
  transcript: string;
  onActivate: () => void;
  onExpandCommandCenter: () => void;
}

export const FloatingOrbWindow: React.FC<FloatingOrbWindowProps> = ({
  orbState,
  transcript,
  onActivate,
  onExpandCommandCenter
}) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      {/* Transcript Tooltip */}
      {transcript && (
        <div style={{
          background: 'rgba(10, 15, 29, 0.92)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: '#e2e8f0',
          fontSize: '0.8rem',
          maxWidth: '260px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center'
        }}>
          {transcript}
        </div>
      )}

      {/* Floating Orb */}
      <div style={{
        background: 'rgba(5, 7, 12, 0.85)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '50%',
        padding: '6px',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)'
      }}>
        <AiOrb
          state={orbState}
          size={110}
          onClick={onActivate}
          showRings={false}
        />
      </div>

      {/* Expand Button */}
      <button
        onClick={onExpandCommandCenter}
        style={{
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid rgba(0, 240, 255, 0.5)',
          color: '#00f0ff',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '0.7rem',
          fontFamily: 'Orbitron, sans-serif',
          cursor: 'pointer'
        }}
      >
        COMMAND CENTER ⤢
      </button>
    </div>
  );
};
