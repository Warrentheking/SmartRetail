from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.report import ReportLog
from app.models.transaction import Transaction, TransactionItem
from app.services.whatsapp import send_whatsapp_message

REPORT_WINDOWS = {
    "daily": timedelta(days=1),
    "weekly": timedelta(days=7),
    "monthly": timedelta(days=30),
}
REPORT_LABELS = {"daily": "Daily", "weekly": "Weekly", "monthly": "Monthly"}


def _period_stats(db: Session, start: datetime) -> dict:
    row = (
        db.query(func.count(Transaction.transaction_id), func.coalesce(func.sum(Transaction.total_amount), 0))
        .filter(Transaction.created_at >= start, Transaction.voided.is_(False))
        .first()
    )
    return {"count": row[0], "revenue": float(row[1])}


def _best_sellers(db: Session, start: datetime, limit: int = 3):
    rows = (
        db.query(Product.name, func.sum(TransactionItem.quantity).label("qty"))
        .join(TransactionItem, Product.product_id == TransactionItem.product_id)
        .join(Transaction, TransactionItem.transaction_id == Transaction.transaction_id)
        .filter(Transaction.created_at >= start, Transaction.voided.is_(False))
        .group_by(Product.product_id, Product.name)
        .order_by(func.sum(TransactionItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [(row.name, int(row.qty)) for row in rows]


def _low_stock_products(db: Session):
    return (
        db.query(Product)
        .filter(Product.stock_quantity <= Product.reorder_point)
        .order_by(Product.stock_quantity.asc())
        .all()
    )


def build_report_content(db: Session, report_type: str) -> str:
    if report_type not in REPORT_WINDOWS:
        raise ValueError(f"Unknown report type '{report_type}' - must be daily, weekly, or monthly")

    window = REPORT_WINDOWS[report_type]
    start = datetime.utcnow() - window

    stats = _period_stats(db, start)
    best_sellers = _best_sellers(db, start)
    low_stock = _low_stock_products(db)
    active_customers = (
        db.query(func.count(func.distinct(Transaction.customer_id)))
        .filter(
            Transaction.created_at >= start,
            Transaction.customer_id.isnot(None),
            Transaction.voided.is_(False),
        )
        .scalar()
    )

    lines = [
        f"SmartRetail - {REPORT_LABELS[report_type]} Business Report",
        f"Period: last {window.days} day(s)",
        "",
        f"Revenue: GHS {stats['revenue']:.2f} ({stats['count']} sale(s))",
        f"Active customers: {active_customers}",
        "",
    ]

    if best_sellers:
        lines.append("Best sellers:")
        lines.extend(f"- {name}: {qty} units" for name, qty in best_sellers)
    else:
        lines.append("Best sellers: no sales recorded this period.")

    lines.append("")
    if low_stock:
        lines.append(f"Low stock alerts ({len(low_stock)}):")
        lines.extend(f"- {p.name}: {p.stock_quantity} left (reorder point {p.reorder_point})" for p in low_stock)
    else:
        lines.append("Low stock alerts: none. All products are well stocked.")

    return "\n".join(lines)


def generate_and_send_report(db: Session, report_type: str) -> ReportLog:
    content = build_report_content(db, report_type)
    send_whatsapp_message(content, context=f"{report_type} report")

    log = ReportLog(report_type=report_type, sent_via="whatsapp", content_summary=content)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
