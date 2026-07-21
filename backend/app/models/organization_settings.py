from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.organization import Organization

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func, Boolean
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
    theme: Mapped[str] = mapped_column(String, default="auto")          # light | dark | auto
    widgetWidth: Mapped[str] = mapped_column(String, default="medium")  # small | medium | large
    widgetHeight: Mapped[str] = mapped_column(String, default="medium") # small | medium | large
    borderRadius: Mapped[str] = mapped_column(String, default="rounded")# square | rounded | full
    font: Mapped[str] = mapped_column(String, default="inter")          # inter | roboto | poppins | system
    showShadow: Mapped[bool] = mapped_column(Boolean, default=True)
    animation: Mapped[str] = mapped_column(String, default="slide")     # fade | slide | bounce | none

    # --- Header ---
    botName: Mapped[str] = mapped_column(String, default="Support AI")
    botAvatarUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    companyLogoUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    headerBgColor: Mapped[str | None] = mapped_column(String, nullable=True)
    headerTextColor: Mapped[str | None] = mapped_column(String, nullable=True)
    showOnlineStatus: Mapped[bool] = mapped_column(Boolean, default=True)
    statusText: Mapped[str] = mapped_column(String, default="instant")  # online | instant | ai_assistant
    showCloseButton: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- Welcome screen ---
    welcomeTitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    welcomeDescription: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggestedQuestions: Mapped[str | None] = mapped_column(Text, nullable=True)  # newline-separated
    startChatButtonText: Mapped[str] = mapped_column(String, default="Start Chat")

    # --- Chat behavior ---
    autoOpenSeconds: Mapped[int | None] = mapped_column(nullable=True)
    autoOpenOnScroll: Mapped[bool] = mapped_column(Boolean, default=False)
    autoOpenOnExitIntent: Mapped[bool] = mapped_column(Boolean, default=False)
    minimizeAfterInactivitySeconds: Mapped[int | None] = mapped_column(nullable=True)
    rememberConversations: Mapped[bool] = mapped_column(Boolean, default=True)
    startMinimized: Mapped[bool] = mapped_column(Boolean, default=True)
    keepOpenAcrossPages: Mapped[bool] = mapped_column(Boolean, default=False)

    # --- Messages ---
    userBubbleColor: Mapped[str | None] = mapped_column(String, nullable=True)
    aiBubbleColor: Mapped[str | None] = mapped_column(String, nullable=True)
    messageTextColor: Mapped[str | None] = mapped_column(String, nullable=True)
    showTimestamps: Mapped[bool] = mapped_column(Boolean, default=False)
    showReadReceipts: Mapped[bool] = mapped_column(Boolean, default=False)
    showTypingIndicator: Mapped[bool] = mapped_column(Boolean, default=True)
    aiThinkingAnimation: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- AI behavior ---
    aiName: Mapped[str] = mapped_column(String, default="AI Assistant")
    aiPersonality: Mapped[str | None] = mapped_column(Text, nullable=True)
    responseLength: Mapped[str] = mapped_column(String, default="medium")  # short | medium | detailed
    emojiUsage: Mapped[str] = mapped_column(String, default="moderate")   # none | moderate | frequent
    tone: Mapped[str] = mapped_column(String, default="friendly")        # professional | friendly | casual
    showAiDisclaimer: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- Conversation settings ---
    askVisitorName: Mapped[bool] = mapped_column(Boolean, default=False)
    askVisitorEmail: Mapped[bool] = mapped_column(Boolean, default=False)
    askVisitorPhone: Mapped[bool] = mapped_column(Boolean, default=False)
    requireContactFields: Mapped[bool] = mapped_column(Boolean, default=False)
    saveVisitorHistory: Mapped[bool] = mapped_column(Boolean, default=True)
    allowAnonymousChat: Mapped[bool] = mapped_column(Boolean, default=True)
    
    onboardedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    organization: Mapped["Organization"] = relationship(back_populates="settings")