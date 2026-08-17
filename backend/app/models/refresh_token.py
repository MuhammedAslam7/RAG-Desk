# backend/app/models/refresh_token.py
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._ids import cuid


class RefreshToken(Base):
    """A single refresh-token session. Only the sha256 hash of the token is
    stored so a leaked database never exposes usable credentials."""

    __tablename__ = "RefreshToken"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    userId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    tokenHash: Mapped[str] = mapped_column(String, unique=True)
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    revokedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
