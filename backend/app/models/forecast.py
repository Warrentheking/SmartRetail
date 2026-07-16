from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class SalesForecast(Base):
    __tablename__ = "sales_forecasts"

    forecast_id        = Column(Integer, primary_key=True, index=True)
    product_id          = Column(Integer, ForeignKey("products.product_id"), nullable=False, index=True)
    forecast_date        = Column(Date, nullable=False, index=True)
    predicted_quantity  = Column(Numeric(10, 2), nullable=False)
    predicted_revenue   = Column(Numeric(10, 2), nullable=False)
    generated_at         = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("product_id", "forecast_date", name="uq_sales_forecasts_product_date"),
    )
