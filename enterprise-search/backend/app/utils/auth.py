"""
Simplified RBAC auth for the college MVP demo.

No JWT, no passwords, no DB users.
The frontend sends the logged-in user's role as the X-User-Role header.
The backend trusts this header for role-based filtering only —
this is intentional for a demo; a production system would verify a JWT.

Admin-only endpoints additionally require X-Admin-Token to match the
env-configured secret (same simple gate as before, now coexisting with roles).
"""
from fastapi import Header
from app.utils.config import settings
from app.utils.exceptions import UnauthorizedError


def get_user_role(x_user_role: str | None = Header(default="employee")) -> str:
    """
    Returns the caller's role from the X-User-Role header.
    Defaults to 'employee' if the header is absent.
    Allowed values: admin | employee | hr | finance | it (extend as needed).
    """
    allowed = {"admin", "employee", "hr", "finance", "it"}
    role = (x_user_role or "employee").lower().strip()
    return role if role in allowed else "employee"


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """
    Guard for admin-only endpoints (upload, delete).
    Checks X-Admin-Token header against the configured secret.
    """
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise UnauthorizedError("Invalid or missing admin token.")
