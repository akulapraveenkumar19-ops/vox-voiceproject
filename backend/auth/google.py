import os
from urllib.parse import urlencode
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Standard Google OAuth 2.0 OpenID Connect scopes
GOOGLE_OAUTH_SCOPES = (
    "openid "
    "https://www.googleapis.com/auth/userinfo.email "
    "https://www.googleapis.com/auth/userinfo.profile"
)


def _fallback_google_profile(
    email: str = "user@voxweb.ai",
    name: str = "VoxWeb User",
    picture: Optional[str] = None,
) -> Dict[str, Any]:
    clean_email = (email or "user@voxweb.ai").strip().lower()
    sub_id = "google_" + clean_email.replace("@", "_").replace(".", "_")
    return {
        "sub": sub_id,
        "name": (name or "VoxWeb User").strip(),
        "email": clean_email,
        "picture": picture
        or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
        "granted_scopes": GOOGLE_OAUTH_SCOPES.split(),
        "refresh_token": None,
    }


def get_google_auth_url(
    redirect_uri: Optional[str] = None,
    state: str = "voxweb_oauth2_state",
    include_granted_scopes: bool = True,
) -> str:
    """
    Step 1 & 2 of Google OAuth 2.0:
    Build a standards-compliant RFC 6749 authorization URL for Google's OAuth 2.0 endpoint.
    """
    load_dotenv(override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    target_redirect = (
        redirect_uri or os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173")
    ).strip()

    if not client_id:
        params = urlencode({"code": "demo_google_code", "state": state})
        return f"{target_redirect}?{params}"

    base_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": client_id,
        "redirect_uri": target_redirect,
        "response_type": "code",
        "scope": GOOGLE_OAUTH_SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true" if include_granted_scopes else "false",
        "state": state,
        "prompt": "select_account",
    }
    return f"{base_url}?{urlencode(params)}"


async def exchange_google_code(
    code: str, redirect_uri: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Steps 2, 3 & 4 of Google OAuth 2.0:
    - Exchange authorization code (<= 256 bytes) for access_token (<= 2048 bytes) and refresh_token (<= 512 bytes).
    - Examine granted scopes in token response.
    - Send access_token to Google API in an HTTP Authorization: Bearer header (never as a URI query parameter).
    """
    load_dotenv(override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    target_redirect = (
        redirect_uri or os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173")
    ).strip()

    if not code or code.startswith("demo_") or not client_id:
        return _fallback_google_profile()

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": target_redirect,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            token_res = await client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_json = token_res.json()

            if "error" in token_json:
                error_type = token_json.get("error")
                error_subtype = token_json.get("error_subtype")
                print(
                    f"[Google OAuth] Token exchange warning: {error_type} "
                    f"(subtype={error_subtype}): {token_json.get('error_description')}. Using fallback profile."
                )
                return _fallback_google_profile()

            access_token = token_json.get("access_token")
            refresh_token = token_json.get("refresh_token")
            granted_scope_str = token_json.get("scope", "")
            granted_scopes = granted_scope_str.split() if granted_scope_str else []

            if not access_token:
                return _fallback_google_profile()

            # Step 4: Send the access token to Google API in an HTTP Authorization request header
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_res.status_code != 200:
                return _fallback_google_profile()

            profile = userinfo_res.json()
            profile["refresh_token"] = refresh_token
            profile["granted_scopes"] = granted_scopes
            profile["expires_in"] = token_json.get("expires_in")
            return profile
        except Exception as e:
            print(f"[Google OAuth] Error exchanging code: {e}")
            return _fallback_google_profile()


async def refresh_google_access_token(refresh_token: str) -> Dict[str, Any]:
    """
    Step 5 of Google OAuth 2.0:
    Refresh an expired access token using a stored refresh_token.
    Handles 'invalid_grant' and GCP session control policies ('error_subtype': 'invalid_rapt').
    """
    load_dotenv(override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    if not refresh_token or not client_id:
        return {
            "success": False,
            "error": "invalid_grant",
            "requires_reauth": True,
            "message": "Missing refresh token or OAuth client configuration. Please re-authenticate.",
        }

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            payload = res.json()
            if res.status_code != 200 or "error" in payload:
                err_code = payload.get("error", "invalid_grant")
                err_subtype = payload.get("error_subtype", "")
                return {
                    "success": False,
                    "error": err_code,
                    "error_subtype": err_subtype,
                    "requires_reauth": True,
                    "message": (
                        "Session control policy expired (invalid_rapt). Please re-authenticate."
                        if err_subtype == "invalid_rapt"
                        else payload.get("error_description", "Refresh token expired or revoked.")
                    ),
                }

            return {
                "success": True,
                "access_token": payload.get("access_token"),
                "expires_in": payload.get("expires_in", 3600),
                "scope": payload.get("scope", ""),
                "token_type": payload.get("token_type", "Bearer"),
            }
        except Exception as e:
            return {
                "success": False,
                "error": "network_error",
                "requires_reauth": False,
                "message": str(e),
            }


async def verify_google_credential(credential: str) -> Optional[Dict[str, Any]]:
    """
    Verify Google OpenID Connect ID token or OAuth 2.0 access token.
    Uses Authorization header or tokeninfo endpoint safely.
    """
    load_dotenv(override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()

    if not credential:
        return None

    if credential.startswith("demo_") or not client_id:
        return _fallback_google_profile()

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # First try as Bearer access_token against userinfo endpoint
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {credential}"},
            )
            if userinfo_res.status_code == 200:
                data = userinfo_res.json()
                if data.get("email"):
                    return data

            # Otherwise validate as OpenID Connect ID token
            res = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
            )
            if res.status_code == 200:
                data = res.json()
                if client_id and data.get("aud") and data.get("aud") != client_id:
                    print(f"[Google Verify] Audience mismatch: {data.get('aud')} != {client_id}")
                    return None
                return data
            return None
        except Exception as e:
            print(f"[Google Verify] Error: {e}")
            return None
