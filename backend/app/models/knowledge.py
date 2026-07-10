from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.database import Base
from app.models._ids import cuid


class KnowledgeSource(Base):
    __tablename__ = "KnowledgeSource"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    title: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="text")
    organizationId: Mapped[str] = mapped_column(ForeignKey("Organization.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="source", cascade="all, delete-orphan"
    )


class KnowledgeChunk(Base):
    __tablename__ = "KnowledgeChunk"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    content: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(settings.EMBED_DIM))  # 768-dim Gemini
    organizationId: Mapped[str] = mapped_column(ForeignKey("Organization.id"))
    knowledgeSourceId: Mapped[str] = mapped_column(ForeignKey("KnowledgeSource.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    source: Mapped["KnowledgeSource"] = relationship(back_populates="chunks")