from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import datetime


class SaleItem(BaseModel):
    product_id: int
    quantity: int


class SaleCreate(BaseModel):
    items: List[SaleItem]
    payment_method: str
    customer_id: Optional[int] = None
    payment_reference: Optional[str] = None


class TransactionItemResponse(BaseModel):
    item_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Optional[Decimal]

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    transaction_id: int
    customer_id: Optional[int]
    user_id: Optional[int]
    total_amount: Decimal
    payment_method: str
    payment_reference: Optional[str]
    created_at: datetime
    voided: bool
    voided_at: Optional[datetime]
    items: List[TransactionItemResponse]

    class Config:
        from_attributes = True


class VoidTransactionResponse(BaseModel):
    message: str
    transaction_id: int
    voided_at: datetime
