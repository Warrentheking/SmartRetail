import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.payment import MomoChargeRequest, MomoChargeResponse
from app.services import paystack
from app.services.auth import get_current_user

router = APIRouter(prefix="/payments/momo", tags=["Payments"])


@router.post("/initiate", response_model=MomoChargeResponse)
def initiate(data: MomoChargeRequest, _=Depends(get_current_user)):
    try:
        result = paystack.initiate_mobile_money_charge(data.amount, data.phone, data.provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Paystack error: {exc.response.text}")
    return {"reference": result["reference"], "status": result.get("status", "pending")}


@router.get("/status/{reference}", response_model=MomoChargeResponse)
def status(reference: str, _=Depends(get_current_user)):
    try:
        result = paystack.verify_transaction(reference)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Paystack error: {exc.response.text}")
    return {"reference": reference, "status": result["status"]}
