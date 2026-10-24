import React, { useState } from 'react';
import { api, AssistantResponse, GroundedSource } from '../services/api';
import { OrbState } from '../services/websocket';

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

  const playSpokenAudio = async (text: string) => {
    try {
      setOrbState('speaking');
      const audioRes = await api.synthesizeVoice(text);
      if (audioRes.success && audioRes.url) {
        const audio = new Audio(`http://127.0.0.1:8000${audioRes.url}`);
        audio.onended = () => setOrbState('ready');
        audio.onerror = () => setOrbState('ready');
        audio.play().catch(() => setOrbState('ready'));
      } else {
        setTimeout(() => setOrbState('ready'), 2000);
      }
    } catch {
      setOrbState('ready');
    }
  };

  const handleSend = async () => {
    if (!inputQuery.trim() || isSending) return;
    const userText = inputQuery.trim();
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
      <div>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1.5px' }}>
          VOICE & CHAT ASSISTANT
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
          Natural conversational intelligence in clear Indian English
        </div>
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
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question or speak a command in natural Indian English..."
          style={{
            flex: 1,
            background: 'rgba(8, 12, 22, 0.85)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '14px 18px',
            color: '#fff',
            fontSize: '0.92rem',
            outline: 'none',
            fontFamily: 'Rajdhani, sans-serif'
          }}
        />
        <button
          className="cyber-btn"
          disabled={isSending}
          onClick={handleSend}
          style={{ padding: '0 24px' }}
        >
          {isSending ? 'SENDING...' : 'SEND'}
        </button>
      </div>
    </div>
  );
};
