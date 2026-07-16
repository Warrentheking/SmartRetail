import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, products, transactions, customers, dashboard, inventory, assistant, forecast, segments, reports, payments
from app.scheduler import scheduler, start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# CORS_ORIGINS is a comma-separated list (e.g. "https://smartretail.vercel.app,http://localhost:5173").
# Local dev origin is always included so `npm run dev`/`vite preview` keep working without any .env change.
_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = list({"http://localhost:5173", *_extra_origins})


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="SmartRetail",
    description="AI-Driven POS System for Ghanaian SMEs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(transactions.router)
app.include_router(customers.router)
app.include_router(dashboard.router)
app.include_router(inventory.router)
app.include_router(assistant.router)
app.include_router(forecast.router)
app.include_router(segments.router)
app.include_router(reports.router)
app.include_router(payments.router)

@app.get("/")
def root():
    return {"message": "SmartRetail is running"}

@app.get("/health")
def health():
    return {"status": "ok"}