import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const SecurityPermissionsScreen: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    api.getAuditLogs().then(setAuditLogs).catch(console.warn);
  }, []);

  const permissionTiers = [
    { tier: 'READ-ONLY', desc: 'Inspect approved documents, check public weather or stock quotes, active window inspection.', color: 'var(--neon-green)' },
    { tier: 'LOW RISK', desc: 'Open allowlisted apps (Chrome, Notepad, Calc, VS Code), media playback controls, local notes.', color: 'var(--neon-cyan)' },
    { tier: 'MEDIUM RISK', desc: 'Screen capture, OCR inspection, clipboard operations, document indexing, configuration updates.', color: 'var(--neon-amber)' },
    { tier: 'HIGH RISK', desc: 'Initiate external phone calls, delete documents, wipe data. STRICTLY REQUIRES EXPLICIT USER CONFIRMATION.', color: 'var(--neon-red)' }
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          SECURITY, PERMISSIONS & PRIVACY AUDIT
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Four-tier risk classification, least-privilege action boundaries, and immutable audit logs
        </div>
      </div>

      {/* 4 Tiers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {permissionTiers.map((p) => (
          <div key={p.tier} className="holo-card" style={{ padding: '16px' }}>
            <div style={{ color: p.color, fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
              {p.tier}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
              {p.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Auditable Security Execution Logs */}
      <div className="holo-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '14px' }}>
          IMMUTABLE SECURITY AUDIT LOGS ({auditLogs.length} EVENTS)
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.3)', color: 'var(--neon-cyan)' }}>
                <th style={{ padding: '8px' }}>TIMESTAMP</th>
                <th style={{ padding: '8px' }}>TOOL</th>
                <th style={{ padding: '8px' }}>RISK TIER</th>
                <th style={{ padding: '8px' }}>STATUS</th>
                <th style={{ padding: '8px' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-dim)' }} className="mono-font">{log.created_at}</td>
                  <td style={{ padding: '8px', color: '#fff', fontWeight: 600 }}>{log.tool_name}</td>
                  <td style={{ padding: '8px', color: log.permission_level === 'high_risk' ? 'var(--neon-red)' : 'var(--neon-cyan)' }}>
                    {log.permission_level.toUpperCase()}
                  </td>
                  <td style={{ padding: '8px', color: log.status === 'success' ? 'var(--neon-green)' : 'var(--neon-amber)' }}>
                    {log.status.toUpperCase()}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
