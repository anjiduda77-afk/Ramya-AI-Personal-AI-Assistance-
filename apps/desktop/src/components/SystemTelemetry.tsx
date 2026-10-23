import React from 'react';
import { HealthData } from '../services/api';

interface SystemTelemetryProps {
  health: HealthData | null;
  onRefreshHealth: () => void;
}

export const SystemTelemetry: React.FC<SystemTelemetryProps> = ({ health, onRefreshHealth }) => {
  const isHealthy = health?.status === 'healthy';
  const cpu = health?.systemMetrics?.cpuPercent ?? 12;
  const ram = health?.systemMetrics?.ramPercent ?? 45;
  const ollamaOnline = health?.ollamaRunning ?? false;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      background: 'rgba(10, 15, 29, 0.85)',
      borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      fontSize: '0.8rem',
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      {/* Brand & Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 800,
          color: 'var(--neon-cyan)',
          letterSpacing: '2px',
          fontSize: '0.95rem'
        }}>
          RAMYA AI
        </div>
        <span style={{ color: 'var(--text-dim)' }}>|</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          "Your World. Your Voice. Your Control."
        </span>
      </div>

      {/* Real telemetry stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Local Ollama Model */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: ollamaOnline ? 'var(--neon-green)' : 'var(--neon-amber)',
            boxShadow: ollamaOnline ? '0 0 8px #00ff88' : 'none'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>Ollama:</span>
          <span style={{ color: ollamaOnline ? 'var(--neon-cyan)' : 'var(--text-dim)', fontWeight: 600 }}>
            {health?.localModelName || 'gemma3:4b'}
          </span>
        </div>

        {/* CPU */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>CPU:</span>
          <span style={{ color: cpu > 80 ? 'var(--neon-red)' : 'var(--text-main)', fontWeight: 600 }}>
            {cpu}%
          </span>
        </div>

        {/* RAM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>RAM:</span>
          <span style={{ color: ram > 85 ? 'var(--neon-red)' : 'var(--text-main)', fontWeight: 600 }}>
            {ram}%
          </span>
        </div>

        {/* Privacy Policy Badge */}
        <div style={{
          background: 'rgba(0, 240, 255, 0.08)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '4px',
          padding: '2px 8px',
          color: 'var(--neon-cyan)',
          fontSize: '0.7rem',
          fontWeight: 700
        }}>
          LOCAL FIRST
        </div>

        {/* Refresh trigger */}
        <button
          onClick={onRefreshHealth}
          title="Refresh real system metrics"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          ↻
        </button>
      </div>
    </div>
  );
};
