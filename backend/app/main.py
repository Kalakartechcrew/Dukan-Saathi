import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import close_db, connect_db
from app.core.database import get_db
from app.core.security import decode_token
from app.models.base import utc_now
from app.services.whatsapp_service import cleanup_expired_bill_files


async def _bill_file_cleanup_worker():
    while True:
        try:
            await cleanup_expired_bill_files()
        except Exception:
            pass
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await cleanup_expired_bill_files()
    cleanup_task = asyncio.create_task(_bill_file_cleanup_worker())
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await close_db()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-tenant SaaS inventory, billing & POS platform for shopkeepers",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def activity_audit_middleware(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(settings.API_V1_PREFIX) and request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        auth = request.headers.get("authorization", "")
        user_id = None
        tenant_id = None
        if auth.lower().startswith("bearer "):
            try:
                payload = decode_token(auth.split(" ", 1)[1])
                if payload.get("type") == "access":
                    user_id = payload.get("sub")
                    tenant_id = payload.get("tenant_id")
            except ValueError:
                pass
        try:
            await get_db().activity_logs.insert_one({
                "user_id": user_id,
                "tenant_id": tenant_id,
                "action": request.method.lower(),
                "module": request.url.path.replace(settings.API_V1_PREFIX, "").strip("/").split("/")[0] or "api",
                "path": request.url.path,
                "status_code": response.status_code,
                "created_at": utc_now(),
            })
        except Exception:
            pass
    return response

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
