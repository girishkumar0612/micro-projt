"""
Simplified RBAC auth for the college MVP demo.

No JWT, no passwords, no DB users.
The frontend sends the logged-in user's role as the X-User-Role header
and the user's id as the X-User-Id header.
The backend trusts these headers for role-based filtering and conversation
ownership only — this is intentional for a demo; a production system would
verify a JWT.

Admin-only endpoints additionally require X-Admin-Token to match the
env-configured secret.

Roles: admin | hr | finance | it | marketing
The generic "employee" role has been intentionally removed.
"""
from fastapi import Header
from app.utils.config import settings
from app.utils.exceptions import UnauthorizedError

# Canonical set of permitted roles. "employee" is not a valid role.
ALLOWED_ROLES = {"admin", "hr", "finance", "it", "marketing"}


def get_user_role(x_user_role: str | None = Header(default=None)) -> str:
    """
    Returns the caller's role from the X-User-Role header.
    If the header is absent or carries an unrecognised value the request is
    treated as having no role — document queries will return nothing.
    Allowed values: admin | hr | finance | it | marketing
    """
    role = (x_user_role or "").lower().strip()
    return role if role in ALLOWED_ROLES else ""


def get_user_id(x_user_id: str | None = Header(default=None)) -> str:
    """
    Returns the caller's user ID from the X-User-Id header.
    Used to scope conversations to the authenticated user.
    Raises UnauthorizedError if the header is absent or empty.
    """
    uid = (x_user_id or "").strip()
    if not uid:
        raise UnauthorizedError("Missing X-User-Id header.")
    return uid


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """
    Guard for admin-only endpoints (upload, delete).
    Checks X-Admin-Token header against the configured secret.
    """
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise UnauthorizedError("Invalid or missing admin token.")
