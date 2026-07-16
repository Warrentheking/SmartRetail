from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CustomerCreate(BaseModel):
    name: str
    phone_number: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None


class CustomerResponse(BaseModel):
    customer_id: int
    name: str
    phone_number: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
