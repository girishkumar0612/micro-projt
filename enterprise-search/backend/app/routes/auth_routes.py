"""
POST /api/auth/login — exchanges credentials for a bearer token.
The token must be sent as `Authorization: Bearer <token>` on protected calls.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import auth_service
from app.models.schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, payload.username, payload.password)
    token = auth_service.create_token(db, user)
    return LoginResponse(
        token=token,
        user=UserOut(username=user.username, role=user.role, display_name=user.display_name),
    )
