import React, { useState } from 'react';
import {
  X,
  Cpu,
  Sparkles,
  Mic,
  Volume2,
  CheckCircle2,
  Radio,
  Brain,
  MessageSquare,
  Send,
  Zap,
} from 'lucide-react';
import { useVoice, LLM_MODELS, AI_PERSONAS } from '../context/VoiceContext';

const SAMPLE_PROMPTS = [
  'Explain how black holes work so a human can easily understand',
  'Tell me a motivational insight for my day',
  'How do large language models understand human speech?',
  'Compare Python and JavaScript in simple terms',
];

const LLMStudioModal = ({ isOpen, onClose }) => {
  const {
    selectedModel,
    setSelectedModel,
    selectedPersona,
    setSelectedPersona,
    handsFreeMode,
    setHandsFreeMode,
    isListening,
    isSpeaking,
    isThinking,
    interimText,
    startListening,
    stopSpeaking,
    executeCommand,
    speak,
  } = useVoice();

  const [testInput, setTestInput] = useState('');
  const [lastReply, setLastReply] = useState(null);

  if (!isOpen) return null;

  const handleTestPrompt = async (promptText) => {
    const query = promptText || testInput;
    if (!query.trim()) return;
    setTestInput('');
    const res = await executeCommand(query);
    if (res) {
      setLastReply({
        question: query,
        answer: res.response,
        model: res.model_used || selectedModel,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-indigo-500/30 bg-[#0d1224] text-white shadow-2xl p-6 custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Multi-LLM & Human Voice AI Studio</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Neural Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Choose which LLM brain powers VoxWeb and how it speaks &amp; explains things to humans.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hands-Free Continuous Conversation Banner */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-cyan-600/20 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  handsFreeMode
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Hands-Free Human ↔ AI Voice Loop
                  </h3>
                  {handsFreeMode && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  When enabled, VoxWeb automatically listens for your voice right after it finishes speaking—just like talking to a real human.
                </p>
              </div>
            </div>
            <button
              onClick={() => setHandsFreeMode(!handsFreeMode)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                handsFreeMode
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'bg-white/10 text-white hover:bg-white/15 border border-white/15'
              }`}
            >
              <Mic className="w-4 h-4" />
              {handsFreeMode ? 'Hands-Free ON' : 'Enable Hands-Free'}
            </button>
          </div>

          {/* Section 1: Select LLM Model */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              1. Select Active Large Language Model (LLM)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {LLM_MODELS.map((model) => {
                const active = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{model.name}</span>
                      {active ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{model.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Select Human Understanding Style (Persona) */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              2. How Should the AI Speak &amp; Explain to Humans?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {AI_PERSONAS.map((persona) => {
                const active = selectedPersona === persona.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="text-lg mb-1">{persona.icon}</div>
                    <div className="text-xs font-bold text-white mb-0.5">{persona.name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{persona.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Interactive Voice & LLM Playground */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Live Human Voice &amp; AI Response Tester
              </span>
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5 animate-bounce" /> Stop AI Voice
                  </button>
                )}
                <button
                  onClick={startListening}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isListening ? 'Listening... (Tap to finish)' : 'Speak with Your Voice'}
                </button>
              </div>
            </div>

            {isListening && (
              <div className="mb-3 p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span>
                  {interimText
                    ? `Hearing: "${interimText}"`
                    : 'Listening to your voice now... speak naturally!'}
                </span>
              </div>
            )}

            {/* Quick sample prompt pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleTestPrompt(p)}
                  disabled={isThinking}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all"
                >
                  <Zap className="w-3 h-3 inline mr-1 text-indigo-400" />
                  {p}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTestPrompt(testInput);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Ask anything or click 'Speak with Your Voice'..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isThinking || !testInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                {isThinking ? 'Thinking...' : 'Ask AI'}
              </button>
            </form>

            {lastReply && (
              <div className="mt-3 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                <div className="flex items-center justify-between text-[11px] text-indigo-300 mb-1">
                  <span className="font-semibold">AI Response ({lastReply.model})</span>
                  <button
                    onClick={() => speak(lastReply.answer, { force: true })}
                    className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Speak Aloud
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {lastReply.answer}
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default LLMStudioModal;
