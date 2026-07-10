from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._ids import cuid


class Fact(Base):
    __tablename__ = "Fact"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    subject: Mapped[str] = mapped_column(String)
    value: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    organizationId: Mapped[str] = mapped_column(ForeignKey("Organization.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())