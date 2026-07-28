# backend/app/repositories/chat_repo.py
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chat, Message


async def get_or_create_chat(db: AsyncSession, user_id: str, org_id: str) -> Chat:
    chat = (
        await db.execute(
            select(Chat).where(
                Chat.userId == user_id,
                Chat.organizationId == org_id,
                Chat.source == "dashboard",
            )
        )
    ).scalars().first()
    if chat is None:
        chat = Chat(userId=user_id, organizationId=org_id, source="dashboard")
        db.add(chat)
        await db.commit()
        await db.refresh(chat)
    return chat


async def get_or_create_widget_chat(
    db: AsyncSession,
    org_id: str,
    visitor_id: str,
    *,
    chat_id: str | None = None,
    remember: bool = True,
    contact: dict | None = None,
) -> Chat:
    chat = None

    if chat_id:
        chat = (
            await db.execute(
                select(Chat).where(Chat.id == chat_id, Chat.organizationId == org_id)
            )
        ).scalars().first()

    if chat is None and remember:
        chat = (
            await db.execute(
                select(Chat).where(
                    Chat.organizationId == org_id,
                    Chat.visitorId == visitor_id,
                    Chat.source == "widget",
                )
            )
        ).scalars().first()

    if chat is None:
        chat = Chat(organizationId=org_id, visitorId=visitor_id, source="widget")
        if contact:
            chat.visitorName = contact.get("name")
            chat.visitorEmail = contact.get("email")
            chat.visitorPhone = contact.get("phone")
        db.add(chat)
        await db.commit()
        await db.refresh(chat)
    elif contact and not (chat.visitorEmail or chat.visitorName or chat.visitorPhone):
        chat.visitorName = contact.get("name") or chat.visitorName
        chat.visitorEmail = contact.get("email") or chat.visitorEmail
        chat.visitorPhone = contact.get("phone") or chat.visitorPhone
        await db.commit()

    return chat


async def get_chat_for_org(db: AsyncSession, chat_id: str, org_id: str) -> Chat | None:
    return (
        await db.execute(
            select(Chat).where(Chat.id == chat_id, Chat.organizationId == org_id)
        )
    ).scalars().first()


async def list_messages(db: AsyncSession, chat_id: str) -> list[Message]:
    return list(
        (
            await db.execute(
                select(Message).where(Message.chatId == chat_id)
                .order_by(Message.createdAt.asc())
            )
        ).scalars().all()
    )


async def add_message(
    db: AsyncSession, chat_id: str, sender: str, content: str, *, persist: bool = True
) -> Message | None:
    if not persist:
        return None
    msg = Message(chatId=chat_id, sender=sender, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def list_widget_chats(db: AsyncSession, org_id: str) -> list[Chat]:
    return list(
        (
            await db.execute(
                select(Chat)
                .where(Chat.organizationId == org_id, Chat.source == "widget")
                .order_by(Chat.createdAt.desc())
            )
        ).scalars().all()
    )


# ---- Human handoff / escalation methods ----

async def escalate_chat(db: AsyncSession, chat_id: str) -> Chat | None:
    """Mark a chat as escalated. Returns None if not found."""
    chat = await db.get(Chat, chat_id)
    if chat is None:
        return None
    if chat.status != "active":
        return chat  # already escalated or resolved
    chat.status = "escalated"
    chat.escalatedAt = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(chat)
    return chat


async def list_escalated_chats(db: AsyncSession, org_id: str) -> list[Chat]:
    """List chats waiting for human attention (escalated or human_active)."""
    return list(
        (
            await db.execute(
                select(Chat)
                .where(
                    Chat.organizationId == org_id,
                    Chat.source == "widget",
                    Chat.status.in_(["escalated", "human_active"]),
                )
                .order_by(Chat.escalatedAt.desc().nulls_last(), Chat.createdAt.desc())
            )
        ).scalars().all()
    )


async def claim_chat(db: AsyncSession, chat_id: str, agent_id: str) -> Chat | None:
    """Assign an agent to an escalated chat. Returns None if not found or already claimed."""
    chat = await db.get(Chat, chat_id)
    if chat is None:
        return None
    if chat.status != "escalated":
        return None
    chat.status = "human_active"
    chat.assignedAgentId = agent_id
    await db.commit()
    await db.refresh(chat)
    return chat


async def resolve_chat(db: AsyncSession, chat_id: str) -> Chat | None:
    """Mark a chat as resolved."""
    chat = await db.get(Chat, chat_id)
    if chat is None:
        return None
    chat.status = "resolved"
    chat.resolvedAt = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(chat)
    return chat
