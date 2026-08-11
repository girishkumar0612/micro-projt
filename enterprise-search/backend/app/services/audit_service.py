"""
Audit service — the single place that writes AuditEvent rows.

Design principles
-----------------
* Append-only: audit rows are never modified or deleted.
* Fire-and-forget safety: log() swallows all exceptions so that a monitoring
  failure can never break a user-facing request.
* No document content: only IDs, filenames, and metadata are stored.
* All helpers receive a SQLAlchemy Session so they participate in the
  existing request-scoped transaction where that makes sense.  For events
  that happen inside an exception handler (where the outer transaction may
  be rolled back) callers pass a fresh session or the same session after
  the commit — both are safe because log() always does its own commit.

Event type constants are defined here so route files import from one place.
"""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.db_models import AuditEvent
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Event type constants ───────────────────────────────────────────────────────
# Query activity
QUERY_SUCCESS      = "QUERY_SUCCESS"
QUERY_FAILED       = "QUERY_FAILED"
QUERY_NO_DOCS      = "QUERY_NO_DOCS"

# Security events
RBAC_DENIED        = "RBAC_DENIED"
UNAUTH_ACCESS      = "UNAUTH_ACCESS"
PROMPT_INJECTION   = "PROMPT_INJECTION"
OUT_OF_SCOPE       = "OUT_OF_SCOPE"
GUARDRAIL_BLOCKED  = "GUARDRAIL_BLOCKED"

# Document activity
DOC_UPLOADED       = "DOC_UPLOADED"
DOC_DUPLICATE      = "DOC_DUPLICATE"
DOC_DELETED        = "DOC_DELETED"
DOC_ACCESS_CHANGED = "DOC_ACCESS_CHANGED"
SUMMARY_GENERATED  = "SUMMARY_GENERATED"

# Result constants
RESULT_SUCCESS = "success"
RESULT_DENIED  = "denied"
RESULT_BLOCKED = "blocked"
RESULT_FAILED  = "failed"
RESULT_INFO    = "info"


# ── Core write helper ─────────────────────────────────────────────────────────

def log(
    db: Session,
    *,
    event_type: str,
    action: str,
    result: str,
    user_id: str = "",
    user_name: str = "",
    user_role: str = "",
    document_id: str = "",
    document_name: str = "",
    detail: str = "",
) -> None:
    """
    Write a single audit row. Never raises — any exception is caught and
    logged at WARNING level so monitoring failures never affect users.
    """
    try:
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            event_type=event_type,
            action=action,
            result=result,
            document_id=document_id,
            document_name=document_name,
            detail=detail[:500] if detail else "",   # cap detail length
        )
        db.add(event)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"audit_service.log failed (non-fatal): {exc}")
        try:
            db.rollback()
        except Exception:
            pass


# ── Typed helpers (used by route handlers) ────────────────────────────────────

def log_query_success(
    db: Session, *, user_id: str, user_name: str, user_role: str,
    question: str, source: str = "",
) -> None:
    log(
        db,
        event_type=QUERY_SUCCESS,
        action="RAG query answered",
        result=RESULT_SUCCESS,
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        document_name=source,
        detail=question[:200],
    )


def log_rbac_denied(
    db: Session, *, user_id: str, user_name: str, user_role: str,
    question: str,
) -> None:
    log(
        db,
        event_type=RBAC_DENIED,
        action="Document access denied by RBAC",
        result=RESULT_DENIED,
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        detail=question[:200],
    )


def log_query_failed(
    db: Session, *, user_id: str, user_name: str, user_role: str,
    question: str, error_code: str = "",
) -> None:
    """Covers LLM errors, no-docs-indexed, and other non-RBAC query failures."""
    log(
        db,
        event_type=QUERY_FAILED,
        action="Query failed",
        result=RESULT_FAILED,
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        detail=f"[{error_code}] {question[:180]}",
    )


def log_doc_uploaded(
    db: Session, *, user_id: str, user_name: str,
    document_id: str, document_name: str, department: str, roles: str,
) -> None:
    log(
        db,
        event_type=DOC_UPLOADED,
        action="Policy uploaded & indexed",
        result=RESULT_SUCCESS,
        user_id=user_id,
        user_name=user_name,
        user_role="admin",
        document_id=document_id,
        document_name=document_name,
        detail=f"dept={department} roles={roles}",
    )


def log_doc_duplicate(
    db: Session, *, user_id: str, user_name: str,
    filename: str, matched_name: str,
) -> None:
    log(
        db,
        event_type=DOC_DUPLICATE,
        action="Duplicate upload rejected",
        result=RESULT_BLOCKED,
        user_id=user_id,
        user_name=user_name,
        user_role="admin",
        document_name=filename,
        detail=f"Matches existing: {matched_name}",
    )


def log_doc_upload_failed(
    db: Session, *, user_id: str, user_name: str,
    filename: str, reason: str,
) -> None:
    log(
        db,
        event_type=DOC_UPLOADED,
        action="Policy upload failed",
        result=RESULT_FAILED,
        user_id=user_id,
        user_name=user_name,
        user_role="admin",
        document_name=filename,
        detail=reason[:200],
    )


def log_doc_deleted(
    db: Session, *, user_id: str, user_name: str,
    document_id: str, document_name: str,
) -> None:
    log(
        db,
        event_type=DOC_DELETED,
        action="Policy deleted",
        result=RESULT_SUCCESS,
        user_id=user_id,
        user_name=user_name,
        user_role="admin",
        document_id=document_id,
        document_name=document_name,
    )


def log_doc_access_changed(
    db: Session, *, user_id: str, user_name: str,
    document_id: str, document_name: str,
    old_roles: str, new_roles: str,
    old_dept: str, new_dept: str,
) -> None:
    detail_parts = []
    if old_roles != new_roles:
        detail_parts.append(f"roles: {old_roles} → {new_roles}")
    if old_dept != new_dept:
        detail_parts.append(f"dept: {old_dept} → {new_dept}")
    log(
        db,
        event_type=DOC_ACCESS_CHANGED,
        action="Policy access permissions updated",
        result=RESULT_SUCCESS,
        user_id=user_id,
        user_name=user_name,
        user_role="admin",
        document_id=document_id,
        document_name=document_name,
        detail="; ".join(detail_parts),
    )


def log_summary_generated(
    db: Session, *, user_id: str, user_name: str, filename: str,
) -> None:
    log(
        db,
        event_type=SUMMARY_GENERATED,
        action="AI summary generated",
        result=RESULT_SUCCESS,
        user_id=user_id,
        user_name=user_name,
        user_role="admin",
        document_name=filename,
    )
