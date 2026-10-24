import React, { useState, useEffect } from 'react';
import { api, AssistantResponse, GroundedSource, VoiceSettings } from '../services/api';
import { OrbState } from '../services/websocket';
import { audioPlayer } from '../services/audioPlayer';

interface AiChatScreenProps {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ramya';
  text: string;
  spokenText?: string;
  intent?: string;
  sources?: GroundedSource[];
  timestamp: string;
}

export const AiChatScreen: React.FC<AiChatScreenProps> = ({ orbState, setOrbState }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ramya',
      text: 'Namaste! I am Ramya, your personal voice-first AI assistant. You can speak to me or type any question or task here.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice_responses_enabled: true,
    preferred_voice: 'en-IN-NeerjaNeural',
    speech_speed: '+0%',
    auto_listen_after_reply: false,
    wake_word_listening: true
  });

  useEffect(() => {
    api.getVoiceSettings().then(setVoiceSettings).catch(console.warn);
  }, []);

  const handleToggleMic = () => {
    audioPlayer.stop();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please use Chrome/Edge or type your message.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      setOrbState('ready');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setOrbState('listening');
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setInputQuery(spoken);
        if (event.results[0].isFinal) {
          setIsListening(false);
          handleSend(spoken);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setOrbState('ready');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      setOrbState('ready');
    }
  };

  const playSpokenAudio = async (text: string) => {
    if (!voiceSettings.voice_responses_enabled || !text.trim()) {
      setOrbState('ready');
      return;
    }

    try {
      setOrbState('speaking');
      const audioRes = await api.synthesizeVoice(
        text,
        voiceSettings.preferred_voice,
        voiceSettings.speech_speed
      );
      if (audioRes.success && audioRes.url) {
        const fullUrl = `http://127.0.0.1:8000${audioRes.url}`;
        audioPlayer.playSpeech(
          fullUrl,
          text,
          () => {
            if (voiceSettings.auto_listen_after_reply) {
              handleToggleMic();
            } else {
              setOrbState('ready');
            }
          },
          () => setOrbState('ready')
        );
      } else {
        setTimeout(() => setOrbState('ready'), 1500);
      }
    } catch {
      setOrbState('ready');
    }
  };

  const handleSend = async (queryOverride?: string) => {
    const rawText = queryOverride !== undefined ? queryOverride : inputQuery;
    if (!rawText.trim() || isSending) return;
    const userText = rawText.trim();
    setInputQuery('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsSending(true);
    setOrbState('working');

    try {
      const res: AssistantResponse = await api.sendChat(userText, 'keyboard', false);
      const botMsg: Message = {
        id: res.task_id || `bot-${Date.now()}`,
        sender: 'ramya',
        text: res.message || res.detailedText || res.spoken_response || '',
        spokenText: res.spoken_response || res.spokenResponse,
        intent: res.intent,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, botMsg]);

      // Play synthesized audio
      if (res.spoken_response) {
        await playSpokenAudio(res.spoken_response);
      } else {
        setOrbState('ready');
      }
    } catch (e: any) {
      setOrbState('needs_attention');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ramya',
          text: "I'm temporarily unable to answer that request. Please try again shortly.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      setTimeout(() => setOrbState('ready'), 2500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 32px', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1.5px' }}>
            VOICE & CHAT ASSISTANT
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Natural conversational intelligence in clear Indian English
          </div>
        </div>
        <button
          onClick={() => {
            const next = !voiceSettings.voice_responses_enabled;
            setVoiceSettings(prev => ({ ...prev, voice_responses_enabled: next }));
            api.updateVoiceSettings({ voice_responses_enabled: next }).catch(console.warn);
          }}
          style={{
            background: voiceSettings.voice_responses_enabled ? 'rgba(0, 255, 157, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            border: voiceSettings.voice_responses_enabled ? '1px solid var(--neon-green)' : '1px solid var(--border-subtle)',
            color: voiceSettings.voice_responses_enabled ? 'var(--neon-green)' : 'var(--text-dim)',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'Orbitron, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>{voiceSettings.voice_responses_enabled ? '🔊' : '🔇'}</span>
          <span>VOICE REPLIES: {voiceSettings.voice_responses_enabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        paddingRight: '6px'
      }}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{
                fontSize: '0.72rem',
                color: isUser ? 'var(--neon-cyan)' : 'var(--neon-violet)',
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '1px',
                textAlign: isUser ? 'right' : 'left'
              }}>
                {isUser ? 'YOU' : 'RAMYA AI'}
              </div>
              <div
                className="holo-card"
                style={{
                  padding: '14px 18px',
                  background: isUser ? 'rgba(0, 112, 243, 0.15)' : 'rgba(14, 22, 38, 0.85)',
                  borderColor: isUser ? 'rgba(0, 240, 255, 0.35)' : 'rgba(138, 43, 226, 0.35)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  boxShadow: isUser ? '0 4px 16px rgba(0, 240, 255, 0.1)' : '0 4px 16px rgba(0,0,0,0.4)'
                }}
              >
                <div>{m.text}</div>

                {/* Grounded Source Citations */}
                {m.sources && m.sources.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
                      Grounded References:
                    </span>
                    {m.sources.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.78rem',
                          background: 'rgba(0, 240, 255, 0.08)',
                          border: '1px solid rgba(0, 240, 255, 0.2)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: 'var(--text-muted)'
                        }}
                      >
                        📄 <strong style={{ color: '#fff' }}>{s.title}</strong> {s.reference && `(${s.reference})`}
                      </div>
                    ))}
                  </div>
                )}

                {/* Re-speak Action for Ramya Messages */}
                {!isUser && m.spokenText && (
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => playSpokenAudio(m.spokenText!)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--neon-cyan)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px'
                      }}
                      title="Listen again"
                    >
                      <span>🔊</span>
                      <span>Speak</span>
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: isUser ? 'right' : 'left' }}>
                {m.timestamp}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question or speak a command in natural Indian English..."
          style={{
            flex: 1,
            background: 'rgba(8, 12, 22, 0.85)',
            border: isListening ? '1px solid var(--neon-green)' : '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '14px 18px',
            color: '#fff',
            fontSize: '0.92rem',
            outline: 'none',
            fontFamily: 'Rajdhani, sans-serif',
            boxShadow: isListening ? '0 0 10px rgba(0, 255, 157, 0.25)' : 'none'
          }}
        />
        <button
          onClick={handleToggleMic}
          title={isListening ? "Stop listening" : "Click to speak with microphone"}
          style={{
            background: isListening ? '#ff3366' : 'rgba(0, 255, 157, 0.12)',
            border: isListening ? '1px solid #ff3366' : '1px solid var(--neon-green)',
            color: isListening ? '#fff' : 'var(--neon-green)',
            padding: '0 18px',
            height: '48px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 700,
            transition: 'all 0.2s ease',
            boxShadow: isListening ? '0 0 15px rgba(255, 51, 102, 0.5)' : 'none'
          }}
        >
          <span>🎙️</span>
          <span>{isListening ? 'LISTENING...' : 'MIC'}</span>
        </button>
        <button
          className="cyber-btn"
          disabled={isSending}
          onClick={() => handleSend()}
          style={{ padding: '0 24px', height: '48px' }}
        >
          {isSending ? 'SENDING...' : 'SEND'}
        </button>
      </div>
    </div>
  );
};
