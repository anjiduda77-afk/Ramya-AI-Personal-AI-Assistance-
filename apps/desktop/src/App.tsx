import React, { useState, useEffect } from 'react';
import { Navigation, NavScreenId } from './components/Navigation';
import { SystemTelemetry } from './components/SystemTelemetry';
import { FloatingOrbWindow } from './components/FloatingOrbWindow';
import { OrbState, wsService } from './services/websocket';
import { api, HealthData } from './services/api';

// Screens
import { CommandCenterScreen } from './screens/CommandCenterScreen';
import { AiChatScreen } from './screens/AiChatScreen';
import { ScreenIntelligenceScreen } from './screens/ScreenIntelligenceScreen';
import { DocumentReaderScreen } from './screens/DocumentReaderScreen';
import { VoiceLabScreen } from './screens/VoiceLabScreen';
import { DesktopControlScreen } from './screens/DesktopControlScreen';
import { MobileControlScreen } from './screens/MobileControlScreen';
import { ProductivityScreen } from './screens/ProductivityScreen';
import { KnowledgeBaseScreen } from './screens/KnowledgeBaseScreen';
import { DataSqlScreen } from './screens/DataSqlScreen';
import { WeatherMarketsScreen } from './screens/WeatherMarketsScreen';
import { QuizLearningScreen } from './screens/QuizLearningScreen';
import { AutomationCenterScreen } from './screens/AutomationCenterScreen';
import { SecurityPermissionsScreen } from './screens/SecurityPermissionsScreen';
import { SettingsDiagnosticsScreen } from './screens/SettingsDiagnosticsScreen';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<NavScreenId>('command_center');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isFloatingMode, setIsFloatingMode] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [transcript, setTranscript] = useState<string>('Listening for "Hey Ramya"...');

  useEffect(() => {
    // 1. Connect WebSocket
    wsService.connect();
    const unsubOrb = wsService.onOrbStateChange((state) => {
      setOrbState(state);
    });

    // 2. Fetch Initial Health & Periodic Polling
    fetchHealth();
    const timer = setInterval(fetchHealth, 15000);

    // 3. Global Push-to-Talk Hotkey Listener (Ctrl+Space)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        triggerPushToTalk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubOrb();
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchHealth = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch (e) {
      console.warn('Backend connection notice:', e);
    }
  };

  const triggerPushToTalk = () => {
    if (orbState === 'idle') {
      setOrbState('listening');
      setTranscript('Listening for Indian English voice command...');
      setTimeout(() => {
        setOrbState('idle');
      }, 4000);
    } else {
      wsService.cancel();
      setOrbState('idle');
    }
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'command_center':
        return <CommandCenterScreen orbState={orbState} setOrbState={setOrbState} onNavigate={setActiveScreen} />;
      case 'ai_chat':
        return <AiChatScreen orbState={orbState} setOrbState={setOrbState} />;
      case 'screen_intel':
        return <ScreenIntelligenceScreen />;
      case 'document_reader':
        return <DocumentReaderScreen />;
      case 'voice_lab':
        return <VoiceLabScreen />;
      case 'desktop_control':
        return <DesktopControlScreen />;
      case 'mobile_control':
        return <MobileControlScreen />;
      case 'productivity':
        return <ProductivityScreen />;
      case 'knowledge_base':
        return <KnowledgeBaseScreen />;
      case 'data_sql':
        return <DataSqlScreen />;
      case 'weather_markets':
        return <WeatherMarketsScreen />;
      case 'quiz_learning':
        return <QuizLearningScreen />;
      case 'automations':
        return <AutomationCenterScreen />;
      case 'security':
        return <SecurityPermissionsScreen />;
      case 'settings':
        return <SettingsDiagnosticsScreen />;
      default:
        return <CommandCenterScreen orbState={orbState} setOrbState={setOrbState} onNavigate={setActiveScreen} />;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Visual Scanline Effect */}
      <div className="scanline-overlay" />

      {/* Floating Compact Orb Mode */}
      {isFloatingMode ? (
        <FloatingOrbWindow
          orbState={orbState}
          transcript={transcript}
          onActivate={triggerPushToTalk}
          onExpandCommandCenter={() => setIsFloatingMode(false)}
        />
      ) : (
        <>
          {/* Top Real System Telemetry Bar */}
          <SystemTelemetry health={health} onRefreshHealth={fetchHealth} />

          {/* Main Layout: Navigation Sidebar + Screen Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Navigation
              activeScreen={activeScreen}
              onSelectScreen={setActiveScreen}
              isFloatingMode={isFloatingMode}
              onToggleFloating={() => setIsFloatingMode(!isFloatingMode)}
            />
            <main style={{ flex: 1, height: 'calc(100vh - 45px)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
              {renderActiveScreen()}
            </main>
          </div>
        </>
      )}
    </div>
  );
};
