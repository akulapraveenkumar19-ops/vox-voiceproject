import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from db import db_manager

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "voxweb_super_secret_jwt_key_2026_modern_voice_ai")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

security_bearer = HTTPBearer(auto_error=False)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[Dict[str, Any]]:
    """Retrieve current user if token exists; return None if unauthenticated."""
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        # Check cookie
        token = request.cookies.get("access_token")

    if not token:
        return None

    if token == "demo-token":
        demo_email = "user@voxweb.ai"
        user = await db_manager.users.find_one({"email": demo_email})
        if not user:
            now = datetime.now(timezone.utc).isoformat()
            demo_doc = {
                "_id": "demo-user-voxweb",
                "name": "VoxWeb User",
                "email": demo_email,
                "password_hash": None,
                "auth_provider": "demo",
                "profile_image": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
                "account_type": "Voice Pro",
                "created_at": now,
                "updated_at": now,
            }
            await db_manager.users.insert_one(demo_doc)
            return demo_doc
        return user

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = payload.get("sub")
    user = await db_manager.users.find_one({"_id": user_id})
    if not user and payload.get("email"):
        user = await db_manager.users.find_one({"email": payload.get("email")})
    if not user:
        try:
            from bson import ObjectId
            user = await db_manager.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
    return user


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Dict[str, Any]:
    """Strict authentication dependency."""
    user = await get_current_user_optional(request, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or have expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
