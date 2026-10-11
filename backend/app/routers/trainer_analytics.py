"""
MORD Trainer Intelligence & Analytics Router (Phase 15B)

Provides evidence-backed workshop intelligence summaries for trainers.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.database.database import get_session
from app.services.session_replay_service import get_trainer_intelligence_analytics

router = APIRouter(prefix="/api/trainer", tags=["Trainer Intelligence"])


@router.get("/analytics")
def get_trainer_analytics(
    session_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Returns aggregate trainer intelligence metrics:
    - Unresolved inspections
    - Repeated events by machine and zone
    - Response latencies (time to acknowledge, time to resolve)
    - Checklist step completion and skipped counts
    - Intervention outcome distributions
    """
    return get_trainer_intelligence_analytics(db, session_id=session_id)
