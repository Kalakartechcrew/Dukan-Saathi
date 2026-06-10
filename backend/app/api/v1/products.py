from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_tenant_id, require_permission
from app.core.permissions import Permission
from app.schemas.common import PaginatedResponse
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services import product_service
from app.services.subscription_service import assert_limit_available

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    low_stock_only: bool = False,
):
    items, total = await product_service.list_products(
        tenant_id, page, page_size, search, category_id, low_stock_only
    )
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=[ProductResponse(**{k: i.get(k) for k in ProductResponse.model_fields}) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=ProductResponse)
async def create_product(
    body: ProductCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    await assert_limit_available(tenant_id, "products")
    product = await product_service.create_product(tenant_id, body)
    return ProductResponse(**{k: product.get(k) for k in ProductResponse.model_fields})


@router.post("/bulk", response_model=list[ProductResponse])
async def bulk_create_products(
    body: list[ProductCreate],
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    await assert_limit_available(tenant_id, "products", count=len(body))
    products = await product_service.bulk_create_products(tenant_id, body)
    return [ProductResponse(**{k: i.get(k) for k in ProductResponse.model_fields}) for i in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    product = await product_service.get_product(tenant_id, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return ProductResponse(**{k: product.get(k) for k in ProductResponse.model_fields})


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    body: ProductUpdate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    product = await product_service.update_product(tenant_id, product_id, body)
    if not product:
        raise HTTPException(404, "Product not found")
    return ProductResponse(**{k: product.get(k) for k in ProductResponse.model_fields})


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    ok = await product_service.delete_product(tenant_id, product_id)
    if not ok:
        raise HTTPException(404, "Product not found")
    return {"message": "Product deleted"}
