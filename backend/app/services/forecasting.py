from datetime import datetime

import pandas as pd
from prophet import Prophet
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.forecast import SalesForecast
from app.models.product import Product
from app.models.transaction import Transaction, TransactionItem

MIN_SALE_DAYS = 5  # Prophet needs enough history to fit trend + seasonality meaningfully
FORECAST_HORIZON_DAYS = 90


def _daily_sales_dataframe(db: Session, product_id: int) -> pd.DataFrame:
    rows = (
        db.query(
            func.date(Transaction.created_at).label("ds"),
            func.sum(TransactionItem.quantity).label("y"),
        )
        .join(Transaction, TransactionItem.transaction_id == Transaction.transaction_id)
        .filter(TransactionItem.product_id == product_id, Transaction.voided.is_(False))
        .group_by(func.date(Transaction.created_at))
        .order_by(func.date(Transaction.created_at))
        .all()
    )
    return pd.DataFrame(rows, columns=["ds", "y"])


def generate_sales_forecast(db: Session, product_id: int, horizon_days: int = FORECAST_HORIZON_DAYS) -> int:
    """Fits Prophet on the product's daily sales history (yearly + weekly
    seasonality, Ghana public holidays) and upserts a horizon_days-ahead
    forecast into sales_forecasts, matching Algorithm 3 in the methodology
    doc. Returns the number of forecast rows written.
    """
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise ValueError("Product not found")

    df = _daily_sales_dataframe(db, product_id)
    if len(df) < MIN_SALE_DAYS:
        raise ValueError(
            f"Not enough sales history to forecast '{product.name}' "
            f"(need sales on at least {MIN_SALE_DAYS} distinct days, found {len(df)})"
        )

    model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
    model.add_country_holidays(country_name="GH")
    model.fit(df)

    future = model.make_future_dataframe(periods=horizon_days)
    forecast = model.predict(future)

    today = datetime.utcnow().date()
    future_rows = forecast[forecast["ds"].dt.date > today]
    generated_at = datetime.utcnow()

    count = 0
    for row in future_rows.itertuples():
        predicted_qty = round(max(0.0, float(row.yhat)), 2)
        predicted_revenue = round(predicted_qty * float(product.price), 2)
        stmt = pg_insert(SalesForecast).values(
            product_id=product_id,
            forecast_date=row.ds.date(),
            predicted_quantity=predicted_qty,
            predicted_revenue=predicted_revenue,
            generated_at=generated_at,
        ).on_conflict_do_update(
            index_elements=["product_id", "forecast_date"],
            set_={
                "predicted_quantity": predicted_qty,
                "predicted_revenue": predicted_revenue,
                "generated_at": generated_at,
            },
        )
        db.execute(stmt)
        count += 1

    db.commit()
    return count
