from sqlalchemy import Boolean, Column, Integer, Numeric, String, DateTime, ForeignKey, Computed
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    customer_id    = Column(Integer, nullable=True)
    user_id        = Column(Integer, nullable=True)
    total_amount   = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    payment_reference = Column(String(100), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())
    voided         = Column(Boolean, nullable=False, default=False, server_default="false")
    voided_at      = Column(DateTime, nullable=True)
    voided_by      = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    items = relationship("TransactionItem", back_populates="transaction")


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    item_id        = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"), nullable=False)
    product_id     = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity       = Column(Integer, nullable=False)
    unit_price     = Column(Numeric(10, 2), nullable=False)
    subtotal       = Column(Numeric(10, 2), Computed("quantity * unit_price", persisted=True))

    transaction = relationship("Transaction", back_populates="items")
