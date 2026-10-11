// Client-side Fast Command Router & Normalizer

const SITES = {
  youtube: 'https://www.youtube.com',
  google: 'https://www.google.com',
  whatsapp: 'https://web.whatsapp.com',
  github: 'https://github.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  reddit: 'https://www.reddit.com',
  wikipedia: 'https://www.wikipedia.org',
  gmail: 'https://mail.google.com',
  linkedin: 'https://www.linkedin.com',
  netflix: 'https://www.netflix.com',
  spotify: 'https://open.spotify.com',
  amazon: 'https://www.amazon.com',
  leetcode: 'https://leetcode.com',
  canva: 'https://www.canva.com',
  coursera: 'https://www.coursera.org',
  discord: 'https://discord.com',
  twitch: 'https://www.twitch.tv',
  maps: 'https://maps.google.com',
  'google maps': 'https://maps.google.com',
  notion: 'https://www.notion.so',
  figma: 'https://www.figma.com',
  stackoverflow: 'https://stackoverflow.com',
};

export function normalizePhone(rawNum) {
  const digits = (rawNum || '').replace(/\D/g, '');
  if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) {
    return {
      digits,
      waDigits: `91${digits}`,
      e164: `+91${digits}`,
    };
  } else if (digits.startsWith('91') && digits.length === 12) {
    return {
      digits,
      waDigits: digits,
      e164: `+${digits}`,
    };
  } else if (digits.startsWith('1') && digits.length === 11) {
    return {
      digits,
      waDigits: digits,
      e164: `+${digits}`,
    };
  }
  return {
    digits,
    waDigits: digits,
    e164: (rawNum || '').trim().startsWith('+') ? rawNum.trim() : `+${digits}`,
  };
}

export function detectFastCommand(command, language = 'en-US') {
  if (!command) return null;
  const rawTrimmed = command.trim();
  const clean = rawTrimmed.toLowerCase().replace(/[.!?]+$/, '');
  const isTe = Boolean(language && language.toLowerCase().startsWith('te'));

  // 1. Call OR Message Combo: "Call this number 7981779432 or message 'Call me back later'"
  const callOrMsgMatch =
    rawTrimmed.match(
      /^(?:please\s+)?(?:call|dial)\s+(?:this\s+number\s+|the\s+number\s+|number\s+|to\s+)?([\+\d\s\-()]+?)\s+(?:or|and)\s+(?:message|send(?:\s+a)?\s+message(?:\s+to)?|text|sms|whatsapp)\s+['"]?([^'"]+?)['"]?$/i
    ) ||
    rawTrimmed.match(
      /^(?:ఈ\s+నంబర్‌కు\s+|నంబర్\s+)?([\+\d\s\-()]+?)\s*(?:కు\s+కాల్\s+చేయి\s+లేదా|కాల్\s+చేయి\s+లేదా|కి\s+కాల్\s+చేయి\s+లేదా)\s*['"]?([^'"]+?)['"]?\s*(?:అని\s+మెసేజ్\s+చేయి|మెసేజ్\s+చేయి)$/
    );

  if (callOrMsgMatch) {
    const rawNum = callOrMsgMatch[1].trim();
    const msgText = callOrMsgMatch[2].trim();
    const { digits, waDigits, e164 } = normalizePhone(rawNum);
    if (digits.length >= 5) {
      const encodedMsg = encodeURIComponent(msgText);
      const telUrl = `tel:${e164}`;
      const waUrl = `https://wa.me/${waDigits}?text=${encodedMsg}`;
      const smsUrl = `sms:${e164}?body=${encodedMsg}`;
      const resp = isTe
        ? `${e164} కు కాల్ చేస్తున్నాను. వాట్సాప్ లేదా SMS ద్వారా '${msgText}' మెసేజ్ కూడా పంపవచ్చు.`
        : `Calling ${e164} on your device. You can also send '${msgText}' via WhatsApp or SMS.`;

      return {
        type: 'action',
        action: 'call_or_message',
        query: e164,
        message: msgText,
        url: telUrl,
        whatsapp_url: waUrl,
        sms_url: smsUrl,
        response: resp,
        intent: 'call_or_message',
      };
    }
  }

  // 2. Standalone Message / Text: "message 7981779432 Call me back later"
  const msgMatch =
    rawTrimmed.match(
      /^(?:please\s+)?(?:message|text|send(?:\s+a)?\s+message\s+to|whatsapp|sms)\s+(?:to\s+|this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-()]+?)[:\s]+['"]?([^'"]+?)['"]?$/i
    ) ||
    rawTrimmed.match(
      /^(?:please\s+)?(?:message|text|send(?:\s+a)?\s+message)\s+['"]?([^'"]+?)['"]?\s+to\s+(?:this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-()]+)$/i
    );

  if (msgMatch) {
    const g1 = msgMatch[1].trim();
    const g2 = msgMatch[2].trim();
    const isG1Num = /\d{5,}/.test(g1);
    const rawNum = isG1Num ? g1 : g2;
    const msgText = isG1Num ? g2 : g1;
    const { digits, waDigits, e164 } = normalizePhone(rawNum);

    if (digits.length >= 5) {
      const encodedMsg = encodeURIComponent(msgText);
      const telUrl = `tel:${e164}`;
      const waUrl = `https://wa.me/${waDigits}?text=${encodedMsg}`;
      const smsUrl = `sms:${e164}?body=${encodedMsg}`;
      const resp = isTe
        ? `${e164} నంబర్‌కు '${msgText}' మెసేజ్ సిద్ధంగా ఉంది.`
        : `Prepared message '${msgText}' for ${e164} on WhatsApp and SMS.`;

      return {
        type: 'action',
        action: 'send_message',
        query: e164,
        message: msgText,
        url: waUrl,
        whatsapp_url: waUrl,
        sms_url: smsUrl,
        response: resp,
        intent: 'send_message',
      };
    }
  }

  // 3. WhatsApp Call command: "call on whatsapp +91...", "whatsapp call 9876...", "వాట్సాప్ కాల్ చేయి 9876..."
  const waMatch = rawTrimmed.match(
    /^(?:call\s+(?:on\s+)?whatsapp\s+(?:to\s+)?|whatsapp\s+call\s+(?:to\s+)?|వాట్సాప్\s*(?:లో)?\s*కాల్\s*చేయి\s*)(?:this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-()]+)$/i
  );
  if (waMatch) {
    const rawNum = waMatch[1].trim();
    const { digits, waDigits, e164 } = normalizePhone(rawNum);
    if (digits.length >= 5) {
      return {
        type: 'action',
        action: 'call_whatsapp',
        query: e164,
        url: `https://wa.me/${waDigits}`,
        whatsapp_url: `https://wa.me/${waDigits}`,
        sms_url: `sms:${e164}`,
        response: isTe ? `${e164} కు వాట్సాప్‌లో కాల్ చేస్తున్నాను.` : `Calling ${e164} on WhatsApp.`,
        intent: 'whatsapp_call',
      };
    }
  }

  // 4. Device / Phone Call: "call this number 7981...", "call 9876...", "dial +91...", "కాల్ చేయి 9876..."
  const phoneMatch = rawTrimmed.match(
    /^(?:please\s+)?(?:call|dial|phone|make a call to|ring|కాల్ చేయి|ఫోన్ చేయి)\s+(?:to\s+|this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-()]+)$/i
  );
  if (phoneMatch) {
    const rawNum = phoneMatch[1].trim();
    const { digits, waDigits, e164 } = normalizePhone(rawNum);
    if (digits.length >= 5) {
      return {
        type: 'action',
        action: 'call_phone',
        query: e164,
        url: `tel:${e164}`,
        whatsapp_url: `https://wa.me/${waDigits}`,
        sms_url: `sms:${e164}`,
        response: isTe ? `${e164} కు కాల్ చేస్తున్నాను.` : `Calling ${e164} on your device.`,
        intent: 'phone_call',
      };
    }
  }

  // 5. Video Call command: "start video call", "talk with video", "video call", "వీడియో కాల్ చేయి"
  const isVideoCall =
    /^(?:please\s+)?(?:start|open|launch|make|talk\s+with|talk\s+via)?\s*(?:a\s+)?(?:ai\s+)?video\s*call(?:\s+(?:with|to)\s+.*)?$/i.test(
      rawTrimmed
    ) || /^(?:వీడియో\s*కాల్|వీడియో\s*కాల్\s*చేయి|వీడియోతో\s*మాట్లాడు)$/.test(clean);

  if (isVideoCall) {
    return {
      type: 'action',
      action: 'video_call',
      response: isTe
        ? 'వీడియో కాల్ రూమ్‌ను ప్రారంభిస్తున్నాను. కెమెరా మరియు ఆడియో కనెక్ట్ అవుతున్నాయి.'
        : 'Starting AI Video Call room. Connecting to real-time camera and live audio.',
      intent: 'video_call',
    };
  }

  // 6. WhatsApp Account command: "create whatsapp account", "whatsapp account", "link whatsapp"
  const isWhatsAppAccount =
    /^(?:please\s+)?(?:create|link|connect|open|setup|manage)\s+(?:a\s+|my\s+)?whatsapp(?:\s+account|\s+profile)?$/i.test(
      rawTrimmed
    ) ||
    /^(?:whatsapp\s+account|whatsapp\s+profile|link\s+whatsapp|connect\s+whatsapp)$/i.test(
      rawTrimmed
    ) ||
    /^(?:వాట్సాప్\s*అకౌంట్|వాట్సాప్\s*ఖాతా|వాట్సాప్\s*కనెక్ట్\s*చేయి)$/.test(clean);

  if (isWhatsAppAccount) {
    return {
      type: 'action',
      action: 'whatsapp_account',
      response: isTe
        ? 'వాట్సాప్ అకౌంట్ హబ్‌ను ఓపెన్ చేస్తున్నాను. ఇక్కడ మీరు నంబర్ లింక్ చేయవచ్చు లేదా QR స్కాన్ చేయవచ్చు.'
        : 'Opening WhatsApp Account Hub. You can link your phone number, pair via QR code, and manage chats.',
      intent: 'whatsapp_account',
    };
  }

  // C. Telugu Fast Actions
  if (['సమయం ఎంత', 'టైమ్ ఎంత', 'ఇప్పుడు సమయం ఎంత', 'టైం ఎంత', 'సమయం చెప్పు', 'టైమ్ చెప్పు'].includes(clean)) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      type: 'action',
      action: 'tell_time',
      response: `ప్రస్తుత సమయం ${timeStr}.`,
      intent: 'time_query',
    };
  }

  if (['తేదీ ఎంత', 'ఈరోజు తేదీ ఎంత', 'ఈరోజు ఏ రోజు', 'తేదీ చెప్పు', 'ఈరోజు తేదీ చెప్పు'].includes(clean)) {
    const dateStr = new Date().toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      type: 'action',
      action: 'tell_date',
      response: `ఈరోజు ${dateStr}.`,
      intent: 'date_query',
    };
  }

  const teYtMatch = rawTrimmed.match(/^(?:యూట్యూబ్‌లో|యూట్యూబ్ లో)\s*(.+?)\s*(?:ప్లే చేయి|పెట్టు|ఓపెన్ చేయి)$/);
  if (teYtMatch) {
    const q = teYtMatch[1].trim();
    return {
      type: 'action',
      action: 'play_youtube',
      query: q,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      response: `యూట్యూబ్‌లో ${q} శోధిస్తున్నాను.`,
      intent: 'youtube_play',
    };
  }
  if (['యూట్యూబ్ ఓపెన్ చేయి', 'యూట్యూబ్ తెరువు'].includes(clean)) {
    return {
      type: 'action',
      action: 'open_url',
      url: 'https://www.youtube.com',
      response: 'యూట్యూబ్ ఓపెన్ చేస్తున్నాను.',
      intent: 'open_website',
    };
  }

  // 1. Check time
  if (['what time is it', 'what is the time', 'current time', 'tell me the time', 'time now'].includes(clean)) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      type: 'action',
      action: 'tell_time',
      response: `The current time is ${timeStr}.`,
      intent: 'time_query',
    };
  }

  // 2. Check date
  if (['what is the date', 'what date is it', 'what day is today', 'current date', "today's date", 'tell me the date'].includes(clean)) {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      type: 'action',
      action: 'tell_date',
      response: `Today is ${dateStr}.`,
      intent: 'date_query',
    };
  }

  // 3. YouTube Search & Play
  const ytMatch =
    clean.match(/^(?:play|listen to)\s+(.+?)(?:\s+on\s+youtube)?$/) ||
    clean.match(/^(?:search\s+youtube\s+for|youtube\s+search\s+for)\s+(.+)$/) ||
    clean.match(/^youtube\s+(?!open\b)(.+)$/);
  if (ytMatch && !clean.startsWith('open')) {
    const query = ytMatch[1].trim();
    if (query.length > 1 && !['music', 'video'].includes(query)) {
      return {
        type: 'action',
        action: 'play_youtube',
        query,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        response: `Searching YouTube for ${query}.`,
        intent: 'youtube_play',
      };
    }
  }

  // 4. Maps search
  const mapsMatch = clean.match(/^(?:search\s+maps?\s+for|find\s+(.+?)\s+on\s+maps?|maps?\s+search\s+for)\s+(.+)$/);
  if (mapsMatch) {
    const place = (mapsMatch[2] || mapsMatch[1]).trim();
    return {
      type: 'action',
      action: 'search_maps',
      query: place,
      url: `https://maps.google.com/?q=${encodeURIComponent(place)}`,
      response: `Searching Google Maps for ${place}.`,
      intent: 'maps_search',
    };
  }

  // 5. Wikipedia search
  const wikiMatch = clean.match(/^(?:search\s+wikipedia\s+for|wikipedia\s+search\s+for|wikipedia)\s+(.+)$/);
  if (wikiMatch) {
    const topic = wikiMatch[1].trim();
    return {
      type: 'action',
      action: 'search_wikipedia',
      query: topic,
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
      response: `Looking up ${topic} on Wikipedia.`,
      intent: 'wikipedia_search',
    };
  }

  // 6. Safe math calculation & natural language math
  const normalizedMath = clean
    .replace(/multiplied by|times/g, '*')
    .replace(/divided by/g, '/')
    .replace(/\bplus\b/g, '+')
    .replace(/\bminus\b/g, '-');

  const pctMatch = normalizedMath.match(/^(?:calculate|what is|compute)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\d+(?:\.\d+)?)$/);
  if (pctMatch) {
    const p = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    const ans = Math.round(((p / 100) * total) * 10000) / 10000;
    return {
      type: 'action',
      action: 'calculate',
      response: `${p}% of ${total} is ${ans}.`,
      intent: 'math_calculation',
      model_used: 'Fast Math Engine',
    };
  }

  const calcMatch = normalizedMath.match(/^(?:calculate|what is|compute)\s+([\d\s\+\-\*\/\.\(\)\%\^x×÷]+)$/);
  if (calcMatch) {
    const expr = calcMatch[1].trim().replace(/x|×/g, '*').replace(/÷/g, '/');
    if (/^[\d\s\+\-\*\/\.\(\)\%]+$/.test(expr)) {
      try {
        const val = Function(`'use strict'; return (${expr})`)();
        if (typeof val === 'number' && !isNaN(val)) {
          const displayVal = Number.isInteger(val) ? val : Math.round(val * 10000) / 10000;
          return {
            type: 'action',
            action: 'calculate',
            response: `${calcMatch[1].trim()} equals ${displayVal}.`,
            intent: 'math_calculation',
            model_used: 'Fast Math Engine',
          };
        }
      } catch (e) {
        // Fallback to backend
      }
    }
  }

  // 6b. Timer & Pomodoro Commands
  if (/^(?:start|open|launch)?\s*(?:a\s+)?(?:pomodoro|focus\s+timer|pomodoro\s+timer)$/.test(clean)) {
    return {
      type: 'action',
      action: 'set_timer',
      query: '1500',
      message: 'Pomodoro Focus (25m)',
      response: 'Starting a 25-minute Pomodoro focus timer for you.',
      intent: 'timer',
      model_used: 'Fast Action Router',
    };
  }

  const timerMatch = clean.match(
    /^(?:please\s+)?(?:set|start|create)?\s*(?:a\s+)?timer\s+(?:for\s+)?(\d+)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)(?:\s+(?:for|to)\s+(.+))?$/
  );
  if (timerMatch) {
    const amount = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2];
    const label = (timerMatch[3] || 'Voice Timer').trim();
    const mult = unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1;
    const totalSecs = amount * mult;
    return {
      type: 'action',
      action: 'set_timer',
      query: String(totalSecs),
      message: label,
      response: `Timer set for ${amount} ${unit} (${label}).`,
      intent: 'timer',
      model_used: 'Fast Action Router',
    };
  }

  // 6c. Unit & Currency Conversion
  const convMatch = clean.match(/^(?:convert|what is)\s+(\d+(?:\.\d+)?)\s*([a-z°]+)\s+(?:to|in|into)\s+([a-z°]+)$/);
  if (convMatch) {
    const val = parseFloat(convMatch[1]);
    const uFrom = convMatch[2].replace('°', '');
    const uTo = convMatch[3].replace('°', '');
    const map = {
      'usd_inr': [val * 83.5, 'INR'],
      'inr_usd': [val / 83.5, 'USD'],
      'km_miles': [val * 0.621371, 'miles'],
      'miles_km': [val * 1.60934, 'km'],
      'kg_lbs': [val * 2.20462, 'lbs'],
      'lbs_kg': [val / 2.20462, 'kg'],
      'c_f': [(val * 9) / 5 + 32, '°F'],
      'f_c': [((val - 32) * 5) / 9, '°C'],
    };
    const key = `${uFrom}_${uTo}`;
    if (map[key]) {
      const [resVal, label] = map[key];
      return {
        type: 'action',
        action: 'calculate',
        response: `${val} ${uFrom.toUpperCase()} equals ${resVal.toFixed(2)} ${label}.`,
        intent: 'unit_conversion',
        model_used: 'Fast Converter',
      };
    }
  }

  // 6d. Theme Switching by Voice
  const themeMatch = clean.match(/^(?:switch|change|set)\s+(?:to\s+)?(?:the\s+)?(cyberpunk|midnight|dark\s*navy|emerald|default)\s*(?:theme|mode)?$/);
  if (themeMatch) {
    const tName = themeMatch[1].replace(/\s+/g, '-');
    const themeKey = tName === 'default' ? 'dark-navy' : tName === 'emerald' ? 'emerald-aurora' : tName;
    return {
      type: 'action',
      action: 'change_theme',
      query: themeKey,
      response: `Switched visual theme to ${themeMatch[1]} mode.`,
      intent: 'theme_change',
      model_used: 'System Control',
    };
  }

  // 7. Open website
  const openMatch = clean.match(/^(?:please\s+)?(?:open|launch|go to|take me to)\s+(?:the\s+)?([a-z0-9.\s]+)$/);
  if (openMatch) {
    const target = openMatch[1].trim();
    if (SITES[target]) {
      return {
        type: 'action',
        action: 'open_url',
        url: SITES[target],
        response: `Opening ${target.charAt(0).toUpperCase() + target.slice(1)} for you.`,
        intent: 'open_website',
        model_used: 'Fast Action Router',
      };
    }
    if (target.includes('.') && !target.includes(' ')) {
      const url = target.startsWith('http') ? target : `https://${target}`;
      return {
        type: 'action',
        action: 'open_url',
        url,
        response: `Navigating to ${target}.`,
        intent: 'open_website',
        model_used: 'Fast Action Router',
      };
    }
  }

  // 8. Search Google
  const searchMatch = clean.match(/^(?:search\s+google\s+for|search\s+for|google\s+for)\s+(.+)$/);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return {
      type: 'action',
      action: 'search_google',
      query,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      response: `Searching Google for ${query}.`,
      intent: 'web_search',
      model_used: 'Fast Action Router',
    };
  }

  return null;
}
