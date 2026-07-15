# backend/app/models/invitation.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._ids import cuid


class Invitation(Base):
    __tablename__ = "Invitation"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    organizationId: Mapped[str] = mapped_column(ForeignKey("Organization.id"))
    email: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)  # 'admin' | 'agent' | 'viewer'
    token: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | accepted | revoked
    invitedByUserId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())