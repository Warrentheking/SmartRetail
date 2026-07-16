from datetime import datetime, timedelta
from typing import Optional, Tuple

import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionItem

LOOKBACK_DAYS = 30
MIN_SALE_DAYS = 2  # need sales on at least 2 distinct days to fit a trend


def estimate_days_until_stockout(
    db: Session, product_id: int, stock_quantity: int
) -> Tuple[Optional[float], Optional[float]]:
    """Fits a linear regression of cumulative units sold vs. day elapsed over the
    last LOOKBACK_DAYS. The slope is the average daily sales rate; stock_quantity
    divided by that rate is the estimated days remaining.

    Returns (daily_sales_rate, days_until_stockout). Both are None when there
    isn't enough sales history yet, and days_until_stockout is None when the
    product isn't trending downward (rate <= 0).
    """
    return estimate_days_until_stockout_batch(db, [(product_id, stock_quantity)])[product_id]


def estimate_days_until_stockout_batch(
    db: Session, products: list[Tuple[int, int]]
) -> dict[int, Tuple[Optional[float], Optional[float]]]:
    """Same estimate as estimate_days_until_stockout(), but for many products in
    a single DB round-trip instead of one query per product - the dashboard's
    low-stock list was previously issuing N sequential queries here."""
    if not products:
        return {}

    stock_by_id = dict(products)
    cutoff = datetime.utcnow() - timedelta(days=LOOKBACK_DAYS)

    rows = (
        db.query(
            TransactionItem.product_id,
            func.date(Transaction.created_at).label("day"),
            func.sum(TransactionItem.quantity).label("qty"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.transaction_id)
        .filter(
            TransactionItem.product_id.in_(stock_by_id.keys()),
            Transaction.created_at >= cutoff,
            Transaction.voided.is_(False),
        )
        .group_by(TransactionItem.product_id, func.date(Transaction.created_at))
        .order_by(TransactionItem.product_id, func.date(Transaction.created_at))
        .all()
    )

    rows_by_product: dict[int, list] = {}
    for row in rows:
        rows_by_product.setdefault(row.product_id, []).append(row)

    results: dict[int, Tuple[Optional[float], Optional[float]]] = {}
    for product_id, stock_quantity in stock_by_id.items():
        product_rows = rows_by_product.get(product_id, [])
        if len(product_rows) < MIN_SALE_DAYS:
            results[product_id] = (None, None)
            continue

        first_day = product_rows[0].day
        day_offsets = np.array([(row.day - first_day).days for row in product_rows]).reshape(-1, 1)
        cumulative = np.cumsum([float(row.qty) for row in product_rows]).reshape(-1, 1)

        model = LinearRegression().fit(day_offsets, cumulative)
        daily_rate = float(model.coef_[0][0])

        if daily_rate <= 0:
            results[product_id] = (round(daily_rate, 2), None)
        else:
            results[product_id] = (round(daily_rate, 2), round(stock_quantity / daily_rate, 1))

    return results


def check_and_alert_low_stock(product_id: int) -> None:
    """Runs in a FastAPI BackgroundTask after a sale commits, so it needs its
    own DB session rather than reusing the request-scoped one."""
    from app.database import SessionLocal
    from app.models.product import Product
    from app.services.whatsapp import send_low_stock_alert

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product or product.stock_quantity > product.reorder_point:
            return
        _, days_remaining = estimate_days_until_stockout(db, product.product_id, product.stock_quantity)
        send_low_stock_alert(product.name, product.stock_quantity, days_remaining)
    finally:
        db.close()
