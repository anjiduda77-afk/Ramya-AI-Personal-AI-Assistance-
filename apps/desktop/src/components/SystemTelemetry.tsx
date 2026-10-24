import React from 'react';
import { HealthData } from '../services/api';

interface SystemTelemetryProps {
  health: HealthData | null;
  onRefreshHealth: () => void;
}

export const SystemTelemetry: React.FC<SystemTelemetryProps> = ({ health, onRefreshHealth }) => {
  const isReady = health?.status === 'ready';
  const cpu = health?.systemMetrics?.cpuPercent ?? 18;
  const ram = health?.systemMetrics?.ramPercent ?? 54;
  const isOnline = health?.isOnline ?? true;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 24px',
      background: 'rgba(8, 12, 22, 0.92)',
      borderBottom: '1px solid rgba(0, 240, 255, 0.18)',
      backdropFilter: 'blur(16px)',
      fontSize: '0.8rem',
      fontFamily: 'JetBrains Mono, monospace',
      zIndex: 100
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 900,
          color: 'var(--neon-cyan)',
          letterSpacing: '3px',
          fontSize: '1.05rem',
          textShadow: '0 0 12px rgba(0, 240, 255, 0.6)'
        }}>
          RAMYA AI
        </div>
        <span style={{ color: 'rgba(0, 240, 255, 0.25)' }}>|</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
          "Your World. Your Voice. Your Control."
        </span>
      </div>

      {/* Assistant Status & Privacy Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Core State */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 240, 255, 0.06)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          padding: '4px 12px',
          borderRadius: '20px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isReady ? 'var(--neon-green)' : 'var(--neon-amber)',
            boxShadow: isReady ? '0 0 10px #00ff88' : '0 0 10px #ffb703'
          }} />
          <span style={{
            color: isReady ? 'var(--neon-green)' : 'var(--neon-amber)',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '1px'
          }}>
            {isReady ? 'CORE ONLINE' : 'NEEDS ATTENTION'}
          </span>
        </div>

        {/* Privacy Shield */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--neon-violet)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <span>🔒</span>
          <span>Local & Private</span>
        </div>

        {/* Wake Phrase Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--neon-cyan)',
          fontSize: '0.75rem'
        }}>
          <span style={{ color: 'var(--text-dim)' }}>Wake Phrase:</span>
          <span style={{
            background: 'rgba(0, 240, 255, 0.12)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            "Hey Ramya"
          </span>
        </div>

        {/* System Pulse: CPU & RAM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>CPU</span>
            <div style={{
              width: '45px',
              height: '5px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(cpu, 100)}%`,
                height: '100%',
                backgroundColor: 'var(--neon-cyan)'
              }} />
            </div>
            <span style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem' }}>{Math.round(cpu)}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>RAM</span>
            <div style={{
              width: '45px',
              height: '5px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(ram, 100)}%`,
                height: '100%',
                backgroundColor: 'var(--neon-violet)'
              }} />
            </div>
            <span style={{ color: 'var(--neon-violet)', fontSize: '0.7rem' }}>{Math.round(ram)}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
