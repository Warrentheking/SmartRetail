from typing import Optional

from pydantic import BaseModel


class InventoryStatusItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str]
    stock_quantity: int
    reorder_point: int
    low_stock: bool
    daily_sales_rate: Optional[float]
    days_until_stockout: Optional[float]
