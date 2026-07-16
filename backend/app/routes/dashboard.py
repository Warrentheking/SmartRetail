from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.transaction import Transaction, TransactionItem
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.dashboard import DashboardResponse
from app.services.auth import get_current_owner
from app.services.inventory import estimate_days_until_stockout_batch

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _period_stats(db: Session, start: datetime) -> dict:
    row = db.query(
        func.count(Transaction.transaction_id),
        func.coalesce(func.sum(Transaction.total_amount), 0),
    ).filter(Transaction.created_at >= start, Transaction.voided.is_(False)).first()
    return {"count": row[0], "revenue": float(row[1])}


@router.get("/", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    now = datetime.utcnow()
    today      = datetime(now.year, now.month, now.day)
    week_start = today - timedelta(days=today.weekday())
    month_start = datetime(now.year, now.month, 1)

    # Sales by period
    sales = {
        "today":      _period_stats(db, today),
        "this_week":  _period_stats(db, week_start),
        "this_month": _period_stats(db, month_start),
    }

    # Counts
    total_customers = db.query(func.count(Customer.customer_id)).scalar()
    total_products  = db.query(func.count(Product.product_id)).scalar()

    # Low stock
    low_stock = (
        db.query(Product)
        .filter(Product.stock_quantity <= Product.reorder_point)
        .order_by(Product.stock_quantity.asc())
        .all()
    )

    stockout_estimates = estimate_days_until_stockout_batch(
        db, [(p.product_id, p.stock_quantity) for p in low_stock]
    )

    # Recent 10 transactions
    recent = (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .limit(10)
        .all()
    )

    # Top 5 products this month by quantity sold
    top_products = (
        db.query(
            Product.product_id,
            Product.name,
            func.sum(TransactionItem.quantity).label("total_sold"),
            func.sum(TransactionItem.subtotal).label("total_revenue"),
        )
        .join(TransactionItem, Product.product_id == TransactionItem.product_id)
        .join(Transaction, TransactionItem.transaction_id == Transaction.transaction_id)
        .filter(Transaction.created_at >= month_start, Transaction.voided.is_(False))
        .group_by(Product.product_id, Product.name)
        .order_by(func.sum(TransactionItem.quantity).desc())
        .limit(5)
        .all()
    )

    return {
        "sales": sales,
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_products": [
            {
                "product_id":    p.product_id,
                "name":          p.name,
                "category":      p.category,
                "stock_quantity": p.stock_quantity,
                "reorder_point": p.reorder_point,
                "days_until_stockout": stockout_estimates[p.product_id][1],
            }
            for p in low_stock
        ],
        "recent_transactions": [
            {
                "transaction_id": t.transaction_id,
                "total_amount":   float(t.total_amount),
                "payment_method": t.payment_method,
                "customer_id":    t.customer_id,
                "created_at":     t.created_at,
                "voided":         t.voided,
            }
            for t in recent
        ],
        "top_products": [
            {
                "product_id":    row.product_id,
                "name":          row.name,
                "total_sold":    int(row.total_sold),
                "total_revenue": float(row.total_revenue),
            }
            for row in top_products
        ],
    }
