import os
import random
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from dotenv import load_dotenv
from db import db_manager

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@voxweb.ai")


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])


def hash_otp(otp: str) -> str:
    """Hash OTP with SHA-256 so OTP codes are never stored in plaintext."""
    return hashlib.sha256(str(otp).strip().encode("utf-8")).hexdigest()


async def create_and_send_otp(
    email: str, purpose: str = "Sign-In / Password Reset"
) -> Tuple[bool, str, Optional[str]]:
    """
    Creates an OTP, stores its SHA-256 hash in the database with 10-minute expiry,
    and sends it via SMTP.
    Returns (success, message, demo_otp_only_if_smtp_unavailable).
    """
    email_clean = email.lower().strip()
    otp = generate_otp(6)
    otp_hashed = hash_otp(otp)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    # Invalidate previous unused OTPs for this email
    await db_manager.otps.delete_many({"email": email_clean})

    # Save hashed OTP (never store plaintext OTP)
    await db_manager.otps.insert_one({
        "email": email_clean,
        "otp_hash": otp_hashed,
        "purpose": purpose,
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    print(f"\n==========================================")
    print(f"[VoxWeb Security Service]")
    print(f"Generated {purpose} OTP for {email_clean}: [******] (SHA-256: {otp_hashed[:16]}...)")
    print(f"Expires at: {expires_at}")
    print(f"==========================================\n")

    # If SMTP is configured, send real email via Gmail SMTP
    smtp_user = os.getenv("SMTP_USERNAME", SMTP_USERNAME).strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD).strip().replace(" ", "")
    smtp_host = os.getenv("SMTP_HOST", SMTP_HOST).strip()
    smtp_port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))
    smtp_from = os.getenv("SMTP_FROM_EMAIL", SMTP_FROM_EMAIL).strip()

    if smtp_user and smtp_pass:
        try:
            from_addr = (
                smtp_user
                if ("@" in smtp_user and (smtp_from == "noreply@voxweb.ai" or not smtp_from or "xxxx" in smtp_from))
                else smtp_from
            )
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"VoxWeb: Your verification code"
            msg["From"] = f"VoxWeb Security <{from_addr}>"
            msg["To"] = email_clean

            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 36px; border-radius: 16px; max-width: 520px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 26px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #a855f7 100%); width: 44px; height: 44px; border-radius: 12px; line-height: 44px; color: white; font-weight: bold; font-size: 22px;">V</div>
                    <h1 style="color: #60a5fa; margin: 10px 0 2px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">VoxWeb</h1>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">Intelligent Voice Website Assistant</p>
                </div>
                <div style="background: rgba(255, 255, 255, 0.05); padding: 26px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
                    <h2 style="color: #f1f5f9; margin-top: 0; font-size: 18px; font-weight: 600;">{purpose}</h2>
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Your 6-digit one-time passcode to authenticate with VoxWeb is:</p>
                    <div style="text-align: center; margin: 28px 0;">
                        <span style="font-size: 38px; font-weight: 800; letter-spacing: 9px; color: #38bdf8; background: #0f172a; padding: 14px 28px; border-radius: 12px; border: 1px solid #38bdf8; display: inline-block; box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);">
                            {otp}
                        </span>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
                </div>
                <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">&copy; 2026 VoxWeb AI. All rights reserved.</p>
            </div>
            """
            part = MIMEText(html_body, "html")
            msg.attach(part)

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, [email_clean], msg.as_string())
            server.quit()
            print(f"[VoxWeb SMTP] Successfully sent verification email to {email_clean}")
            # Do NOT expose plain-text OTP in API response when email was delivered to inbox
            return True, f"Verification OTP sent to {email_clean}. Please check your inbox.", None
        except Exception as e:
            print(f"[SMTP Error] Failed to send email via SMTP: {e}")
            return True, f"Verification OTP generated for {email_clean}.", otp

    return True, f"Verification OTP generated for {email_clean}.", otp


async def verify_otp(email: str, otp: str) -> bool:
    """Validate OTP against stored SHA-256 hash."""
    email_clean = email.lower().strip()
    otp_clean = str(otp).strip()
    otp_hashed = hash_otp(otp_clean)

    record = await db_manager.otps.find_one({
        "email": email_clean,
        "used": False
    })
    if not record:
        return False

    stored_hash = record.get("otp_hash")
    stored_plain = record.get("otp")
    if stored_hash and stored_hash != otp_hashed:
        return False
    if not stored_hash and stored_plain != otp_clean:
        return False

    expires_at = record.get("expires_at")
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at)
            if datetime.now(timezone.utc) > exp_dt:
                return False
        except Exception:
            return False

    return True


async def mark_otp_used(email: str, otp: str):
    """Mark OTP as used."""
    email_clean = email.lower().strip()
    await db_manager.otps.update_one(
        {"email": email_clean, "used": False},
        {"$set": {"used": True}}
    )
