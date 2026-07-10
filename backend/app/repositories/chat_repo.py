from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chat, Message


async def get_or_create_chat(db: AsyncSession, user_id: str, org_id: str) -> Chat:
    chat = (
        await db.execute(
            select(Chat).where(Chat.userId == user_id, Chat.organizationId == org_id)
        )
    ).scalars().first()
    if chat is None:
        chat = Chat(userId=user_id, organizationId=org_id)
        db.add(chat)
        await db.commit()
        await db.refresh(chat)
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


async def add_message(db: AsyncSession, chat_id: str, sender: str, content: str) -> Message:
    msg = Message(chatId=chat_id, sender=sender, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg