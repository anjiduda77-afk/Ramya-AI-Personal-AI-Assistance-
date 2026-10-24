import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const ProductivityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks_notes' | 'memories'>('tasks_notes');

  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('7:00 PM');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Personal Memory state
  const [memories, setMemories] = useState<any[]>([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('all');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCat, setNewMemoryCat] = useState('preference');
  const [newMemoryImp, setNewMemoryImp] = useState(3);

  useEffect(() => {
    loadData();
    loadMemories();
  }, []);

  const loadData = async () => {
    try {
      const [t, r, n] = await Promise.all([
        api.getTasks(true),
        api.getReminders(),
        api.getNotes()
      ]);
      setTasks(t);
      setReminders(r);
      setNotes(n);
    } catch (e) {
      console.warn('Error loading productivity data:', e);
    }
  };

  const loadMemories = async () => {
    try {
      const mems = await api.getMemories(
        memoryCategory !== 'all' ? memoryCategory : undefined,
        memorySearch.trim() || undefined
      );
      setMemories(mems);
    } catch (e) {
      console.warn('Error loading memories:', e);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    await api.createTask(newTaskTitle.trim());
    setNewTaskTitle('');
    loadData();
  };

  const handleToggleTask = async (id: string) => {
    await api.toggleTask(id);
    loadData();
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Delete this task?')) {
      await api.deleteTask(id);
      loadData();
    }
  };

  const handleCreateReminder = async () => {
    if (!newReminderText.trim()) return;
    await api.setReminder(newReminderText.trim(), newReminderTime);
    setNewReminderText('');
    loadData();
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    await api.createNote(newNoteTitle.trim(), newNoteContent.trim());
    setNewNoteTitle('');
    setNewNoteContent('');
    loadData();
  };

  // Memory Operations
  const handleCreateMemory = async () => {
    if (!newMemoryContent.trim()) return;
    await api.createMemory(newMemoryContent.trim(), newMemoryCat, newMemoryImp);
    setNewMemoryContent('');
    loadMemories();
  };

  const handleDeleteMemory = async (id: string) => {
    if (window.confirm('Delete this memory?')) {
      await api.deleteMemory(id);
      loadMemories();
    }
  };

  const handleExportMemories = async () => {
    const data = await api.exportMemories();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ramya-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllMemories = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL stored memories? This action is permanent.')) {
      await api.clearAllMemories();
      loadMemories();
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
            PRODUCTIVITY & PERSONAL MEMORY VAULT
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Daily tasks, reminders, research notes, and persistent user-controlled memories
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`cyber-btn ${activeTab === 'tasks_notes' ? '' : 'cyber-btn-secondary'}`}
            onClick={() => setActiveTab('tasks_notes')}
          >
            <span>⏱️</span> TASKS & NOTES
          </button>
          <button
            className={`cyber-btn ${activeTab === 'memories' ? '' : 'cyber-btn-secondary'}`}
            onClick={() => { setActiveTab('memories'); loadMemories(); }}
          >
            <span>🧠</span> PERSONAL MEMORY VAULT
          </button>
        </div>
      </div>

      {activeTab === 'tasks_notes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left: Tasks & Reminders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tasks Card */}
            <div className="holo-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '12px' }}>
                DAILY TASKS ({tasks.filter(t => !t.is_completed).length} PENDING)
              </div>

              {/* Add Task Input */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                  placeholder="Add task title..."
                  style={{
                    flex: 1,
                    background: 'rgba(5, 7, 12, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}
                />
                <button className="cyber-btn" onClick={handleCreateTask}>ADD</button>
              </div>

              {/* Task List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(5, 7, 12, 0.5)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(t.is_completed)}
                        onChange={() => handleToggleTask(t.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{
                        color: t.is_completed ? 'var(--text-dim)' : '#fff',
                        textDecoration: t.is_completed ? 'line-through' : 'none',
                        fontSize: '0.85rem'
                      }}>
                        {t.title}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reminders Card */}
            <div className="holo-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '12px' }}>
                SCHEDULED REMINDERS
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="text"
                  value={newReminderText}
                  onChange={(e) => setNewReminderText(e.target.value)}
                  placeholder="Reminder text..."
                  style={{ flex: 1, background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  placeholder="Time (e.g. 7:00 PM)"
                  style={{ width: '120px', background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}
                />
                <button className="cyber-btn" onClick={handleCreateReminder}>SET</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reminders.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(5, 7, 12, 0.5)', borderRadius: '6px' }}>
                    <span style={{ color: '#fff', fontSize: '0.85rem' }}>{r.text}</span>
                    <span style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem' }} className="mono-font">{r.trigger_time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Notes & Quick Capture */}
          <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
              QUICK NOTES & RESEARCH LOGS
            </div>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Note title..."
              style={{ background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}
            />
            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write notes..."
              style={{ background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px', resize: 'none' }}
            />
            <button className="cyber-btn" onClick={handleCreateNote}>SAVE NOTE</button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', marginTop: '10px' }}>
              {notes.map((n) => (
                <div key={n.id} style={{ padding: '10px 12px', background: 'rgba(5, 7, 12, 0.5)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{n.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{n.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'memories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Controls: Search, Category Filter, and Export */}
          <div className="holo-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                value={memorySearch}
                onChange={(e) => { setMemorySearch(e.target.value); loadMemories(); }}
                placeholder="Search memories..."
                style={{ flex: 1, background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}
              />
              <select
                value={memoryCategory}
                onChange={(e) => { setMemoryCategory(e.target.value); loadMemories(); }}
                style={{ background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: 'var(--neon-cyan)', padding: '8px 12px', borderRadius: '6px' }}
              >
                <option value="all">ALL CATEGORIES</option>
                <option value="preference">PREFERENCES</option>
                <option value="fact">FACTS</option>
                <option value="project">PROJECTS</option>
                <option value="learned_language">LEARNED WORDS</option>
                <option value="general">GENERAL</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="cyber-btn" onClick={handleExportMemories}>
                <span>💾</span> EXPORT JSON
              </button>
              <button
                className="cyber-btn"
                style={{ background: 'rgba(255, 51, 102, 0.15)', color: 'var(--neon-red)', borderColor: 'var(--neon-red)' }}
                onClick={handleClearAllMemories}
              >
                <span>🗑️</span> CLEAR ALL
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            {/* Stored Memories List */}
            <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                  USER-CONTROLLED MEMORY VAULT ({memories.length} ENTRIES)
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  GROUNDED CONTEXT • ZERO FABRICATION
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                {memories.length > 0 ? (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(5, 7, 12, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            background: 'rgba(176, 38, 255, 0.15)',
                            color: 'var(--neon-purple)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            {m.category.toUpperCase()}
                          </span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            Importance: {'⭐'.repeat(m.importance || 3)}
                          </span>
                        </div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', lineHeight: '1.4' }}>
                          {m.content}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                    No memories found. Add a fact or say "Remember that..." to Ramya!
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Memory Box */}
            <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                EXPLICITLY REMEMBER FACT
              </div>

              <textarea
                rows={4}
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                placeholder='e.g. "User prefers dark cyberpunk mode", "Learned English sentence: Have you eaten?", "Project deadline is Friday"'
                style={{
                  background: 'rgba(5, 7, 12, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: '0.85rem',
                  resize: 'none'
                }}
              />

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                  CATEGORY
                </label>
                <select
                  value={newMemoryCat}
                  onChange={(e) => setNewMemoryCat(e.target.value)}
                  style={{ width: '100%', background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px', borderRadius: '6px' }}
                >
                  <option value="preference">Preference</option>
                  <option value="fact">Fact</option>
                  <option value="project">Project / Goal</option>
                  <option value="learned_language">Learned Language</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                  IMPORTANCE (1-5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={newMemoryImp}
                  onChange={(e) => setNewMemoryImp(parseInt(e.target.value) || 3)}
                  style={{ width: '100%', background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px', borderRadius: '6px' }}
                />
              </div>

              <button className="cyber-btn" onClick={handleCreateMemory}>
                COMMIT TO MEMORY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
