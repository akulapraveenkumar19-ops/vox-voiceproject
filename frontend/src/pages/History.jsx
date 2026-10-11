import React, { useState, useEffect } from 'react';
import { Search, Trash2, Volume2, ExternalLink, Calendar, Clock, RefreshCw, Download } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import VoiceStatus from '../components/VoiceStatus';
import api from '../services/api';
import { useVoice } from '../context/VoiceContext';

const History = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { speak } = useVoice();

  const handleExportHistory = () => {
    if (historyItems.length === 0) return;
    const content = historyItems
      .map(
        (item) =>
          `[${item.timestamp}] USER: ${item.message}\nVOXWEB: ${item.response}\nType: ${item.command_type}${
            item.url ? ` | Link: ${item.url}` : ''
          }\n----------------------------------------\n`
      )
      .join('\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `voxweb-chat-history-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/command/history');
      setHistoryItems(res.data.history || []);
    } catch (err) {
      console.warn('Could not load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire conversation history?')) return;
    try {
      await api.delete('/command/history');
      setHistoryItems([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await api.delete(`/command/history/${id}`);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const filteredItems = historyItems.filter(
    (item) =>
      item.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.response.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

        <header className="dashboard-header">
          <div>
            <h1 className="header-greeting-title">Chat History</h1>
            <p className="header-greeting-sub">
              Review and replay all your spoken commands and AI conversations.
            </p>
          </div>
          <VoiceStatus />
        </header>

        {/* Action Controls & Search */}
        <div className="history-header-actions">
          <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="search-history-input"
              placeholder="Search past commands or responses..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExportHistory}
              className="btn-icon-control"
              title="Export Conversation History"
              disabled={historyItems.length === 0}
            >
              <Download size={16} />
            </button>

            <button
              onClick={fetchHistory}
              className="btn-icon-control"
              title="Refresh History"
            >
              <RefreshCw size={16} />
            </button>

            {historyItems.length > 0 && (
              <button onClick={handleClearAll} className="btn-danger-outline">
                <Trash2 size={16} />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading conversations...
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginTop: '1rem',
            }}
          >
            <p style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#fff' }}>
              {searchFilter ? 'No matching conversations found.' : 'No chat history recorded yet.'}
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              Speak or type a command on the Home Dashboard to get started!
            </p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => {
              const dateObj = new Date(item.timestamp);
              const dateFormatted = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';
              const timeFormatted = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div key={item.id} className="history-card-item">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span
                        className={`badge-action-type ${
                          item.command_type === 'action' ? 'badge-action' : 'badge-ai'
                        }`}
                      >
                        {item.command_type === 'action' ? '⚡ Fast Action' : '🤖 AI Answer'}
                      </span>
                      {item.model_used && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(99, 102, 241, 0.16)',
                            border: '1px solid rgba(129, 140, 248, 0.35)',
                            color: '#a5b4fc',
                            fontWeight: 600,
                          }}
                        >
                          🧠 {item.model_used}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        <Calendar size={13} />
                        <span>{dateFormatted}</span>
                        {timeFormatted && (
                          <>
                            <Clock size={13} style={{ marginLeft: '4px' }} />
                            <span>{timeFormatted}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => speak(item.response, { force: true, skipHandsFree: true })}
                        className="btn-replay-audio"
                        title="Replay Voice"
                      >
                        <Volume2 size={15} />
                        <span>Play Voice</span>
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="btn-icon-control"
                        style={{ width: '28px', height: '28px' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Command & Response Text */}
                  <div style={{ margin: '6px 0' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                      &ldquo;{item.message}&rdquo;
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {item.response}
                    </div>
                  </div>

                  {/* External URL if applicable */}
                  {item.url && (
                    <div>
                      <a
                        href={item.url}
                        target={item.url.startsWith('http') ? '_blank' : undefined}
                        rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="action-launch-link"
                      >
                        <span>
                          Open{' '}
                          {item.url.startsWith('tel:')
                            ? item.url.replace('tel:', 'Phone: ')
                            : item.url.startsWith('sms:')
                            ? 'SMS Message'
                            : (() => {
                                try {
                                  return new URL(item.url).hostname.replace('www.', '') || item.url;
                                } catch {
                                  return item.url;
                                }
                              })()}
                        </span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
