from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PeriodStats(BaseModel):
    count: int
    revenue: float


class SalesSummary(BaseModel):
    today: PeriodStats
    this_week: PeriodStats
    this_month: PeriodStats


class LowStockItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str]
    stock_quantity: int
    reorder_point: int
    days_until_stockout: Optional[float] = None


class RecentTransaction(BaseModel):
    transaction_id: int
    total_amount: float
    payment_method: str
    customer_id: Optional[int]
    created_at: datetime
    voided: bool


class TopProduct(BaseModel):
    product_id: int
    name: str
    total_sold: int
    total_revenue: float


class DashboardResponse(BaseModel):
    sales: SalesSummary
    total_customers: int
    total_products: int
    low_stock_products: List[LowStockItem]
    recent_transactions: List[RecentTransaction]
    top_products: List[TopProduct]
