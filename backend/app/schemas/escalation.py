from datetime import datetime

from pydantic import BaseModel


class EscalatedChatOut(BaseModel):
    chatId: str
    visitorId: str | None = None
    visitorName: str | None = None
    visitorEmail: str | None = None
    status: str
    assignedAgentId: str | None = None
    escalatedAt: datetime | None = None
    createdAt: datetime
    messageCount: int = 0
    lastMessage: str | None = None
    lastSender: str | None = None


class EscalatedChatDetail(BaseModel):
    chatId: str
    visitorId: str | None = None
    visitorName: str | None = None
    visitorEmail: str | None = None
    status: str
    assignedAgentId: str | None = None
    escalatedAt: datetime | None = None
    resolvedAt: datetime | None = None
    createdAt: datetime
    messages: list[dict]


class AgentReplyRequest(BaseModel):
    content: str


class EscalationResponse(BaseModel):
    success: bool
    chatId: str
    status: str
