import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const ProductivityScreen: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('7:00 PM');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    loadData();
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

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          PERSONAL PRODUCTIVITY & FOCUS SUITE
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Voice-created tasks, scheduled reminders, study notes, and focus planning
        </div>
      </div>

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
              <button className="cyber-btn" onClick={handleCreateTask}>
                ADD
              </button>
            </div>

            {/* Task Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(5, 7, 12, 0.5)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div
                    onClick={() => handleToggleTask(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    <span style={{ color: t.is_completed ? 'var(--neon-green)' : 'var(--text-dim)' }}>
                      {t.is_completed ? '✓' : '○'}
                    </span>
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
                    style={{ background: 'none', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', fontSize: '0.8rem' }}
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
    </div>
  );
};
