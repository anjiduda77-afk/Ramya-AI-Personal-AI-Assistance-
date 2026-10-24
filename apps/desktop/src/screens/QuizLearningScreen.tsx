import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const QuizLearningScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'english' | 'quiz'>('english');

  // English Tutor State
  const [englishSession, setEnglishSession] = useState<any>(null);
  const [englishProgress, setEnglishProgress] = useState<any>(null);
  const [translateInput, setTranslateInput] = useState<string>('Tell my friend in English that I will arrive in ten minutes');
  const [translationResult, setTranslationResult] = useState<any>(null);
  const [isLoadingTutor, setIsLoadingTutor] = useState<boolean>(false);

  // Quiz State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadEnglishData();
    loadQuestions();
  }, []);

  const loadEnglishData = async () => {
    try {
      const [sess, prog] = await Promise.all([
        api.getEnglishSession(),
        api.getEnglishProgress()
      ]);
      setEnglishSession(sess);
      setEnglishProgress(prog);
    } catch (e) {
      console.warn('Error loading English tutor data:', e);
    }
  };

  const handleEnglishChoice = async (choice: 'revise' | 'new') => {
    setIsLoadingTutor(true);
    try {
      const res = await api.sendEnglishChoice(choice);
      setEnglishSession(res);
      const prog = await api.getEnglishProgress();
      setEnglishProgress(prog);
      if (res.spoken_response) {
        api.synthesizeVoice(res.spoken_response).then((audioRes) => {
          if (audioRes.success && audioRes.url) {
            new Audio(`http://127.0.0.1:8000${audioRes.url}`).play().catch(() => {});
          }
        });
      }
    } catch (e) {
      console.warn('Error sending English choice:', e);
    } finally {
      setIsLoadingTutor(false);
    }
  };

  const handleTranslateTelugu = async () => {
    if (!translateInput.trim()) return;
    setIsLoadingTutor(true);
    try {
      const res = await api.translateTeluguToEnglish(translateInput.trim());
      setTranslationResult(res);
    } catch (e) {
      console.warn('Error translating:', e);
    } finally {
      setIsLoadingTutor(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const q = await api.getQuizQuestions();
      setQuestions(q);
      setCurrentIdx(0);
      setSelectedOpt(null);
      setVerification(null);
      setScore(0);
    } catch (e) {
      console.warn('Error loading quiz:', e);
    }
  };

  const currentQ = questions[currentIdx];

  const handleSelectOption = async (idx: number) => {
    if (verification !== null || !currentQ) return;
    setSelectedOpt(idx);
    try {
      const res = await api.verifyQuizAnswer(currentQ.id, idx);
      setVerification(res);
      if (res.isCorrect) {
        setScore((prev) => prev + 1);
      }
    } catch (e) {
      console.warn('Error verifying answer:', e);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOpt(null);
      setVerification(null);
    } else {
      alert(`Quiz Finished! Your final score is ${score} / ${questions.length}`);
      loadQuestions();
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1px' }}>
            LEARNING & TUTORING STUDIO
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Personalised English Tutor, Telugu-to-Natural-English translation, and interactive quizzes
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`cyber-btn ${activeTab === 'english' ? '' : 'cyber-btn-secondary'}`}
            onClick={() => setActiveTab('english')}
          >
            <span>📚</span> ENGLISH TUTOR
          </button>
          <button
            className={`cyber-btn ${activeTab === 'quiz' ? '' : 'cyber-btn-secondary'}`}
            onClick={() => setActiveTab('quiz')}
          >
            <span>🎯</span> INTERACTIVE QUIZ
          </button>
        </div>
      </div>

      {activeTab === 'english' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Progress Header Capsule */}
          <div className="holo-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem' }}>CURRICULUM LEVEL: </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{englishProgress?.current_level || 'Beginner'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem' }}>LESSONS MASTERED: </span>
              <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>{englishProgress?.total_learned || 0} / {englishProgress?.total_lessons_available || 7}</span>
            </div>
            <div>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem' }}>ACTIVE STREAK: </span>
              <span style={{ color: 'var(--neon-amber)', fontWeight: 600 }}>🔥 {englishProgress?.streak_days || 1} Days</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            {/* Daily Lesson Card */}
            <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                  DAILY CONVERSATIONAL ENGLISH PRACTICE
                </span>
                <span style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 600 }}>
                  SPACED REPETITION
                </span>
              </div>

              {englishSession?.needs_revision_prompt ? (
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#fff', lineHeight: 1.4, marginBottom: '12px' }}>
                    Would you like to revise yesterday’s sentence before learning a new one?
                  </h3>
                  <div style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '1rem' }}>
                      Yesterday: "{englishSession.previous_sentence}"
                    </div>
                    {englishSession.lesson_details?.meaning_telugu && (
                      <div style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.9rem' }}>
                        తెలుగు అర్థం: {englishSession.lesson_details.meaning_telugu}
                      </div>
                    )}
                    {englishSession.lesson_details?.grammar_note && (
                      <div style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.82rem' }}>
                        💡 {englishSession.lesson_details.grammar_note}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      className="cyber-btn"
                      disabled={isLoadingTutor}
                      onClick={() => handleEnglishChoice('revise')}
                    >
                      🔁 REVISE YESTERDAY'S SENTENCE
                    </button>
                    <button
                      className="cyber-btn cyber-btn-secondary"
                      disabled={isLoadingTutor}
                      onClick={() => handleEnglishChoice('new')}
                    >
                      ➡️ LEARN NEW LESSON
                    </button>
                  </div>
                </div>
              ) : englishSession?.lesson ? (
                <div>
                  <div style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    DAY {englishSession.lesson.lesson_day} LESSON
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '8px' }}>
                    "{englishSession.lesson.sentence_en}"
                  </h3>
                  <div style={{ color: 'var(--neon-cyan)', fontSize: '0.95rem', marginBottom: '8px' }}>
                    తెలుగు: {englishSession.lesson.meaning_telugu}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '12px' }}>
                    📖 Simple English: {englishSession.lesson.meaning_simple_en}
                  </div>
                  <div style={{ background: 'rgba(5, 7, 12, 0.6)', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                    💡 <strong>Practical Usage Note:</strong> {englishSession.lesson.grammar_note}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="cyber-btn"
                      onClick={() => {
                        if (englishSession.lesson.sentence_en) {
                          api.synthesizeVoice(englishSession.lesson.sentence_en).then((res) => {
                            if (res.success && res.url) new Audio(`http://127.0.0.1:8000${res.url}`).play().catch(() => {});
                          });
                        }
                      }}
                    >
                      🔊 HEAR PRONUNCIATION
                    </button>
                    <button
                      className="cyber-btn cyber-btn-secondary"
                      onClick={() => handleEnglishChoice('new')}
                    >
                      NEXT LESSON →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Loading lesson curriculum...</div>
              )}
            </div>

            {/* Telugu to Natural English Translator Tool */}
            <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                TELUGU TO NATURAL ENGLISH TRANSLATOR
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Enter Telugu speech or conversational intent to produce natural idiomatic English rather than blunt word-for-word translation.
              </div>

              <textarea
                rows={3}
                value={translateInput}
                onChange={(e) => setTranslateInput(e.target.value)}
                placeholder='e.g. "Tell my friend in English that I will arrive in ten minutes" or "నేను పది నిమిషాల్లో అక్కడ ఉంటాను"'
                style={{
                  background: 'rgba(5, 7, 12, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />

              <button
                className="cyber-btn"
                disabled={isLoadingTutor}
                onClick={handleTranslateTelugu}
              >
                TRANSLATE TO NATURAL ENGLISH
              </button>

              {translationResult && (
                <div style={{
                  marginTop: '6px',
                  background: 'rgba(0, 240, 255, 0.06)',
                  border: '1px solid var(--neon-cyan)',
                  borderRadius: '6px',
                  padding: '14px'
                }}>
                  <div style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem', fontWeight: 700 }}>
                    NATURAL ENGLISH RESULT:
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                    "{translationResult.natural_english}"
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>
                    💡 {translationResult.explanation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <div style={{
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid var(--neon-cyan)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: 'var(--neon-cyan)',
              fontSize: '0.85rem',
              fontFamily: 'Orbitron, sans-serif'
            }}>
              SCORE: {score} / {questions.length}
            </div>
          </div>

          {currentQ ? (
            <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
                  QUESTION {currentIdx + 1} OF {questions.length} • TOPIC: {currentQ.topic.toUpperCase()}
                </span>
              </div>

              <h3 style={{ fontSize: '1.1rem', color: '#fff', lineHeight: 1.4 }}>
                {currentQ.question}
              </h3>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQ.options.map((opt: string, idx: number) => {
                  let optBorder = 'var(--border-subtle)';
                  let optBg = 'rgba(5, 7, 12, 0.6)';

                  if (verification !== null) {
                    if (idx === verification.correctIndex) {
                      optBorder = 'var(--neon-green)';
                      optBg = 'rgba(0, 255, 102, 0.15)';
                    } else if (idx === selectedOpt && !verification.isCorrect) {
                      optBorder = 'var(--neon-red)';
                      optBg = 'rgba(255, 51, 102, 0.15)';
                    }
                  } else if (selectedOpt === idx) {
                    optBorder = 'var(--neon-cyan)';
                    optBg = 'rgba(0, 240, 255, 0.15)';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={verification !== null}
                      onClick={() => handleSelectOption(idx)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 18px',
                        background: optBg,
                        border: `1px solid ${optBorder}`,
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: verification !== null ? 'default' : 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit'
                      }}
                    >
                      <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, marginRight: '10px' }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Instant Verification Explanation */}
              {verification !== null && (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '6px',
                  background: verification.isCorrect ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                  border: `1px solid ${verification.isCorrect ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: 700, color: verification.isCorrect ? 'var(--neon-green)' : 'var(--neon-red)', marginBottom: '4px' }}>
                    {verification.isCorrect ? '✓ CORRECT ANSWER' : '✗ INCORRECT'}
                  </div>
                  <div style={{ color: '#fff', lineHeight: '1.4' }}>
                    {verification.explanation}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  className="cyber-btn"
                  disabled={verification === null}
                  onClick={handleNext}
                >
                  {currentIdx < questions.length - 1 ? 'NEXT QUESTION →' : 'FINISH QUIZ'}
                </button>
              </div>
            </div>
          ) : (
            <div className="holo-card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading interactive quiz questions...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
