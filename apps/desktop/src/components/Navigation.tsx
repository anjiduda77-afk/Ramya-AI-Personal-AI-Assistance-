import React from 'react';

export type NavScreenId =
  | 'command_center'
  | 'ai_chat'
  | 'screen_intel'
  | 'document_reader'
  | 'voice_lab'
  | 'desktop_control'
  | 'mobile_control'
  | 'productivity'
  | 'knowledge_base'
  | 'data_sql'
  | 'weather_markets'
  | 'quiz_learning'
  | 'automations'
  | 'security'
  | 'settings';

interface NavigationProps {
  activeScreen: NavScreenId;
  onSelectScreen: (screen: NavScreenId) => void;
  isFloatingMode: boolean;
  onToggleFloating: () => void;
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
  onToggleFloating
}) => {
  const navItems: NavItem[] = [
    { id: 'command_center', label: '1. Command Center', icon: '⚡' },
    { id: 'ai_chat', label: '2. AI Voice Chat', icon: '💬' },
    { id: 'screen_intel', label: '3. Screen Intelligence', icon: '👁️' },
    { id: 'document_reader', label: '4. Document Reader', icon: '📄' },
    { id: 'voice_lab', label: '5. Voice Lab', icon: '🎙️' },
    { id: 'desktop_control', label: '6. Desktop Control', icon: '🖥️' },
    { id: 'mobile_control', label: '7. Mobile Control', icon: '📱' },
    { id: 'productivity', label: '8. Personal Productivity', icon: '⏱️' },
    { id: 'knowledge_base', label: '9. Knowledge Base (RAG)', icon: '🧠' },
    { id: 'data_sql', label: '10. Data & SQL Explorer', icon: '🗄️' },
    { id: 'weather_markets', label: '11. Weather & Markets', icon: '📈' },
    { id: 'quiz_learning', label: '12. Quiz & Learning', icon: '🎓' },
    { id: 'automations', label: '13. Automation Center', icon: '⚙️' },
    { id: 'security', label: '14. Security & Permissions', icon: '🛡️' },
    { id: 'settings', label: '15. Settings & Diagnostics', icon: '🔧' }
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
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={onToggleFloating}
          style={{
            width: '100%',
            background: isFloatingMode ? 'var(--neon-cyan)' : 'rgba(0, 240, 255, 0.1)',
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
          <span>{isFloatingMode ? 'EXIT ORB MODE' : 'FLOATING ORB MODE'}</span>
        </button>
      </div>

      <div style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: 'var(--text-dim)',
        letterSpacing: '1.5px',
        paddingLeft: '8px',
        marginBottom: '10px'
      }}>
        NAVIGATION CONSOLE
      </div>

      {/* Nav List */}
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
                gap: '10px',
                padding: '9px 12px',
                background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--neon-cyan)' : 'transparent',
                borderRadius: '6px',
                color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.7rem',
        color: 'var(--text-dim)',
        textAlign: 'center'
      }}>
        Wake Word: "Hey Ramya"
      </div>
    </aside>
  );
};
