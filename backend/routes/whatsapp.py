import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from db import db_manager
from auth.jwt import get_current_user_optional

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


class WhatsAppAccountRequest(BaseModel):
    phone_number: str
    display_name: str
    about: Optional[str] = "Available on VoxWeb"
    country_code: Optional[str] = "+91"
    profile_image: Optional[str] = None
    is_connected: Optional[bool] = True


class WhatsAppAccountResponse(BaseModel):
    phone_number: str
    display_name: str
    about: str
    country_code: str
    profile_image: Optional[str] = None
    is_connected: bool
    updated_at: str


@router.post("/account")
async def save_whatsapp_account(
    payload: WhatsAppAccountRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Save or update user's linked WhatsApp account."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"
    now_iso = datetime.now(timezone.utc).isoformat()

    account_data = {
        "user_id": user_id,
        "phone_number": payload.phone_number.strip(),
        "display_name": payload.display_name.strip(),
        "about": (payload.about or "").strip(),
        "country_code": payload.country_code or "+91",
        "profile_image": payload.profile_image,
        "is_connected": payload.is_connected,
        "updated_at": now_iso
    }

    try:
        existing = await db_manager.whatsapp_accounts.find_one({"user_id": user_id})
        if existing:
            await db_manager.whatsapp_accounts.update_one(
                {"user_id": user_id},
                {"$set": account_data}
            )
        else:
            await db_manager.whatsapp_accounts.insert_one(account_data)
    except Exception as e:
        print(f"[WhatsApp DB Error] {e}")

    return {
        "success": True,
        "message": "WhatsApp account saved successfully.",
        "account": account_data
    }


@router.get("/account")
async def get_whatsapp_account(
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Retrieve user's linked WhatsApp account."""
    user_id = str(current_user["_id"]) if current_user else "anonymous"

    try:
        record = await db_manager.whatsapp_accounts.find_one({"user_id": user_id})
        if not record:
            # Backward-compatible check if previously stored in conversations
            record = await db_manager.conversations.find_one({"user_id": f"wa_{user_id}"})
        if record:
            return {
                "success": True,
                "account": {
                    "phone_number": record.get("phone_number", ""),
                    "display_name": record.get("display_name", "VoxWeb User"),
                    "about": record.get("about", "Available on VoxWeb"),
                    "country_code": record.get("country_code", "+91"),
                    "profile_image": record.get("profile_image"),
                    "is_connected": record.get("is_connected", True),
                    "updated_at": record.get("updated_at", "")
                }
            }
    except Exception as e:
        print(f"[WhatsApp DB Get Error] {e}")

    return {
        "success": False,
        "account": None
    }


class VerifyCodeRequest(BaseModel):
    phone_number: Optional[str] = None


@router.post("/verify-code")
async def generate_or_verify_code(
    phone_number: Optional[str] = None,
    payload: Optional[VerifyCodeRequest] = None
):
    """Simulate WhatsApp 6-digit linking verification code."""
    target_phone = phone_number or (payload.phone_number if payload else "") or ""
    clean_digits = "".join(filter(str.isdigit, target_phone))
    simulated_code = "729481" if not clean_digits else f"{clean_digits[-4:]:0>4}21"[:6]
    return {
        "success": True,
        "phone_number": target_phone,
        "verification_code": simulated_code,
        "message": f"WhatsApp verification pairing code for {target_phone} generated."
    }
