import urllib.parse
import urllib.request
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from db import db_manager
from auth.jwt import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Smart Features"])


class ContactCreate(BaseModel):
    name: str
    phone_number: str
    country_code: Optional[str] = "+91"
    tag: Optional[str] = "Personal"
    is_favorite: Optional[bool] = False


class ShortcutCreate(BaseModel):
    trigger_phrase: str
    action_type: str  # "open_urls", "speak_text", "command"
    target_value: str
    response_speech: str


class TranslateRequest(BaseModel):
    text: str
    source_lang: Optional[str] = "auto"
    target_lang: str = "te"


DEFAULT_SHORTCUTS = [
    {
        "id": "default-morning",
        "trigger_phrase": "morning briefing",
        "action_type": "open_urls",
        "target_value": "https://mail.google.com, https://news.google.com",
        "response_speech": "Good morning! Opening your Gmail inbox and Google News briefing.",
    },
    {
        "id": "default-coding",
        "trigger_phrase": "coding mode",
        "action_type": "open_urls",
        "target_value": "https://github.com, https://leetcode.com, https://stackoverflow.com",
        "response_speech": "Activating coding mode! Launching GitHub, LeetCode, and StackOverflow.",
    },
    {
        "id": "default-relax",
        "trigger_phrase": "chill mode",
        "action_type": "open_urls",
        "target_value": "https://www.youtube.com/results?search_query=lofi+hip+hop+radio",
        "response_speech": "Starting chill mode with Lo-Fi beats on YouTube.",
    },
]


@router.get("/contacts")
async def get_contacts(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Retrieve saved speed-dial contacts for voice calling & messaging."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    cursor = db_manager.contacts.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(100)
    results = []
    for d in docs:
        results.append({
            "id": str(d.get("_id", "")),
            "name": d.get("name", ""),
            "phone_number": d.get("phone_number", ""),
            "country_code": d.get("country_code", "+91"),
            "tag": d.get("tag", "Personal"),
            "is_favorite": bool(d.get("is_favorite", False)),
            "created_at": d.get("created_at", ""),
        })
    return {"contacts": results}


@router.post("/contacts")
async def create_contact(
    payload: ContactCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Save a new speed-dial contact."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "phone_number": payload.phone_number.strip(),
        "country_code": (payload.country_code or "+91").strip(),
        "tag": (payload.tag or "Personal").strip(),
        "is_favorite": bool(payload.is_favorite),
        "created_at": now_iso,
    }
    res = await db_manager.contacts.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        **doc,
    }


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Delete a speed-dial contact."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    await db_manager.contacts.delete_one({"_id": contact_id, "user_id": user_id})
    return {"success": True}


@router.get("/shortcuts")
async def get_shortcuts(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Retrieve custom voice shortcuts/macros for the user."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    cursor = db_manager.shortcuts.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(100)
    custom_list = []
    for d in docs:
        custom_list.append({
            "id": str(d.get("_id", "")),
            "trigger_phrase": d.get("trigger_phrase", ""),
            "action_type": d.get("action_type", "open_urls"),
            "target_value": d.get("target_value", ""),
            "response_speech": d.get("response_speech", ""),
            "created_at": d.get("created_at", ""),
        })
    return {"shortcuts": custom_list if custom_list else DEFAULT_SHORTCUTS}


@router.post("/shortcuts")
async def create_shortcut(
    payload: ShortcutCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a custom voice macro/shortcut."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "trigger_phrase": payload.trigger_phrase.strip().lower(),
        "action_type": payload.action_type.strip(),
        "target_value": payload.target_value.strip(),
        "response_speech": payload.response_speech.strip(),
        "created_at": now_iso,
    }
    res = await db_manager.shortcuts.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        **doc,
    }


@router.delete("/shortcuts/{shortcut_id}")
async def delete_shortcut(
    shortcut_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Delete a custom voice shortcut."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    await db_manager.shortcuts.delete_one({"_id": shortcut_id, "user_id": user_id})
    return {"success": True}


def translate_text_live(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text using public translation endpoints with safe fallback."""
    try:
        sl = source_lang if source_lang and source_lang != "auto" else "auto"
        tl = target_lang.split("-")[0] if target_lang else "te"
        encoded = urllib.parse.quote(text.strip())
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={tl}&dt=t&q={encoded}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, list) and data[0]:
                translated_parts = [part[0] for part in data[0] if part and part[0]]
                if translated_parts:
                    return "".join(translated_parts)
    except Exception as e:
        print(f"[Translate API Notice] {e}")
    return text


@router.post("/translate")
async def translate_endpoint(payload: TranslateRequest):
    """Translate text into target language for voice output."""
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text cannot be empty.")
    translated = translate_text_live(payload.text.strip(), payload.source_lang or "auto", payload.target_lang)
    return {
        "original": payload.text.strip(),
        "translated": translated,
        "target_lang": payload.target_lang,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
