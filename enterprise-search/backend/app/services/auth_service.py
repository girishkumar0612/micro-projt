"""
Auth service — user provisioning, login, and bearer-token sessions.
Seed accounts are created on startup so the app is usable immediately.

Role-based access: every user has exactly one role. Documents carry a list of
roles allowed to see them (see document_service). 'admin' is the super role.
"""
from sqlalchemy.orm import Session
from app.models.db_models import User, AuthToken
from app.utils.security import hash_password, verify_password, generate_token
from app.utils.exceptions import UnauthorizedError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# username -> (display_name, role, default_password)
DEFAULT_USERS: dict[str, tuple[str, str, str]] = {
    "admin": ("Admin", "admin", "admin123"),
    "hr": ("HR Officer", "hr", "hr123"),
    "manager": ("Team Manager", "manager", "manager123"),
    "it": ("IT Support", "it", "it123"),
    "finance": ("Finance", "finance", "finance123"),
    "operations": ("Operations", "operations", "operations123"),
    "legal": ("Legal Counsel", "legal", "legal123"),
    "security": ("Security", "security", "security123"),
    "employee": ("Employee", "employee", "employee123"),
}

ALL_ROLES = list(DEFAULT_USERS.keys())


def seed_default_users(db: Session) -> None:
    for username, (display_name, role, password) in DEFAULT_USERS.items():
        exists = db.query(User).filter(User.username == username).first()
        if exists:
            continue
        db.add(User(
            username=username,
            password_hash=hash_password(password),
            role=role,
            display_name=display_name,
        ))
        logger.info(f"Seeded default user: {username} (role={role})")
    db.commit()


def authenticate(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username.strip()).first()
    if not user or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid username or password.")
    return user


def create_token(db: Session, user: User) -> str:
    token = generate_token()
    db.add(AuthToken(token=token, user_id=user.id))
    db.commit()
    return token


def get_user_by_token(db: Session, token: str) -> User:
    record = db.query(AuthToken).filter(AuthToken.token == token).first()
    if not record:
        raise UnauthorizedError("Invalid or expired session. Please log in again.")
    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise UnauthorizedError("Your account no longer exists. Please contact an admin.")
    return user
