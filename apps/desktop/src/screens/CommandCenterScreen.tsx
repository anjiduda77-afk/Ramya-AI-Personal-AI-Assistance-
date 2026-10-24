import React, { useState, useEffect, useRef } from 'react';
import { AiOrb } from '../components/AiOrb';
import { OrbState, wsService } from '../services/websocket';
import { api, AssistantResponse, VoiceSettings } from '../services/api';
import { audioPlayer } from '../services/audioPlayer';

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
  const [tasksSnapshot, setTasksSnapshot] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Continuous Conversation & Audio Pipeline References
  const activeRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const followUpTimerRef = useRef<any>(null);
  const isEchoSuppressedRef = useRef<boolean>(false);
  const isListeningActiveRef = useRef<boolean>(false);
  const accumulatedSpeechRef = useRef<string>('');

  // Upgrade state: English Tutor, Music, and Personal Memory
  const [englishSession, setEnglishSession] = useState<any>(null);
  const [musicStreams, setMusicStreams] = useState<any[]>([]);
  const [activeMusicTrack, setActiveMusicTrack] = useState<any>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [musicAudio, setMusicAudio] = useState<HTMLAudioElement | null>(null);
  const [memoriesList, setMemoriesList] = useState<any[]>([]);
  const [newMemoryText, setNewMemoryText] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice_responses_enabled: true,
    preferred_voice: 'en-IN-NeerjaNeural',
    speech_speed: '+0%',
    auto_listen_after_reply: true,
    wake_word_listening: true,
    continuous_listening: true,
    speech_recognition_lang: 'en-IN',
    silence_threshold_ms: 850
  });

  useEffect(() => {
    loadDashboardData();
    return () => {
      stopRecognitionEngine();
      audioPlayer.stop();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [w, t, eng, ms, mems, vs] = await Promise.all([
        api.getWeather('Hyderabad').catch(() => null),
        api.getTasks(false).catch(() => []),
        api.getEnglishSession().catch(() => null),
        api.getMusicStreams().catch(() => []),
        api.getMemories().catch(() => []),
        api.getVoiceSettings().catch(() => null)
      ]);
      if (w) setWeatherData(w);
      if (t) setTasksSnapshot(t.slice(0, 3));
      if (eng) setEnglishSession(eng);
      if (ms && ms.length > 0) {
        setMusicStreams(ms);
        setActiveMusicTrack(ms[0]);
      }
      if (mems) setMemoriesList(mems.slice(0, 4));
      if (vs) setVoiceSettings(vs);
    } catch (e) {
      console.warn('Dashboard data refresh');
    }
  };

  const isExitPhrase = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    return /^(?:stop|bye|goodbye|cancel|nevermind|nothing|thank\s*you|thanks|that'?s\s*all|exit|close)(?:\s+(?:ramya|for\s+now|so\s+much))?[!\.]*$/i.test(t);
  };

  const stopRecognitionEngine = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (followUpTimerRef.current) {
      clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.abort();
      } catch {}
      activeRecognitionRef.current = null;
    }
    isListeningActiveRef.current = false;
    setInterimTranscript('');
    accumulatedSpeechRef.current = '';
  };

  const startListening = (mode: 'initial' | 'follow_up' = 'initial') => {
    if (isEchoSuppressedRef.current) return;
    stopRecognitionEngine();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Speech recognition not supported in this browser environment.");
      setOrbState('ready');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceSettings.speech_recognition_lang || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      isListeningActiveRef.current = true;
      activeRecognitionRef.current = recognition;

      if (mode === 'follow_up') {
        setOrbState('follow_up');
        setStatusMessage('Listening for follow-up... (or say "that\'s all")');

        // Set 7.5s silence follow-up window
        followUpTimerRef.current = setTimeout(() => {
          if (isListeningActiveRef.current) {
            stopRecognitionEngine();
            setOrbState('ready');
            setStatusMessage('Ready for your command');
          }
        }, 7500);
      } else {
        setOrbState('listening');
        setStatusMessage('Listening... Speak your command or question.');
      }

      recognition.onresult = (event: any) => {
        if (isEchoSuppressedRef.current) return; // Acoustic feedback suppression

        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }

        const activeHeard = (accumulatedSpeechRef.current + currentFinal + currentInterim).trim();
        if (activeHeard) {
          setInterimTranscript(currentInterim.trim() || activeHeard);
          setStatusMessage(`"${activeHeard}"`);

          // Reset follow-up timer on detected speech
          if (followUpTimerRef.current) {
            clearTimeout(followUpTimerRef.current);
            followUpTimerRef.current = null;
          }

          // Instant exit word detection
          if (isExitPhrase(activeHeard)) {
            stopRecognitionEngine();
            handleExecuteCommand(activeHeard);
            return;
          }

          // Voice Activity Detection / End-of-Speech silence debounce
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          const silenceThreshold = voiceSettings.silence_threshold_ms || 850;
          silenceTimerRef.current = setTimeout(() => {
            const finalCommand = activeHeard;
            stopRecognitionEngine();
            if (finalCommand) {
              handleExecuteCommand(finalCommand);
            } else {
              setOrbState('ready');
              setStatusMessage('Ready');
            }
          }, silenceThreshold);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          if (mode !== 'follow_up') {
            stopRecognitionEngine();
            setOrbState('ready');
            setStatusMessage("I didn't catch that. Ready for your command.");
          }
        } else if (event.error === 'not-allowed') {
          stopRecognitionEngine();
          setOrbState('needs_attention');
          setStatusMessage("Microphone access is required for voice commands.");
        } else if (event.error !== 'aborted') {
          stopRecognitionEngine();
          setOrbState('ready');
          setStatusMessage("Ready for your command");
        }
      };

      recognition.onend = () => {
        if (isListeningActiveRef.current && !isEchoSuppressedRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
    } catch {
      setOrbState('ready');
      setStatusMessage("Could not initialize microphone.");
    }
  };

  const handleStop = () => {
    audioPlayer.stop();
    if (musicAudio) {
      musicAudio.pause();
      setIsAudioPlaying(false);
    }
    wsService.cancel();
    stopRecognitionEngine();
    isEchoSuppressedRef.current = false;
    setOrbState('ready');
    setStatusMessage('Ready for your command');
    setIsProcessing(false);
  };

  const handleExecuteCommand = async (commandText: string, isConfirmed: boolean = false) => {
    if (!commandText.trim()) return;

    // Anti-feedback echo suppression: mute recognition during execution & speech playback
    isEchoSuppressedRef.current = true;
    stopRecognitionEngine();

    setIsProcessing(true);
    setOrbState('working');
    setStatusMessage('Working on your request...');

    try {
      const res = await api.sendChat(commandText, 'voice', isConfirmed);
      setLastResponse(res);

      if (res.requires_approval) {
        isEchoSuppressedRef.current = false;
        setOrbState('waiting_approval');
        setStatusMessage(res.approval_prompt || 'Waiting for your approval...');
        setIsProcessing(false);
        return;
      }

      setOrbState('speaking');
      setStatusMessage(res.spoken_response || res.message || 'Completed.');

      const spokenText = res.spoken_response || res.spokenResponse;
      const isExit = res.intent === 'exit_conversation' || isExitPhrase(commandText);

      // Synthesize and play audio response if voice responses are enabled
      if (voiceSettings.voice_responses_enabled && spokenText) {
        try {
          const audioRes = await api.synthesizeVoice(
            spokenText,
            voiceSettings.preferred_voice,
            voiceSettings.speech_speed
          );

          if (audioRes.success && audioRes.url) {
            const fullUrl = `http://127.0.0.1:8000${audioRes.url}`;
            audioPlayer.playSpeech(
              fullUrl,
              spokenText,
              () => {
                // Speech playback ended cleanly
                isEchoSuppressedRef.current = false;
                if (isExit) {
                  setOrbState('ready');
                  setStatusMessage('Ready for your command');
                } else if (voiceSettings.continuous_listening !== false) {
                  // Seamless persistent turn-taking
                  startListening('follow_up');
                } else {
                  setOrbState('ready');
                  setStatusMessage('Ready');
                }
              },
              () => {
                isEchoSuppressedRef.current = false;
                setOrbState('ready');
                setStatusMessage('Ready');
              }
            );
          } else {
            // Audio synthesis fallback delay
            isEchoSuppressedRef.current = false;
            setTimeout(() => {
              if (isExit) {
                setOrbState('ready');
                setStatusMessage('Ready for your command');
              } else if (voiceSettings.continuous_listening !== false) {
                startListening('follow_up');
              } else {
                setOrbState('ready');
                setStatusMessage('Ready');
              }
            }, 1400);
          }
        } catch {
          isEchoSuppressedRef.current = false;
          setOrbState('ready');
          setStatusMessage('Ready');
        }
      } else {
        isEchoSuppressedRef.current = false;
        setTimeout(() => {
          if (isExit) {
            setOrbState('ready');
            setStatusMessage('Ready for your command');
          } else if (voiceSettings.continuous_listening !== false) {
            startListening('follow_up');
          } else {
            setOrbState('ready');
            setStatusMessage('Ready');
          }
        }, 1000);
      }

      // Refresh background widgets
      loadDashboardData();
    } catch (e: any) {
      isEchoSuppressedRef.current = false;
      setOrbState('needs_attention');
      setStatusMessage("I couldn't complete that request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrbClick = () => {
    // Speech Barge-in: clicking while speaking immediately interrupts TTS and begins listening!
    if (orbState === 'speaking' || isProcessing) {
      audioPlayer.stop();
      isEchoSuppressedRef.current = false;
      setIsProcessing(false);
      startListening('initial');
      return;
    }

    if (orbState === 'listening' || orbState === 'follow_up') {
      stopRecognitionEngine();
      setOrbState('ready');
      setStatusMessage('Ready for your command');
      return;
    }

    if (orbState === 'paused') {
      startListening('initial');
      return;
    }

    // IDLE / ready
    startListening('initial');
  };

  // Music stream toggling
  const handleToggleMusic = (track?: any) => {
    const selected = track || activeMusicTrack;
    if (!selected) return;

    if (isAudioPlaying && musicAudio) {
      musicAudio.pause();
      setIsAudioPlaying(false);
      return;
    }

    if (musicAudio) {
      musicAudio.pause();
    }

    const audio = new Audio(selected.stream_url);
    audio.onended = () => setIsAudioPlaying(false);
    audio.onerror = () => setIsAudioPlaying(false);
    audio.play().then(() => {
      setIsAudioPlaying(true);
      setActiveMusicTrack(selected);
      setMusicAudio(audio);
    }).catch(() => {
      setIsAudioPlaying(false);
    });
  };

  // English Learning Tutor Choice Handling
  const handleEnglishChoice = async (choice: 'revise' | 'new') => {
    setIsProcessing(true);
    setOrbState('working');
    try {
      const res = await api.sendEnglishChoice(choice);
      setEnglishSession(res);
      setOrbState('speaking');
      setStatusMessage(res.spoken_response || res.message);
      if (res.spoken_response) {
        const audioRes = await api.synthesizeVoice(res.spoken_response);
        if (audioRes.success && audioRes.url) {
          const audio = new Audio(`http://127.0.0.1:8000${audioRes.url}`);
          audio.onended = () => { setOrbState('ready'); setStatusMessage('Ready'); };
          audio.play().catch(() => { setOrbState('ready'); setStatusMessage('Ready'); });
        }
      }
    } catch {
      setOrbState('ready');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick memory save
  const handleSaveMemory = async () => {
    if (!newMemoryText.trim()) return;
    try {
      await api.createMemory(newMemoryText.trim(), 'general', 4);
      setNewMemoryText('');
      loadDashboardData();
    } catch (e) {
      console.warn('Memory save error', e);
    }
  };

  // Export memories JSON
  const handleExportMemories = async () => {
    try {
      const data = await api.exportMemories();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ramya-memories-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Export failed', e);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '2px' }}>
            COMMAND CENTER
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Ramya AI Personal Cybernetic Intelligence Hub
          </div>
        </div>

        {/* Action Chips */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="cyber-btn"
            style={{
              borderColor: orbState === 'paused' ? 'var(--neon-amber)' : 'rgba(0, 240, 255, 0.4)',
              background: orbState === 'paused' ? 'rgba(255, 170, 0, 0.15)' : undefined
            }}
            onClick={() => {
              if (orbState === 'paused') {
                startListening('initial');
              } else {
                stopRecognitionEngine();
                setOrbState('paused');
                setStatusMessage('Microphone paused. Click orb or Resume to activate.');
              }
            }}
          >
            <span>{orbState === 'paused' ? '▶️' : '⏸️'}</span> {orbState === 'paused' ? 'RESUME MIC' : 'PAUSE MIC'}
          </button>
          <button
            className="cyber-btn"
            onClick={() => handleExecuteCommand('Repeat yesterday’s English lesson')}
          >
            <span>📚</span> REPEAT ENGLISH LESSON
          </button>
          <button
            className="cyber-btn"
            onClick={() => handleExecuteCommand('Play relaxing music')}
          >
            <span>🎵</span> PLAY RELAXING MUSIC
          </button>
          <button
            className="cyber-btn cyber-btn-secondary"
            onClick={() => handleExecuteCommand('Tell my friend in English that I will arrive in ten minutes')}
          >
            <span>🗣️</span> TELUGU TO ENGLISH
          </button>
        </div>
      </div>

      {/* Holographic Center: Animated Orb & Waveform */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0 10px',
        position: 'relative'
      }}>
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
          maxWidth: '640px',
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

        {/* Interim Real-time Speech Preview */}
        {interimTranscript && (
          <div style={{
            marginTop: '10px',
            padding: '6px 20px',
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px dashed var(--neon-cyan)',
            borderRadius: '16px',
            color: 'var(--neon-cyan)',
            fontSize: '0.86rem',
            fontStyle: 'italic',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🎙️</span>
            <span>Hearing: "{interimTranscript}"</span>
          </div>
        )}

        {/* Persistent Conversation Follow-Up Badge */}
        {orbState === 'follow_up' && (
          <div style={{
            marginTop: '10px',
            padding: '5px 18px',
            background: 'rgba(255, 170, 0, 0.12)',
            border: '1px solid var(--neon-amber)',
            borderRadius: '16px',
            color: 'var(--neon-amber)',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-amber)' }}></span>
            <span>Continuous Follow-Up Active — Speak naturally or say "that's all"</span>
          </div>
        )}

        {/* Microphone Paused Badge */}
        {orbState === 'paused' && (
          <div style={{
            marginTop: '10px',
            padding: '5px 18px',
            background: 'rgba(255, 51, 102, 0.12)',
            border: '1px solid var(--neon-red)',
            borderRadius: '16px',
            color: 'var(--neon-red)',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⏸️</span>
            <span>Microphone Paused — Click orb or "RESUME MIC" to talk</span>
          </div>
        )}

        {/* Confirmation Approval Gate */}
        {lastResponse?.requires_approval && (
          <div style={{
            marginTop: '16px',
            background: 'rgba(255, 170, 0, 0.12)',
            border: '1px solid var(--neon-amber)',
            borderRadius: '10px',
            padding: '14px 20px',
            maxWidth: '640px',
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
          maxWidth: '640px',
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
            placeholder='Ask Ramya (e.g. "Play relaxing music", "What is the weather?", "Remember that I like coffee")'
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

      {/* Assistant Spoken Response Card */}
      {lastResponse && !lastResponse.requires_approval && (
        <div className="holo-card" style={{ padding: '18px 24px', borderColor: 'var(--neon-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px' }}>
              ASSISTANT RESPONSE
            </span>
            <span style={{ color: 'var(--neon-green)', fontSize: '0.75rem', fontWeight: 600 }}>
              ✓ Verified Outcome
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

      {/* Upgraded Cybernetic Grid: English Tutor, Free Legal Music, Personal Memory, Weather & Tasks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Card 1: Personalised English Learning Tutor */}
        <div className="holo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
              ENGLISH LEARNING TUTOR
            </span>
            <span style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 600 }}>
              DAY {englishSession?.lesson_details?.lesson_day || englishSession?.lesson?.lesson_day || 1}
            </span>
          </div>

          {englishSession?.needs_revision_prompt ? (
            <div>
              <div style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 600, marginBottom: '8px' }}>
                Would you like to revise yesterday’s sentence before learning a new one?
              </div>
              <div style={{
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '12px',
                fontSize: '0.85rem'
              }}>
                <div style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
                  Yesterday: "{englishSession.previous_sentence}"
                </div>
                {englishSession.lesson_details?.meaning_telugu && (
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    తెలుగు: {englishSession.lesson_details.meaning_telugu}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="cyber-btn"
                  style={{ flex: 1, fontSize: '0.8rem' }}
                  onClick={() => handleEnglishChoice('revise')}
                >
                  🔁 REVISE SENTENCE
                </button>
                <button
                  className="cyber-btn cyber-btn-secondary"
                  style={{ flex: 1, fontSize: '0.8rem' }}
                  onClick={() => handleEnglishChoice('new')}
                >
                  ➡️ NEW LESSON
                </button>
              </div>
            </div>
          ) : englishSession?.lesson ? (
            <div>
              <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, marginBottom: '6px' }}>
                "{englishSession.lesson.sentence_en}"
              </div>
              <div style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', marginBottom: '8px' }}>
                తెలుగు: {englishSession.lesson.meaning_telugu}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
                💡 {englishSession.lesson.grammar_note}
              </div>
              <button
                className="cyber-btn"
                style={{ width: '100%', fontSize: '0.8rem' }}
                onClick={() => handleEnglishChoice('new')}
              >
                NEXT LESSON →
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Loading personalized English curriculum...
            </div>
          )}
        </div>

        {/* Card 2: Free and Legal Curated Music Deck */}
        <div className="holo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
              FREE & LEGAL MUSIC DECK
            </span>
            <span style={{ color: isAudioPlaying ? 'var(--neon-green)' : 'var(--text-muted)', fontSize: '0.75rem' }}>
              {isAudioPlaying ? '● PLAYING' : 'PAUSED'}
            </span>
          </div>

          {activeMusicTrack && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>
                {activeMusicTrack.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeMusicTrack.artist} • Genre: {activeMusicTrack.genre.toUpperCase()}
              </div>
            </div>
          )}

          {/* Genre selector chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {musicStreams.map((s) => (
              <button
                key={s.id}
                onClick={() => handleToggleMusic(s)}
                style={{
                  background: activeMusicTrack?.id === s.id ? 'var(--neon-cyan)' : 'rgba(0, 240, 255, 0.08)',
                  color: activeMusicTrack?.id === s.id ? '#000' : 'var(--neon-cyan)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {s.genre.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="cyber-btn"
              style={{ flex: 1, fontSize: '0.8rem' }}
              onClick={() => handleToggleMusic()}
            >
              {isAudioPlaying ? '⏸️ PAUSE' : '▶️ PLAY AUDIO'}
            </button>
            <button
              className="cyber-btn cyber-btn-secondary"
              style={{ fontSize: '0.8rem' }}
              onClick={() => api.launchMusicApp('youtube')}
            >
              YOUTUBE
            </button>
            <button
              className="cyber-btn cyber-btn-secondary"
              style={{ fontSize: '0.8rem' }}
              onClick={() => api.launchMusicApp('spotify')}
            >
              SPOTIFY
            </button>
          </div>
        </div>

        {/* Card 3: Personal Memory & Facts Hub */}
        <div className="holo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
              PERSONAL MEMORY
            </span>
            <button
              onClick={handleExportMemories}
              style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              EXPORT JSON ↓
            </button>
          </div>

          {/* Quick Memory List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '120px', overflowY: 'auto' }}>
            {memoriesList.length > 0 ? (
              memoriesList.map((m) => (
                <div key={m.id} style={{ fontSize: '0.82rem', color: '#fff', background: 'rgba(5, 7, 12, 0.6)', padding: '6px 10px', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--neon-purple)', fontWeight: 600 }}>[{m.category.toUpperCase()}]</span> {m.content}
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                Say "Remember that..." to save preferences or facts.
              </div>
            )}
          </div>

          {/* Quick Add Memory */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveMemory()}
              placeholder="Save new fact..."
              style={{
                flex: 1,
                background: 'rgba(5, 7, 12, 0.9)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            />
            <button className="cyber-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={handleSaveMemory}>
              SAVE
            </button>
          </div>
        </div>

        {/* Card 4: Ambient Weather Radar */}
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

        {/* Card 5: Priority Tasks */}
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
