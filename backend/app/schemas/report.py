from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReportLogItem(BaseModel):
    report_id: int
    report_type: str
    sent_via: str
    sent_at: datetime
    content_summary: Optional[str]

    class Config:
        from_attributes = True


class GenerateReportResponse(BaseModel):
    report_id: int
    content: Optional[str]
    sent_via: str
    sent_at: datetime


class MonthlyRevenue(BaseModel):
    month: str
    revenue: float
