"""
Admin-only monitoring endpoints.

GET /api/admin/monitoring/summary  — aggregate statistics for dashboard cards
GET /api/admin/monitoring/events   — paginated + filterable activity log

Both endpoints require X-Admin-Token.  A non-admin caller receives 401.
No monitoring data is ever exposed to regular users.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.db_models import AuditEvent, Conversation
from app.models.schemas import MonitoringSummary, MonitoringEventsResponse, AuditEventOut
from app.services.audit_service import (
    QUERY_SUCCESS, QUERY_FAILED, QUERY_NO_DOCS,
    RBAC_DENIED, UNAUTH_ACCESS, PROMPT_INJECTION, OUT_OF_SCOPE, GUARDRAIL_BLOCKED,
    DOC_UPLOADED, DOC_DUPLICATE, DOC_DELETED, DOC_ACCESS_CHANGED, SUMMARY_GENERATED,
    RESULT_SUCCESS, RESULT_FAILED,
)
from app.utils.auth import require_admin

router = APIRouter(prefix="/api/admin/monitoring", tags=["monitoring"])


def _count(db: Session, event_type: str) -> int:
    return db.query(func.count(AuditEvent.id)).filter(
        AuditEvent.event_type == event_type
    ).scalar() or 0


def _count_result(db: Session, result: str) -> int:
    return db.query(func.count(AuditEvent.id)).filter(
        AuditEvent.result == result
    ).scalar() or 0


@router.get("/summary", response_model=MonitoringSummary)
def get_summary(
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
):
    """
    Return aggregate statistics for all dashboard stat cards.
    Only accessible with a valid X-Admin-Token header.
    """
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # Active users = distinct user_ids that have fired at least one query event
    active_users: int = db.query(
        func.count(func.distinct(AuditEvent.user_id))
    ).filter(
        AuditEvent.event_type.in_([QUERY_SUCCESS, QUERY_FAILED, RBAC_DENIED]),
        AuditEvent.user_id != "",
    ).scalar() or 0

    # Total conversations from the conversations table (already exists)
    total_conversations: int = db.query(func.count(Conversation.id)).scalar() or 0

    # Queries today = all query-related events since midnight UTC
    queries_today: int = db.query(func.count(AuditEvent.id)).filter(
        AuditEvent.event_type.in_([QUERY_SUCCESS, QUERY_FAILED, RBAC_DENIED, QUERY_NO_DOCS]),
        AuditEvent.timestamp >= today_start,
    ).scalar() or 0

    return MonitoringSummary(
        # Query activity
        total_queries=_count(db, QUERY_SUCCESS) + _count(db, QUERY_FAILED)
                      + _count(db, RBAC_DENIED) + _count(db, QUERY_NO_DOCS),
        queries_today=queries_today,
        successful_requests=_count(db, QUERY_SUCCESS),
        failed_requests=_count(db, QUERY_FAILED),
        active_users=active_users,
        total_conversations=total_conversations,

        # Security events
        rbac_denied=_count(db, RBAC_DENIED),
        unauth_access=_count(db, UNAUTH_ACCESS),
        prompt_injection=_count(db, PROMPT_INJECTION),
        out_of_scope=_count(db, OUT_OF_SCOPE),
        guardrail_blocked=_count(db, GUARDRAIL_BLOCKED),

        # Document activity
        policy_uploads=_count(db, DOC_UPLOADED),
        duplicate_attempts=_count(db, DOC_DUPLICATE),
        policy_deletions=_count(db, DOC_DELETED),
        access_changes=_count(db, DOC_ACCESS_CHANGED),
        summary_generations=_count(db, SUMMARY_GENERATED),
    )


@router.get("/events", response_model=MonitoringEventsResponse)
def get_events(
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
    # Filters
    event_type: Optional[str] = Query(default=None, description="Filter by event type"),
    result:     Optional[str] = Query(default=None, description="Filter by result (success/denied/blocked/failed)"),
    user_id:    Optional[str] = Query(default=None, description="Filter by user ID"),
    user_role:  Optional[str] = Query(default=None, description="Filter by user role"),
    search:     Optional[str] = Query(default=None, description="Full-text search across action, detail, document_name, user_name"),
    date_from:  Optional[datetime] = Query(default=None, description="Start of time range (ISO 8601)"),
    date_to:    Optional[datetime] = Query(default=None, description="End of time range (ISO 8601)"),
    # Pagination
    page:       int = Query(default=1, ge=1),
    page_size:  int = Query(default=50, ge=1, le=200),
):
    """
    Return a paginated, filterable activity log.
    Newest events first. Only accessible with a valid X-Admin-Token header.
    """
    q = db.query(AuditEvent)

    if event_type:
        q = q.filter(AuditEvent.event_type == event_type.upper())
    if result:
        q = q.filter(AuditEvent.result == result.lower())
    if user_id:
        q = q.filter(AuditEvent.user_id == user_id)
    if user_role:
        q = q.filter(AuditEvent.user_role == user_role.lower())
    if date_from:
        q = q.filter(AuditEvent.timestamp >= date_from)
    if date_to:
        q = q.filter(AuditEvent.timestamp <= date_to)
    if search:
        term = f"%{search}%"
        q = q.filter(
            AuditEvent.action.ilike(term)
            | AuditEvent.detail.ilike(term)
            | AuditEvent.document_name.ilike(term)
            | AuditEvent.user_name.ilike(term)
        )

    total = q.count()
    events = (
        q.order_by(AuditEvent.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return MonitoringEventsResponse(
        total=total,
        page=page,
        page_size=page_size,
        events=events,
    )
