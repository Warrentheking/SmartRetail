import os
from datetime import datetime, timedelta

from google import genai
from google.genai import types
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.product import Product
from app.models.transaction import Transaction, TransactionItem
from app.services.inventory import estimate_days_until_stockout_batch

MODEL = "models/gemini-flash-latest"

SYSTEM_PROMPT = (
    "You are SmartRetail's business assistant for a small retail shop owner in Ghana. "
    "Answer the owner's question in plain, friendly English using ONLY the business data "
    "provided below. Keep answers short and direct - this is for someone checking their "
    "phone between customers, not a formal report. If the data doesn't cover the question, "
    "say so plainly rather than guessing. Amounts are in Ghanaian cedis (GHS)."
)


def _period_stats(db: Session, start: datetime) -> dict:
    row = (
        db.query(func.count(Transaction.transaction_id), func.coalesce(func.sum(Transaction.total_amount), 0))
        .filter(Transaction.created_at >= start, Transaction.voided.is_(False))
        .first()
    )
    return {"count": row[0], "revenue": float(row[1])}


def build_business_context(db: Session) -> str:
    now = datetime.utcnow()
    today = datetime(now.year, now.month, now.day)
    week_start = today - timedelta(days=today.weekday())
    month_start = datetime(now.year, now.month, 1)

    today_stats = _period_stats(db, today)
    week_stats = _period_stats(db, week_start)
    month_stats = _period_stats(db, month_start)

    low_stock = (
        db.query(Product)
        .filter(Product.stock_quantity <= Product.reorder_point)
        .order_by(Product.stock_quantity.asc())
        .all()
    )
    stockout_estimates = estimate_days_until_stockout_batch(
        db, [(p.product_id, p.stock_quantity) for p in low_stock]
    )
    low_stock_lines = []
    for p in low_stock:
        _, days_left = stockout_estimates[p.product_id]
        eta = f"~{days_left:.0f} days left" if days_left is not None else "stockout timing unknown"
        low_stock_lines.append(f"- {p.name}: {p.stock_quantity} units left, reorder point {p.reorder_point} ({eta})")

    top_products = (
        db.query(
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
    top_lines = [
        f"- {row.name}: {int(row.total_sold)} units sold, GHS {float(row.total_revenue):.2f} revenue"
        for row in top_products
    ]

    total_customers = db.query(func.count(Customer.customer_id)).scalar()

    return f"""SmartRetail - live business snapshot (as of {now.strftime('%Y-%m-%d %H:%M')} UTC)

Revenue:
- Today: GHS {today_stats['revenue']:.2f} across {today_stats['count']} sale(s)
- This week: GHS {week_stats['revenue']:.2f} across {week_stats['count']} sale(s)
- This month: GHS {month_stats['revenue']:.2f} across {month_stats['count']} sale(s)

Low stock alerts ({len(low_stock_lines)}):
{chr(10).join(low_stock_lines) if low_stock_lines else "- None. All products are above their reorder point."}

Top-selling products this month:
{chr(10).join(top_lines) if top_lines else "- No sales recorded yet this month."}

Total registered customers: {total_customers}"""


def ask_business_question(db: Session, question: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("AI assistant is not configured yet. Set GEMINI_API_KEY in backend/.env.")

    client = genai.Client(api_key=api_key)
    context = build_business_context(db)

    response = client.models.generate_content(
        model=MODEL,
        contents=f"{context}\n\nOwner's question: {question}",
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )

    return response.text
