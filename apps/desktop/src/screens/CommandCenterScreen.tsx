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
  const [statusMessage, setStatusMessage] = useState<string>('Ready for voice or text command');
  const [lastResponse, setLastResponse] = useState<AssistantResponse | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [tasksSnapshot, setTasksSnapshot] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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
      console.warn('Dashboard data refresh');
    }
  };

  const handleStop = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    wsService.cancel();
    setOrbState('ready');
    setStatusMessage('Ready for your command');
    setIsProcessing(false);
  };

  const handleExecuteCommand = async (commandText: string, isConfirmed: boolean = false) => {
    if (!commandText.trim()) return;
    setIsProcessing(true);
    setOrbState('working');
    setStatusMessage('Working on your request...');

    try {
      const res = await api.sendChat(commandText, 'keyboard', isConfirmed);
      setLastResponse(res);

      if (res.requires_approval) {
        setOrbState('waiting_approval');
        setStatusMessage(res.approval_prompt || 'Waiting for your approval...');
        setIsProcessing(false);
        return;
      }

      setOrbState('speaking');
      setStatusMessage(res.spoken_response || res.message || 'Completed.');

      // Synthesize audio
      if (res.spoken_response) {
        const audioRes = await api.synthesizeVoice(res.spoken_response);
        if (audioRes.success && audioRes.url) {
          const audio = new Audio(`http://127.0.0.1:8000${audioRes.url}`);
          setCurrentAudio(audio);
          audio.onended = () => {
            setOrbState('ready');
            setStatusMessage('Ready');
            setCurrentAudio(null);
          };
          audio.onerror = () => {
            setOrbState('ready');
            setStatusMessage('Ready');
            setCurrentAudio(null);
          };
          audio.play().catch(() => {
            setOrbState('ready');
            setStatusMessage('Ready');
            setCurrentAudio(null);
          });
        } else {
          setTimeout(() => {
            setOrbState('ready');
            setStatusMessage('Ready');
          }, 3000);
        }
      } else {
        setOrbState('ready');
      }

      loadDashboardData();
    } catch (e: any) {
      setOrbState('needs_attention');
      setStatusMessage("I couldn't complete that request. Please try again.");
      setTimeout(() => {
        setOrbState('ready');
        setStatusMessage('Ready');
      }, 3500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrbClick = () => {
    if (orbState === 'speaking' || orbState === 'working') {
      handleStop();
      return;
    }

    setOrbState('listening');
    setStatusMessage('Listening in Indian English...');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        const current = event.results[event.results.length - 1][0].transcript;
        setStatusMessage(`"${current}"`);
      };
      recognition.onend = () => {
        setOrbState('understanding');
        setStatusMessage('Understanding...');
        handleExecuteCommand(statusMessage.replace(/"/g, ''));
      };
      recognition.onerror = () => {
        setOrbState('ready');
        setStatusMessage("I couldn't hear that clearly. Please try again.");
      };
      recognition.start();
    } else {
      handleExecuteCommand("What's on my agenda for today?");
    }
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Top Banner & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '2px' }}>
            COMMAND CENTER
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Personal Cybernetic Intelligence Hub
          </div>
        </div>

        {/* Action Chips */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="cyber-btn"
            onClick={() => handleExecuteCommand('Analyze my current screen')}
          >
            <span>👁️</span> ANALYZE SCREEN
          </button>
          <button
            className="cyber-btn cyber-btn-secondary"
            onClick={() => handleExecuteCommand('Show daily plan')}
          >
            <span>⏱️</span> TODAY'S PLAN
          </button>
        </div>
      </div>

      {/* Holographic Center: Animated Orb & Waveform */}
      <div className="holo-card" style={{
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'radial-gradient(circle at 50% 50%, rgba(0, 112, 243, 0.12) 0%, rgba(14, 22, 38, 0.85) 75%)',
        border: '1px solid rgba(0, 240, 255, 0.25)'
      }}>
        {/* Animated Ramya AI Orb */}
        <AiOrb
          state={orbState}
          size={190}
          onClick={handleOrbClick}
          onCancel={handleStop}
          showWaveform={true}
        />

        {/* Dynamic Status Capsule */}
        <div style={{
          marginTop: '18px',
          background: 'rgba(5, 7, 12, 0.75)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: '24px',
          padding: '8px 24px',
          maxWidth: '620px',
          width: '100%',
          textAlign: 'center',
          color: 'var(--text-main)',
          fontSize: '0.92rem',
          fontFamily: 'Rajdhani, sans-serif',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}>
          {statusMessage}
        </div>

        {/* Confirmation Approval Gate */}
        {lastResponse?.requires_approval && (
          <div style={{
            marginTop: '16px',
            background: 'rgba(255, 170, 0, 0.12)',
            border: '1px solid var(--neon-amber)',
            borderRadius: '10px',
            padding: '14px 20px',
            maxWidth: '620px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ color: '#fff', fontSize: '0.85rem' }}>
              <strong>Approval Needed:</strong> {lastResponse.approval_prompt}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="cyber-btn"
                style={{ background: 'var(--neon-green)', color: '#000', borderColor: 'var(--neon-green)' }}
                onClick={() => handleExecuteCommand(lastResponse.query || '', true)}
              >
                Approve
              </button>
              <button
                className="cyber-btn"
                style={{ background: 'rgba(255, 51, 102, 0.2)', color: 'var(--neon-red)', borderColor: 'var(--neon-red)' }}
                onClick={handleStop}
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Natural Input Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '620px',
          width: '100%',
          marginTop: '18px'
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
            placeholder='Ask Ramya (e.g., "What is the weather in Hyderabad?", "Add task to finish presentation", "Open Chrome")'
            style={{
              flex: 1,
              background: 'rgba(8, 12, 22, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 18px',
              color: '#fff',
              fontSize: '0.9rem',
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
            SEND
          </button>
        </div>
      </div>

      {/* Assistant Spoken / Verified Outcome Card */}
      {lastResponse && !lastResponse.requires_approval && (
        <div className="holo-card" style={{ padding: '18px 24px', borderColor: 'var(--neon-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px' }}>
              ASSISTANT RESPONSE
            </span>
            <span style={{ color: 'var(--neon-green)', fontSize: '0.75rem', fontWeight: 600 }}>
              ✓ Verified
            </span>
          </div>
          <div style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
            "{lastResponse.spoken_response || lastResponse.spokenResponse}"
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {lastResponse.message || lastResponse.detailedText}
          </div>
        </div>
      )}

      {/* Telemetry Snapshot Grid: Live Weather, Market Pulse & Tasks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Card 1: Ambient Weather Radar */}
        <div className="holo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
              AMBIENT WEATHER
            </span>
            <span style={{ color: 'var(--neon-green)', fontSize: '0.7rem' }}>● LIVE</span>
          </div>
          {weatherData ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff' }}>
                  {weatherData.temperatureC}°C
                </span>
                <span style={{ color: 'var(--neon-cyan)', fontSize: '1rem', fontWeight: 600 }}>
                  {weatherData.condition}
                </span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '4px' }}>
                {weatherData.location}
              </div>
              <div style={{ display: 'flex', gap: '18px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Humidity: {weatherData.humidityPercent}%</span>
                <span>Wind: {weatherData.windSpeedKmh} km/h</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Updating weather radar...</div>
          )}
        </div>

        {/* Card 2: Market Watchlist */}
        <div className="holo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
              MARKET WATCHLIST
            </span>
            <button
              onClick={() => onNavigate('weather_markets')}
              style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              RADAR →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {watchlist.slice(0, 3).map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>{w.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{w.company_name}</span>
                <button
                  onClick={() => handleExecuteCommand(`Stock price of ${w.symbol}`)}
                  style={{
                    background: 'rgba(0, 240, 255, 0.08)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    color: 'var(--neon-cyan)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Quote
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Priority Tasks */}
        <div className="holo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
              PRIORITY TASKS
            </span>
            <button
              onClick={() => onNavigate('productivity')}
              style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              VIEW ALL →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasksSnapshot.length > 0 ? (
              tasksSnapshot.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--neon-amber)' }}>•</span>
                  <span style={{ color: '#fff', flex: 1 }}>{t.title}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--neon-cyan)',
                    background: 'rgba(0, 240, 255, 0.08)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {t.priority}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                All clear! Say "Add task..." to schedule something.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
