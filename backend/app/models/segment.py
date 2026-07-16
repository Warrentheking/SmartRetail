from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    customer_id     = Column(Integer, ForeignKey("customers.customer_id"), primary_key=True)
    recency_score   = Column(Integer, nullable=False)
    frequency_score = Column(Integer, nullable=False)
    monetary_score  = Column(Integer, nullable=False)
    segment_label   = Column(String(20), nullable=False)
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())
