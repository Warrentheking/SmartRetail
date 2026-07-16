from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class ReportLog(Base):
    __tablename__ = "reports_log"

    report_id        = Column(Integer, primary_key=True, index=True)
    report_type      = Column(String(20), nullable=False)
    sent_via          = Column(String(20), nullable=False)
    sent_at            = Column(DateTime, server_default=func.now())
    content_summary   = Column(Text)
