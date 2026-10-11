import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { voiceManager, isSpeechRecognitionSupported } from '../services/voice';
import { soundManager } from '../services/soundEffects';
import api, { parseApiError } from '../services/api';

const VoiceContext = createContext(null);

export const LLM_MODELS = [
  { id: 'voxweb-omni', name: 'VoxWeb Omni-LLM', badge: 'Auto Routing', desc: 'Smartest hybrid router across live LLMs & real-time knowledge' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Fast & Natural', desc: 'Ultra-fast, natural human-like conversational intelligence' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Multimodal', desc: 'Google-grade fast reasoning & multilingual fluency' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', badge: 'Open Source', desc: 'High-precision open-weights 70B instruction model' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', badge: 'Deep Reasoning', desc: 'Step-by-step analytical, coding & math specialist' },
];

export const AI_PERSONAS = [
  { id: 'friendly', name: 'Friendly Human', icon: '😊', desc: 'Warm, empathetic, natural human conversation' },
  { id: 'eli5', name: 'Explain Simply (ELI5)', icon: '💡', desc: 'Breaks down complex topics into simple everyday analogies' },
  { id: 'concise', name: 'Quick Voice', icon: '⚡', desc: 'Short, punchy 1-2 sentence voice answers' },
  { id: 'expert', name: 'Professor / Expert', icon: '🎓', desc: 'Structured, insightful technical & academic depth' },
  { id: 'storyteller', name: 'Creative Storyteller', icon: '✨', desc: 'Expressive, vivid, and engaging narrative responses' },
];

export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [status, setStatus] = useState('ready'); // ready, listening, thinking, speaking, error
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [errorMessage, setErrorMessage] = useState(null);

  // Voice & Speech Settings
  const [isMuted, setIsMuted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [language, setLanguage] = useState(() => localStorage.getItem('voxweb_lang') || 'en-US');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');

  // Multi-LLM & Human Persona Settings
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('voxweb_llm_model') || 'voxweb-omni'
  );
  const [selectedPersona, setSelectedPersona] = useState(
    () => localStorage.getItem('voxweb_llm_persona') || 'friendly'
  );
  const [handsFreeMode, setHandsFreeMode] = useState(
    () => localStorage.getItem('voxweb_hands_free') === 'true'
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem('voxweb_theme') || 'dark-navy'
  );
  const [mobileAppMode, setMobileAppMode] = useState(
    () => localStorage.getItem('voxweb_mobile_app_mode') === 'true'
  );

  // Active Smart Timer / Pomodoro State
  const [activeTimer, setActiveTimer] = useState(null); // { secondsLeft, totalSeconds, label, isRunning }
  const [customShortcuts, setCustomShortcuts] = useState([]);

  // Refs for latest state inside async callbacks
  const onCommandExecutedRef = useRef(null);
  const conversationContextRef = useRef([]);
  const handsFreeModeRef = useRef(handsFreeMode);
  const startListeningRef = useRef(null);

  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
    localStorage.setItem('voxweb_hands_free', String(handsFreeMode));
  }, [handsFreeMode]);

  useEffect(() => {
    localStorage.setItem('voxweb_llm_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('voxweb_llm_persona', selectedPersona);
  }, [selectedPersona]);

  useEffect(() => {
    localStorage.setItem('voxweb_lang', language);
    voiceManager.setLanguage(language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('voxweb_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('voxweb_mobile_app_mode', String(mobileAppMode));
    document.body.classList.toggle('mobile-app-frame-mode', mobileAppMode);
  }, [mobileAppMode]);

  // Load user's custom voice shortcuts
  const refreshShortcuts = useCallback(async () => {
    try {
      const res = await api.get('/shortcuts');
      if (Array.isArray(res.data)) {
        setCustomShortcuts(res.data);
      }
    } catch {
      // Ignore if offline
    }
  }, []);

  useEffect(() => {
    refreshShortcuts();
  }, [refreshShortcuts]);

  // Load browser voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = voiceManager.getAvailableVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        if (!selectedVoiceURI) {
          const naturalVoice = voices.find(
            (v) =>
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Microsoft') ||
                v.name.includes('Premium')) &&
              v.lang.startsWith('en')
          );
          if (naturalVoice) {
            setSelectedVoiceURI(naturalVoice.voiceURI);
            voiceManager.selectedVoice = naturalVoice;
          }
        }
      }
    };

    updateVoices();
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceURI]);

  // Handle selected voice change
  useEffect(() => {
    if (selectedVoiceURI && availableVoices.length > 0) {
      const found = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
      if (found) {
        voiceManager.selectedVoice = found;
      }
    }
  }, [selectedVoiceURI, availableVoices]);

  const speak = useCallback(
    (text, options = {}) => {
      if (isMuted || (!autoSpeak && !options.force) || !text) {
        if (handsFreeModeRef.current && startListeningRef.current) {
          setTimeout(() => startListeningRef.current(), 450);
        }
        return;
      }

      setIsSpeaking(true);
      setStatus('speaking');
      setStatusMessage('VoxWeb AI is speaking...');

      voiceManager.speak(text, {
        rate: speechRate,
        pitch: speechPitch,
        lang: options.lang || language,
        onStart: () => {
          setIsSpeaking(true);
          setStatus('speaking');
          setStatusMessage('VoxWeb AI is speaking...');
        },
        onEnd: () => {
          setIsSpeaking(false);
          setStatus('ready');
          setStatusMessage('Ready');
          // In Hands-Free Conversation mode, automatically listen for the human's next reply
          if (handsFreeModeRef.current && startListeningRef.current && !options.skipHandsFree) {
            setTimeout(() => {
              startListeningRef.current();
            }, 500);
          }
        },
        onError: (err) => {
          console.warn('Speech synthesis error:', err);
          setIsSpeaking(false);
          setStatus('ready');
          setStatusMessage('Ready');
        },
      });
    },
    [isMuted, autoSpeak, speechRate, speechPitch, language]
  );

  // Smart Timer countdown effect
  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;
    const interval = setInterval(() => {
      setActiveTimer((prev) => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.secondsLeft <= 1) {
          soundManager.playCommandSuccess();
          setTimeout(() => {
            speak(`${prev.label || 'Timer'} is complete!`, { force: true, skipHandsFree: true });
          }, 100);
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer, speak]);

  const startTimer = useCallback((seconds, label = 'Voice Timer') => {
    if (!seconds || seconds <= 0) return;
    setActiveTimer({
      secondsLeft: seconds,
      totalSeconds: seconds,
      label,
      isRunning: true,
    });
  }, []);

  const stopTimer = useCallback(() => {
    setActiveTimer(null);
  }, []);

  const stopSpeaking = useCallback(() => {
    voiceManager.stopSpeaking();
    setIsSpeaking(false);
    setStatus('ready');
    setStatusMessage('Ready');
  }, []);

  const handleSpecialAction = useCallback(
    (actionData) => {
      if (!actionData) return;
      if (actionData.action === 'set_timer' && actionData.meta?.seconds) {
        startTimer(actionData.meta.seconds, actionData.meta.label || 'Voice Timer');
      } else if (actionData.action === 'switch_theme' && actionData.meta?.theme) {
        setTheme(actionData.meta.theme);
      }
    },
    [startTimer]
  );

  const executeCommand = useCallback(
    async (spokenText) => {
      if (!spokenText || !spokenText.trim()) return null;

      stopSpeaking();
      setIsThinking(true);
      setStatus('thinking');
      setStatusMessage('VoxWeb AI is thinking...');
      setErrorMessage(null);

      const cleanInput = spokenText.trim().toLowerCase();

      // 0. Check if user spoke a Custom Voice Shortcut phrase
      const matchedShortcut = customShortcuts.find(
        (s) => cleanInput === s.phrase.toLowerCase() || cleanInput === `run ${s.phrase.toLowerCase()}`
      );
      if (matchedShortcut) {
        setIsThinking(false);
        if (matchedShortcut.target_url) {
          try {
            window.open(matchedShortcut.target_url, '_blank');
          } catch (e) {
            console.warn('Shortcut open blocked:', e);
          }
        }
        const shortcutResult = {
          response: matchedShortcut.response_text || `Executing your shortcut "${matchedShortcut.phrase}".`,
          type: 'action',
          action: matchedShortcut.action_type || 'open_website',
          url: matchedShortcut.target_url || null,
          model_used: 'Custom Voice Macro',
        };
        if (onCommandExecutedRef.current) {
          onCommandExecutedRef.current({
            userText: spokenText,
            assistantData: shortcutResult,
          });
        }
        soundManager.playCommandSuccess();
        speak(shortcutResult.response);
        return shortcutResult;
      }

      // 1. Client-side instant evaluation for fast commands (websites, math, timers, themes, translations)
      const { detectFastCommand } = await import('../services/commandRouter');
      const fastAction = detectFastCommand(spokenText, language);

      if (fastAction) {
        setIsThinking(false);
        handleSpecialAction(fastAction);

        if (fastAction.url) {
          try {
            if (fastAction.action === 'call_phone') {
              window.location.href = fastAction.url;
            } else {
              window.open(fastAction.url, '_blank');
            }
          } catch (e) {
            console.warn('Auto-open blocked:', e);
          }
        }

        if (onCommandExecutedRef.current) {
          onCommandExecutedRef.current({
            userText: spokenText,
            assistantData: fastAction,
          });
        }

        soundManager.playCommandSuccess();
        if (fastAction.response) {
          speak(fastAction.response);
        }

        // Background sync to backend for database logging
        api
          .post('/command', {
            command: spokenText.trim(),
            language,
            model: selectedModel,
            persona: selectedPersona,
          })
          .catch((e) => {
            console.warn('Backend sync warning:', e);
          });

        return fastAction;
      }

      try {
        // 2. Send command to Multi-LLM backend with conversation context, model & persona
        const res = await api.post('/command', {
          command: spokenText.trim(),
          language,
          model: selectedModel,
          persona: selectedPersona,
          context: conversationContextRef.current.slice(-5),
        });

        const data = res.data;
        setIsThinking(false);
        handleSpecialAction(data);

        // Save turn in local conversation memory for natural follow-up questions
        conversationContextRef.current = [
          ...conversationContextRef.current.slice(-5),
          { user: spokenText.trim(), assistant: data.response || '' },
        ];

        if (data.type === 'action' && data.url) {
          try {
            if (data.action === 'call_phone') {
              window.location.href = data.url;
            } else {
              window.open(data.url, '_blank');
            }
          } catch (e) {
            console.warn('Could not auto-open URL:', e);
          }
        }

        if (onCommandExecutedRef.current) {
          onCommandExecutedRef.current({
            userText: spokenText,
            assistantData: data,
          });
        }

        soundManager.playCommandSuccess();
        if (data.response) {
          speak(data.response);
        } else {
          setStatus('ready');
          setStatusMessage('Ready');
        }

        return data;
      } catch (err) {
        console.error('Command execution error:', err);
        setIsThinking(false);
        setStatus('error');
        const errTxt = parseApiError(err, "VoxWeb couldn't connect to the server.");
        setErrorMessage(errTxt);
        setStatusMessage('Error');

        if (onCommandExecutedRef.current) {
          onCommandExecutedRef.current({
            userText: spokenText,
            assistantData: {
              response: errTxt,
              type: 'error',
            },
          });
        }

        setTimeout(() => {
          setErrorMessage(null);
          setStatus('ready');
          setStatusMessage('Ready');
        }, 4500);

        return null;
      }
    },
    [speak, stopSpeaking, language, selectedModel, selectedPersona, customShortcuts, handleSpecialAction]
  );

  const stopListening = useCallback(() => {
    voiceManager.stopListening();
    setIsListening(false);
    setStatus('ready');
    setStatusMessage('Ready');
  }, []);

  const startListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    stopSpeaking();
    setInterimText('');
    setErrorMessage(null);

    voiceManager.startListening({
      onStart: () => {
        setIsListening(true);
        setStatus('listening');
        setStatusMessage('Listening to your voice...');
        soundManager.playListenStart();
      },
      onInterim: (text) => {
        setInterimText(text);
      },
      onResult: (finalText) => {
        setIsListening(false);
        setInterimText('');
        if (finalText) {
          executeCommand(finalText);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setStatus('ready');
        setStatusMessage('Ready');
        const msg = err.message || 'Microphone error';
        setErrorMessage(msg);
        setTimeout(() => {
          setErrorMessage((curr) => (curr === msg ? null : curr));
        }, 5000);
      },
      onEnd: () => {
        setIsListening(false);
        setStatus((prev) => (prev === 'listening' ? 'ready' : prev));
        setStatusMessage((prev) => (prev === 'Listening to your voice...' ? 'Ready' : prev));
      },
    });
  }, [isListening, executeCommand, stopSpeaking, stopListening]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const registerCommandListener = (callback) => {
    onCommandExecutedRef.current = callback;
  };

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        isSpeaking,
        isThinking,
        interimText,
        status,
        statusMessage,
        errorMessage,
        setErrorMessage,
        isMuted,
        setIsMuted,
        autoSpeak,
        setAutoSpeak,
        speechRate,
        setSpeechRate,
        speechPitch,
        setSpeechPitch,
        language,
        setLanguage,
        availableVoices,
        selectedVoiceURI,
        setSelectedVoiceURI,
        selectedModel,
        setSelectedModel,
        selectedPersona,
        setSelectedPersona,
        handsFreeMode,
        setHandsFreeMode,
        theme,
        setTheme,
        mobileAppMode,
        setMobileAppMode,
        activeTimer,
        startTimer,
        stopTimer,
        customShortcuts,
        refreshShortcuts,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        executeCommand,
        registerCommandListener,
        isSupported: isSpeechRecognitionSupported(),
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
