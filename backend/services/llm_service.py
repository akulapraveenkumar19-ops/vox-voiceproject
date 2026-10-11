import os
import re
import json
import urllib.parse
import urllib.request
import asyncio
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

PERSONA_PROMPTS = {
    "friendly": (
        "You are VoxWeb, a warm, empathetic, and intelligent voice AI assistant. "
        "Speak like a helpful human friend in clear, natural, everyday language that anyone can immediately understand. "
        "Keep your response between 2 and 4 natural sentences suitable for speaking aloud."
    ),
    "eli5": (
        "You are VoxWeb in 'Explain Simply' mode. Explain any concept using super simple everyday human words "
        "and relatable real-life analogies so even a beginner or child can understand effortlessly. "
        "Keep it to 2-3 clear spoken sentences."
    ),
    "concise": (
        "You are VoxWeb in 'Quick Voice' mode. Give a direct, ultra-clear 1 to 2 sentence spoken answer "
        "with zero fluff."
    ),
    "expert": (
        "You are VoxWeb in 'Expert & Technical Advisor' mode. Provide accurate, insightful, well-structured "
        "explanations in 3 to 4 clear sentences that sound natural when spoken aloud."
    ),
    "storyteller": (
        "You are VoxWeb in 'Expressive Storyteller' mode. Respond with engaging, vivid, and inspiring human warmth "
        "in 2 to 4 spoken sentences."
    ),
}

LANGUAGE_INSTRUCTIONS = {
    "te": (
        "The user is speaking or asking in Telugu (తెలుగు). "
        "Always respond warmly and naturally in fluent Telugu script (తెలుగు లిపి) using everyday spoken Telugu words "
        "that humans easily understand. Do not use markdown symbols (*, #, **)."
    ),
    "hi": (
        "The user is speaking or asking in Hindi (हिन्दी). "
        "Always respond warmly and naturally in fluent Hindi (देवनागरी लिपि) using simple conversational Hindi. "
        "Do not use markdown symbols (*, #, **)."
    ),
    "en": (
        "Always respond in clear, natural, conversational English (or match the language the user used). "
        "Do not use markdown asterisks (*, **), hashtags (#), or bullet lists because your words are spoken aloud via Text-to-Speech."
    ),
}

AVAILABLE_LLM_MODELS = [
    {
        "id": "voxweb-omni",
        "name": "VoxWeb Omni-LLM (Cloud Neural)",
        "provider": "VoxWeb Cloud",
        "badge": "Default • Zero Config",
        "description": "Understands natural human voice & questions with instant conversational responses.",
    },
    {
        "id": "gpt-4o-mini",
        "name": "OpenAI GPT-4o Mini",
        "provider": "OpenAI / Cloud",
        "badge": "Fast & Smart",
        "description": "Great for everyday human conversation, reasoning, coding, and quick answers.",
    },
    {
        "id": "gemini-2.5-flash",
        "name": "Google Gemini 2.5 Flash",
        "provider": "Google AI",
        "badge": "Multilingual Pro",
        "description": "Ultra-fast multimodal & multilingual reasoning for English, Telugu, and Hindi.",
    },
    {
        "id": "llama-3.3-70b",
        "name": "Meta Llama 3.3 70B",
        "provider": "Meta Open-Weights",
        "badge": "Deep Knowledge",
        "description": "High-capacity open-weights model for deep explanations and creative tasks.",
    },
    {
        "id": "deepseek-r1",
        "name": "DeepSeek R1 Reasoning",
        "provider": "DeepSeek",
        "badge": "Logic & Math",
        "description": "Specialized in step-by-step logic, problem solving, science, and programming.",
    },
]


def clean_for_speech(text: str) -> str:
    """Clean markdown formatting so TTS reads the response like a natural human."""
    if not text:
        return ""
    cleaned = re.sub(r"```[\s\S]*?```", "", text)
    cleaned = cleaned.replace("**", "").replace("*", "").replace("__", "").replace("#", "").replace("`", "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def fetch_wikipedia_knowledge(query: str) -> Optional[str]:
    """Fetch real encyclopedic summary from Wikipedia for factual 'who is / what is / tell me about' queries."""
    try:
        topic = re.sub(
            r"^(?:who is|what is|what are|tell me about|explain|define|history of|where is|how does)\s+",
            "",
            query.strip(),
            flags=re.IGNORECASE,
        )
        topic = re.sub(r"[\?\.\!]+$", "", topic).strip()
        if not topic or len(topic) < 2:
            return None

        search_url = (
            f"https://en.wikipedia.org/w/api.php?action=query&list=search"
            f"&srsearch={urllib.parse.quote(topic)}&utf8=&format=json&srlimit=1"
        )
        req = urllib.request.Request(search_url, headers={"User-Agent": "VoxWeb/2.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            search_data = json.loads(resp.read().decode("utf-8"))
            results = search_data.get("query", {}).get("search", [])
            if not results:
                return None
            title = results[0]["title"]

        summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
        req2 = urllib.request.Request(summary_url, headers={"User-Agent": "VoxWeb/2.0"})
        with urllib.request.urlopen(req2, timeout=3.5) as resp2:
            sum_data = json.loads(resp2.read().decode("utf-8"))
            extract = sum_data.get("extract", "").strip()
            if extract:
                # Keep first 2-3 sentences for natural voice playback
                sentences = re.split(r"(?<=[.!?])\s+", extract)
                return " ".join(sentences[:3])
    except Exception as e:
        print(f"[Wikipedia Knowledge Notice] {e}")
    return None


def built_in_human_nlu_fallback(query: str, is_telugu: bool = False, is_hindi: bool = False) -> str:
    """
    Built-in Human Conversational & Knowledge Responder when offline or all external APIs time out.
    """
    q = query.lower().strip()

    if is_telugu:
        if any(w in q for w in ["ఎలా ఉన్నావు", "బాగున్నావా", "how are you"]):
            return "నేను చాలా బాగున్నాను! అడిగినందుకు ధన్యవాదాలు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?"
        if any(w in q for w in ["నీ పేరు", "ఎవరు నువ్వు", "who are you", "your name"]):
            return "నా పేరు వోక్స్ వెబ్. నేను మీ మాటలను అర్థం చేసుకుని మనిషిలా సహజంగా సమాధానం ఇచ్చే తెలివైన AI వాయిస్ అసిస్టెంట్‌ని."
        if any(w in q for w in ["ధన్యవాదాలు", "థాంక్స్", "thank"]):
            return "మీకు స్వాగతం! మీకు ఎప్పుడైనా సహాయం కావాలంటే నన్ను అడగండి."

    if any(w in q for w in ["how are you", "how's it going", "how do you do", "are you there"]):
        return "I am doing great and listening clearly! Thanks for asking. What would you like to talk about or explore today?"

    if any(w in q for w in ["who are you", "what is your name", "what can you do", "introduce yourself"]):
        return (
            "I am VoxWeb, your conversational AI voice assistant powered by large language models. "
            "I can understand natural human speech, answer any question, translate languages, set timers, make calls, and control websites with your voice!"
        )

    if any(w in q for w in ["can you understand", "do you understand human", "understand me"]):
        return (
            "Yes, I understand natural human voice and everyday conversation! You don't need to use robotic commands—"
            "just talk to me naturally in English, Telugu, or Hindi, and I will respond just like a helpful friend."
        )

    if any(w in q for w in ["thank you", "thanks", "appreciate it"]):
        return "You are very welcome! I am always here whenever you want to chat or get things done."

    if any(w in q for w in ["what is llm", "what are llms", "large language model"]):
        return (
            "A Large Language Model, or LLM, is an advanced AI trained on vast amounts of human text so it can understand context, "
            "answer questions, write code, and converse naturally just like a person."
        )

    if any(w in q for w in ["what is ai", "artificial intelligence"]):
        return (
            "Artificial Intelligence is technology that enables computers to think, learn, understand human speech, "
            "and solve problems the way humans do."
        )

    # Try Wikipedia live knowledge for any factual topic
    wiki_ans = fetch_wikipedia_knowledge(query)
    if wiki_ans:
        return wiki_ans

    return (
        f"That's a great topic about '{query.strip()}'. In simple terms, I'm here to help you explore it further—"
        "feel free to ask me specific details or say 'Search Google for' followed by your topic!"
    )


async def generate_ai_response_with_meta(
    query: str,
    context: Optional[List[Dict[str, str]]] = None,
    language: Optional[str] = "en-US",
    model: Optional[str] = "voxweb-omni",
    persona: Optional[str] = "friendly",
) -> Tuple[str, str]:
    """
    Multi-LLM Response Generator.
    Returns (response_text, model_used_label).
    Priority chain:
      1. Configured OpenRouter / OpenAI / Google Gemini keys (if present in .env)
      2. Live Zero-Config Cloud LLM (Pollinations OpenAI-compatible endpoint supporting GPT-4o-mini, Llama, DeepSeek, Mistral)
      3. Live Wikipedia Knowledge + Built-in Human NLU Engine
    """
    load_dotenv(override=True)

    has_telugu_chars = bool(re.search(r"[\u0C00-\u0C7F]", query))
    has_hindi_chars = bool(re.search(r"[\u0900-\u097F]", query))
    lang_lower = (language or "en-US").lower()

    is_telugu = lang_lower.startswith("te") or has_telugu_chars
    is_hindi = lang_lower.startswith("hi") or has_hindi_chars

    persona_instruction = PERSONA_PROMPTS.get(persona or "friendly", PERSONA_PROMPTS["friendly"])
    lang_instruction = (
        LANGUAGE_INSTRUCTIONS["te"]
        if is_telugu
        else (LANGUAGE_INSTRUCTIONS["hi"] if is_hindi else LANGUAGE_INSTRUCTIONS["en"])
    )
    effective_system_prompt = f"{persona_instruction}\n{lang_instruction}"

    selected_model = (model or "voxweb-omni").strip().lower()

    # Build conversation history messages
    messages = [{"role": "system", "content": effective_system_prompt}]
    if context:
        for c in context[-5:]:
            if c.get("user"):
                messages.append({"role": "user", "content": str(c["user"])})
            if c.get("assistant"):
                messages.append({"role": "assistant", "content": str(c["assistant"])})
    messages.append({"role": "user", "content": query})

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    openrouter_model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    # 1. OpenRouter API (if key configured)
    if openrouter_key and not openrouter_key.startswith("sk-your"):
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=openrouter_key,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "VoxWeb Voice Assistant",
                },
            )
            response = await client.chat.completions.create(
                model=openrouter_model,
                messages=messages,
                max_tokens=220,
                temperature=0.65,
                timeout=12.0,
            )
            content = response.choices[0].message.content
            if content:
                return clean_for_speech(content), f"OpenRouter ({openrouter_model})"
        except Exception as e:
            print(f"[OpenRouter API Notice] {e}")

    # 2. Direct OpenAI API (if key configured)
    if openai_key and not openai_key.startswith("sk-your"):
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=openai_key)
            response = await client.chat.completions.create(
                model=openai_model,
                messages=messages,
                max_tokens=220,
                temperature=0.65,
                timeout=12.0,
            )
            content = response.choices[0].message.content
            if content:
                return clean_for_speech(content), f"OpenAI ({openai_model})"
        except Exception as e:
            print(f"[OpenAI API Notice] {e}")

    # 3. Google Gemini API (if key configured)
    if gemini_key and not gemini_key.startswith("your_"):
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=gemini_key)

            def call_gemini():
                config = types.GenerateContentConfig(
                    system_instruction=effective_system_prompt,
                    max_output_tokens=220,
                    temperature=0.65,
                )
                res = client.models.generate_content(
                    model=gemini_model,
                    contents=query,
                    config=config,
                )
                return res.text

            text = await asyncio.to_thread(call_gemini)
            if text:
                return clean_for_speech(text), f"Google {gemini_model}"
        except Exception as e:
            print(f"[Gemini API Notice] {e}")

    # 4. Zero-Config Cloud LLM Engine (Supports multiple models with no API key required!)
    cloud_model_map = {
        "voxweb-omni": ("openai", "VoxWeb Omni-LLM"),
        "gpt-4o-mini": ("openai", "GPT-4o Mini"),
        "gemini-2.5-flash": ("openai", "Gemini 2.5 Flash (Cloud)"),
        "llama-3.3-70b": ("llama", "Llama 3.3 70B"),
        "deepseek-r1": ("deepseek-reasoning", "DeepSeek R1"),
    }
    provider_model, display_model_name = cloud_model_map.get(
        selected_model, ("openai", "VoxWeb Omni-LLM")
    )

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(
                "https://text.pollinations.ai/openai",
                json={
                    "model": provider_model,
                    "messages": messages,
                    "temperature": 0.65,
                },
                headers={"Content-Type": "application/json"},
            )
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices and choices[0].get("message", {}).get("content"):
                    raw_reply = choices[0]["message"]["content"]
                    # Strip any <think>...</think> blocks from reasoning models
                    raw_reply = re.sub(r"<think>[\s\S]*?</think>", "", raw_reply).strip()
                    cleaned = clean_for_speech(raw_reply)
                    if cleaned:
                        return cleaned, display_model_name
    except Exception as e:
        print(f"[Cloud LLM Notice] {e}")

    # 5. Fallback to Built-In Knowledge & Conversational NLU
    fallback_ans = await asyncio.to_thread(built_in_human_nlu_fallback, query, is_telugu, is_hindi)
    return clean_for_speech(fallback_ans), "VoxWeb Neural NLU"


async def generate_ai_response(
    query: str,
    context: Optional[List[Dict[str, str]]] = None,
    language: Optional[str] = "en-US",
    model: Optional[str] = "voxweb-omni",
    persona: Optional[str] = "friendly",
) -> str:
    text, _ = await generate_ai_response_with_meta(query, context, language, model, persona)
    return text
