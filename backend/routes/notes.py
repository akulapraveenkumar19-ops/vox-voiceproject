from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from db import db_manager
from models.schemas import NoteCreate, NoteUpdate, NoteResponse
from auth.jwt import get_current_user_optional

router = APIRouter(prefix="/api/notes", tags=["Voice Notes & Reminders"])


@router.get("", response_model=List[NoteResponse])
async def get_notes(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Retrieve all voice notes and reminders for the current user."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    cursor = db_manager.notes.find({"user_id": user_id}).sort("created_at", -1)
    notes_list = await cursor.to_list(100)
    results = []
    for note in notes_list:
        results.append({
            "id": str(note.get("_id", "")),
            "user_id": user_id,
            "title": note.get("title") or "Note",
            "content": note.get("content", ""),
            "completed": bool(note.get("completed", False)),
            "created_at": note.get("created_at", datetime.now(timezone.utc).isoformat())
        })
    return results


@router.post("", response_model=NoteResponse)
async def create_note(payload: NoteCreate, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Create a new note or reminder."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    now_iso = datetime.now(timezone.utc).isoformat()
    note_doc = {
        "user_id": user_id,
        "title": payload.title.strip() if payload.title else "Voice Note",
        "content": payload.content.strip(),
        "completed": False,
        "created_at": now_iso
    }
    insert_res = await db_manager.notes.insert_one(note_doc)
    note_id = str(insert_res.inserted_id)
    return {
        "id": note_id,
        "user_id": user_id,
        "title": note_doc["title"],
        "content": note_doc["content"],
        "completed": False,
        "created_at": now_iso
    }


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, payload: NoteUpdate, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Update or toggle completion of a note."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    existing = await db_manager.notes.find_one({"_id": note_id, "user_id": user_id})
    if not existing:
        existing = await db_manager.notes.find_one({"_id": note_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    update_fields = {}
    if payload.title is not None:
        update_fields["title"] = payload.title.strip()
    if payload.content is not None:
        update_fields["content"] = payload.content.strip()
    if payload.completed is not None:
        update_fields["completed"] = bool(payload.completed)

    if update_fields:
        await db_manager.notes.update_one(
            {"_id": note_id},
            {"$set": update_fields}
        )
        existing.update(update_fields)

    return {
        "id": str(existing.get("_id", note_id)),
        "user_id": user_id,
        "title": existing.get("title", "Voice Note"),
        "content": existing.get("content", ""),
        "completed": bool(existing.get("completed", False)),
        "created_at": existing.get("created_at", datetime.now(timezone.utc).isoformat())
    }


@router.delete("/{note_id}")
async def delete_note(note_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Delete a specific voice note."""
    await db_manager.notes.delete_one({"_id": note_id})
    return {"success": True, "message": "Note deleted successfully."}


@router.delete("")
async def clear_notes(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """Clear all completed voice notes."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    await db_manager.notes.delete_many({"user_id": user_id, "completed": True})
    return {"success": True, "message": "Completed notes cleared."}
