"""
Simplified RBAC auth for the college MVP demo.

No JWT, no passwords, no DB users.
The frontend sends the logged-in user's role as the X-User-Role header.
The backend trusts this header for role-based filtering only —
this is intentional for a demo; a production system would verify a JWT.

Admin-only endpoints additionally require X-Admin-Token to match the
env-configured secret (same simple gate as before, now coexisting with roles).

Roles: admin | hr | finance | it
The generic "employee" role has been intentionally removed.
"""
from fastapi import Header
from app.utils.config import settings
from app.utils.exceptions import UnauthorizedError

# Canonical set of permitted roles. "employee" is not a valid role.
ALLOWED_ROLES = {"admin", "hr", "finance", "it"}


def get_user_role(x_user_role: str | None = Header(default=None)) -> str:
    """
    Returns the caller's role from the X-User-Role header.
    If the header is absent or carries an unrecognised value the request is
    treated as having no role — document queries will return nothing.
    Allowed values: admin | hr | finance | it
    """
    role = (x_user_role or "").lower().strip()
    return role if role in ALLOWED_ROLES else ""


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """
    Guard for admin-only endpoints (upload, delete).
    Checks X-Admin-Token header against the configured secret.
    """
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise UnauthorizedError("Invalid or missing admin token.")
