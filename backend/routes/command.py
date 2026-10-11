from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from db import db_manager
from models.schemas import CommandRequest, CommandResponse
from auth.jwt import get_current_user_optional
from services.command_router import process_fast_command
from services.llm_service import generate_ai_response_with_meta, AVAILABLE_LLM_MODELS

router = APIRouter(prefix="/api/command", tags=["Voice & Commands"])


@router.get("/models")
async def get_available_models():
    """Return available LLM models for the Voice AI Assistant."""
    return {"models": AVAILABLE_LLM_MODELS}


@router.post("", response_model=CommandResponse)
async def execute_command(
    payload: CommandRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Executes spoken or typed command.
    1. Custom Voice Shortcuts check.
    2. Fast Command Router evaluates direct actions (Website, Search, Time/Date, Timer, Translation).
    3. If not a fast command, routes to Multi-LLM AI service (VoxWeb Omni / GPT-4o-mini / Gemini / Llama / DeepSeek).
    4. Saves conversation history.
    """
    cmd = payload.command.strip()
    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Command cannot be empty."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    cmd_lower = cmd.lower().strip()

    # Step 0A: Check user's custom voice shortcuts
    try:
        shortcut_doc = await db_manager.shortcuts.find_one({
            "user_id": user_id,
            "trigger_phrase": cmd_lower
        })
        if shortcut_doc:
            urls = [u.strip() for u in shortcut_doc.get("target_value", "").split(",") if u.strip()]
            first_url = urls[0] if urls else None
            response_data = {
                "type": "action",
                "action": "custom_shortcut",
                "url": first_url,
                "query": shortcut_doc.get("target_value"),
                "response": shortcut_doc.get("response_speech", f"Executing shortcut {cmd}."),
                "timestamp": now_iso,
                "intent": "custom_shortcut",
                "model_used": "Fast Voice Macro"
            }
            await db_manager.conversations.insert_one({
                "user_id": user_id,
                "message": cmd,
                "response": response_data["response"],
                "command_type": "action",
                "action": "custom_shortcut",
                "url": first_url,
                "timestamp": now_iso
            })
            return response_data
    except Exception as se:
        print(f"[Shortcuts Check Notice] {se}")

    # Step 1: Fast Command Router
    fast_result = process_fast_command(cmd, payload.language)

    if fast_result is not None:
        if fast_result.get("action") == "save_note":
            try:
                note_content = fast_result.get("query", cmd)
                await db_manager.notes.insert_one({
                    "user_id": user_id,
                    "title": "Voice Reminder",
                    "content": note_content,
                    "completed": False,
                    "created_at": now_iso
                })
            except Exception as ne:
                print(f"[Notes DB Error] {ne}")

        response_data = {
            "type": "action",
            "action": fast_result.get("action"),
            "url": fast_result.get("url"),
            "whatsapp_url": fast_result.get("whatsapp_url"),
            "sms_url": fast_result.get("sms_url"),
            "message": fast_result.get("message"),
            "query": fast_result.get("query"),
            "response": fast_result.get("response", ""),
            "timestamp": now_iso,
            "intent": fast_result.get("intent"),
            "model_used": "Fast Action Router"
        }
    else:
        # Step 2: AI Question via Multi-LLM Service
        ai_text, model_used = await generate_ai_response_with_meta(
            cmd,
            payload.context,
            payload.language,
            payload.model,
            payload.persona,
        )
        response_data = {
            "type": "ai",
            "action": None,
            "url": None,
            "query": None,
            "response": ai_text,
            "timestamp": now_iso,
            "intent": "ai_query",
            "model_used": model_used
        }

    # Step 3: Record to conversation history
    try:
        await db_manager.conversations.insert_one({
            "user_id": user_id,
            "message": cmd,
            "response": response_data["response"],
            "command_type": response_data["type"],
            "action": response_data.get("action"),
            "url": response_data.get("url"),
            "model_used": response_data.get("model_used"),
            "timestamp": now_iso
        })
    except Exception as e:
        print(f"[DB] Error storing conversation: {e}")

    return response_data


@router.get("/history")
async def get_history(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Retrieve chat history for the authenticated or demo user."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    cursor = db_manager.conversations.find({"user_id": user_id}).sort("timestamp", -1).limit(100)
    items = await cursor.to_list(100)

    # Format documents with string ID
    results = []
    for item in items:
        results.append({
            "id": str(item.get("_id", "")),
            "user_id": str(item.get("user_id")),
            "message": item.get("message", ""),
            "response": item.get("response", ""),
            "command_type": item.get("command_type", "ai"),
            "action": item.get("action"),
            "url": item.get("url"),
            "model_used": item.get("model_used"),
            "timestamp": item.get("timestamp", "")
        })
    return {"history": results}


@router.delete("/history")
async def clear_history(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Clear all chat history for current user."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    res = await db_manager.conversations.delete_many({"user_id": user_id})
    return {"success": True, "deleted_count": getattr(res, "deleted_count", 0)}


@router.delete("/history/{item_id}")
async def delete_history_item(item_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Delete a specific conversation record."""
    res = await db_manager.conversations.delete_one({"_id": item_id})
    if getattr(res, "deleted_count", 0) == 0:
        from bson import ObjectId
        try:
            res = await db_manager.conversations.delete_one({"_id": ObjectId(item_id)})
        except Exception:
            pass
    return {"success": True}
