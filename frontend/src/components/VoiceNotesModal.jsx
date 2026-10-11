import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Trash2, Plus, X, StickyNote, Mic } from 'lucide-react';
import api from '../services/api';

const VoiceNotesModal = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notes');
      setNotes(res.data || []);
    } catch (e) {
      console.warn('Error fetching notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const res = await api.post('/notes', {
        title: 'Voice Note',
        content: newContent.trim(),
      });
      setNotes((prev) => [res.data, ...prev]);
      setNewContent('');
    } catch (e) {
      console.error('Failed to create note:', e);
    }
  };

  const handleToggleComplete = async (noteId, currentStatus) => {
    try {
      const res = await api.put(`/notes/${noteId}`, {
        completed: !currentStatus,
      });
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, completed: res.data.completed } : n))
      );
    } catch (e) {
      console.error('Failed to toggle note:', e);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <StickyNote size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>Voice Notes & Reminders</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Say <span style={{ color: 'var(--accent-blue)' }}>"Take a note: ..."</span> or type below
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type a new reminder or note..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            style={{ paddingLeft: '14px', flex: 1 }}
          />
          <button
            type="submit"
            className="btn-gradient-submit"
            style={{ width: 'auto', padding: '10px 18px', whiteSpace: 'nowrap' }}
            disabled={!newContent.trim()}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>

        {/* Notes List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px',
          }}
        >
          {loading && notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
              }}
            >
              <StickyNote size={32} style={{ opacity: 0.4, margin: '0 auto 10px' }} />
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#e2e8f0' }}>No voice notes yet</p>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Say <span style={{ color: 'var(--accent-blue)' }}>"Take a note: study AI tonight"</span> to save instantly!
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: note.completed ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease',
                  opacity: note.completed ? 0.6 : 1,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                  onClick={() => handleToggleComplete(note.id, note.completed)}
                >
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: note.completed ? 'var(--accent-emerald)' : '#94a3b8' }}
                  >
                    {note.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: note.completed ? 'var(--text-muted)' : '#f8fafc',
                      textDecoration: note.completed ? 'line-through' : 'none',
                      wordBreak: 'break-word',
                    }}
                  >
                    {note.content}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.7,
                    marginLeft: '8px',
                  }}
                  title="Delete note"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceNotesModal;
