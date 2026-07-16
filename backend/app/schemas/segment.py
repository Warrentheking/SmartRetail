from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CustomerSegmentItem(BaseModel):
    customer_id: int
    customer_name: str
    phone_number: Optional[str]
    recency_score: int
    frequency_score: int
    monetary_score: int
    segment_label: str
    updated_at: datetime


class SegmentSummary(BaseModel):
    segment_label: str
    customer_count: int
    avg_monetary_score: float


class PurchaseFrequencyBucket(BaseModel):
    bucket: str
    customer_count: int


class SegmentsResponse(BaseModel):
    summary: List[SegmentSummary]
    customers: List[CustomerSegmentItem]
    avg_spend: float
    purchase_frequency: List[PurchaseFrequencyBucket]


class GenerateSegmentsResponse(BaseModel):
    message: str
    customers_segmented: int
