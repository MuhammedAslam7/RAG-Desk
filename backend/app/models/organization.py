from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.organization_settings import OrganizationSettings

import secrets
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._ids import cuid


def generate_widget_token() -> str:
    """Opaque public identifier for the embeddable widget.

    This is what gets exposed in the public embed snippet / iframe URL —
    deliberately *not* the org slug, which is guessable and bound to the
    org's identity. Matches the pattern used by Intercom (app_id), Crisp
    (website_id) and Chatwoot (websiteToken).
    """
    return secrets.token_urlsafe(24)


class Organization(Base):
    __tablename__ = "Organization"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True)
    widgetToken: Mapped[str] = mapped_column(
        String, unique=True, index=True, default=generate_widget_token
    )
    status: Mapped[str] = mapped_column(String, default="active")

    logoUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    websiteUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    contactEmail: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str] = mapped_column(String, default="en")

    # --- Added during onboarding wizard (benchmarked against Intercom / Crisp / Tidio) ---
    brandName: Mapped[str | None] = mapped_column(String, nullable=True)  # customer-facing name
    teamSize: Mapped[str | None] = mapped_column(String, nullable=True)  # 1-10 | 11-50 | 51-200 | 200+
    primaryUseCase: Mapped[str | None] = mapped_column(String, nullable=True)  # support | sales | faq | ecommerce | internal
    supportChannels: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated: widget,email,whatsapp,...

    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    settings: Mapped["OrganizationSettings"] = relationship(
        back_populates="organization", uselist=False, cascade="all, delete-orphan"
    )