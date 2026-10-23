import React, { useState } from 'react';
import { api } from '../services/api';

export const KnowledgeBaseScreen: React.FC = () => {
  const [ragQuery, setRagQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    if (!ragQuery.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.queryRAG(ragQuery.trim());
      setResult(res);
    } catch (e: any) {
      alert(`Search error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          LOCAL RAG KNOWLEDGE BASE & SEMANTIC RETRIEVAL
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Source-grounded answers with verifiable page/slide citations from your indexed documents
        </div>
      </div>

      {/* Query Bar */}
      <div className="holo-card" style={{ padding: '16px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={ragQuery}
          onChange={(e) => setRagQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Ask a question grounded strictly in your indexed documents..."
          style={{
            flex: 1,
            background: 'rgba(5, 7, 12, 0.9)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '12px 16px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button className="cyber-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'RETRIEVING...' : '🔍 SEARCH DOCUMENTS'}
        </button>
      </div>

      {/* Grounded Response and Citations */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Grounded Answer Card */}
          <div className="holo-card" style={{ padding: '20px', borderColor: 'var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.75rem' }}>
                GROUNDED SYNTHESIS (GEMMA 3 4B)
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }} className="mono-font">
                Evidence: {result.sufficientEvidence ? 'SUFFICIENT' : 'INSUFFICIENT'}
              </span>
            </div>
            <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: 1.5 }}>
              {result.answer}
            </div>
          </div>

          {/* Citations List */}
          <div className="holo-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '14px' }}>
              EXACT DOCUMENT CITATIONS ({result.citations?.length || 0})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.citations?.map((c: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'rgba(5, 7, 12, 0.6)',
                    border: '1px solid rgba(0, 240, 255, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 600, marginBottom: '4px' }}>
                    <span>{c.filename} — Page/Slide {c.pageOrSlideNumber}</span>
                    <span className="mono-font">Relevance: {(c.relevanceScore * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{c.snippet}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
