from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._ids import cuid


class Organization(Base):
    __tablename__ = "Organization"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="organization")