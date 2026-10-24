import React, { useState, useEffect } from 'react';
import { Navigation, NavScreenId } from './components/Navigation';
import { SystemTelemetry } from './components/SystemTelemetry';
import { FloatingOrbWindow } from './components/FloatingOrbWindow';
import { OrbState, wsService } from './services/websocket';
import { api, HealthData, UserProfile } from './services/api';

// Screens & Modals
import { CommandCenterScreen } from './screens/CommandCenterScreen';
import { AiChatScreen } from './screens/AiChatScreen';
import { ScreenIntelligenceScreen } from './screens/ScreenIntelligenceScreen';
import { DocumentReaderScreen } from './screens/DocumentReaderScreen';
import { ProductivityScreen } from './screens/ProductivityScreen';
import { WeatherMarketsScreen } from './screens/WeatherMarketsScreen';
import { QuizLearningScreen } from './screens/QuizLearningScreen';
import { SettingsDiagnosticsScreen } from './screens/SettingsDiagnosticsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<NavScreenId>('command_center');
  const [orbState, setOrbState] = useState<OrbState>('ready');
  const [isFloatingMode, setIsFloatingMode] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [transcript, setTranscript] = useState<string>('Listening for "Hey Ramya"...');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // 1. Connect WebSocket for live voice events
    wsService.connect();
    const unsubOrb = wsService.onOrbStateChange((state) => {
      setOrbState(state);
    });

    // 2. Fetch Initial Health & Periodic Polling
    fetchHealth();
    fetchProfile();
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
      console.warn('Backend connection notice');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.getUserProfile();
      setUserProfile(res.profile);
    } catch (e) {
      console.warn('Profile load notice');
    }
  };

  const triggerPushToTalk = () => {
    if (orbState === 'ready' || orbState === 'idle') {
      setOrbState('listening');
      setTranscript('Listening for Indian English voice command...');
      setTimeout(() => {
        setOrbState('ready');
      }, 4000);
    } else {
      wsService.cancel();
      setOrbState('ready');
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
      case 'productivity':
        return <ProductivityScreen />;
      case 'weather_markets':
        return <WeatherMarketsScreen />;
      case 'quiz_learning':
        return <QuizLearningScreen />;
      case 'settings':
        return <SettingsDiagnosticsScreen />;
      case 'profile':
        return <ProfileScreen onOpenAuthModal={() => setIsAuthModalOpen(true)} />;
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
              userProfile={userProfile}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
            <main style={{ flex: 1, height: 'calc(100vh - 45px)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
              {renderActiveScreen()}
            </main>
          </div>
        </>
      )}

      {/* Google Authentication & Guest Mode Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={(p) => {
          setUserProfile(p);
          fetchProfile();
        }}
      />
    </div>
  );
};
