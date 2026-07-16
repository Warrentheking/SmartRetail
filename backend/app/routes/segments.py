from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.segment import CustomerSegment
from app.models.transaction import Transaction
from app.schemas.segment import GenerateSegmentsResponse, SegmentsResponse
from app.services.auth import get_current_owner
from app.services.segmentation import compute_rfm_segments

router = APIRouter(prefix="/segments", tags=["Customer Segments"])

FREQUENCY_BUCKETS = [
    (1, 1, "1 time"),
    (2, 3, "2-3 times"),
    (4, 6, "4-6 times"),
    (7, 10, "7-10 times"),
    (11, None, "10+ times"),
]


def _frequency_bucket(count: int) -> str:
    for lo, hi, label in FREQUENCY_BUCKETS:
        if count >= lo and (hi is None or count <= hi):
            return label
    return FREQUENCY_BUCKETS[-1][2]


@router.post("/generate", response_model=GenerateSegmentsResponse)
def generate(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    try:
        count = compute_rfm_segments(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"message": "Customer segments generated", "customers_segmented": count}


@router.get("/", response_model=SegmentsResponse)
def get_segments(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    rows = (
        db.query(CustomerSegment, Customer)
        .join(Customer, Customer.customer_id == CustomerSegment.customer_id)
        .order_by(CustomerSegment.segment_label, Customer.name)
        .all()
    )
    customers = [
        {
            "customer_id": seg.customer_id,
            "customer_name": cust.name,
            "phone_number": cust.phone_number,
            "recency_score": seg.recency_score,
            "frequency_score": seg.frequency_score,
            "monetary_score": seg.monetary_score,
            "segment_label": seg.segment_label,
            "updated_at": seg.updated_at,
        }
        for seg, cust in rows
    ]

    summary_rows = (
        db.query(
            CustomerSegment.segment_label,
            func.count(CustomerSegment.customer_id),
            func.avg(CustomerSegment.monetary_score),
        )
        .group_by(CustomerSegment.segment_label)
        .all()
    )
    summary = [
        {"segment_label": label, "customer_count": count, "avg_monetary_score": float(avg_m)}
        for label, count, avg_m in summary_rows
    ]

    segmented_ids = [seg.customer_id for seg, _ in rows]
    raw_stats = (
        db.query(
            Transaction.customer_id,
            func.count(Transaction.transaction_id).label("frequency"),
            func.sum(Transaction.total_amount).label("monetary"),
        )
        .filter(Transaction.customer_id.in_(segmented_ids), Transaction.voided.is_(False))
        .group_by(Transaction.customer_id)
        .all()
    ) if segmented_ids else []

    freq_counts = {label: 0 for _, _, label in FREQUENCY_BUCKETS}
    total_monetary = 0.0
    for r in raw_stats:
        freq_counts[_frequency_bucket(r.frequency)] += 1
        total_monetary += float(r.monetary)

    avg_spend = round(total_monetary / len(raw_stats), 2) if raw_stats else 0.0
    purchase_frequency = [
        {"bucket": label, "customer_count": freq_counts[label]} for _, _, label in FREQUENCY_BUCKETS
    ]

    return {
        "summary": summary,
        "customers": customers,
        "avg_spend": avg_spend,
        "purchase_frequency": purchase_frequency,
    }
