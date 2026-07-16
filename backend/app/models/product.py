from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    product_id     = Column(Integer, primary_key=True, index=True)
    name           = Column(String(150), nullable=False)
    category       = Column(String(100), nullable=True)
    price          = Column(Numeric(10, 2), nullable=False)
    cost_price     = Column(Numeric(10, 2), nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    reorder_point  = Column(Integer, nullable=False, default=10)
    created_at     = Column(DateTime, server_default=func.now())
