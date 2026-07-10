from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.message import Message

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._ids import cuid


class Chat(Base):
    __tablename__ = "Chat"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    userId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    organizationId: Mapped[str] = mapped_column(ForeignKey("Organization.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    messages: Mapped[list["Message"]] = relationship(
        back_populates="chat", order_by="Message.createdAt"
    )