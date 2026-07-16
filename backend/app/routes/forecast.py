from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.forecast import SalesForecast
from app.models.product import Product
from app.schemas.forecast import CategoryDemand, ForecastResponse, GenerateForecastResponse
from app.services.auth import get_current_owner
from app.services.forecasting import _daily_sales_dataframe, generate_sales_forecast

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


@router.get("/category-demand", response_model=List[CategoryDemand])
def category_demand(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    """Aggregates each product's latest forecast across all products, grouped by
    category - powers the portfolio-wide demand breakdown on the Forecasting page."""
    rows = (
        db.query(
            Product.category,
            func.sum(SalesForecast.predicted_quantity).label("predicted_units"),
            func.sum(SalesForecast.predicted_revenue).label("predicted_revenue"),
        )
        .join(SalesForecast, SalesForecast.product_id == Product.product_id)
        .group_by(Product.category)
        .order_by(func.sum(SalesForecast.predicted_quantity).desc())
        .all()
    )
    return [
        {
            "category": row.category or "Uncategorized",
            "predicted_units": float(row.predicted_units),
            "predicted_revenue": float(row.predicted_revenue),
        }
        for row in rows
    ]


@router.post("/{product_id}/generate", response_model=GenerateForecastResponse)
def generate(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_owner)):
    try:
        count = generate_sales_forecast(db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"message": "Forecast generated", "forecast_points_written": count}


@router.get("/{product_id}", response_model=ForecastResponse)
def get_forecast(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_owner)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    df = _daily_sales_dataframe(db, product_id)
    actuals = [{"date": row.ds, "quantity": int(row.y)} for row in df.itertuples()]

    forecast_rows = (
        db.query(SalesForecast)
        .filter(SalesForecast.product_id == product_id)
        .order_by(SalesForecast.forecast_date.asc())
        .all()
    )
    generated_at = forecast_rows[0].generated_at if forecast_rows else None

    return {
        "product_id": product.product_id,
        "product_name": product.name,
        "generated_at": generated_at,
        "actuals": actuals,
        "forecast": forecast_rows,
    }
