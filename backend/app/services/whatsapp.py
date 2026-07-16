import json
import logging
import os
import time
from typing import Optional

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

logger = logging.getLogger("smartretail.whatsapp")

MAX_RETRIES = 3

# Once a production WhatsApp sender is set up (see send_whatsapp_template()
# docstring), create an approved Content API template with this exact text
# and variable order, then set TWILIO_LOW_STOCK_CONTENT_SID to its SID:
#   "SmartRetail stock alert: {{1}} is low - {{2}} units left. "
#   "Estimated time to stockout: {{3}}. Please reorder soon."
LOW_STOCK_CONTENT_SID_ENV = "TWILIO_LOW_STOCK_CONTENT_SID"


def _get_client() -> Optional[Client]:
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not sid or not token:
        return None
    return Client(sid, token)


def send_whatsapp_message(body: str, context: str = "message") -> bool:
    """Sends a WhatsApp message to the owner with retry x3. Logs and no-ops
    gracefully if Twilio isn't configured, so callers never need to guard
    against missing credentials themselves."""
    from_number = os.getenv("TWILIO_WHATSAPP_FROM")
    to_number = os.getenv("OWNER_WHATSAPP_NUMBER")
    client = _get_client()

    if client is None or not from_number or not to_number:
        logger.warning(
            "WhatsApp %s skipped: Twilio not configured. "
            "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, "
            "OWNER_WHATSAPP_NUMBER in backend/.env to enable delivery.",
            context,
        )
        return False

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            client.messages.create(from_=f"whatsapp:{from_number}", to=f"whatsapp:{to_number}", body=body)
            return True
        except TwilioRestException as exc:
            logger.warning("WhatsApp %s attempt %s/%s failed: %s", context, attempt, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES:
                time.sleep(1)

    logger.error("WhatsApp %s failed after %s attempts", context, MAX_RETRIES)
    return False


def send_whatsapp_template(content_sid: str, content_variables: dict, context: str = "message") -> bool:
    """Sends a WhatsApp message via an approved Content API template
    (ContentSid + ContentVariables) instead of a free-form body.

    Unlike send_whatsapp_message(), this works outside WhatsApp's 24-hour
    customer-initiated session window - required for alerts that fire on
    their own schedule rather than in reply to the owner texting first.

    Requires a production WhatsApp sender. The shared Twilio sandbox number
    can only send Twilio's own built-in demo templates (not custom ones) for
    business-initiated messages, so this has no effect until TWILIO_WHATSAPP_FROM
    points at a real, Meta-approved WhatsApp sender with its own approved
    template registered for content_sid.
    """
    from_number = os.getenv("TWILIO_WHATSAPP_FROM")
    to_number = os.getenv("OWNER_WHATSAPP_NUMBER")
    client = _get_client()

    if client is None or not from_number or not to_number:
        logger.warning(
            "WhatsApp template %s skipped: Twilio not configured. "
            "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, "
            "OWNER_WHATSAPP_NUMBER in backend/.env to enable delivery.",
            context,
        )
        return False

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            client.messages.create(
                from_=f"whatsapp:{from_number}",
                to=f"whatsapp:{to_number}",
                content_sid=content_sid,
                content_variables=json.dumps(content_variables),
            )
            return True
        except TwilioRestException as exc:
            logger.warning("WhatsApp template %s attempt %s/%s failed: %s", context, attempt, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES:
                time.sleep(1)

    logger.error("WhatsApp template %s failed after %s attempts", context, MAX_RETRIES)
    return False


def send_low_stock_alert(product_name: str, stock_quantity: int, days_until_stockout: Optional[float]) -> bool:
    eta = f"~{days_until_stockout:.0f} day(s)" if days_until_stockout is not None else "unknown (not enough sales history yet)"
    context = f"low-stock alert for '{product_name}'"

    content_sid = os.getenv(LOW_STOCK_CONTENT_SID_ENV)
    if content_sid:
        return send_whatsapp_template(
            content_sid,
            {"1": product_name, "2": str(stock_quantity), "3": eta},
            context=context,
        )

    body = (
        f"SmartRetail stock alert\n"
        f"'{product_name}' is low: {stock_quantity} units left.\n"
        f"Estimated time to stockout: {eta}.\n"
        f"Please reorder soon."
    )
    return send_whatsapp_message(body, context=context)
