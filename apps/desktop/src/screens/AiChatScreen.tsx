import React, { useState } from 'react';
import { api, AssistantResponse } from '../services/api';
import { OrbState } from '../services/websocket';

interface AiChatScreenProps {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ramya';
  text: string;
  intent?: string;
  timestamp: string;
}

export const AiChatScreen: React.FC<AiChatScreenProps> = ({ orbState, setOrbState }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ramya',
      text: 'Hello! I am Ramya AI, your personal desktop and mobile assistant. You can speak to me in clear Indian English or type commands here.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

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
    setOrbState('processing');

    try {
      const res: AssistantResponse = await api.sendChat(userText, 'keyboard', false);
      const botMsg: Message = {
        id: res.id,
        sender: 'ramya',
        text: res.detailedText || res.spokenResponse,
        intent: res.intent,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, botMsg]);
      setOrbState('speaking');

      // Synthesize audio
      if (res.spokenResponse) {
        const audioRes = await api.synthesizeVoice(res.spokenResponse);
        if (audioRes.success && audioRes.url) {
          const audio = new Audio(`http://127.0.0.1:8000${audioRes.url}`);
          audio.onended = () => setOrbState('idle');
          audio.onerror = () => setOrbState('idle');
          audio.play().catch(() => setOrbState('idle'));
        } else {
          setTimeout(() => setOrbState('idle'), 2000);
        }
      } else {
        setOrbState('idle');
      }
    } catch (e: any) {
      setOrbState('error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ramya',
          text: `Error connecting to assistant: ${e.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      setTimeout(() => setOrbState('idle'), 2500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          AI VOICE & TEXT CONVERSATION STUDIO
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Gemma 3 4B Local Model / Smart Intent Dispatcher
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="holo-card" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: isUser ? 'rgba(0, 112, 243, 0.25)' : 'rgba(14, 22, 38, 0.9)',
                border: '1px solid',
                borderColor: isUser ? 'var(--neon-blue)' : 'rgba(0, 240, 255, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUser ? 'var(--neon-blue)' : 'var(--neon-cyan)' }}>
                  {isUser ? 'USER' : 'RAMYA AI'}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  {m.timestamp}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#fff', lineHeight: 1.4 }}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything, control your desktop, or query your documents..."
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '12px 16px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button className="cyber-btn" onClick={handleSend} disabled={isSending}>
          {isSending ? 'PROCESSING...' : 'SEND →'}
        </button>
      </div>
    </div>
  );
};
