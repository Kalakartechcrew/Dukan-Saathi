from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    billing,
    categories,
    customers,
    expenses,
    insights,
    notifications,
    products,
    reports,
    shops,
    subscriptions,
    websocket,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(shops.router)
api_router.include_router(subscriptions.router)
api_router.include_router(products.router)
api_router.include_router(categories.router)
api_router.include_router(billing.router)
api_router.include_router(customers.router)
api_router.include_router(expenses.router)
api_router.include_router(reports.router)
api_router.include_router(notifications.router)
api_router.include_router(insights.router)
api_router.include_router(admin.router)
api_router.include_router(websocket.router)
