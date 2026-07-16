from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.report import ReportLog
from app.models.transaction import Transaction
from app.schemas.report import GenerateReportResponse, MonthlyRevenue, ReportLogItem
from app.services.auth import get_current_owner
from app.services.reports import generate_and_send_report

router = APIRouter(prefix="/reports", tags=["Reports"])

VALID_TYPES = {"daily", "weekly", "monthly"}


def _month_start(year: int, month: int) -> datetime:
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1)


@router.get("/revenue-trend", response_model=List[MonthlyRevenue])
def revenue_trend(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    """Revenue summed by calendar month for the last 6 months (including the
    current, partial month) - powers the Reports page trend chart."""
    now = datetime.utcnow()
    month_starts = [_month_start(now.year, now.month - i) for i in range(5, -1, -1)]

    rows = (
        db.query(
            func.date_trunc("month", Transaction.created_at).label("month"),
            func.coalesce(func.sum(Transaction.total_amount), 0).label("revenue"),
        )
        .filter(Transaction.created_at >= month_starts[0], Transaction.voided.is_(False))
        .group_by(func.date_trunc("month", Transaction.created_at))
        .all()
    )
    revenue_by_month = {row.month.replace(tzinfo=None): float(row.revenue) for row in rows}

    return [
        {"month": ms.strftime("%b %Y"), "revenue": round(revenue_by_month.get(ms, 0.0), 2)}
        for ms in month_starts
    ]


@router.post("/generate/{report_type}", response_model=GenerateReportResponse)
def generate(report_type: str, db: Session = Depends(get_db), _=Depends(get_current_owner)):
    if report_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail="report_type must be 'daily', 'weekly', or 'monthly'")
    log = generate_and_send_report(db, report_type)
    return {
        "report_id": log.report_id,
        "content": log.content_summary,
        "sent_via": log.sent_via,
        "sent_at": log.sent_at,
    }


@router.get("/", response_model=List[ReportLogItem])
def list_reports(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    return db.query(ReportLog).order_by(ReportLog.sent_at.desc()).limit(50).all()
