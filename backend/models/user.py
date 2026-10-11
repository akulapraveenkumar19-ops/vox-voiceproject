from datetime import datetime, timezone
from typing import Dict, Any, Optional


def user_helper(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id", "")),
        "name": user.get("name", "User"),
        "email": user.get("email", ""),
        "auth_provider": user.get("auth_provider", "email"),
        "profile_image": user.get("profile_image"),
        "created_at": user.get("created_at", datetime.now(timezone.utc).isoformat()),
        "account_type": user.get("account_type", "Voice Pro")
    }


def create_user_document(
    name: str,
    email: str,
    password_hash: Optional[str] = None,
    auth_provider: str = "email",
    google_id: Optional[str] = None,
    profile_image: Optional[str] = None
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "name": name,
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "auth_provider": auth_provider,
        "google_id": google_id,
        "profile_image": profile_image,
        "account_type": "Voice Pro",
        "created_at": now,
        "updated_at": now
    }
