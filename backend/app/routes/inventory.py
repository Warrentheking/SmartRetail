from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.inventory import InventoryStatusItem
from app.services.auth import get_current_user
from app.services.inventory import estimate_days_until_stockout

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/status", response_model=List[InventoryStatusItem])
def inventory_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    products = db.query(Product).order_by(Product.stock_quantity.asc()).all()
    result = []
    for p in products:
        daily_rate, days_remaining = estimate_days_until_stockout(db, p.product_id, p.stock_quantity)
        result.append({
            "product_id": p.product_id,
            "name": p.name,
            "category": p.category,
            "stock_quantity": p.stock_quantity,
            "reorder_point": p.reorder_point,
            "low_stock": p.stock_quantity <= p.reorder_point,
            "daily_sales_rate": daily_rate,
            "days_until_stockout": days_remaining,
        })
    return result
