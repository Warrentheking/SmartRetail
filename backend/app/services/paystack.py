import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("smartretail.paystack")

PAYSTACK_BASE_URL = "https://api.paystack.co"
VALID_PROVIDERS = {"mtn", "vod", "atl"}


def _headers() -> dict:
    key = os.getenv("PAYSTACK_SECRET_KEY")
    if not key:
        raise RuntimeError(
            "Mobile money payment is not configured yet. Set PAYSTACK_SECRET_KEY in backend/.env."
        )
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def initiate_mobile_money_charge(
    amount_ghs: float, phone: str, provider: str, email: Optional[str] = None
) -> dict:
    """Starts a Paystack Mobile Money charge. Amount is converted to pesewas
    (GHS smallest unit). Returns Paystack's `data` object, which typically
    has status='pay_offline' - the customer must approve on their phone
    before the payment is final. Use verify_transaction() to check the
    outcome."""
    provider = provider.lower()
    if provider not in VALID_PROVIDERS:
        raise ValueError(f"provider must be one of {sorted(VALID_PROVIDERS)}")

    # Paystack ties customer identity/authorization to the email, so a fixed
    # placeholder here would merge every walk-in mobile money charge into one
    # Paystack customer record - causing OTP/authorization to keep reusing
    # whichever phone was authorized first, regardless of the phone passed in
    # for this charge. Deriving the placeholder from the phone number instead
    # keeps each distinct number its own identity.
    digits = "".join(ch for ch in phone if ch.isdigit()) or "unknown"
    payload = {
        "amount": int(round(amount_ghs * 100)),
        "email": email or f"momo-{digits}@example.com",
        "currency": "GHS",
        "mobile_money": {"phone": phone, "provider": provider},
    }
    with httpx.Client(timeout=15) as client:
        response = client.post(f"{PAYSTACK_BASE_URL}/charge", json=payload, headers=_headers())
    response.raise_for_status()
    data = response.json()["data"]
    logger.info(
        "momo charge initiated: provider=%s phone=%s reference=%s status=%s display_text=%s",
        provider, phone, data.get("reference"), data.get("status"), data.get("display_text"),
    )
    return data


def submit_otp(reference: str, otp: str) -> dict:
    """Submits the OTP the customer received via SMS back to Paystack to
    complete a mobile money charge that requires OTP authorization (status
    'send_otp' from initiate_mobile_money_charge). Without this call, the
    charge sits waiting for OTP until Paystack marks it failed."""
    payload = {"otp": otp, "reference": reference}
    with httpx.Client(timeout=15) as client:
        response = client.post(f"{PAYSTACK_BASE_URL}/charge/submit_otp", json=payload, headers=_headers())
    response.raise_for_status()
    return response.json()["data"]


def verify_transaction(reference: str) -> dict:
    """Returns Paystack's `data` object for the given reference, including
    `status` ('success', 'failed', 'abandoned', or still pending)."""
    with httpx.Client(timeout=15) as client:
        response = client.get(f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}", headers=_headers())
    response.raise_for_status()
    data = response.json()["data"]
    logger.info(
        "momo verify: reference=%s status=%s gateway_response=%s",
        reference, data.get("status"), data.get("gateway_response"),
    )
    return data
