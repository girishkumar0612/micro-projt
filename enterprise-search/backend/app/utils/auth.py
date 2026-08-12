"""
Auth dependencies for FastAPI.

Two paths are accepted for admin-only actions (upload / delete):
  - a logged-in admin user via `Authorization: Bearer <token>`, or
  - the legacy shared `X-Admin-Token` secret from .env (kept for scripts).

`get_current_user` is required for any endpoint that returns role-scoped data
(documents list, ask) so answers are filtered per account.
"""
from fastapi import Header, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import auth_service
from app.utils.config import settings
from app.utils.exceptions import UnauthorizedError


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        return None
    return value.strip()


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _extract_bearer(authorization)
    if not token:
        raise UnauthorizedError("Please log in to continue.")
    return auth_service.get_user_by_token(db, token)


def require_admin(
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    # Legacy shared-secret path (env ADMIN_TOKEN).
    if x_admin_token and x_admin_token == settings.admin_token:
        return
    user = get_current_user(authorization=authorization, db=db)
    if user.role != "admin":
        raise UnauthorizedError("Only administrators can perform this action.")
