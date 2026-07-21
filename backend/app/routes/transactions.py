from datetime import datetime

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from app.database import get_db
from app.models.transaction import Transaction, TransactionItem
from app.models.product import Product
from app.schemas.transaction import SaleCreate, TransactionResponse, VoidTransactionResponse
from app.services.auth import get_current_owner, get_current_user
from app.services.inventory import check_and_alert_low_stock
from app.services import paystack

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/", response_model=TransactionResponse)
def create_sale(
    data: SaleCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not data.items:
        raise HTTPException(status_code=400, detail="Sale must have at least one item")
    if data.payment_method not in ("cash", "mobile_money", "card"):
        raise HTTPException(status_code=400, detail="payment_method must be 'cash', 'mobile_money', or 'card'")

    # Validate all products and check stock before touching anything
    cart = []
    for entry in data.items:
        product = db.query(Product).filter(Product.product_id == entry.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {entry.product_id} not found")
        if product.stock_quantity < entry.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}"
            )
        cart.append({"product": product, "quantity": entry.quantity})

    # Compute totals
    total = Decimal("0")
    for item in cart:
        total += Decimal(str(item["product"].price)) * item["quantity"]

    # Mobile money and card sales must be verified server-side against
    # Paystack before the sale is recorded - never trust the frontend's
    # claim that a payment succeeded.
    if data.payment_method in ("mobile_money", "card"):
        method_label = "Mobile money" if data.payment_method == "mobile_money" else "Card"
        if not data.payment_reference:
            raise HTTPException(status_code=400, detail=f"payment_reference is required for {data.payment_method} sales")
        try:
            verified = paystack.verify_transaction(data.payment_reference)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Could not verify {data.payment_method} payment: {exc.response.text}")
        if verified["status"] != "success":
            raise HTTPException(
                status_code=400,
                detail=f"{method_label} payment has not succeeded yet (status: {verified['status']})",
            )
        expected_pesewas = int(round(total * 100))
        if verified.get("amount") != expected_pesewas:
            raise HTTPException(status_code=400, detail=f"{method_label} payment amount does not match the sale total")

    # Create transaction header
    transaction = Transaction(
        customer_id=data.customer_id,
        user_id=current_user.user_id,
        total_amount=total,
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
    )
    db.add(transaction)
    db.flush()  # assigns transaction_id without committing

    # Create line items and deduct stock
    for item in cart:
        product = item["product"]
        qty = item["quantity"]
        unit_price = Decimal(str(product.price))
        db.add(TransactionItem(
            transaction_id=transaction.transaction_id,
            product_id=product.product_id,
            quantity=qty,
            unit_price=unit_price,
        ))
        product.stock_quantity -= qty

    db.commit()
    db.refresh(transaction)

    for item in cart:
        product = item["product"]
        if product.stock_quantity <= product.reorder_point:
            background_tasks.add_task(check_and_alert_low_stock, product.product_id)

    return transaction


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Transaction).order_by(Transaction.created_at.desc()).all()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    transaction = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.post("/{transaction_id}/void", response_model=VoidTransactionResponse)
def void_transaction(transaction_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_owner)):
    """Voids a completed sale: restores the sold stock to each product and
    marks the transaction as voided (never deleted, so it stays in the
    audit trail) rather than counting toward revenue, forecasts, or
    customer segments going forward."""
    transaction = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.voided:
        raise HTTPException(status_code=400, detail="Transaction is already voided")

    for item in transaction.items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if product:
            product.stock_quantity += item.quantity

    transaction.voided = True
    transaction.voided_at = datetime.utcnow()
    transaction.voided_by = current_user.user_id
    db.commit()

    return {
        "message": "Transaction voided and stock restored",
        "transaction_id": transaction.transaction_id,
        "voided_at": transaction.voided_at,
    }
