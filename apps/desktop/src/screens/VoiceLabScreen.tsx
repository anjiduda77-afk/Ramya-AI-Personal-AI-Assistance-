import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { audioPlayer } from '../services/audioPlayer';

export const VoiceLabScreen: React.FC = () => {
  // TTS State
  const [testText, setTestText] = useState('Namaste! I am Ramya, your personal voice-first AI assistant. How can I help you today?');
  const [selectedVoice, setSelectedVoice] = useState('en-IN-NeerjaNeural');
  const [speechRate, setSpeechRate] = useState('+0%');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Live Microphone / Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [micRecognition, setMicRecognition] = useState<any>(null);

  // Command Testing State
  const [commandInput, setCommandInput] = useState('Hey Ramya, what is the weather in Hyderabad?');
  const [commandStatus, setCommandStatus] = useState<string>('');
  const [commandResponse, setCommandResponse] = useState<any>(null);
  const [isCommandRunning, setIsCommandRunning] = useState(false);

  const voices = [
    { id: 'en-IN-NeerjaNeural', name: 'Indian English — Neerja (Natural Female)' },
    { id: 'en-IN-PrabhatNeural', name: 'Indian English — Prabhat (Natural Male)' },
    { id: 'sarah', name: 'Ultra-Realistic Cloud — Sarah (OpenRouter ElevenLabs)' },
    { id: 'en-US-JennyNeural', name: 'US English — Jenny (Standard)' },
    { id: 'piper-lessac', name: 'Offline Piper Neural (100% Offline ONNX Engine)' },
    { id: 'windows-local-sapi5', name: 'Native Windows SAPI5 (100% Offline Local Voice)' }
  ];

  const presetTexts = [
    "Namaste! I am Ramya, your personal voice-first AI assistant. How can I help you today?",
    "Tell my friend in English that I will reach the office in ten minutes.",
    "Playing Deep Focus Ambient Atmosphere for your study session.",
    "Weather in Hyderabad is clear, 30°C with 39% humidity.",
    "Task added to your list: Complete voice testing."
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
    }
  }, []);

  const handleSynthesize = async (textToSpeak?: string) => {
    const text = textToSpeak || testText;
    if (!text.trim()) return;
    setIsSynthesizing(true);
    try {
      const isForceOffline = selectedVoice === 'windows-local-sapi5';
      const res = await api.synthesizeVoice(text, selectedVoice, speechRate, isForceOffline);
      if (res.success && res.url) {
        const fullUrl = `http://127.0.0.1:8000${res.url}`;
        setAudioUrl(fullUrl);
        audioPlayer.playSpeech(fullUrl, text);
      } else {
        alert(res.message || 'TTS generation failed.');
      }
    } catch (e: any) {
      alert(`Synthesis error: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Toggle Live Microphone Recognition
  const handleToggleMic = () => {
    if (isRecording) {
      if (micRecognition) {
        micRecognition.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge or type your voice command.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('Listening... Speak now into your microphone.');
        setWakeWordDetected(false);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        const lower = currentTranscript.toLowerCase();
        if (
          lower.includes('hey ramya') ||
          lower.includes('hello ramya') ||
          lower.includes('okey ramya') ||
          lower.includes('ok ramya') ||
          lower.includes('ramya')
        ) {
          setWakeWordDetected(true);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech error', e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      setMicRecognition(recognition);
    } catch (err: any) {
      alert(`Could not start microphone: ${err.message}`);
      setIsRecording(false);
    }
  };

  // Run Voice Command
  const handleExecuteVoiceCommand = async (cmd?: string) => {
    const query = cmd || commandInput;
    if (!query.trim()) return;

    setIsCommandRunning(true);
    setCommandStatus('Dispatching command to Ramya AI...');
    try {
      const res = await api.sendChat(query, 'voice', false);
      setCommandResponse(res);
      setCommandStatus(res.spoken_response || res.message || 'Command executed.');

      // Automatically play back spoken response
      if (res.spoken_response) {
        const isForceOffline = selectedVoice === 'windows-local-sapi5';
        const audioRes = await api.synthesizeVoice(res.spoken_response, selectedVoice, speechRate, isForceOffline);
        if (audioRes.success && audioRes.url) {
          audioPlayer.playSpeech(`http://127.0.0.1:8000${audioRes.url}`, res.spoken_response);
        }
      }
    } catch (e: any) {
      setCommandStatus(`Error: ${e.message}`);
    } finally {
      setIsCommandRunning(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1.5px' }}>
          VOICE LAB & ACOUSTIC STUDIO
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
          Real-time speech synthesis (TTS), live microphone input (STT), wake-word calibrator, and acoustic router
        </div>
      </div>

      {/* Grid: 3 Testing Panes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Text-to-Speech (Voice Output) Studio */}
        <div className="holo-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 700, letterSpacing: '1px' }}>
              🔊 VOICE SYNTHESIS (OUTPUT)
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)', background: 'rgba(0, 255, 157, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Edge-TTS Active
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              VOICE MODEL (NATURAL INDIAN ENGLISH)
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(5, 7, 12, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '6px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              PRESET VOICE PHRASES
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {presetTexts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTestText(p);
                    handleSynthesize(p);
                  }}
                  style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    color: '#e2e8f0',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  ▶ "{p.length > 50 ? p.substring(0, 50) + '...' : p}"
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              CUSTOM SPEECH SYNTHESIS TEST
            </label>
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(5, 7, 12, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '6px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem',
                resize: 'none'
              }}
            />
          </div>

          <button
            className="cyber-btn"
            onClick={() => handleSynthesize()}
            disabled={isSynthesizing}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSynthesizing ? 'GENERATING AUDIO...' : '▶ GENERATE & PLAY VOICE OUTPUT'}
          </button>

          {audioUrl && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>ACTIVE AUDIO STREAM:</div>
              <audio controls src={audioUrl} autoPlay style={{ width: '100%', height: '36px' }} />
            </div>
          )}
        </div>

        {/* Card 2: Live Microphone Input (STT) Studio */}
        <div className="holo-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: 700, letterSpacing: '1px' }}>
              🎙️ MICROPHONE VOICE INPUT (STT)
            </div>
            <span style={{
              fontSize: '0.7rem',
              color: isRecording ? '#ff3366' : 'var(--text-dim)',
              background: isRecording ? 'rgba(255, 51, 102, 0.15)' : 'rgba(255,255,255,0.05)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              {isRecording ? '● LIVE RECORDING' : 'IDLE'}
            </span>
          </div>

          <div style={{
            background: isRecording ? 'rgba(0, 255, 157, 0.08)' : 'rgba(5, 7, 12, 0.6)',
            border: isRecording ? '1px solid var(--neon-green)' : '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            minHeight: '110px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                LIVE SPEECH TRANSCRIPT:
              </div>
              <div style={{ fontSize: '0.95rem', color: '#fff', fontStyle: transcript ? 'normal' : 'italic' }}>
                {transcript || 'Click "Start Microphone" and speak in Indian English...'}
              </div>
            </div>

            {wakeWordDetected && (
              <div style={{
                marginTop: '10px',
                background: 'rgba(0, 240, 255, 0.2)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>✓</span>
                <span>WAKE PHRASE "HEY RAMYA" DETECTED!</span>
              </div>
            )}
          </div>

          <button
            onClick={handleToggleMic}
            style={{
              background: isRecording ? '#ff3366' : 'rgba(0, 255, 157, 0.12)',
              border: isRecording ? '1px solid #ff3366' : '1px solid var(--neon-green)',
              color: isRecording ? '#fff' : 'var(--neon-green)',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: isRecording ? '0 0 15px rgba(255, 51, 102, 0.4)' : 'none'
            }}
          >
            <span>{isRecording ? '⏹ STOP MICROPHONE' : '🎙️ START LIVE MICROPHONE CHECK'}</span>
          </button>

          {/* Wake Word Calibration Matrix */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              RECOGNIZED WAKE PHRASES & VARIANTS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['Hey Ramya', 'Hello Ramya', 'Ramya', 'Okey Ramya', 'Ok Ramya'].map((p) => (
                <span
                  key={p}
                  style={{
                    background: 'rgba(0, 240, 255, 0.08)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.72rem'
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
            Tip: Press <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>Ctrl + Space</span> anywhere in the app to activate Push-to-Talk!
          </div>
        </div>

        {/* Card 3: End-to-End Voice Command Dispatcher */}
        <div className="holo-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--neon-violet)', fontWeight: 700, letterSpacing: '1px' }}>
              ⚡ VOICE COMMAND DISPATCHER
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-violet)', background: 'rgba(138, 43, 226, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Full Pipeline
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              QUICK COMMAND TESTERS
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                "Hey Ramya, what is the weather in Hyderabad?",
                "Hey Ramya, play relaxing music",
                "Tell my friend in English that I will arrive in ten minutes",
                "Remember that I prefer dark cyberpunk mode",
                "What do you remember about my preferences?"
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCommandInput(cmd);
                    handleExecuteVoiceCommand(cmd);
                  }}
                  style={{
                    background: 'rgba(138, 43, 226, 0.08)',
                    border: '1px solid rgba(138, 43, 226, 0.25)',
                    color: '#e2e8f0',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ {cmd}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              CUSTOM VOICE COMMAND
            </label>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteVoiceCommand()}
              style={{
                width: '100%',
                background: 'rgba(5, 7, 12, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '6px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <button
            className="cyber-btn"
            onClick={() => handleExecuteVoiceCommand()}
            disabled={isCommandRunning}
            style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--neon-violet)', color: '#fff' }}
          >
            {isCommandRunning ? 'PROCESSING COMMAND...' : '▶ DISPATCH VOICE COMMAND'}
          </button>

          {commandStatus && (
            <div style={{
              background: 'rgba(5, 7, 12, 0.8)',
              border: '1px solid rgba(138, 43, 226, 0.3)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--neon-violet)', fontWeight: 700, marginBottom: '4px' }}>
                {commandResponse ? `ROUTED INTENT: [${commandResponse.intent || 'conversation'}]` : 'STATUS:'}
              </div>
              <div style={{ color: '#fff', lineHeight: '1.4' }}>
                {commandStatus}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
