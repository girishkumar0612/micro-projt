"""
Lightweight env-based admin gate.
No user accounts / JWT — a single shared ADMIN_TOKEN from .env, sent by the
frontend as the `X-Admin-Token` header for admin-only actions (upload, delete).
"""
from fastapi import Header
from app.utils.config import settings
from app.utils.exceptions import UnauthorizedError


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise UnauthorizedError("Invalid or missing admin token.")
