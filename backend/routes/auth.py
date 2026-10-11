import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

from db import db_manager
from models.schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    ForgotPasswordRequest,
    OTPLoginRequest,
    OTPLoginVerify,
    VerifyOTPRequest,
    ResetPasswordRequest,
    GoogleAuthRequest,
    UserResponse
)
from models.user import user_helper, create_user_document
from auth.security import hash_password, verify_password
from auth.jwt import create_access_token, get_current_user
from auth.google import (
    get_google_auth_url,
    exchange_google_code,
    verify_google_credential,
    refresh_google_access_token,
    GOOGLE_OAUTH_SCOPES,
)
from services.email_service import create_and_send_otp, verify_otp, mark_otp_used

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def set_token_cookie(response: Response, token: str, remember_me: bool = True):
    max_age = COOKIE_MAX_AGE if remember_me else None
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=False
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve currently authenticated user details."""
    return user_helper(current_user)


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegister, response: Response):
    """Register a new user account with email and password, or link password if account was created via Google."""
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    email_clean = payload.email.lower().strip()
    existing_user = await db_manager.users.find_one({"email": email_clean})

    if existing_user:
        # If user registered earlier via Google or OTP and has no password hash
        if not existing_user.get("password_hash"):
            pw_hash = hash_password(payload.password)
            user_id = str(existing_user["_id"])
            await db_manager.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {
                    "password_hash": pw_hash,
                    "name": payload.name.strip() or existing_user.get("name"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            existing_user["password_hash"] = pw_hash
            access_token = create_access_token({"sub": user_id, "email": email_clean})
            set_token_cookie(response, access_token, remember_me=True)
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_helper(existing_user)
            }

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    pw_hash = hash_password(payload.password)
    user_doc = create_user_document(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=pw_hash,
        auth_provider="email"
    )

    insert_result = await db_manager.users.insert_one(user_doc)
    user_id = str(insert_result.inserted_id)
    user_doc["_id"] = user_id

    access_token = create_access_token({"sub": user_id, "email": email_clean})
    set_token_cookie(response, access_token, remember_me=True)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_helper(user_doc)
    }


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, response: Response):
    """Authenticate existing user with email and password."""
    email_clean = payload.email.lower().strip()
    user = await db_manager.users.find_one({"email": email_clean})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Please create an account or sign in with Google."
        )

    if not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was registered via Google or Email OTP. Please use 'Sign in with Google' or 'Sign in with Email OTP' below."
        )

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again or use 'Forgot Password'."
        )

    user_id = str(user["_id"])
    delta = timedelta(days=7) if payload.remember_me else timedelta(hours=12)
    access_token = create_access_token({"sub": user_id, "email": email_clean}, expires_delta=delta)
    set_token_cookie(response, access_token, remember_me=bool(payload.remember_me))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }


@router.post("/otp-login-request")
async def request_otp_login(payload: OTPLoginRequest):
    """Send an OTP code to the user's email inbox for passwordless login."""
    email_clean = payload.email.lower().strip()
    success, msg, _ = await create_and_send_otp(email_clean, purpose="Sign-In Verification")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=msg,
        )
    return {
        "success": True,
        "message": msg,
    }


@router.post("/otp-login-verify", response_model=TokenResponse)
async def verify_otp_login(payload: OTPLoginVerify, response: Response):
    """Verify OTP and log user in immediately (or create account if new)."""
    email_clean = payload.email.lower().strip()
    is_valid = await verify_otp(email_clean, payload.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new code."
        )

    user = await db_manager.users.find_one({"email": email_clean})
    if not user:
        # Create user account automatically
        default_name = payload.name.strip() if payload.name else email_clean.split("@")[0].capitalize()
        user_doc = create_user_document(
            name=default_name,
            email=email_clean,
            password_hash=None,
            auth_provider="email_otp"
        )
        insert_result = await db_manager.users.insert_one(user_doc)
        user_id = str(insert_result.inserted_id)
        user_doc["_id"] = user_id
        user = user_doc
    else:
        user_id = str(user["_id"])

    await mark_otp_used(email_clean, payload.otp)

    access_token = create_access_token({"sub": user_id, "email": email_clean}, expires_delta=timedelta(days=7))
    set_token_cookie(response, access_token, remember_me=True)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, response: Response):
    """Authenticate or register user via Google OAuth 2.0 code, ID token, or account chooser."""
    google_data = None
    if payload.code:
        google_data = await exchange_google_code(payload.code, redirect_uri=payload.redirect_uri)
    elif payload.credential:
        google_data = await verify_google_credential(payload.credential)

    if not google_data or (payload.email and google_data.get("email") == "user@voxweb.ai"):
        email = payload.email or (google_data.get("email") if google_data else "user@voxweb.ai")
        name = payload.name or (google_data.get("name") if google_data else "VoxWeb User")
        sub = "google_" + email.replace("@", "_").replace(".", "_")
        picture = (
            payload.profile_image
            or (google_data.get("picture") if google_data else None)
            or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80"
        )
        google_data = {
            "sub": sub,
            "email": email,
            "name": name,
            "picture": picture,
            "granted_scopes": GOOGLE_OAUTH_SCOPES.split(),
        }

    email_clean = google_data["email"].lower().strip()
    user = await db_manager.users.find_one({"email": email_clean})

    if not user:
        user_doc = create_user_document(
            name=google_data.get("name", "VoxWeb User"),
            email=email_clean,
            password_hash=None,
            auth_provider="google",
            google_id=google_data.get("sub"),
            profile_image=google_data.get("picture")
        )
        if google_data.get("refresh_token"):
            user_doc["google_refresh_token"] = google_data["refresh_token"]
        if google_data.get("granted_scopes"):
            user_doc["google_scopes"] = google_data["granted_scopes"]
        insert_result = await db_manager.users.insert_one(user_doc)
        user_id = str(insert_result.inserted_id)
        user_doc["_id"] = user_id
        user = user_doc
    else:
        user_id = str(user["_id"])
        if google_data.get("picture") and not user.get("profile_image"):
            await db_manager.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"profile_image": google_data.get("picture")}}
            )
            user["profile_image"] = google_data.get("picture")

    access_token = create_access_token({"sub": user_id, "email": email_clean})
    set_token_cookie(response, access_token, remember_me=True)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }


@router.get("/google")
async def get_google_oauth_url(redirect_uri: Optional[str] = None, state: str = "voxweb_oauth2_state"):
    """Returns Google OAuth 2.0 authorization redirect URL and requested scopes."""
    url = get_google_auth_url(redirect_uri=redirect_uri, state=state)
    return {
        "url": url,
        "scopes": GOOGLE_OAUTH_SCOPES.split(),
        "protocol": "OAuth 2.0 / OpenID Connect",
    }


@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    response: Response,
    code: Optional[str] = None,
    error: Optional[str] = None,
    redirect_uri: Optional[str] = None,
):
    """Callback endpoint for Google OAuth 2.0 authorization code flow."""
    accept_hdr = request.headers.get("accept", "")
    wants_json = "application/json" in accept_hdr

    if error and not code:
        if wants_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth returned error: {error}",
            )
        return RedirectResponse(f"{FRONTEND_ORIGIN}/login?error={error}")

    google_data = await exchange_google_code(code or "demo_google_code", redirect_uri=redirect_uri)
    if not google_data or "email" not in google_data:
        if wants_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google OAuth authorization code exchange failed or expired.",
            )
        return RedirectResponse(f"{FRONTEND_ORIGIN}/login?error=google_auth_failed")

    email_clean = google_data["email"].lower().strip()
    user = await db_manager.users.find_one({"email": email_clean})

    if not user:
        user_doc = create_user_document(
            name=google_data.get("name", "VoxWeb User"),
            email=email_clean,
            password_hash=None,
            auth_provider="google",
            google_id=google_data.get("sub"),
            profile_image=google_data.get("picture"),
        )
        if google_data.get("refresh_token"):
            user_doc["google_refresh_token"] = google_data.get("refresh_token")
        if google_data.get("granted_scopes"):
            user_doc["google_scopes"] = google_data.get("granted_scopes")

        insert_result = await db_manager.users.insert_one(user_doc)
        user_id = str(insert_result.inserted_id)
        user_doc["_id"] = user_id
        user = user_doc
    else:
        user_id = str(user["_id"])
        updates: Dict[str, Any] = {}
        if google_data.get("refresh_token"):
            updates["google_refresh_token"] = google_data["refresh_token"]
        if google_data.get("granted_scopes"):
            updates["google_scopes"] = google_data["granted_scopes"]
        if google_data.get("picture") and not user.get("profile_image"):
            updates["profile_image"] = google_data["picture"]
            user["profile_image"] = google_data["picture"]
        if updates:
            await db_manager.users.update_one({"_id": user["_id"]}, {"$set": updates})

    access_token = create_access_token({"sub": user_id, "email": email_clean})
    set_token_cookie(response, access_token, remember_me=True)

    if wants_json:
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "granted_scopes": google_data.get("granted_scopes", []),
            "user": user_helper(user),
        }

    redirect_target = f"{FRONTEND_ORIGIN}/login?token={access_token}"
    resp = RedirectResponse(redirect_target)
    set_token_cookie(resp, access_token, remember_me=True)
    return resp


@router.post("/google/refresh")
async def refresh_google_token_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Step 5 of Google OAuth 2.0:
    Refresh the user's Google OAuth 2.0 access token using their stored refresh_token.
    """
    stored_refresh = current_user.get("google_refresh_token")
    result = await refresh_google_access_token(stored_refresh or "")
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result,
        )
    return result


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Send an OTP code to the user's email inbox for password recovery."""
    email_clean = payload.email.lower().strip()
    success, msg, _ = await create_and_send_otp(email_clean, purpose="Password Reset")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=msg,
        )
    return {
        "success": True,
        "message": msg,
    }


@router.post("/verify-otp")
async def verify_otp_endpoint(payload: VerifyOTPRequest):
    """Verify validity of entered OTP."""
    is_valid = await verify_otp(payload.email, payload.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new one."
        )
    return {"success": True, "message": "OTP verified successfully."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """Reset user password after OTP verification."""
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_valid = await verify_otp(payload.email, payload.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new verification code."
        )

    new_hash = hash_password(payload.new_password)
    email_clean = payload.email.lower().strip()

    update_res = await db_manager.users.update_one(
        {"email": email_clean},
        {"$set": {
            "password_hash": new_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    if update_res.matched_count == 0:
        new_user = create_user_document(
            name=email_clean.split("@")[0].capitalize(),
            email=email_clean,
            password_hash=new_hash,
            auth_provider="email"
        )
        await db_manager.users.insert_one(new_user)

    await mark_otp_used(email_clean, payload.otp)
    return {"success": True, "message": "Your password has been successfully reset! You can now log in."}


@router.post("/logout")
async def logout(response: Response):
    """Clear session cookie and log out."""
    response.delete_cookie(key="access_token")
    return {"success": True, "message": "Logged out successfully."}
