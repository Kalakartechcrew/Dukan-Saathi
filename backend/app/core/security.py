from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict[str, Any], expires_delta: timedelta, token_type: str) -> str:
    payload = data.copy()
    issued_at = datetime.now(timezone.utc)
    expire = issued_at + expires_delta
    payload.update({"exp": expire, "iat": issued_at, "type": token_type})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, extra: Optional[dict[str, Any]] = None) -> str:
    data = {"sub": subject, **(extra or {})}
    return create_token(
        data,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(subject: str) -> str:
    return create_token(
        {"sub": subject},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def create_invoice_share_token(invoice_id: str, tenant_id: str) -> str:
    return create_token(
        {"sub": invoice_id, "tenant_id": tenant_id},
        timedelta(days=3650),
        "public_invoice",
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError("Invalid token") from e


def decode_invoice_share_token(token: str, invoice_id: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "public_invoice" or payload.get("sub") != invoice_id:
        raise ValueError("Invalid invoice share token")
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise ValueError("Invalid invoice share token")
    return payload
