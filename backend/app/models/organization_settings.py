from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.organization import Organization

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._ids import cuid


class OrganizationSettings(Base):
    __tablename__ = "OrganizationSettings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    organizationId: Mapped[str] = mapped_column(
        ForeignKey("Organization.id"), unique=True
    )
    websiteUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    fallbackEmail: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str] = mapped_column(String, default="en")
    allowedDomains: Mapped[str | None] = mapped_column(Text, nullable=True)
    widgetGreeting: Mapped[str | None] = mapped_column(Text, nullable=True)
    widgetColor: Mapped[str | None] = mapped_column(String, nullable=True)
    widgetPosition: Mapped[str] = mapped_column(String, default="bottom-right")
    onboardedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    organization: Mapped["Organization"] = relationship(back_populates="settings")