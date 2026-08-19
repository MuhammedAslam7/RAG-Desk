# backend/scripts/make_admin.py
"""One-time script to promote a user to admin role.

Usage:
    cd backend
    python scripts/make_admin.py user@example.com

This will:
  1. Set the user's role to "admin"
  2. Mark their email as verified (skipping email verification)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User


def make_admin(email: str) -> None:
    email = email.lower().strip()

    # Use a synchronous engine built from the same DATABASE_URL
    url = settings.DATABASE_URL
    # psycopg async driver (psycopg+asyncpg) → swap for sync psycopg
    # Normalise to the sync psycopg (v3) driver that is already installed
    url = url.replace("postgresql+psycopg_async://", "postgresql+psycopg://")
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg://")
    engine = create_engine(url, pool_pre_ping=True)

    with Session(engine) as db:
        user = db.execute(select(User).where(User.email == email)).scalars().first()

        if user is None:
            print(f"❌ No user found with email: {email}")
            print("   Make sure you've signed up first at http://localhost:3000/sign-up")
            return

        print(f"📋 Found user: {user.name or '(no name)'} <{user.email}>")
        print(f"   Current role: {user.role}")
        print(f"   Email verified: {user.emailVerified}")

        # Promote to admin
        user.role = "admin"
        user.emailVerified = True
        user.emailVerifyToken = None
        user.emailVerifyExpiresAt = None
        db.commit()

        print(f"\n✅ User promoted to admin!")
        print(f"   New role: {user.role}")
        print(f"   Email verified: {user.emailVerified}")
        print(f"\n📌 Next steps:")
        print(f"   1. Add ADMIN_EMAIL={email} to backend/.env")
        print(f"   2. Restart the backend server")
        print(f"   3. Sign in at http://localhost:3001")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/make_admin.py <email>")
        print("Example: python scripts/make_admin.py admin@ragdesk.com")
        sys.exit(1)

    make_admin(sys.argv[1])
