
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.chat import Chat

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._ids import cuid


class Message(Base):
    __tablename__ = "Message"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    chatId: Mapped[str] = mapped_column(ForeignKey("Chat.id"))
    sender: Mapped[str] = mapped_column(String)  # 'user' | 'ai'
    content: Mapped[str] = mapped_column(Text)
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    chat: Mapped["Chat"] = relationship(back_populates="messages")