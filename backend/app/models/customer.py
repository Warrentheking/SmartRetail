from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    customer_id  = Column(Integer, primary_key=True, index=True)
    name         = Column(String(150), nullable=False)
    phone_number = Column(String(20), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())
