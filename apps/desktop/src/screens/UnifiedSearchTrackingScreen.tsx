import React, { useState, useEffect } from 'react';
import { api, UnifiedSearchResult, Tracker, TrackerEvent } from '../services/api';

export const UnifiedSearchTrackingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'tracking'>('search');

  // Unified Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<string>('hybrid');
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [sourcesSearched, setSourcesSearched] = useState<string[]>([]);
  const [totalFound, setTotalFound] = useState<number>(0);

  // Tracking Dashboard State
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [trackerEvents, setTrackerEvents] = useState<TrackerEvent[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState<boolean>(false);
  const [newTrackerTitle, setNewTrackerTitle] = useState<string>('');
  const [newTrackerType, setNewTrackerType] = useState<string>('file_watcher');
  const [newTrackerTarget, setNewTrackerTarget] = useState<string>('storage/documents');
  const [showAddTracker, setShowAddTracker] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string>('');

  useEffect(() => {
    loadTrackingData();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await api.unifiedSearch(searchQuery.trim(), sourceFilter, searchMode);
      setSearchResults(res.results || []);
      setTotalFound(res.total || 0);
      setSourcesSearched(res.sources_searched || []);
    } catch {
      setActionNotice('Search query encountered an error. Please try again.');
      setTimeout(() => setActionNotice(''), 3500);
    } finally {
      setIsSearching(false);
    }
  };

  const loadTrackingData = async () => {
    setIsLoadingTracking(true);
    try {
      const data = await api.getTrackingDashboard();
      setTrackers(data.trackers || []);
      setTrackerEvents(data.events || []);
    } catch (e) {
      console.warn('Failed to load tracking data', e);
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const handleToggleTracker = async (t: Tracker) => {
    const nextPause = t.status !== 'paused';
    try {
      await api.toggleTracker(t.id, nextPause);
      loadTrackingData();
      setActionNotice(`Tracker '${t.title}' is now ${nextPause ? 'PAUSED' : 'ACTIVE'}.`);
      setTimeout(() => setActionNotice(''), 3000);
    } catch {
      setActionNotice('Failed to update tracker.');
    }
  };

  const handleForceCheck = async (t: Tracker) => {
    setActionNotice(`Checking '${t.title}' now...`);
    try {
      const res = await api.forceCheckTracker(t.id);
      loadTrackingData();
      setActionNotice(`Check completed: ${res.summary}`);
      setTimeout(() => setActionNotice(''), 4000);
    } catch {
      setActionNotice('Check failed.');
    }
  };

  const handleDeleteTracker = async (id: string) => {
    if (window.confirm('Delete this tracker?')) {
      try {
        await api.deleteTracker(id);
        loadTrackingData();
      } catch {
        setActionNotice('Failed to delete tracker.');
      }
    }
  };

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackerTitle.trim() || !newTrackerTarget.trim()) return;

    try {
      await api.createTracker({
        title: newTrackerTitle.trim(),
        tracker_type: newTrackerType,
        target: newTrackerTarget.trim(),
        check_interval_seconds: 300
      });
      setShowAddTracker(false);
      setNewTrackerTitle('');
      loadTrackingData();
      setActionNotice('New tracker successfully registered.');
      setTimeout(() => setActionNotice(''), 3500);
    } catch {
      setActionNotice('Failed to create tracker.');
    }
  };

  const handleMarkEventRead = async (id: string) => {
    await api.markEventRead(id);
    setTrackerEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, is_read: true } : ev)));
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header and Mode Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', margin: 0, letterSpacing: '1.5px' }}>
            UNIFIED SEARCH & AUTONOMOUS TRACKING
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            Multi-source hybrid retrieval, natural-language file lookup, and persistent change monitors
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              background: activeTab === 'search' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'search' ? '#000' : 'var(--text-muted)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '6px',
              padding: '8px 18px',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔍 UNIFIED SEARCH
          </button>
          <button
            onClick={() => { setActiveTab('tracking'); loadTrackingData(); }}
            style={{
              background: activeTab === 'tracking' ? 'var(--neon-green)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'tracking' ? '#000' : 'var(--text-muted)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '6px',
              padding: '8px 18px',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📊 TRACKING DASHBOARD ({trackers.length})
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid var(--neon-cyan)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: 'var(--neon-cyan)'
        }}>
          {actionNotice}
        </div>
      )}

      {/* VIEW 1: UNIFIED SEARCH */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search Box Card */}
          <div className="holo-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search memories, PDFs, chats, tasks, apps, or natural questions (e.g. "Find the PDF about architecture")'
                style={{
                  flex: 1,
                  background: 'rgba(8, 12, 22, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 18px',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  fontFamily: 'Rajdhani, sans-serif'
                }}
              />
              <button
                type="submit"
                className="cyber-btn"
                disabled={isSearching}
                style={{ minWidth: '140px', justifyContent: 'center' }}
              >
                {isSearching ? 'SEARCHING...' : 'SEARCH ALL'}
              </button>
            </form>

            {/* Filters Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              {/* Source Filters */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Sources' },
                  { id: 'documents', label: '📄 Documents' },
                  { id: 'memories', label: '🧠 Memories' },
                  { id: 'conversations', label: '💬 Conversations' },
                  { id: 'tasks', label: '✅ Tasks' },
                  { id: 'apps', label: '🚀 Apps' },
                  { id: 'web', label: '🌐 Web' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSourceFilter(s.id)}
                    style={{
                      background: sourceFilter === s.id ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.05)',
                      color: sourceFilter === s.id ? '#000' : 'var(--text-muted)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Search Mode Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retrieval Mode:</span>
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  style={{
                    background: 'rgba(8, 12, 22, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="hybrid">Hybrid (FTS + Vector Embedding)</option>
                  <option value="exact">Exact & Keyword Match</option>
                  <option value="semantic">Semantic Meaning Only</option>
                </select>
              </div>
            </div>

            {/* Quick Natural Language Shortcuts */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Try asking:</span>
              {[
                'Find my pending tasks',
                'Search previous conversation',
                'What is in storage documents',
                'Search web for latest AI news'
              ].map(shortcut => (
                <button
                  key={shortcut}
                  onClick={() => { setSearchQuery(shortcut); handleSearch(); }}
                  style={{
                    background: 'transparent',
                    border: '1px dashed rgba(0, 240, 255, 0.3)',
                    color: 'var(--neon-cyan)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    cursor: 'pointer'
                  }}
                >
                  "{shortcut}"
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          {sourcesSearched.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>
                Found <strong style={{ color: '#fff' }}>{totalFound}</strong> results across: {sourcesSearched.join(', ').toUpperCase()}
              </span>
              <span>Sorted by Relevance & Recency</span>
            </div>
          )}

          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {searchResults.map(item => {
              const sourceColors: Record<string, string> = {
                documents: 'var(--neon-cyan)',
                memories: 'var(--neon-purple)',
                conversations: 'var(--neon-amber)',
                tasks: 'var(--neon-green)',
                apps: '#ff00aa',
                web: '#00ccff'
              };
              const col = sourceColors[item.source] || 'var(--neon-cyan)';

              return (
                <div
                  key={item.id}
                  className="holo-card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderColor: 'rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          color: col,
                          border: `1px solid ${col}`,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontWeight: 700
                        }}>
                          {item.source.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 700 }}>
                          {item.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Timestamp: {item.timestamp} • Score: {item.final_score || item.relevance_score}
                      </div>
                    </div>

                    <button
                      className="cyber-btn"
                      style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                      onClick={() => {
                        if (item.action_type === 'open_url' && item.action_target) {
                          window.open(item.action_target, '_blank');
                        } else {
                          setActionNotice(`Selected ${item.title}`);
                          setTimeout(() => setActionNotice(''), 3000);
                        }
                      }}
                    >
                      {item.action_type === 'open_url' ? 'VISIT URL ↗' : 'VIEW DETAILS'}
                    </button>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45', background: 'rgba(5, 7, 12, 0.4)', padding: '8px 12px', borderRadius: '4px' }}>
                    {item.snippet}
                  </div>
                </div>
              );
            })}

            {searchResults.length === 0 && !isSearching && searchQuery && (
              <div className="holo-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No matching results found across authorized local and online sources.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ACCURATE TRACKING DASHBOARD */}
      {activeTab === 'tracking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tracking Controls & Add Modal Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--neon-green)', fontWeight: 700 }}>
                AUTONOMOUS TRACKERS & CHANGE MONITORS
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Persistent monitors for deadlines, document changes, and system health
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="cyber-btn"
                onClick={() => setShowAddTracker(!showAddTracker)}
              >
                <span>➕</span> {showAddTracker ? 'CANCEL' : 'ADD NEW TRACKER'}
              </button>
              <button
                className="cyber-btn cyber-btn-secondary"
                onClick={loadTrackingData}
              >
                <span>🔄</span> REFRESH ALL
              </button>
            </div>
          </div>

          {/* New Tracker Form Modal */}
          {showAddTracker && (
            <form onSubmit={handleCreateTracker} className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'var(--neon-green)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--neon-green)', fontWeight: 700 }}>
                REGISTER USER-APPROVED TRACKER
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TRACKER TITLE</label>
                  <input
                    type="text"
                    required
                    value={newTrackerTitle}
                    onChange={(e) => setNewTrackerTitle(e.target.value)}
                    placeholder='e.g. "Monitor Invoices Folder", "Project Alpha Deadlines"'
                    style={{ width: '100%', background: 'rgba(8, 12, 22, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TRACKER TYPE</label>
                  <select
                    value={newTrackerType}
                    onChange={(e) => setNewTrackerType(e.target.value)}
                    style={{ width: '100%', background: 'rgba(8, 12, 22, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '4px' }}
                  >
                    <option value="file_watcher">File & Folder Watcher</option>
                    <option value="task_reminder">Task & Deadline Monitor</option>
                    <option value="system_health">System Health & Engine</option>
                    <option value="service_status">External Service Endpoint</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>MONITORING TARGET</label>
                  <input
                    type="text"
                    required
                    value={newTrackerTarget}
                    onChange={(e) => setNewTrackerTarget(e.target.value)}
                    placeholder='e.g. "storage/documents", "database:tasks"'
                    style={{ width: '100%', background: 'rgba(8, 12, 22, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '4px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="submit" className="cyber-btn">SAVE AND ACTIVATE TRACKER</button>
              </div>
            </form>
          )}

          {/* Trackers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {trackers.map(t => {
              const isAlert = t.status === 'alert';
              const isPaused = t.status === 'paused';
              const statusColor = isAlert ? 'var(--neon-red)' : isPaused ? 'var(--neon-amber)' : 'var(--neon-green)';

              return (
                <div
                  key={t.id}
                  className="holo-card"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderColor: isAlert ? 'var(--neon-red)' : undefined
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 700 }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Target: <span className="mono-font">{t.target}</span> • Every {t.check_interval_seconds}s
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.68rem',
                      color: statusColor,
                      border: `1px solid ${statusColor}`,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {t.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', background: 'rgba(5, 7, 12, 0.5)', padding: '8px 12px', borderRadius: '4px' }}>
                    {t.change_summary}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Last Checked: {t.last_checked ? new Date(t.last_checked).toLocaleTimeString() : 'Never'}</span>
                    <span>Next: {t.next_check ? new Date(t.next_check).toLocaleTimeString() : 'Pending'}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                    <button
                      onClick={() => handleForceCheck(t)}
                      style={{
                        flex: 1,
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        color: 'var(--neon-cyan)',
                        borderRadius: '4px',
                        padding: '4px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      CHECK NOW
                    </button>
                    <button
                      onClick={() => handleToggleTracker(t)}
                      style={{
                        flex: 1,
                        background: isPaused ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 170, 0, 0.1)',
                        border: `1px solid ${isPaused ? 'var(--neon-green)' : 'var(--neon-amber)'}`,
                        color: isPaused ? 'var(--neon-green)' : 'var(--neon-amber)',
                        borderRadius: '4px',
                        padding: '4px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isPaused ? 'RESUME' : 'PAUSE'}
                    </button>
                    <button
                      onClick={() => handleDeleteTracker(t.id)}
                      style={{
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid var(--neon-red)',
                        color: 'var(--neon-red)',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Change Events & Alerts Log */}
          <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: 700 }}>
              RECENT DETECTED CHANGES & ALERTS ({trackerEvents.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trackerEvents.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    background: ev.is_read ? 'rgba(5, 7, 12, 0.4)' : 'rgba(0, 255, 136, 0.05)',
                    border: `1px solid ${ev.severity === 'warning' ? 'var(--neon-amber)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
                        {ev.tracker_title}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                        {ev.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {ev.details}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {ev.created_at}
                    </div>
                  </div>

                  {!ev.is_read && (
                    <button
                      onClick={() => handleMarkEventRead(ev.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--neon-green)',
                        color: 'var(--neon-green)',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
                        cursor: 'pointer'
                      }}
                    >
                      MARK READ
                    </button>
                  )}
                </div>
              ))}

              {trackerEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  No change alerts currently active. All monitors reporting normal state.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
