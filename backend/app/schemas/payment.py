from pydantic import BaseModel


class MomoChargeRequest(BaseModel):
    amount: float
    phone: str
    provider: str  # "mtn" | "vod" | "atl"


class MomoChargeResponse(BaseModel):
    reference: str
    status: str
