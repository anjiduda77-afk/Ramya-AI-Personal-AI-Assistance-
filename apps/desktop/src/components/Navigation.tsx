import React from 'react';
import { UserProfile } from '../services/api';

export type NavScreenId =
  | 'command_center'
  | 'ai_chat'
  | 'screen_intel'
  | 'document_reader'
  | 'productivity'
  | 'weather_markets'
  | 'quiz_learning'
  | 'settings'
  | 'profile';

interface NavigationProps {
  activeScreen: NavScreenId;
  onSelectScreen: (screen: NavScreenId) => void;
  isFloatingMode: boolean;
  onToggleFloating: () => void;
  userProfile?: UserProfile | null;
  onOpenAuth?: () => void;
}

interface NavItem {
  id: NavScreenId;
  label: string;
  icon: string;
  badge?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeScreen,
  onSelectScreen,
  isFloatingMode,
  onToggleFloating,
  userProfile,
  onOpenAuth
}) => {
  const navItems: NavItem[] = [
    { id: 'command_center', label: 'Command Center', icon: '⚡' },
    { id: 'ai_chat', label: 'Voice & Chat', icon: '💬' },
    { id: 'screen_intel', label: 'Vision & Screen', icon: '👁️' },
    { id: 'document_reader', label: 'Document Studio', icon: '📄' },
    { id: 'productivity', label: 'Productivity & Focus', icon: '⏱️' },
    { id: 'weather_markets', label: 'Live Radar', icon: '📈' },
    { id: 'quiz_learning', label: 'Learning & Quiz', icon: '🎓' },
    { id: 'settings', label: 'Preferences & Privacy', icon: '⚙️' },
    { id: 'profile', label: 'User Profile & Sync', icon: '👤' }
  ];

  return (
    <aside style={{
      width: '260px',
      height: 'calc(100vh - 45px)',
      background: 'rgba(8, 12, 22, 0.95)',
      borderRight: '1px solid rgba(0, 240, 255, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      overflowY: 'auto'
    }}>
      {/* Primary Floating Orb View Toggle */}
      <div style={{ marginBottom: '18px' }}>
        <button
          onClick={onToggleFloating}
          style={{
            width: '100%',
            background: isFloatingMode ? 'var(--neon-cyan)' : 'rgba(0, 240, 255, 0.08)',
            color: isFloatingMode ? '#000' : 'var(--neon-cyan)',
            border: '1px solid var(--neon-cyan)',
            padding: '10px',
            borderRadius: '8px',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isFloatingMode ? 'var(--neon-glow-cyan)' : 'none'
          }}
        >
          <span>🔮</span>
          <span>{isFloatingMode ? 'EXPAND DASHBOARD' : 'COMPACT ORB MODE'}</span>
        </button>
      </div>

      <div style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: 'var(--text-dim)',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '10px',
        paddingLeft: '8px'
      }}>
        ASSISTANT PANELS
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid transparent',
                color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  background: 'var(--neon-cyan)',
                  color: '#000',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Privacy Status Banner */}
      <div style={{
        marginTop: 'auto',
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(10, 15, 29, 0.8)',
        border: '1px solid rgba(0, 240, 255, 0.1)',
        fontSize: '0.72rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-green)', fontWeight: 700, marginBottom: '4px' }}>
          <span>🛡️</span>
          <span>Privacy Shield Active</span>
        </div>
        <div>Local processing prioritized. No data shared without consent.</div>
      </div>
    </aside>
  );
};
