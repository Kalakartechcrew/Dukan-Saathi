from enum import Enum
from typing import Set


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OWNER = "owner"
    MANAGER = "manager"
    CASHIER = "cashier"
    STAFF = "staff"


class Permission(str, Enum):
    DASHBOARD_VIEW = "dashboard:view"
    PRODUCTS_MANAGE = "products:manage"
    INVENTORY_MANAGE = "inventory:manage"
    BILLING_CREATE = "billing:create"
    BILLING_REFUND = "billing:refund"
    CUSTOMERS_MANAGE = "customers:manage"
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"
    SETTINGS_MANAGE = "settings:manage"
    USERS_MANAGE = "users:manage"
    EXPENSES_MANAGE = "expenses:manage"
    ADMIN_PLATFORM = "admin:platform"


ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.SUPER_ADMIN: set(Permission),
    Role.ADMIN: {Permission.ADMIN_PLATFORM},
    Role.OWNER: {
        Permission.DASHBOARD_VIEW,
        Permission.PRODUCTS_MANAGE,
        Permission.INVENTORY_MANAGE,
        Permission.BILLING_CREATE,
        Permission.BILLING_REFUND,
        Permission.CUSTOMERS_MANAGE,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        Permission.SETTINGS_MANAGE,
        Permission.USERS_MANAGE,
        Permission.EXPENSES_MANAGE,
    },
    Role.MANAGER: {
        Permission.DASHBOARD_VIEW,
        Permission.PRODUCTS_MANAGE,
        Permission.INVENTORY_MANAGE,
        Permission.BILLING_CREATE,
        Permission.BILLING_REFUND,
        Permission.CUSTOMERS_MANAGE,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        Permission.EXPENSES_MANAGE,
    },
    Role.CASHIER: {
        Permission.DASHBOARD_VIEW,
        Permission.BILLING_CREATE,
        Permission.CUSTOMERS_MANAGE,
    },
    Role.STAFF: {
        Permission.DASHBOARD_VIEW,
        Permission.INVENTORY_MANAGE,
        Permission.PRODUCTS_MANAGE,
    },
}


def has_permission(role: str, permission: Permission) -> bool:
    try:
        r = Role(role)
    except ValueError:
        return False
    return permission in ROLE_PERMISSIONS.get(r, set())
