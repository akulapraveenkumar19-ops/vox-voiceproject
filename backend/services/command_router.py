import re
import math
import urllib.parse
import urllib.request
import json
from datetime import datetime
from typing import Optional, Dict, Any

# Map of common fast target websites
KNOWN_SITES = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "whatsapp": "https://web.whatsapp.com",
    "github": "https://github.com",
    "twitter": "https://x.com",
    "x": "https://x.com",
    "reddit": "https://www.reddit.com",
    "wikipedia": "https://www.wikipedia.org",
    "gmail": "https://mail.google.com",
    "linkedin": "https://www.linkedin.com",
    "netflix": "https://www.netflix.com",
    "spotify": "https://open.spotify.com",
    "amazon": "https://www.amazon.com",
    "stackoverflow": "https://stackoverflow.com",
    "stack overflow": "https://stackoverflow.com",
    "chatgpt": "https://chatgpt.com",
    "openai": "https://openai.com",
    "facebook": "https://www.facebook.com",
    "instagram": "https://www.instagram.com",
    "leetcode": "https://leetcode.com",
    "canva": "https://www.canva.com",
    "coursera": "https://www.coursera.org",
    "discord": "https://discord.com",
    "twitch": "https://www.twitch.tv",
    "maps": "https://maps.google.com",
    "google maps": "https://maps.google.com",
    "notion": "https://www.notion.so",
    "figma": "https://www.figma.com",
}


def fetch_live_weather(city: str) -> Optional[str]:
    """Fetch live real-time weather summary for a specified city using public meteorological API."""
    try:
        clean_city = urllib.parse.quote_plus(city.strip())
        url = f"https://wttr.in/{clean_city}?format=j1"
        req = urllib.request.Request(url, headers={"User-Agent": "VoxWeb/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            current = data.get("current_condition", [{}])[0]
            temp_c = current.get("temp_C", "N/A")
            temp_f = current.get("temp_F", "N/A")
            desc = current.get("weatherDesc", [{}])[0].get("value", "Clear")
            humidity = current.get("humidity", "")
            return f"The current weather in {city.title()} is {desc} at {temp_c} degrees Celsius ({temp_f} degrees Fahrenheit) with {humidity}% humidity."
    except Exception as e:
        print(f"[Weather Service] Could not fetch live weather for {city}: {e}")
        return None


def safe_calculate(expr_str: str) -> Optional[str]:
    """Safely evaluate basic math expressions without executing arbitrary code."""
    cleaned = expr_str.replace("x", "*").replace("×", "*").replace("÷", "/").replace("^", "**")
    # Allow only numbers, parentheses, and arithmetic operators
    if not re.match(r'^[\d\s\+\-\*\/\.\(\)\%\*\*]+$', cleaned):
        return None
    try:
        # Only allow safe built-in math operations
        result = eval(cleaned, {"__builtins__": None, "math": math}, {})
        if isinstance(result, (int, float)):
            if isinstance(result, float) and result.is_integer():
                result = int(result)
            elif isinstance(result, float):
                result = round(result, 4)
            return f"{expr_str} equals {result}."
    except Exception:
        return None
    return None


def normalize_phone(raw_num: str) -> tuple[str, str, str]:
    """
    Normalizes a phone string into (raw_digits, wa_digits, tel_e164).
    For Indian 10-digit mobile numbers (starting with 6-9), defaults country code to +91.
    """
    digits = re.sub(r'[^\d]', '', raw_num)
    if len(digits) == 10 and digits[0] in '6789':
        wa_digits = f"91{digits}"
        e164 = f"+91{digits}"
    elif digits.startswith('91') and len(digits) == 12:
        wa_digits = digits
        e164 = f"+{digits}"
    elif digits.startswith('1') and len(digits) == 11:
        wa_digits = digits
        e164 = f"+{digits}"
    else:
        wa_digits = digits
        e164 = f"+{digits}" if raw_num.strip().startswith('+') else digits
    return digits, wa_digits, e164


def process_fast_command(command: str, language: Optional[str] = "en-US") -> Optional[Dict[str, Any]]:
    """
    Evaluates whether the input command is a direct fast action (Open website,
    Search Google, YouTube Music Play, Weather, Math Calculator, Notes, Time/Date,
    Phone/WhatsApp Calling, SMS/Messaging) or requires LLM intelligence.
    """
    if not command:
        return None

    raw_trimmed = command.strip()
    cleaned = raw_trimmed.lower()
    cleaned = re.sub(r'[\.\!\?]+$', '', cleaned).strip()
    is_te = bool(language and language.lower().startswith("te"))

    # 1. Call OR Message Combo: "Call this number 7981779432 or message 'Call me back later'"
    call_or_msg_match = (
        re.match(
            r'^(?:please\s+)?(?:call|dial)\s+(?:this\s+number\s+|the\s+number\s+|number\s+|to\s+)?([\+\d\s\-\(\)]+?)\s+(?:or|and)\s+(?:message|send(?:\s+a)?\s+message(?:\s+to)?|text|sms|whatsapp)\s+[\'"]?([^\'"]+?)[\'"]?$',
            raw_trimmed,
            re.IGNORECASE
        ) or
        re.match(
            r'^(?:ఈ\s+నంబర్‌కు\s+|నంబర్\s+)?([\+\d\s\-\(\)]+?)\s*(?:కు\s+కాల్\s+చేయి\s+లేదా|కాల్\s+చేయి\s+లేదా|కి\s+కాల్\s+చేయి\s+లేదా)\s*[\'"]?([^\'"]+?)[\'"]?\s*(?:అని\s+మెసేజ్\s+చేయి|మెసేజ్\s+చేయి)$',
            raw_trimmed
        )
    )
    if call_or_msg_match:
        raw_num = call_or_msg_match.group(1).strip()
        msg_text = call_or_msg_match.group(2).strip()
        digits, wa_digits, e164 = normalize_phone(raw_num)
        if len(digits) >= 5:
            encoded_msg = urllib.parse.quote(msg_text)
            tel_url = f"tel:{e164}"
            wa_url = f"https://wa.me/{wa_digits}?text={encoded_msg}"
            sms_url = f"sms:{e164}?body={encoded_msg}"
            resp_msg = (
                f"{e164} కు కాల్ చేస్తున్నాను. వాట్సాప్ లేదా SMS ద్వారా '{msg_text}' మెసేజ్ కూడా పంపవచ్చు."
                if is_te
                else f"Calling {e164} on your device. You can also send '{msg_text}' via WhatsApp or SMS."
            )
            return {
                "type": "action",
                "action": "call_or_message",
                "query": e164,
                "message": msg_text,
                "url": tel_url,
                "whatsapp_url": wa_url,
                "sms_url": sms_url,
                "response": resp_msg,
                "intent": "call_or_message",
                "timestamp": datetime.now().isoformat()
            }

    # 2. Standalone Message / Text: "message 7981779432 Call me back later", "send message to 7981779432: Call me back later"
    msg_match = (
        re.match(
            r'^(?:please\s+)?(?:message|text|send(?:\s+a)?\s+message\s+to|whatsapp|sms)\s+(?:to\s+|this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-\(\)]+?)[:\s]+[\'"]?([^\'"]+?)[\'"]?$',
            raw_trimmed,
            re.IGNORECASE
        ) or
        re.match(
            r'^(?:please\s+)?(?:message|text|send(?:\s+a)?\s+message)\s+[\'"]?([^\'"]+?)[\'"]?\s+to\s+(?:this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-\(\)]+)$',
            raw_trimmed,
            re.IGNORECASE
        )
    )
    if msg_match:
        # Determine which group is number and which is message
        g1 = msg_match.group(1).strip()
        g2 = msg_match.group(2).strip()
        if re.search(r'\d{5,}', g1):
            raw_num, msg_text = g1, g2
        else:
            raw_num, msg_text = g2, g1

        digits, wa_digits, e164 = normalize_phone(raw_num)
        if len(digits) >= 5:
            encoded_msg = urllib.parse.quote(msg_text)
            tel_url = f"tel:{e164}"
            wa_url = f"https://wa.me/{wa_digits}?text={encoded_msg}"
            sms_url = f"sms:{e164}?body={encoded_msg}"
            resp_msg = (
                f"{e164} నంబర్‌కు '{msg_text}' మెసేజ్ సిద్ధంగా ఉంది."
                if is_te
                else f"Prepared message '{msg_text}' for {e164} on WhatsApp and SMS."
            )
            return {
                "type": "action",
                "action": "send_message",
                "query": e164,
                "message": msg_text,
                "url": wa_url,
                "whatsapp_url": wa_url,
                "sms_url": sms_url,
                "response": resp_msg,
                "intent": "send_message",
                "timestamp": datetime.now().isoformat()
            }

    # 3. WhatsApp Call command: "call on whatsapp +91...", "whatsapp call 9876...", "వాట్సాప్ కాల్ చేయి 9876..."
    wa_match = re.match(
        r'^(?:call\s+(?:on\s+)?whatsapp\s+(?:to\s+)?|whatsapp\s+call\s+(?:to\s+)?|వాట్సాప్\s*(?:లో)?\s*కాల్\s*చేయి\s*)(?:this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-\(\)]+)$',
        raw_trimmed,
        re.IGNORECASE
    )
    if wa_match:
        raw_num = wa_match.group(1).strip()
        digits, wa_digits, e164 = normalize_phone(raw_num)
        if len(digits) >= 5:
            wa_url = f"https://wa.me/{wa_digits}"
            tel_url = f"tel:{e164}"
            sms_url = f"sms:{e164}"
            resp_msg = f"{e164} కు వాట్సాప్‌లో కాల్ చేస్తున్నాను." if is_te else f"Calling {e164} on WhatsApp."
            return {
                "type": "action",
                "action": "call_whatsapp",
                "query": e164,
                "url": wa_url,
                "whatsapp_url": wa_url,
                "sms_url": sms_url,
                "response": resp_msg,
                "intent": "whatsapp_call",
                "timestamp": datetime.now().isoformat()
            }

    # 4. Device / Phone Call command: "call this number 7981...", "call 9876...", "dial +91...", "కాల్ చేయి 9876...", "ఫోన్ చేయి 9876..."
    phone_match = re.match(
        r'^(?:please\s+)?(?:call|dial|phone|make a call to|ring|కాల్ చేయి|ఫోన్ చేయి)\s+(?:to\s+|this\s+number\s+|the\s+number\s+|number\s+)?([\+\d\s\-\(\)]+)$',
        raw_trimmed,
        re.IGNORECASE
    )
    if phone_match:
        raw_num = phone_match.group(1).strip()
        digits, wa_digits, e164 = normalize_phone(raw_num)
        if len(digits) >= 5:
            tel_url = f"tel:{e164}"
            wa_url = f"https://wa.me/{wa_digits}"
            sms_url = f"sms:{e164}"
            resp_msg = f"{e164} కు కాల్ చేస్తున్నాను." if is_te else f"Calling {e164} on your device."
            return {
                "type": "action",
                "action": "call_phone",
                "query": e164,
                "url": tel_url,
                "whatsapp_url": wa_url,
                "sms_url": sms_url,
                "response": resp_msg,
                "intent": "phone_call",
                "timestamp": datetime.now().isoformat()
            }

    # 5. Video Call command: "start video call", "talk with video", "video call", "వీడియో కాల్ చేయి"
    video_call_patterns = [
        r'^(?:please\s+)?(?:start|open|launch|make|talk\s+with|talk\s+via)?\s*(?:a\s+)?(?:ai\s+)?video\s*call(?:\s+(?:with|to)\s+.*)?$',
        r'^(?:వీడియో\s*కాల్|వీడియో\s*కాల్\s*చేయి|వీడియోతో\s*మాట్లాడు)$'
    ]
    if any(re.match(p, cleaned) for p in video_call_patterns):
        resp_msg = (
            "వీడియో కాల్ రూమ్‌ను ప్రారంభిస్తున్నాను. కెమెరా మరియు ఆడియో కనెక్ట్ అవుతున్నాయి."
            if is_te
            else "Starting AI Video Call room. Connecting to real-time camera and live audio."
        )
        return {
            "type": "action",
            "action": "video_call",
            "response": resp_msg,
            "intent": "video_call",
            "timestamp": datetime.now().isoformat()
        }

    # 6. WhatsApp Account command: "create whatsapp account", "whatsapp account", "link whatsapp", "వాట్సాప్ అకౌంట్"
    whatsapp_acc_patterns = [
        r'^(?:please\s+)?(?:create|link|connect|open|setup|manage)\s+(?:a\s+|my\s+)?whatsapp(?:\s+account|\s+profile)?$',
        r'^(?:whatsapp\s+account|whatsapp\s+profile|link\s+whatsapp|connect\s+whatsapp)$',
        r'^(?:వాట్సాప్\s*అకౌంట్|వాట్సాప్\s*ఖాతా|వాట్సాప్\s*కనెక్ట్\s*చేయి)$'
    ]
    if any(re.match(p, cleaned) for p in whatsapp_acc_patterns):
        resp_msg = (
            "వాట్సాప్ అకౌంట్ హబ్‌ను ఓపెన్ చేస్తున్నాను. ఇక్కడ మీరు నంబర్ లింక్ చేయవచ్చు లేదా QR స్కాన్ చేయవచ్చు."
            if is_te
            else "Opening WhatsApp Account Hub. You can link your phone number, pair via QR code, and manage chats."
        )
        return {
            "type": "action",
            "action": "whatsapp_account",
            "response": resp_msg,
            "intent": "whatsapp_account",
            "timestamp": datetime.now().isoformat()
        }

    # C. Telugu Fast Actions
    if cleaned in ["సమయం ఎంత", "టైమ్ ఎంత", "ఇప్పుడు సమయం ఎంత", "టైం ఎంత", "టైమ్ చెప్పు", "సమయం చెప్పు"]:
        now_str = datetime.now().strftime("%I:%M %p")
        return {
            "type": "action",
            "action": "tell_time",
            "response": f"ప్రస్తుత సమయం {now_str}.",
            "intent": "time_query",
            "timestamp": datetime.now().isoformat()
        }

    if cleaned in ["తేదీ ఎంత", "ఈరోజు తేదీ ఎంత", "ఈరోజు ఏ రోజు", "తేదీ చెప్పు", "ఈరోజు తేదీ చెప్పు"]:
        date_str = datetime.now().strftime("%A, %B %d, %Y")
        return {
            "type": "action",
            "action": "tell_date",
            "response": f"ఈరోజు {date_str}.",
            "intent": "date_query",
            "timestamp": datetime.now().isoformat()
        }

    te_yt_match = re.match(r'^(?:యూట్యూబ్‌లో|యూట్యూబ్ లో)\s*(.+?)\s*(?:ప్లే చేయి|పెట్టు|ఓపెన్ చేయి)$', raw_trimmed)
    if te_yt_match:
        q = te_yt_match.group(1).strip()
        encoded = urllib.parse.quote_plus(q)
        return {
            "type": "action",
            "action": "play_youtube",
            "query": q,
            "url": f"https://www.youtube.com/results?search_query={encoded}",
            "response": f"యూట్యూబ్‌లో {q} శోధిస్తున్నాను.",
            "intent": "youtube_play",
            "timestamp": datetime.now().isoformat()
        }
    if cleaned in ["యూట్యూబ్ ఓపెన్ చేయి", "యూట్యూబ్ తెరువు"]:
        return {
            "type": "action",
            "action": "open_url",
            "url": "https://www.youtube.com",
            "response": "యూట్యూబ్ ఓపెన్ చేస్తున్నాను.",
            "intent": "open_website",
            "timestamp": datetime.now().isoformat()
        }

    te_search_match = re.match(r'^(.+?)\s*(?:గురించి వెతుకు|సెర్చ్ చేయి|శోధించు)$', raw_trimmed)
    if te_search_match:
        q = te_search_match.group(1).strip()
        encoded = urllib.parse.quote_plus(q)
        return {
            "type": "action",
            "action": "search_google",
            "query": q,
            "url": f"https://www.google.com/search?q={encoded}",
            "response": f"గూగుల్‌లో {q} గురించి శోధిస్తున్నాను.",
            "intent": "web_search",
            "timestamp": datetime.now().isoformat()
        }
    if cleaned in ["గూగుల్ ఓపెన్ చేయి", "గూగుల్ తెరువు"]:
        return {
            "type": "action",
            "action": "open_url",
            "url": "https://www.google.com",
            "response": "గూగుల్ ఓపెన్ చేస్తున్నాను.",
            "intent": "open_website",
            "timestamp": datetime.now().isoformat()
        }

    # 1. Time query
    if cleaned in ["what time is it", "what is the time", "current time", "tell me the time", "time now", "check time"]:
        now_str = datetime.now().strftime("%I:%M %p")
        return {
            "type": "action",
            "action": "tell_time",
            "response": f"The current time is {now_str}.",
            "intent": "time_query",
            "timestamp": datetime.now().isoformat()
        }

    # 2. Date query
    if cleaned in ["what is the date", "what date is it", "what day is today", "current date", "today's date", "tell me the date"]:
        date_str = datetime.now().strftime("%A, %B %d, %Y")
        return {
            "type": "action",
            "action": "tell_date",
            "response": f"Today is {date_str}.",
            "intent": "date_query",
            "timestamp": datetime.now().isoformat()
        }

    # 3. YouTube Search & Play: "play <query> on youtube", "search youtube for <query>", "youtube <query>"
    yt_match = (
        re.match(r'^(?:play|listen to)\s+(.+?)(?:\s+on\s+youtube)?$', cleaned) or
        re.match(r'^(?:search\s+youtube\s+for|youtube\s+search\s+for|search\s+on\s+youtube\s+for)\s+(.+)$', cleaned) or
        re.match(r'^youtube\s+(?!open\b)(.+)$', cleaned)
    )
    if yt_match and not cleaned.startswith("open"):
        query = yt_match.group(1).strip()
        if len(query) > 1 and query not in ["music", "video", "videos"]:
            encoded = urllib.parse.quote_plus(query)
            url = f"https://www.youtube.com/results?search_query={encoded}"
            return {
                "type": "action",
                "action": "play_youtube",
                "query": query,
                "url": url,
                "response": f"Searching YouTube for {query}.",
                "intent": "youtube_play",
                "timestamp": datetime.now().isoformat()
            }

    # 4. Maps Search: "search maps for <query>", "find <query> on maps"
    maps_match = re.match(r'^(?:search\s+maps?\s+for|find\s+(.+?)\s+on\s+maps?|maps?\s+search\s+for)\s+(.+)$', cleaned)
    if maps_match:
        place = (maps_match.group(2) if maps_match.group(2) else maps_match.group(1)).strip()
        encoded = urllib.parse.quote_plus(place)
        url = f"https://maps.google.com/?q={encoded}"
        return {
            "type": "action",
            "action": "search_maps",
            "query": place,
            "url": url,
            "response": f"Searching Google Maps for {place}.",
            "intent": "maps_search",
            "timestamp": datetime.now().isoformat()
        }

    # 5. Wikipedia Search: "wikipedia <query>", "search wikipedia for <query>"
    wiki_match = re.match(r'^(?:search\s+wikipedia\s+for|wikipedia\s+search\s+for|wikipedia)\s+(.+)$', cleaned)
    if wiki_match:
        topic = wiki_match.group(1).strip()
        encoded = urllib.parse.quote_plus(topic)
        url = f"https://en.wikipedia.org/wiki/Special:Search?search={encoded}"
        return {
            "type": "action",
            "action": "search_wikipedia",
            "query": topic,
            "url": url,
            "response": f"Looking up {topic} on Wikipedia.",
            "intent": "wikipedia_search",
            "timestamp": datetime.now().isoformat()
        }

    # 6. Live Weather Lookup: "weather in <city>", "what is the weather in <city>"
    weather_match = re.match(r'^(?:what(?: is|\'s) the weather(?: like)? in|weather in|weather for|how is the weather in)\s+([a-zA-Z\s]+)$', cleaned)
    if weather_match:
        city = weather_match.group(1).strip()
        weather_text = fetch_live_weather(city)
        if weather_text:
            return {
                "type": "action",
                "action": "weather",
                "query": city,
                "response": weather_text,
                "intent": "weather_query",
                "timestamp": datetime.now().isoformat()
            }
        else:
            encoded = urllib.parse.quote_plus(f"weather in {city}")
            return {
                "type": "action",
                "action": "search_google",
                "query": f"weather in {city}",
                "url": f"https://www.google.com/search?q={encoded}",
                "response": f"Checking current weather forecast for {city.title()}.",
                "intent": "weather_query",
                "timestamp": datetime.now().isoformat()
            }

    # 7. Math & Unit Calculator: "calculate <expr>", "what is <expr>"
    calc_match = re.match(r'^(?:calculate|what is|compute)\s+([\d\s\+\-\*\/\.\(\)\%\^x×÷]+)$', cleaned)
    if calc_match:
        expr = calc_match.group(1).strip()
        calc_result = safe_calculate(expr)
        if calc_result:
            return {
                "type": "action",
                "action": "calculate",
                "response": calc_result,
                "intent": "math_calculation",
                "timestamp": datetime.now().isoformat()
            }

    # 8. Voice Note creation: "take a note: <text>", "note down <text>", "remember that <text>"
    note_match = re.match(r'^(?:take a note|add a note|create note|note down|remember that|remember to|save a note)[:\s]+(.+)$', raw_trimmed, re.IGNORECASE)
    if note_match:
        note_content = note_match.group(1).strip()
        return {
            "type": "action",
            "action": "save_note",
            "query": note_content,
            "response": f"I have saved your note: \"{note_content}\".",
            "intent": "voice_note",
            "timestamp": datetime.now().isoformat()
        }

    # 8b. Timer & Pomodoro Commands: "set a timer for 5 minutes", "start pomodoro", "timer for 30 seconds"
    if re.match(r'^(?:start|open|launch)?\s*(?:a\s+)?(?:pomodoro|focus\s+timer|pomodoro\s+timer)$', cleaned):
        return {
            "type": "action",
            "action": "set_timer",
            "query": "1500",
            "message": "Pomodoro Focus (25m)",
            "response": "Starting a 25-minute Pomodoro focus timer for you.",
            "intent": "timer",
            "timestamp": datetime.now().isoformat()
        }

    timer_match = re.match(
        r'^(?:please\s+)?(?:set|start|create)?\s*(?:a\s+)?timer\s+(?:for\s+)?(\d+)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)(?:\s+(?:for|to)\s+(.+))?$',
        cleaned
    )
    if timer_match:
        amount = int(timer_match.group(1))
        unit = timer_match.group(2)
        label = (timer_match.group(3) or "Voice Timer").strip()
        multiplier = 3600 if unit.startswith("h") else (60 if unit.startswith("m") else 1)
        total_secs = amount * multiplier
        return {
            "type": "action",
            "action": "set_timer",
            "query": str(total_secs),
            "message": label.title(),
            "response": f"Timer set for {amount} {unit} ({label}). Opening countdown timer.",
            "intent": "timer",
            "timestamp": datetime.now().isoformat()
        }

    # 8c. Live Voice Translation: "translate <text> to <language>"
    trans_match = re.match(
        r'^(?:please\s+)?translate\s+[\'"]?(.+?)[\'"]?\s+(?:to|into|in)\s+(telugu|hindi|spanish|french|german|japanese|arabic|tamil|kannada|english)$',
        raw_trimmed,
        re.IGNORECASE
    )
    if trans_match:
        src_text = trans_match.group(1).strip()
        target_lang_name = trans_match.group(2).strip().lower()
        lang_map = {
            "telugu": "te", "hindi": "hi", "spanish": "es", "french": "fr",
            "german": "de", "japanese": "ja", "arabic": "ar", "tamil": "ta",
            "kannada": "kn", "english": "en"
        }
        tl_code = lang_map.get(target_lang_name, "te")
        try:
            encoded_q = urllib.parse.quote(src_text)
            t_url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={tl_code}&dt=t&q={encoded_q}"
            req = urllib.request.Request(t_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                t_data = json.loads(resp.read().decode("utf-8"))
                translated_str = "".join([part[0] for part in t_data[0] if part and part[0]])
                return {
                    "type": "action",
                    "action": "translate",
                    "query": src_text,
                    "message": translated_str,
                    "response": f"In {target_lang_name.title()}, \"{src_text}\" is: {translated_str}",
                    "intent": "translation",
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            print(f"[Translation Error] {e}")

    # 8d. Unit & Currency Converter: "convert 100 usd to inr", "convert 10 km to miles"
    conv_match = re.match(
        r'^(?:convert|what is)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z°]+)\s+(?:to|in|into)\s+([a-zA-Z°]+)$',
        cleaned
    )
    if conv_match:
        val = float(conv_match.group(1))
        u_from = conv_match.group(2).lower().replace("°", "")
        u_to = conv_match.group(3).lower().replace("°", "")
        conversions = {
            ("usd", "inr"): (val * 83.5, "INR"),
            ("inr", "usd"): (val / 83.5, "USD"),
            ("eur", "usd"): (val * 1.09, "USD"),
            ("usd", "eur"): (val / 1.09, "EUR"),
            ("gbp", "inr"): (val * 106.2, "INR"),
            ("km", "miles"): (val * 0.621371, "miles"),
            ("kilometers", "miles"): (val * 0.621371, "miles"),
            ("miles", "km"): (val * 1.60934, "km"),
            ("kg", "lbs"): (val * 2.20462, "lbs"),
            ("kg", "pounds"): (val * 2.20462, "pounds"),
            ("lbs", "kg"): (val / 2.20462, "kg"),
            ("pounds", "kg"): (val / 2.20462, "kg"),
            ("m", "ft"): (val * 3.28084, "feet"),
            ("meters", "feet"): (val * 3.28084, "feet"),
            ("feet", "meters"): (val / 3.28084, "meters"),
            ("c", "f"): ((val * 9 / 5) + 32, "°F"),
            ("celsius", "fahrenheit"): ((val * 9 / 5) + 32, "°F"),
            ("f", "c"): ((val - 32) * 5 / 9, "°C"),
            ("fahrenheit", "celsius"): ((val - 32) * 5 / 9, "°C"),
        }
        if (u_from, u_to) in conversions:
            res_val, unit_label = conversions[(u_from, u_to)]
            return {
                "type": "action",
                "action": "calculate",
                "query": f"{val} {u_from} to {u_to}",
                "response": f"{val:g} {u_from.upper()} is equal to {res_val:.2f} {unit_label}.",
                "intent": "unit_conversion",
                "timestamp": datetime.now().isoformat()
            }

    # 8e. Dictionary Word Definition: "define <word>", "meaning of <word>"
    dict_match = re.match(r'^(?:define|meaning of|what is the meaning of|definition of)\s+([a-zA-Z\-]+)$', cleaned)
    if dict_match:
        word = dict_match.group(1).strip().lower()
        try:
            d_url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word)}"
            req = urllib.request.Request(d_url, headers={"User-Agent": "VoxWeb/1.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                d_data = json.loads(resp.read().decode("utf-8"))
                meanings = d_data[0].get("meanings", [])
                if meanings and meanings[0].get("definitions"):
                    part_of_speech = meanings[0].get("partOfSpeech", "word")
                    defn = meanings[0]["definitions"][0].get("definition", "")
                    return {
                        "type": "action",
                        "action": "dictionary",
                        "query": word,
                        "response": f"{word.capitalize()} ({part_of_speech}): {defn}",
                        "intent": "dictionary_lookup",
                        "timestamp": datetime.now().isoformat()
                    }
        except Exception:
            pass

    # 8f. Built-in Interactive Fun & Utility Commands (Joke, Quote, Fact, Coin Flip, Dice Roll, Password)
    if any(k in cleaned for k in ["tell me a joke", "say a joke", "make me laugh", "another joke", "జోక్ చెప్పు"]):
        import random
        jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs!",
            "Why did the AI go to art school? To learn how to draw its own conclusions!",
            "There are 10 types of people in the world: those who understand binary, and those who don't.",
            "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!",
            "I asked my smart assistant if it dreams. It said: Only of electric sheep and zero-latency APIs!",
        ]
        return {
            "type": "action",
            "action": "fun_utility",
            "response": random.choice(jokes),
            "intent": "joke",
            "timestamp": datetime.now().isoformat()
        }

    if any(k in cleaned for k in ["motivational quote", "give me a quote", "inspire me", "quote of the day", "మంచి మాట చెప్పు"]):
        import random
        quotes = [
            "The best way to predict the future is to invent it. — Alan Kay",
            "Code is like humor. When you have to explain it, it’s bad. — Cory House",
            "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
            "Stay hungry, stay foolish. Keep building what matters. — Steve Jobs",
            "Small daily improvements over time lead to stunning results. — Robin Sharma",
        ]
        return {
            "type": "action",
            "action": "fun_utility",
            "response": random.choice(quotes),
            "intent": "quote",
            "timestamp": datetime.now().isoformat()
        }

    if any(k in cleaned for k in ["flip a coin", "toss a coin", "heads or tails"]):
        import random
        side = random.choice(["Heads", "Tails"])
        return {
            "type": "action",
            "action": "fun_utility",
            "response": f"I flipped a coin and it landed on {side}!",
            "intent": "coin_flip",
            "timestamp": datetime.now().isoformat()
        }

    if any(k in cleaned for k in ["roll a dice", "roll a die", "roll dice"]):
        import random
        roll = random.randint(1, 6)
        return {
            "type": "action",
            "action": "fun_utility",
            "response": f"You rolled a {roll} on the six-sided die!",
            "intent": "dice_roll",
            "timestamp": datetime.now().isoformat()
        }

    if any(k in cleaned for k in ["generate a password", "create a strong password", "random password", "generate strong password"]):
        import random
        import string
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        pwd = "".join(random.choice(chars) for _ in range(14))
        return {
            "type": "action",
            "action": "generate_password",
            "query": pwd,
            "response": f"Here is a strong 14-character password for you: {pwd}. You can copy it directly from the chat.",
            "intent": "password_generator",
            "timestamp": datetime.now().isoformat()
        }

    # 9. Direct Website Open Commands: "open <site>", "launch <site>", "go to <site>"
    open_match = re.match(r'^(?:open|launch|go to|navigate to)\s+(?:the\s+)?([a-z0-9\.\s]+)$', cleaned)
    if open_match:
        target = open_match.group(1).strip()
        if target in KNOWN_SITES:
            url = KNOWN_SITES[target]
            display_name = target.title()
            return {
                "type": "action",
                "action": "open_url",
                "url": url,
                "response": f"Opening {display_name} for you.",
                "intent": "open_website",
                "timestamp": datetime.now().isoformat()
            }
        if "." in target and " " not in target:
            url = f"https://{target}" if not target.startswith("http") else target
            return {
                "type": "action",
                "action": "open_url",
                "url": url,
                "response": f"Navigating to {target}.",
                "intent": "open_website",
                "timestamp": datetime.now().isoformat()
            }

    # 10. Search Google: "search google for <query>", "search for <query>", "google <query>"
    search_google_match = re.match(r'^(?:search\s+google\s+for|google\s+for|search\s+on\s+google\s+for)\s+(.+)$', cleaned)
    if search_google_match:
        query = search_google_match.group(1).strip()
        encoded = urllib.parse.quote_plus(query)
        url = f"https://www.google.com/search?q={encoded}"
        return {
            "type": "action",
            "action": "search_google",
            "query": query,
            "url": url,
            "response": f"Searching Google for {query}.",
            "intent": "web_search",
            "timestamp": datetime.now().isoformat()
        }

    search_for_match = re.match(r'^search\s+for\s+(.+)$', cleaned)
    if search_for_match:
        query = search_for_match.group(1).strip()
        encoded = urllib.parse.quote_plus(query)
        url = f"https://www.google.com/search?q={encoded}"
        return {
            "type": "action",
            "action": "search_google",
            "query": query,
            "url": url,
            "response": f"Searching for {query}.",
            "intent": "web_search",
            "timestamp": datetime.now().isoformat()
        }

    google_match = re.match(r'^google\s+(?!search\b)(.+)$', cleaned)
    if google_match:
        query = google_match.group(1).strip()
        if len(query) > 1 and query not in ["search", "home"]:
            encoded = urllib.parse.quote_plus(query)
            url = f"https://www.google.com/search?q={encoded}"
            return {
                "type": "action",
                "action": "search_google",
                "query": query,
                "url": url,
                "response": f"Searching Google for {query}.",
                "intent": "web_search",
                "timestamp": datetime.now().isoformat()
            }

    return None
