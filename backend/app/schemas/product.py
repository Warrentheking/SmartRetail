from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime

class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    price: Decimal
    cost_price: Decimal
    stock_quantity: int = 0
    reorder_point: int = 10

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    reorder_point: Optional[int] = None

class ProductResponse(BaseModel):
    product_id: int
    name: str
    category: Optional[str]
    price: Decimal
    cost_price: Decimal
    stock_quantity: int
    reorder_point: int
    created_at: datetime
    low_stock: bool = False

    class Config:
        from_attributes = True
