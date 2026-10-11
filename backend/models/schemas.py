from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    confirm_password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None  # Google ID token or OAuth access_token
    code: Optional[str] = None        # OAuth 2.0 authorization code
    redirect_uri: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    profile_image: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class OTPLoginRequest(BaseModel):
    email: EmailStr


class OTPLoginVerify(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)
    name: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=6, max_length=100)
    confirm_password: str = Field(..., min_length=6, max_length=100)


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    profile_image: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    auth_provider: str = "email"
    profile_image: Optional[str] = None
    created_at: str
    account_type: str = "Voice Pro"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CommandRequest(BaseModel):
    command: str
    context: Optional[List[Dict[str, str]]] = []
    language: Optional[str] = "en-US"
    model: Optional[str] = "voxweb-omni"
    persona: Optional[str] = "friendly"


class CommandResponse(BaseModel):
    type: str  # "action", "ai", "weather", "calc", "note"
    action: Optional[str] = None
    url: Optional[str] = None
    whatsapp_url: Optional[str] = None
    sms_url: Optional[str] = None
    message: Optional[str] = None
    query: Optional[str] = None
    response: str
    timestamp: str
    intent: Optional[str] = None
    model_used: Optional[str] = None


class ConversationItem(BaseModel):
    id: str
    user_id: str
    message: str
    response: str
    command_type: str
    action: Optional[str] = None
    url: Optional[str] = None
    timestamp: str


class NoteCreate(BaseModel):
    title: Optional[str] = None
    content: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    completed: Optional[bool] = None


class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    completed: bool = False
    created_at: str
