from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class ForecastPoint(BaseModel):
    forecast_date: date
    predicted_quantity: Decimal
    predicted_revenue: Decimal

    class Config:
        from_attributes = True


class ActualPoint(BaseModel):
    date: date
    quantity: int


class ForecastResponse(BaseModel):
    product_id: int
    product_name: str
    generated_at: Optional[datetime]
    actuals: List[ActualPoint]
    forecast: List[ForecastPoint]


class GenerateForecastResponse(BaseModel):
    message: str
    forecast_points_written: int


class CategoryDemand(BaseModel):
    category: str
    predicted_units: float
    predicted_revenue: float
