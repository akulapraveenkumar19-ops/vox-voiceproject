import React, { useState } from 'react';
import {
  X,
  Languages,
  Timer,
  Sparkles,
  Volume2,
  Play,
  Square,
  Plus,
  Trash2,
  ExternalLink,
  ArrowRightLeft,
} from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import api from '../services/api';

const TARGET_LANGUAGES = [
  { id: 'telugu', label: 'Telugu (తెలుగు)', ttsLang: 'te-IN' },
  { id: 'hindi', label: 'Hindi (हिन्दी)', ttsLang: 'hi-IN' },
  { id: 'english', label: 'English', ttsLang: 'en-US' },
  { id: 'spanish', label: 'Spanish (Español)', ttsLang: 'es-ES' },
  { id: 'french', label: 'French (Français)', ttsLang: 'fr-FR' },
  { id: 'german', label: 'German (Deutsch)', ttsLang: 'de-DE' },
  { id: 'japanese', label: 'Japanese (日本語)', ttsLang: 'ja-JP' },
];

const SmartToolsModal = ({ isOpen, onClose, initialTab = 'translator' }) => {
  const {
    speak,
    activeTimer,
    startTimer,
    stopTimer,
    customShortcuts,
    refreshShortcuts,
    executeCommand,
  } = useVoice();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Translator State
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('telugu');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Timer State
  const [customMinutes, setCustomMinutes] = useState(10);
  const [timerLabel, setTimerLabel] = useState('Focus Session');

  // Shortcut State
  const [phrase, setPhrase] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [responseText, setResponseText] = useState('');
  const [isSavingShortcut, setIsSavingShortcut] = useState(false);

  if (!isOpen) return null;

  const handleTranslate = async (e) => {
    if (e) e.preventDefault();
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    try {
      const res = await api.post('/translate', {
        text: sourceText.trim(),
        target_language: targetLang,
      });
      const result = res.data?.translated || '';
      setTranslatedText(result);
      const langObj = TARGET_LANGUAGES.find((l) => l.id === targetLang);
      if (result) {
        speak(result, { lang: langObj?.ttsLang || 'en-US', force: true, skipHandsFree: true });
      }
    } catch {
      setTranslatedText('Could not reach translation engine. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddShortcut = async (e) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    setIsSavingShortcut(true);
    try {
      await api.post('/shortcuts', {
        phrase: phrase.trim().toLowerCase(),
        action_type: targetUrl.trim() ? 'open_website' : 'speak',
        target_url: targetUrl.trim() || null,
        response_text:
          responseText.trim() || `Executing your custom shortcut ${phrase.trim()}`,
      });
      setPhrase('');
      setTargetUrl('');
      setResponseText('');
      await refreshShortcuts();
    } catch (err) {
      console.warn('Error saving shortcut:', err);
    } finally {
      setIsSavingShortcut(false);
    }
  };

  const handleDeleteShortcut = async (id) => {
    try {
      await api.delete(`/shortcuts/${id}`);
      await refreshShortcuts();
    } catch (err) {
      console.warn('Failed to delete shortcut:', err);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#0d1224] text-white shadow-2xl p-6 custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white">VoxWeb Smart Voice Toolkit</h2>
              <p className="text-xs text-slate-400">
                Live Multi-Language Voice Translator, Pomodoro Timers &amp; Custom Voice Macros
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('translator')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'translator'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Languages className="w-4 h-4" /> Voice Translator
            </button>
            <button
              onClick={() => setActiveTab('timer')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'timer'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Timer className="w-4 h-4" /> Timers &amp; Pomodoro
              {activeTimer && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-400 text-slate-950 font-extrabold">
                  {formatSeconds(activeTimer.secondsLeft)}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'shortcuts'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Voice Shortcuts ({customShortcuts.length})
            </button>
          </div>

          {/* TAB 1: VOICE TRANSLATOR */}
          {activeTab === 'translator' && (
            <form onSubmit={handleTranslate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phrase or Sentence to Translate
                </label>
                <textarea
                  rows={3}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Type anything (e.g., How are you doing today? or Artificial Intelligence is amazing)..."
                  className="w-full rounded-xl bg-white/5 border border-white/15 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Translate &amp; Speak in:
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full rounded-xl bg-[#151c35] border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {TARGET_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isTranslating || !sourceText.trim()}
                  className="sm:mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {isTranslating ? 'Translating...' : 'Translate & Speak'}
                </button>
              </div>

              {translatedText && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Translated Output ({targetLang})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const langObj = TARGET_LANGUAGES.find((l) => l.id === targetLang);
                        speak(translatedText, {
                          lang: langObj?.ttsLang || 'en-US',
                          force: true,
                          skipHandsFree: true,
                        });
                      }}
                      className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Speak Again
                    </button>
                  </div>
                  <p className="text-base font-semibold text-white">{translatedText}</p>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                💡 Tip: You can also translate by voice anytime—just say{' '}
                <span className="text-indigo-300 font-semibold">
                  &ldquo;Translate Good Morning to Telugu&rdquo;
                </span>{' '}
                or{' '}
                <span className="text-indigo-300 font-semibold">
                  &ldquo;Translate Thank You to Spanish&rdquo;
                </span>
                .
              </p>
            </form>
          )}

          {/* TAB 2: SMART TIMER & POMODORO */}
          {activeTab === 'timer' && (
            <div className="space-y-5">
              {activeTimer ? (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-indigo-950/60 border border-cyan-500/40 text-center">
                  <div className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-1">
                    {activeTimer.label}
                  </div>
                  <div className="text-5xl font-black tracking-tight text-white my-3 font-mono">
                    {formatSeconds(activeTimer.secondsLeft)}
                  </div>
                  <button
                    onClick={stopTimer}
                    className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" /> Cancel Timer
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                  No active timer running. Pick a quick preset below or say{' '}
                  <span className="text-cyan-300 font-semibold">
                    &ldquo;Set a timer for 5 minutes&rdquo;
                  </span>
                  !
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: '1 Min Quick', sec: 60 },
                  { label: '5 Min Break', sec: 300 },
                  { label: '15 Min Sprint', sec: 900 },
                  { label: '25 Min Pomodoro', sec: 1500 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      startTimer(preset.sec, preset.label);
                      speak(`Starting ${preset.label} timer now.`, {
                        force: true,
                        skipHandsFree: true,
                      });
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-center transition-all"
                  >
                    <Play className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <div className="text-xs font-bold text-white">{preset.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-white/10">
                <input
                  type="text"
                  value={timerLabel}
                  onChange={(e) => setTimerLabel(e.target.value)}
                  placeholder="Timer label"
                  className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="w-24 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white"
                />
                <button
                  onClick={() => {
                    const secs = Math.max(1, Number(customMinutes)) * 60;
                    startTimer(secs, timerLabel || 'Custom Timer');
                    speak(`Timer set for ${customMinutes} minutes.`, {
                      force: true,
                      skipHandsFree: true,
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  Start Custom (Min)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM VOICE SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddShortcut}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
              >
                <div className="text-xs font-bold text-purple-300">
                  Create a Custom Voice Macro
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    placeholder='When I say... (e.g. "study mode")'
                    className="rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="Open URL (optional, e.g. https://leetcode.com)"
                    className="rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="What VoxWeb should say back..."
                    className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={isSavingShortcut || !phrase.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </form>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {customShortcuts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No custom voice shortcuts yet. Create one above and trigger it by speaking its phrase!
                  </p>
                ) : (
                  customShortcuts.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-300">
                            &ldquo;{s.phrase}&rdquo;
                          </span>
                          {s.target_url && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <ExternalLink className="w-3 h-3" /> {s.target_url}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{s.response_text}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => executeCommand(s.phrase)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] font-semibold hover:bg-purple-500/30"
                        >
                          Run
                        </button>
                        <button
                          onClick={() => handleDeleteShortcut(s.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default SmartToolsModal;
