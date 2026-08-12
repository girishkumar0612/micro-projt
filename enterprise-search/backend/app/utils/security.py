"""
Password hashing + bearer-token helpers (stdlib only — no extra deps).
Passwords are stored as PBKDF2-HMAC-SHA256 with a per-user salt.
"""
import hashlib
import hmac
import secrets

_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), _ITERATIONS
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    calc = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), _ITERATIONS
    ).hex()
    return hmac.compare_digest(calc, digest)


def generate_token() -> str:
    return secrets.token_urlsafe(32)
