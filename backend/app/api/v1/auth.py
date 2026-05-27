from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    SignUpRequest,
    TokenResponse,
    UserResponse,
    VerifyOtpRequest,
)
from app.schemas.common import MessageResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignUpRequest):
    try:
        user, shop, _otp = await auth_service.register_user(
            email=body.email,
            password=body.password,
            full_name=body.full_name,
            shop_name=body.shop_name,
            business_type=body.business_type,
            phone=body.phone,
            address=body.address,
            city=body.city,
            state=body.state,
            country=body.country,
            currency=body.currency,
            gst_number=body.gst_number,
            default_tax_rate=body.default_tax_rate,
            logo_url=body.logo_url,
            upi_id=body.upi_id,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    _, access, refresh = await auth_service.login_user(body.email, body.password)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    try:
        _, access, refresh = await auth_service.login_user(body.email, body.password)
    except ValueError as exc:
        message = str(exc)
        code = status.HTTP_403_FORBIDDEN if "disabled" in message.lower() or "deleted" in message.lower() else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(code, message)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    try:
        access, refresh_tok = await auth_service.refresh_access_token(body.refresh_token)
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e))
    return TokenResponse(access_token=access, refresh_token=refresh_tok)


@router.get("/me", response_model=UserResponse)
async def me(user: Annotated[dict, Depends(get_current_user)]):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        tenant_id=user.get("tenant_id"),
        is_verified=user.get("is_verified", False),
        permissions=auth_service.user_permissions(user["role"]),
    )


@router.post("/verify-otp", response_model=MessageResponse)
async def verify_otp(body: VerifyOtpRequest):
    from app.core.database import get_db
    from app.models.base import utc_now

    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.get("otp") != body.otp:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OTP")
    if user.get("otp_expires") and user["otp_expires"] < utc_now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True}, "$unset": {"otp": "", "otp_expires": ""}},
    )
    return MessageResponse(message="Email verified successfully")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest):
    await auth_service.create_password_reset_otp(body.email)
    return MessageResponse(message="If the email exists, an OTP has been sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
    try:
        await auth_service.reset_password_with_otp(body.email, body.otp, body.password)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return MessageResponse(message="Password reset successful")
