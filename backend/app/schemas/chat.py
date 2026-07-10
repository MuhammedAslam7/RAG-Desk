from datetime import datetime
from pydantic import BaseModel


class MessagePart(BaseModel):
    type: str = "text"
    text: str = ""


class UIMessage(BaseModel):
    id: str | None = None
    role: str  # 'user' | 'assistant'
    parts: list[MessagePart] = []


class ChatRequest(BaseModel):
    chatId: str
    messages: list[UIMessage] = []


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    createdAt: datetime


class ChatInitOut(BaseModel):
    chatId: str
    messages: list[MessageOut]