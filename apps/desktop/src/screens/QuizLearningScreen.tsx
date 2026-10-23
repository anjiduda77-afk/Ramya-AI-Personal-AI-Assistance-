import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const QuizLearningScreen: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, []);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
            QUIZ & ADAPTIVE LEARNING STUDIO
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Interactive multiple-choice practice, instant voice explanations, and score tracking
          </div>
        </div>

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
                  optBg = 'rgba(0, 255, 136, 0.15)';
                } else if (idx === selectedOpt && !verification.isCorrect) {
                  optBorder = 'var(--neon-red)';
                  optBg = 'rgba(255, 51, 102, 0.15)';
                }
              } else if (idx === selectedOpt) {
                optBorder = 'var(--neon-cyan)';
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: optBg,
                    border: '1px solid',
                    borderColor: optBorder,
                    cursor: verification ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1px solid var(--neon-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--neon-cyan)'
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ color: '#fff', fontSize: '0.9rem' }}>{opt}</span>
                </div>
              );
            })}
          </div>

          {/* Explanation after answer */}
          {verification && (
            <div style={{
              background: 'rgba(10, 15, 29, 0.9)',
              border: '1px solid',
              borderColor: verification.isCorrect ? 'var(--neon-green)' : 'var(--neon-amber)',
              borderRadius: '8px',
              padding: '14px',
              marginTop: '8px'
            }}>
              <div style={{
                color: verification.isCorrect ? 'var(--neon-green)' : 'var(--neon-amber)',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: '4px'
              }}>
                {verification.message}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                {verification.explanation}
              </div>
              <button
                className="cyber-btn"
                onClick={handleNext}
                style={{ marginTop: '12px' }}
              >
                {currentIdx < questions.length - 1 ? 'NEXT QUESTION →' : 'FINISH QUIZ 🏆'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>
          Loading questions...
        </div>
      )}
    </div>
  );
};
