from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from db import db_manager
from models.schemas import UserProfileUpdate, ChangePasswordRequest, UserResponse
from models.user import user_helper
from auth.jwt import get_current_user
from auth.security import verify_password, hash_password

router = APIRouter(prefix="/api/users", tags=["User Profile"])


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update profile details (name, profile_image)."""
    user_id = current_user["_id"]
    updates = {}
    if payload.name is not None and payload.name.strip():
        updates["name"] = payload.name.strip()
    if payload.profile_image is not None:
        updates["profile_image"] = payload.profile_image.strip()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db_manager.users.update_one({"_id": user_id}, {"$set": updates})

    updated_user = await db_manager.users.find_one({"_id": user_id})
    return user_helper(updated_user or current_user)


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change user password after verifying current password."""
    # Check if user has password (google accounts may not have a password_hash initially)
    if current_user.get("password_hash"):
        if not verify_password(payload.current_password, current_user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password."
            )

    new_hash = hash_password(payload.new_password)
    await db_manager.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "password_hash": new_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Password updated successfully."}


@router.get("/stats")
async def get_user_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve usage statistics for user."""
    user_id = str(current_user["_id"])
    cursor = db_manager.conversations.find({"user_id": user_id})
    items = await cursor.to_list(1000)

    total_commands = len(items)
    ai_queries = sum(1 for i in items if i.get("command_type") == "ai")
    fast_actions = sum(1 for i in items if i.get("command_type") == "action")

    return {
        "total_commands": total_commands,
        "ai_queries": ai_queries,
        "fast_actions": fast_actions
    }
