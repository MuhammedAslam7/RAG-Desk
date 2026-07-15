# backend/app/models/user.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.organization import Organization

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._ids import cuid


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    clerkId: Mapped[str] = mapped_column(String, unique=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="owner")
    organizationId: Mapped[str | None] = mapped_column(
        ForeignKey("Organization.id"), nullable=True
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    organization: Mapped["Organization | None"] = relationship(back_populates="users")