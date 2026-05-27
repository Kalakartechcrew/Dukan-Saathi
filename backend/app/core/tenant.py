"""Multi-tenant isolation: every tenant-scoped query must include tenant_id."""

from typing import Any, Optional


def tenant_filter(tenant_id: str, extra: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    filt = {"tenant_id": tenant_id}
    if extra:
        filt.update(extra)
    return filt
