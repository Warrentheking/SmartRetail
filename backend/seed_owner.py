import os
import bcrypt
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

NAME     = "Warren"
EMAIL    = os.getenv("SEED_OWNER_EMAIL", "warren@smartretail.com")
PASSWORD = os.getenv("SEED_OWNER_PASSWORD")

if not PASSWORD:
    raise SystemExit(
        "Set SEED_OWNER_PASSWORD in backend/.env before running this script "
        "(keeps the owner password out of source control)."
    )

hashed = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
print(f"Hash generated ({len(hashed)} chars): {hashed[:20]}...")

with engine.connect() as conn:
    conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": EMAIL})
    conn.execute(text(
        "INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, 'owner')"
    ), {"name": NAME, "email": EMAIL, "hash": hashed})
    conn.commit()
    row = conn.execute(text("SELECT email, LENGTH(password_hash) FROM users WHERE email = :email"), {"email": EMAIL}).fetchone()
    print(f"Inserted: {row[0]}, hash length: {row[1]}")

print("Done. Login with:", EMAIL, "/", PASSWORD)
