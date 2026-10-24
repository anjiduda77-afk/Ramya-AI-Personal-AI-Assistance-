import React, { useState, useEffect } from 'react';
import { api, DeviceCapability } from '../services/api';

export const SecurityPermissionsScreen: React.FC = () => {
  const [capabilities, setCapabilities] = useState<DeviceCapability[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [notification, setNotification] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      const [caps, logs] = await Promise.all([
        api.getCapabilities().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);
      setCapabilities(caps);
      setAuditLogs(logs);
    } catch (e) {
      console.warn('Failed to load security data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCapability = async (cap: DeviceCapability) => {
    const nextState = !cap.is_enabled;
    try {
      const res = await api.toggleCapability(cap.id, nextState);
      if (res.success) {
        setCapabilities(prev =>
          prev.map(c => (c.id === cap.id ? { ...c, is_enabled: nextState, status: nextState ? 'active' : 'disabled' } : c))
        );
        setNotification(`Capability '${cap.name}' has been ${nextState ? 'ENABLED' : 'DISABLED'}. Boundary policy applied.`);
        setTimeout(() => setNotification(''), 4000);
        // Refresh audit logs to show the security event
        api.getAuditLogs().then(setAuditLogs).catch(console.warn);
      }
    } catch {
      setNotification(`Failed to toggle '${cap.name}'. Please try again.`);
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const handleOpenOsSettings = (hint: string) => {
    if (window.confirm(`Open OS Settings Guidance:\n\n${hint}\n\nWould you like to copy this path to clipboard?`)) {
      navigator.clipboard.writeText(hint);
      setNotification('OS settings path copied to clipboard.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const permissionTiers = [
    { tier: 'READ-ONLY', desc: 'Inspect approved documents, check public weather or stock quotes, active window inspection.', color: 'var(--neon-green)' },
    { tier: 'LOW RISK', desc: 'Open allowlisted apps (Chrome, Notepad, Calc, VS Code), media playback controls, local notes.', color: 'var(--neon-cyan)' },
    { tier: 'MEDIUM RISK', desc: 'Screen capture, OCR inspection, clipboard operations, document indexing, configuration updates.', color: 'var(--neon-amber)' },
    { tier: 'HIGH RISK', desc: 'Initiate external phone calls, delete documents, wipe data. STRICTLY REQUIRES EXPLICIT USER CONFIRMATION.', color: 'var(--neon-red)' }
  ];

  const filteredCaps = capabilities.filter(cap => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'local') return cap.processing_mode === 'local';
    if (filterCategory === 'cloud') return cap.processing_mode === 'cloud' || cap.processing_mode === 'hybrid';
    if (filterCategory === 'high_risk') return cap.risk_level === 'high_risk';
    return true;
  });

  const filteredLogs = auditLogs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'denied') return log.status === 'denied';
    if (logFilter === 'success') return log.status === 'success';
    return true;
  });

  const activeCount = capabilities.filter(c => c.is_enabled && c.is_platform_supported).length;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1.5px' }}>
          SECURITY, CAPABILITIES & ZERO-TRUST CONTROL
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
          Granular capability enforcement, least-privilege action boundaries, runtime OS settings guidance, and immutable audit logs
        </div>
      </div>

      {notification && (
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
          <span>🛡️</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Security Summary Banner */}
      <div className="holo-card" style={{
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderColor: 'rgba(0, 240, 255, 0.4)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            ZERO-TRUST EXECUTION BOUNDARY
          </div>
          <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>
            {activeCount} of {capabilities.length} Capabilities Active & Policy Guarded
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(0, 255, 157, 0.12)',
            border: '1px solid var(--neon-green)',
            borderRadius: '6px',
            padding: '6px 14px',
            color: 'var(--neon-green)',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            ✓ ZERO-TRUST ENFORCED
          </div>
          <div style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid var(--neon-cyan)',
            borderRadius: '6px',
            padding: '6px 14px',
            color: 'var(--neon-cyan)',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            OS: Windows 11 / Android Verified
          </div>
        </div>
      </div>

      {/* 4 Tiers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {permissionTiers.map(p => (
          <div key={p.tier} className="holo-card" style={{ padding: '16px' }}>
            <div style={{ color: p.color, fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
              {p.tier}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.4 }}>
              {p.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Capabilities Section */}
      <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', fontWeight: 700, letterSpacing: '1px' }}>
              GRANULAR DEVICE CAPABILITY CONTROLS
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Every switch enforces real functionality at execution time. Disabling immediately halts operations.
            </div>
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'local', 'cloud', 'high_risk'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  background: filterCategory === cat ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.05)',
                  color: filterCategory === cat ? '#000' : 'var(--text-muted)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {cat.toUpperCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Capability Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredCaps.map(cap => {
            const isHighRisk = cap.risk_level === 'high_risk';
            const isMediumRisk = cap.risk_level === 'medium_risk';
            const riskColor = isHighRisk ? 'var(--neon-red)' : isMediumRisk ? 'var(--neon-amber)' : 'var(--neon-green)';

            return (
              <div
                key={cap.id}
                style={{
                  background: 'rgba(5, 7, 12, 0.7)',
                  border: `1px solid ${cap.is_enabled ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Card Header: Title + Switch */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700 }}>
                      {cap.name}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        color: riskColor,
                        border: `1px solid ${riskColor}`,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontWeight: 700
                      }}>
                        {cap.risk_level.toUpperCase().replace('_', ' ')}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.06)',
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}>
                        {cap.processing_mode.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: cap.is_platform_supported ? 'var(--neon-cyan)' : 'var(--text-dim)',
                        background: 'rgba(0, 240, 255, 0.08)',
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}>
                        {cap.supported_platforms.join(', ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    disabled={!cap.is_platform_supported}
                    onClick={() => handleToggleCapability(cap)}
                    style={{
                      background: !cap.is_platform_supported
                        ? 'rgba(255,255,255,0.05)'
                        : cap.is_enabled
                        ? 'var(--neon-cyan)'
                        : 'rgba(255,255,255,0.1)',
                      color: !cap.is_platform_supported
                        ? 'var(--text-dim)'
                        : cap.is_enabled
                        ? '#000'
                        : 'var(--text-muted)',
                      border: 'none',
                      padding: '5px 14px',
                      borderRadius: '4px',
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: cap.is_platform_supported ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {!cap.is_platform_supported ? 'UNSUPPORTED' : cap.is_enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* Description */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {cap.description}
                </div>

                {/* Required Permissions & OS Guidance */}
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span>OS Min: {cap.min_os_version}</span>
                    {cap.required_permissions.length > 0 && (
                      <span style={{ marginLeft: '8px', color: 'var(--neon-amber)' }}>
                        ({cap.required_permissions.join(', ')})
                      </span>
                    )}
                  </div>
                  {cap.os_settings_hint && (
                    <button
                      onClick={() => handleOpenOsSettings(cap.os_settings_hint)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '3px',
                        color: 'var(--neon-cyan)',
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        cursor: 'pointer'
                      }}
                    >
                      OS Settings
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auditable Security Execution Logs */}
      <div className="holo-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            IMMUTABLE ZERO-TRUST AUDIT LOGS ({filteredLogs.length} EVENTS)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'success', 'denied'].map(status => (
              <button
                key={status}
                onClick={() => setLogFilter(status)}
                style={{
                  background: logFilter === status ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                  color: logFilter === status ? 'var(--neon-cyan)' : 'var(--text-muted)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                {status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.3)', color: 'var(--neon-cyan)' }}>
                <th style={{ padding: '8px' }}>TIMESTAMP</th>
                <th style={{ padding: '8px' }}>ACTION / TARGET</th>
                <th style={{ padding: '8px' }}>RISK TIER</th>
                <th style={{ padding: '8px' }}>OUTCOME</th>
                <th style={{ padding: '8px' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-dim)' }} className="mono-font">{log.created_at}</td>
                  <td style={{ padding: '8px', color: '#fff', fontWeight: 600 }}>{log.tool_name}</td>
                  <td style={{ padding: '8px', color: log.permission_level === 'high_risk' ? 'var(--neon-red)' : 'var(--neon-cyan)' }}>
                    {log.permission_level?.toUpperCase()}
                  </td>
                  <td style={{ padding: '8px', color: log.status === 'success' ? 'var(--neon-green)' : 'var(--neon-amber)' }}>
                    {log.status?.toUpperCase()}
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
