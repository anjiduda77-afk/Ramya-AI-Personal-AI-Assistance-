import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const DocumentReaderScreen: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDoc) {
        setSelectedDoc(docs[0]);
      }
    } catch (e: any) {
      console.warn('Could not load documents:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMsg(`Parsing and indexing ${file.name}...`);
    try {
      const res = await api.uploadDocument(file);
      setStatusMsg(res.message);
      await loadDocuments();
    } catch (err: any) {
      setStatusMsg(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
            DOCUMENT & PRESENTATION INTELLIGENCE
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Local indexing for PDF, DOCX, PPTX presentations, spreadsheets, and markdown
          </div>
        </div>

        {/* Upload Button */}
        <label className="cyber-btn" style={{ cursor: 'pointer' }}>
          <span>📤</span> {uploading ? 'PARSING...' : 'UPLOAD DOCUMENT'}
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.txt,.csv,.md"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {statusMsg && (
        <div style={{ padding: '8px 12px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--neon-cyan)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--neon-cyan)' }}>
          {statusMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', flex: 1 }}>
        {/* Document List */}
        <div className="holo-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '6px' }}>
            INDEXED REPOSITORY ({documents.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {documents.length > 0 ? (
              documents.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: selectedDoc?.id === d.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(5, 7, 12, 0.5)',
                    border: '1px solid',
                    borderColor: selectedDoc?.id === d.id ? 'var(--neon-cyan)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{d.filename}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <span>{d.file_type.toUpperCase()} • {d.total_pages} Pages/Slides</span>
                    <span>{(d.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '16px 0', textAlign: 'center' }}>
                No documents uploaded. Click "Upload Document" to index your assignment, paper, or slides.
              </div>
            )}
          </div>
        </div>

        {/* Selected Document Details & Actions */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedDoc ? (
            <>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>DOCUMENT METADATA</span>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '4px' }}>{selectedDoc.filename}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                  Indexed at: {selectedDoc.indexed_at} • Total Chunks: {selectedDoc.chunk_count}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '6px' }}>
                  AUTOMATED EXTRACTION SUMMARY
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {selectedDoc.summary || 'Document ready for semantic retrieval and grounded voice explanations.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button
                  className="cyber-btn"
                  onClick={() => alert(`Starting grounded reading of ${selectedDoc.filename}`)}
                >
                  <span>🔊</span> READ ALOUD
                </button>
                <button
                  className="cyber-btn cyber-btn-secondary"
                  onClick={() => alert(`Generating quiz questions for ${selectedDoc.filename}`)}
                >
                  <span>🎓</span> GENERATE QUIZ
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: 'auto' }}>
              Select a document to view metadata and trigger actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
