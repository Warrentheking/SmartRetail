from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, products, transactions, customers, dashboard, inventory, assistant, forecast, segments, reports, payments

app = FastAPI(
    title="SmartRetail",
    description="AI-Driven POS System for Ghanaian SMEs",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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