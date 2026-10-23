import React, { useState, useEffect } from 'react';
import { AiOrb } from '../components/AiOrb';
import { OrbState, wsService } from '../services/websocket';
import { api, AssistantResponse } from '../services/api';

interface CommandCenterScreenProps {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  onNavigate: (screenId: any) => void;
}

export const CommandCenterScreen: React.FC<CommandCenterScreenProps> = ({
  orbState,
  setOrbState,
  onNavigate
}) => {
  const [transcript, setTranscript] = useState<string>('Say "Hey Ramya" or click Push-to-Talk to speak...');
  const [lastResponse, setLastResponse] = useState<AssistantResponse | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [tasksSnapshot, setTasksSnapshot] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');

  // Fetch real dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [w, wl, t] = await Promise.all([
        api.getWeather('Hyderabad'),
        api.getWatchlist(),
        api.getTasks(false)
      ]);
      setWeatherData(w);
      setWatchlist(wl);
      setTasksSnapshot(t.slice(0, 3));
    } catch (e) {
      console.warn('Dashboard data fetch error:', e);
    }
  };

  // Execute a real command
  const handleExecuteCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsProcessing(true);
    setOrbState('processing');
    setTranscript(`Command: "${commandText}"`);

    try {
      const res = await api.sendChat(commandText, 'keyboard', false);
      setLastResponse(res);
      setOrbState('speaking');

      // Synthesize and play audio response
      if (res.spokenResponse) {
        const audioRes = await api.synthesizeVoice(res.spokenResponse);
        if (audioRes.success && audioRes.url) {
          const audio = new Audio(`http://127.0.0.1:8000${audioRes.url}`);
          audio.onended = () => setOrbState('idle');
          audio.onerror = () => setOrbState('idle');
          audio.play().catch(() => setOrbState('idle'));
        } else {
          setTimeout(() => setOrbState('idle'), 2500);
        }
      } else {
        setOrbState('idle');
      }

      // Refresh tasks / live data if modified
      loadDashboardData();
    } catch (e: any) {
      setOrbState('error');
      setTranscript(`Error executing command: ${e.message}`);
      setTimeout(() => setOrbState('idle'), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrbClick = () => {
    if (orbState === 'idle') {
      setOrbState('listening');
      setTranscript('Listening for command in Indian English...');
      
      // Check for browser speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          const current = event.results[event.results.length - 1][0].transcript;
          setTranscript(current);
        };
        recognition.onend = () => {
          setOrbState('processing');
          handleExecuteCommand(transcript);
        };
        recognition.onerror = () => {
          setOrbState('idle');
          setTranscript('Microphone stopped or permission required.');
        };
        recognition.start();
      } else {
        // Fallback simulated push-to-talk for demonstration
        setTimeout(() => {
          handleExecuteCommand('What is the weather today?');
        }, 1500);
      }
    } else {
      // Barge-in / interruption
      wsService.cancel();
      setOrbState('idle');
      setTranscript('Speech interrupted by user.');
    }
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Top Banner & Quick Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--neon-cyan)', margin: 0 }}>
            COMMAND CENTER — HACKER MAINFRAME
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Voice-First Desktop & Mobile Personal Intelligence Matrix
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="cyber-btn"
            onClick={() => handleExecuteCommand('Analyze my current screen')}
          >
            <span>👁️</span> SCREEN INTEL
          </button>
          <button
            className="cyber-btn cyber-btn-secondary"
            onClick={() => handleExecuteCommand('Pause music')}
          >
            <span>⏸️</span> MEDIA PAUSE
          </button>
        </div>
      </div>

      {/* Central Visual Matrix: Orb + Live Transcript */}
      <div className="holo-card" style={{
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'radial-gradient(circle at 50% 50%, rgba(0, 112, 243, 0.15) 0%, rgba(14, 22, 38, 0.8) 70%)'
      }}>
        {/* Animated AI Orb */}
        <AiOrb
          state={orbState}
          size={200}
          onClick={handleOrbClick}
        />

        <div style={{
          marginTop: '20px',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '0.8rem',
          letterSpacing: '2px',
          color: orbState === 'listening' ? 'var(--neon-green)' : 'var(--neon-cyan)'
        }}>
          {orbState === 'listening' ? 'MICROPHONE ACTIVE — LISTENING' : 'CLICK ORB OR SAY "HEY RAMYA"'}
        </div>

        {/* Live Transcript Display */}
        <div style={{
          marginTop: '12px',
          background: 'rgba(5, 7, 12, 0.7)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '8px',
          padding: '10px 20px',
          maxWidth: '650px',
          width: '100%',
          textAlign: 'center',
          color: 'var(--text-main)',
          fontSize: '0.9rem',
          fontFamily: 'Rajdhani, sans-serif'
        }}>
          {transcript}
        </div>

        {/* Text Command Input Bar */}
        <div style={{
          display: 'flex',
          gap: '10px',
          maxWidth: '650px',
          width: '100%',
          marginTop: '16px'
        }}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleExecuteCommand(customInput);
                setCustomInput('');
              }
            }}
            placeholder='Type command (e.g. "Open Chrome", "Weather in Mumbai", "Add task Read paper")'
            style={{
              flex: 1,
              background: 'rgba(10, 15, 29, 0.9)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              fontFamily: 'Rajdhani, sans-serif'
            }}
          />
          <button
            className="cyber-btn"
            disabled={isProcessing}
            onClick={() => {
              handleExecuteCommand(customInput);
              setCustomInput('');
            }}
          >
            EXECUTE
          </button>
        </div>
      </div>

      {/* Assistant Spoken / Execution Feedback Card */}
      {lastResponse && (
        <div className="holo-card" style={{ padding: '16px 20px', borderColor: 'var(--neon-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px' }}>
              ASSISTANT VERIFIED RESPONSE [{lastResponse.intent.toUpperCase()}]
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }} className="mono-font">
              {lastResponse.providerUsed} ({lastResponse.executionTimeMs}ms)
            </span>
          </div>
          <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
            "{lastResponse.spokenResponse}"
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {lastResponse.detailedText}
          </div>
        </div>
      )}

      {/* Grid: Live Weather, Market Watchlist & Pending Tasks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Real-Time Weather */}
        <div className="holo-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem' }}>
              LIVE WEATHER MATRIX
            </span>
            <span style={{ color: 'var(--neon-green)', fontSize: '0.65rem' }}>OPEN-METEO LIVE</span>
          </div>
          {weatherData ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {weatherData.temperatureC}°C
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {weatherData.condition}
                </span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '4px' }}>
                Location: {weatherData.location}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Humidity: {weatherData.humidityPercent}%</span>
                <span>Wind: {weatherData.windSpeedKmh} km/h</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Fetching live weather...</div>
          )}
        </div>

        {/* Card 2: Market Watchlist */}
        <div className="holo-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem' }}>
              MARKET WATCHLIST
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }} className="mono-font">
              YAHOO FINANCE (DELAYED)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {watchlist.slice(0, 3).map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{w.symbol}</span>
                <span style={{ color: 'var(--text-muted)' }}>{w.company_name}</span>
                <button
                  onClick={() => handleExecuteCommand(`Stock price of ${w.symbol}`)}
                  style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer' }}
                >
                  Quote
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="holo-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem' }}>
              PENDING TO-DOS
            </span>
            <button
              onClick={() => onNavigate('productivity')}
              style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '0.7rem' }}
            >
              VIEW ALL →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasksSnapshot.length > 0 ? (
              tasksSnapshot.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--neon-amber)' }}>•</span>
                  <span style={{ color: '#fff', flex: 1 }}>{t.title}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t.priority}</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No pending tasks. Say "Add task..." to create one.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
