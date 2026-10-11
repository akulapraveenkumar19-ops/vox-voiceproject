import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Volume2,
  VolumeX,
  ExternalLink,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  Music,
  CloudSun,
  Calculator,
  StickyNote,
  PhoneCall,
  MessageSquare,
  Video,
  Brain,
  Radio,
  Languages,
  Timer,
} from 'lucide-react';
import { useVoice, LLM_MODELS, AI_PERSONAS } from '../context/VoiceContext';
import Microphone from './Microphone';

const SUGGESTIONS_EN = [
  { label: 'Explain AI Simply', command: 'Explain how artificial intelligence works in simple human terms', icon: <Brain size={13} /> },
  { label: 'Translate to Telugu', command: 'translate How are you today to Telugu', icon: <Languages size={13} /> },
  { label: '5-Min Focus Timer', command: 'set a timer for 5 minutes', icon: <Timer size={13} /> },
  { label: 'AI Video Call', command: 'start video call', icon: <Video size={13} /> },
  { label: 'Play Lo-Fi on YouTube', command: 'play lo-fi beats on youtube', icon: <Music size={13} /> },
  { label: 'Weather in Hyderabad', command: 'weather in Hyderabad', icon: <CloudSun size={13} /> },
  { label: 'Convert 100 USD to INR', command: 'convert 100 usd to inr', icon: <Calculator size={13} /> },
  { label: 'Take a Voice Note', command: 'take a note: Review AI project presentation at 5pm', icon: <StickyNote size={13} /> },
];

const SUGGESTIONS_TE = [
  { label: 'AI గురించి వివరించు', command: 'ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ అంటే ఏమిటి సులభంగా వివరించు', icon: <Brain size={13} /> },
  { label: 'తెలుగులోకి అనువదించు', command: 'translate Good Morning to Telugu', icon: <Languages size={13} /> },
  { label: '5 నిమిషాల టైమర్', command: 'set a timer for 5 minutes', icon: <Timer size={13} /> },
  { label: 'AI వీడియో కాల్', command: 'వీడియో కాల్ చేయి', icon: <Video size={13} /> },
  { label: 'యూట్యూబ్‌లో పాటలు', command: 'play telugu songs on youtube', icon: <Music size={13} /> },
  { label: 'హైదరాబాద్ వాతావరణం', command: 'weather in Hyderabad', icon: <CloudSun size={13} /> },
  { label: 'గణితం: 50 * 25', command: 'calculate 50 * 25', icon: <Calculator size={13} /> },
  { label: 'నోట్ రాసుకో', command: 'take a note: రేపు ఉదయం 10 గంటలకు మీటింగ్', icon: <StickyNote size={13} /> },
];

const getSafeHostname = (urlStr) => {
  if (!urlStr) return '';
  if (urlStr.startsWith('tel:')) return urlStr.replace('tel:', '');
  if (urlStr.startsWith('sms:')) return 'SMS Message';
  try {
    return new URL(urlStr).hostname.replace('www.', '') || urlStr;
  } catch {
    return urlStr;
  }
};

const Chat = ({ onOpenVideoCall, onOpenWhatsApp, onOpenLLMStudio }) => {
  const {
    executeCommand,
    speak,
    stopSpeaking,
    isSpeaking,
    registerCommandListener,
    language,
    selectedModel,
    setSelectedModel,
    selectedPersona,
    setSelectedPersona,
    handsFreeMode,
    setHandsFreeMode,
  } = useVoice();

  const isTelugu = Boolean(language && language.startsWith('te'));
  const suggestions = isTelugu ? SUGGESTIONS_TE : SUGGESTIONS_EN;

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: isTelugu
        ? 'నమస్కారం! నేను వోక్స్ వెబ్ Multi-LLM వాయిస్ అసిస్టెంట్. మీరు మీ గొంతుతో ఏదైనా ప్రశ్న అడగవచ్చు, ఇతర భాషల్లోకి అనువదించవచ్చు, టైమర్లు సెట్ చేయవచ్చు లేదా వెబ్ కమాండ్లు ఇవ్వవచ్చు!'
        : 'Hello! I am VoxWeb, powered by our Multi-LLM Human Voice Engine. Speak naturally with your voice or type any question—I understand human context, explain topics clearly, translate languages, set timers, and automate websites!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'ai',
      model_used: 'VoxWeb Omni-LLM',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    registerCommandListener(({ userText, assistantData }) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender: 'user',
          text: userText,
          timestamp: timeStr,
        },
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender: 'assistant',
          text: assistantData.response,
          ...assistantData,
          timestamp: timeStr,
        },
      ]);
    });
  }, [registerCommandListener]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    setInputText('');
    await executeCommand(query);
  };

  const handleSuggestionClick = (cmd) => {
    setInputText('');
    executeCommand(cmd);
  };

  const handleCopyText = (id, text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearChat = () => {
    stopSpeaking();
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: isTelugu
          ? 'సంభాషణ క్లియర్ చేయబడింది. ఇప్పుడు నేను మీకు ఎలా సహాయపడగలను?'
          : 'Conversation cleared. Speak or type anything—how can I help you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'ai',
        model_used: 'VoxWeb Omni-LLM',
      },
    ]);
  };

  return (
    <div className="chat-conversation-panel">
      {/* Header bar with Multi-LLM & Persona selectors */}
      <div className="chat-panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="chat-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={20} color="var(--accent-blue)" />
          <span>VoxWeb Human Voice &amp; Multi-LLM Hub</span>
        </div>

        <div className="chat-panel-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* LLM Model Dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            aria-label="Select LLM Model"
            style={{
              background: 'rgba(99, 102, 241, 0.16)',
              border: '1px solid rgba(129, 140, 248, 0.45)',
              color: '#e0e7ff',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
            title="Select Active Large Language Model"
          >
            {LLM_MODELS.map((m) => (
              <option key={m.id} value={m.id} style={{ background: '#0f172a', color: '#fff' }}>
                🧠 {m.name}
              </option>
            ))}
          </select>

          {/* Human Persona Dropdown */}
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            aria-label="Select AI Response Style"
            style={{
              background: 'rgba(6, 182, 212, 0.14)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#a5f3fc',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
            title="How the AI explains answers to humans"
          >
            {AI_PERSONAS.map((p) => (
              <option key={p.id} value={p.id} style={{ background: '#0f172a', color: '#fff' }}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>

          {/* Hands-Free Loop Toggle */}
          <button
            type="button"
            onClick={() => setHandsFreeMode(!handsFreeMode)}
            style={{
              background: handsFreeMode ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.06)',
              border: handsFreeMode ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
              color: handsFreeMode ? '#34d399' : '#cbd5e1',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
            title="When ON, VoxWeb automatically listens for your reply after speaking"
          >
            <Radio size={13} />
            <span>{handsFreeMode ? 'Hands-Free ON' : 'Hands-Free'}</span>
          </button>

          {onOpenLLMStudio && (
            <button
              type="button"
              onClick={onOpenLLMStudio}
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                color: '#d8b4fe',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Open Multi-LLM Studio"
            >
              <Brain size={13} />
              <span>Studio</span>
            </button>
          )}

          {/* Floating Stop Speaking Button when audio is active */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="btn-replay-audio"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '4px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'pulse 1.5s infinite',
              }}
              title="Stop audio playback"
            >
              <VolumeX size={14} />
              <span>{isTelugu ? 'ఆపండి' : 'Stop Speaking'}</span>
            </button>
          )}

          <button
            onClick={handleClearChat}
            className="btn-icon-control"
            title={isTelugu ? 'చాట్ క్లియర్ చేయండి' : 'Clear Chat'}
            aria-label="Clear Chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
            <div className={`message-avatar ${msg.sender === 'assistant' ? 'avatar-voxweb' : 'avatar-user'}`}>
              {msg.sender === 'assistant' ? <Bot size={20} /> : <User size={20} />}
            </div>

            <div style={{ maxWidth: '85%' }}>
              <div className="message-bubble">
                <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{msg.text}</p>

                {/* Combo Call or Message Action */}
                {msg.action === 'call_or_message' && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <a
                        href={msg.url}
                        className="action-launch-link"
                        style={{
                          background: 'rgba(34, 197, 94, 0.25)',
                          border: '1px solid rgba(34, 197, 94, 0.5)',
                          color: '#4ade80',
                          fontWeight: 600,
                        }}
                      >
                        <PhoneCall size={14} />
                        <span>{isTelugu ? 'ఆటోమేటిక్ కాల్' : 'Auto Call Device'} ({msg.query})</span>
                      </a>

                      {msg.whatsapp_url && (
                        <a
                          href={msg.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-launch-link"
                          style={{
                            background: 'rgba(37, 211, 102, 0.25)',
                            border: '1px solid rgba(37, 211, 102, 0.5)',
                            color: '#22c55e',
                            fontWeight: 600,
                          }}
                        >
                          <MessageSquare size={14} />
                          <span>{isTelugu ? 'వాట్సాప్ మెసేజ్' : 'WhatsApp'} &ldquo;{msg.message || 'Call me back later'}&rdquo;</span>
                        </a>
                      )}

                      {msg.sms_url && (
                        <a
                          href={msg.sms_url}
                          className="action-launch-link"
                          style={{
                            background: 'rgba(56, 189, 248, 0.2)',
                            border: '1px solid rgba(56, 189, 248, 0.45)',
                            color: '#38bdf8',
                            fontWeight: 600,
                          }}
                        >
                          <MessageSquare size={14} />
                          <span>SMS &ldquo;{msg.message || 'Call me back later'}&rdquo;</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Standalone Send Message Action */}
                {msg.action === 'send_message' && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {msg.whatsapp_url && (
                        <a
                          href={msg.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-launch-link"
                          style={{
                            background: 'rgba(37, 211, 102, 0.25)',
                            border: '1px solid rgba(37, 211, 102, 0.5)',
                            color: '#22c55e',
                            fontWeight: 600,
                          }}
                        >
                          <MessageSquare size={14} />
                          <span>WhatsApp &ldquo;{msg.message}&rdquo;</span>
                        </a>
                      )}
                      {msg.sms_url && (
                        <a
                          href={msg.sms_url}
                          className="action-launch-link"
                          style={{
                            background: 'rgba(56, 189, 248, 0.2)',
                            border: '1px solid rgba(56, 189, 248, 0.45)',
                            color: '#38bdf8',
                            fontWeight: 600,
                          }}
                        >
                          <MessageSquare size={14} />
                          <span>SMS &ldquo;{msg.message}&rdquo;</span>
                        </a>
                      )}
                      {msg.url && msg.url.startsWith('tel:') && (
                        <a
                          href={msg.url}
                          className="action-launch-link"
                          style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#4ade80',
                          }}
                        >
                          <PhoneCall size={14} />
                          <span>{isTelugu ? 'కాల్ చేయండి' : 'Call'} ({msg.query})</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Direct Phone Calling Action */}
                {msg.action === 'call_phone' && (
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={msg.url}
                      className="action-launch-link"
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#4ade80',
                      }}
                    >
                      <PhoneCall size={14} />
                      <span>{isTelugu ? 'కాల్ ప్రారంభించండి' : 'Dial Device Call'} ({msg.query})</span>
                    </a>
                  </div>
                )}

                {/* WhatsApp Calling Action */}
                {msg.action === 'call_whatsapp' && (
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={msg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-launch-link"
                      style={{
                        background: 'rgba(37, 211, 102, 0.2)',
                        border: '1px solid rgba(37, 211, 102, 0.4)',
                        color: '#22c55e',
                      }}
                    >
                      <PhoneCall size={14} />
                      <span>{isTelugu ? 'వాట్సాప్‌లో కాల్ చేయండి' : 'Call via WhatsApp'} ({msg.query})</span>
                    </a>
                  </div>
                )}

                {/* AI Video Call Action */}
                {msg.action === 'video_call' && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onOpenVideoCall && onOpenVideoCall()}
                      className="action-launch-link"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.35) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.6)',
                        color: '#38bdf8',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Video size={15} />
                      <span>{isTelugu ? 'లైవ్ వీడియో కాల్ ప్రారంభించండి' : 'Start Live AI Video Call'}</span>
                    </button>

                    {onOpenWhatsApp && (
                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp()}
                        className="action-launch-link"
                        style={{
                          background: 'rgba(37, 211, 102, 0.2)',
                          border: '1px solid rgba(37, 211, 102, 0.45)',
                          color: '#4ade80',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <MessageSquare size={14} />
                        <span>{isTelugu ? 'వాట్సాప్ ఆహ్వానం' : 'WhatsApp Video Invite'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* WhatsApp Account Hub Action */}
                {msg.action === 'whatsapp_account' && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp && onOpenWhatsApp()}
                      className="action-launch-link"
                      style={{
                        background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.25) 0%, rgba(18, 140, 126, 0.35) 100%)',
                        border: '1px solid rgba(37, 211, 102, 0.6)',
                        color: '#4ade80',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <MessageSquare size={15} />
                      <span>{isTelugu ? 'వాట్సాప్ ఖాతా హబ్ తెరవండి' : 'Open WhatsApp Account Hub'}</span>
                    </button>

                    <a
                      href="https://web.whatsapp.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-launch-link"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#cbd5e1',
                        fontWeight: 600,
                      }}
                    >
                      <span>WhatsApp Web</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}

                {/* If action triggered an external URL */}
                {msg.url &&
                  !['call_phone', 'call_whatsapp', 'call_or_message', 'send_message', 'video_call', 'whatsapp_account'].includes(
                    msg.action
                  ) && (
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={msg.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-launch-link"
                      >
                        <span>Visit {getSafeHostname(msg.url)}</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
              </div>

              <div className="message-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{msg.timestamp}</span>

                {msg.type && (
                  <span
                    className={`badge-action-type ${
                      msg.type === 'action' ? 'badge-action' : 'badge-ai'
                    }`}
                  >
                    {msg.action === 'video_call'
                      ? isTelugu
                        ? '📹 AI వీడియో కాల్'
                        : '📹 AI Video Call'
                      : msg.action === 'whatsapp_account'
                      ? isTelugu
                        ? '💬 వాట్సాప్ హబ్'
                        : '💬 WhatsApp Hub'
                      : msg.action === 'call_or_message'
                      ? isTelugu
                        ? '📞 కాల్ & 💬 మెసేజ్'
                        : '📞 Device Call & 💬 SMS/WhatsApp'
                      : msg.action === 'send_message'
                      ? isTelugu
                        ? '💬 SMS / వాట్సాప్'
                        : '💬 SMS / WhatsApp'
                      : msg.action === 'call_phone'
                      ? isTelugu
                        ? '📞 ఫోన్ కాల్'
                        : '📞 Device Call'
                      : msg.action === 'call_whatsapp'
                      ? isTelugu
                        ? '💬 వాట్సాప్ కాల్'
                        : '💬 WhatsApp Call'
                      : msg.action === 'play_youtube'
                      ? isTelugu
                        ? '▶ యూట్యూబ్'
                        : '▶ YouTube Play'
                      : msg.action === 'weather'
                      ? isTelugu
                        ? '⛅ వాతావరణం'
                        : '⛅ Live Weather'
                      : msg.action === 'calculate'
                      ? isTelugu
                        ? '🧮 గణితం'
                        : '🧮 Math Calc'
                      : msg.action === 'save_note'
                      ? isTelugu
                        ? '📝 వాయిస్ నోట్'
                        : '📝 Voice Note'
                      : msg.action === 'set_timer'
                      ? '⏱️ Smart Timer'
                      : msg.action === 'translate'
                      ? '🌐 Live Translator'
                      : msg.action === 'convert_unit'
                      ? '🔄 Unit Converter'
                      : msg.action === 'dictionary'
                      ? '📖 Dictionary'
                      : msg.type === 'action'
                      ? isTelugu
                        ? '⚡ త్వరిత చర్య'
                        : '⚡ Fast Action'
                      : isTelugu
                      ? '🤖 AI సమాధానం'
                      : '🤖 Human-Friendly AI'}
                  </span>
                )}

                {msg.model_used && msg.sender === 'assistant' && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(99, 102, 241, 0.16)',
                      border: '1px solid rgba(129, 140, 248, 0.35)',
                      color: '#a5b4fc',
                      fontWeight: 600,
                    }}
                  >
                    🧠 {msg.model_used}
                  </span>
                )}

                {msg.sender === 'assistant' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => speak(msg.text, { force: true, skipHandsFree: true })}
                      className="btn-replay-audio"
                      title={isTelugu ? 'సమాధానం వినండి' : 'Listen to AI voice response'}
                    >
                      <Volume2 size={13} />
                      <span>{isTelugu ? 'వినండి' : 'Speak Aloud'}</span>
                    </button>

                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="btn-replay-audio"
                      title={isTelugu ? 'కాపీ చేయండి' : 'Copy to clipboard'}
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={13} color="var(--accent-emerald)" />
                          <span style={{ color: 'var(--accent-emerald)' }}>
                            {isTelugu ? 'కాపీ అయింది!' : 'Copied!'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>{isTelugu ? 'కాపీ' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Suggestion Chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '8px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.2)',
          scrollbarWidth: 'none',
        }}
      >
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSuggestionClick(s.command)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Footer: Microphone & Text Input */}
      <div className="chat-panel-footer">
        <Microphone />

        <form onSubmit={handleSend} className="text-input-bar">
          <input
            type="text"
            className="text-input-field"
            placeholder={
              isTelugu
                ? 'వాయిస్ కమాండ్ మాట్లాడండి లేదా ఏదైనా ప్రశ్న టైప్ చేయండి...'
                : 'Speak with the microphone above or type any question for the LLM...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            className="btn-send-message"
            disabled={!inputText.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
