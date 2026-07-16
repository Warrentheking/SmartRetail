from datetime import datetime, timedelta

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.segment import CustomerSegment
from app.models.transaction import Transaction

N_CLUSTERS = 5
MIN_CUSTOMERS = N_CLUSTERS
LOOKBACK_DAYS = 365


def _assign_segment_labels(centroids: dict) -> dict:
    """centroids: {cluster_id: {"r": mean_recency_score, "f": mean_frequency_score, "m": mean_monetary_score}}

    Ranks clusters by combined RFM strength to assign the five segment names
    from Algorithm 4: Champion (highest overall), Loyal (next highest), At
    Risk (decent historical value but the lowest recency among the mid/low
    tier), New (high recency but not yet built up frequency/monetary), and
    Occasional (whatever's left - low across the board).
    """
    composite = {cid: c["r"] + c["f"] + c["m"] for cid, c in centroids.items()}
    ranked = sorted(composite, key=composite.get, reverse=True)

    labels = {ranked[0]: "Champion", ranked[1]: "Loyal"}

    remaining = ranked[2:]
    at_risk = min(remaining, key=lambda cid: centroids[cid]["r"])
    remaining.remove(at_risk)
    labels[at_risk] = "At Risk"

    new = max(remaining, key=lambda cid: centroids[cid]["r"])
    remaining.remove(new)
    labels[new] = "New"

    labels[remaining[0]] = "Occasional"
    return labels


def compute_rfm_segments(db: Session, lookback_days: int = LOOKBACK_DAYS) -> int:
    """Implements Algorithm 4 (RFM Scoring and Customer Segmentation): quintile
    RFM scores (recency inverted), StandardScaler normalization, then
    KMeans(n_clusters=5) mapped to named segments. Upserts into
    customer_segments. Returns the number of customers segmented.
    """
    analysis_date = datetime.utcnow()
    cutoff = analysis_date - timedelta(days=lookback_days)

    rows = (
        db.query(
            Transaction.customer_id,
            func.max(Transaction.created_at).label("last_purchase"),
            func.count(Transaction.transaction_id).label("frequency"),
            func.sum(Transaction.total_amount).label("monetary"),
        )
        .filter(
            Transaction.customer_id.isnot(None),
            Transaction.created_at >= cutoff,
            Transaction.voided.is_(False),
        )
        .group_by(Transaction.customer_id)
        .all()
    )

    if len(rows) < MIN_CUSTOMERS:
        raise ValueError(
            f"Not enough customers with purchase history to segment "
            f"(need at least {MIN_CUSTOMERS} registered customers with a purchase, found {len(rows)})"
        )

    df = pd.DataFrame(rows, columns=["customer_id", "last_purchase", "frequency", "monetary"])
    df["recency_days"] = (analysis_date - df["last_purchase"]).dt.days
    df["monetary"] = df["monetary"].astype(float)

    # Quintile scores 1-5 via rank-based bucketing (avoids qcut errors on tied values).
    # Recency is inverted: fewer days since last purchase -> higher score.
    recency_bins = pd.qcut(df["recency_days"].rank(method="first"), 5, labels=False, duplicates="drop")
    df["recency_score"] = recency_bins.max() - recency_bins + 1
    df["frequency_score"] = pd.qcut(df["frequency"].rank(method="first"), 5, labels=False, duplicates="drop") + 1
    df["monetary_score"] = pd.qcut(df["monetary"].rank(method="first"), 5, labels=False, duplicates="drop") + 1

    rfm = df[["recency_score", "frequency_score", "monetary_score"]].to_numpy(dtype=float)
    scaled = StandardScaler().fit_transform(rfm)

    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(scaled)

    centroids = {
        cluster_id: {
            "r": group["recency_score"].mean(),
            "f": group["frequency_score"].mean(),
            "m": group["monetary_score"].mean(),
        }
        for cluster_id, group in df.groupby("cluster")
    }
    segment_labels = _assign_segment_labels(centroids)

    updated_at = datetime.utcnow()
    for _, row in df.iterrows():
        label = segment_labels[row["cluster"]]
        stmt = pg_insert(CustomerSegment).values(
            customer_id=int(row["customer_id"]),
            recency_score=int(row["recency_score"]),
            frequency_score=int(row["frequency_score"]),
            monetary_score=int(row["monetary_score"]),
            segment_label=label,
            updated_at=updated_at,
        ).on_conflict_do_update(
            index_elements=["customer_id"],
            set_={
                "recency_score": int(row["recency_score"]),
                "frequency_score": int(row["frequency_score"]),
                "monetary_score": int(row["monetary_score"]),
                "segment_label": label,
                "updated_at": updated_at,
            },
        )
        db.execute(stmt)

    db.commit()
    return len(df)
