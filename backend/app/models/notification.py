from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._ids import cuid


class Notification(Base):
    __tablename__ = "Notification"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    organizationId: Mapped[str] = mapped_column(ForeignKey("Organization.id"))
    userId: Mapped[str] = mapped_column(ForeignKey("User.id"))  # recipient
    actorId: Mapped[str | None] = mapped_column(
        ForeignKey("User.id"), nullable=True
    )  # who triggered it (may be null for system events)
    type: Mapped[str] = mapped_column(String, default="knowledge")
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sourceId: Mapped[str | None] = mapped_column(String, nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
