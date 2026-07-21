# backend/app/api/v1/endpoints/chat.py
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import User
from app.repositories import chat_repo
from app.schemas.chat import ChatInitOut, ChatRequest, MessageOut
from app.services.ai.llm import stream_answer
from app.services.facts.service import get_active_facts
from app.services.rag.prompt import build_system_prompt
from app.services.rag.retrieval import (
    get_relevant_chunks,
    rank_by_relevance_and_recency,
)

router = APIRouter()


@router.get("", response_model=ChatInitOut)
async def get_chat(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    chat = await chat_repo.get_or_create_chat(db, user.id, user.organizationId)
    msgs = await chat_repo.list_messages(db, chat.id)
    return ChatInitOut(
        chatId=chat.id,
        messages=[
            MessageOut(
                id=m.id,
                role="user" if m.sender == "user" else "assistant",
                content=m.content,
                createdAt=m.createdAt,
            )
            for m in msgs
        ],
    )


@router.post("")
async def post_chat(
    body: ChatRequest,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    chat = await chat_repo.get_chat_for_org(db, body.chatId, user.organizationId)
    if chat is None:
        return StreamingResponse(
            iter(["data: [ERROR] chat not found\n\n"]),
            media_type="text/event-stream",
            status_code=404,
        )

    messages = [m.model_dump() for m in body.messages]
    last = messages[-1] if messages else {"parts": []}
    user_text = next(
        (p["text"] for p in last.get("parts", []) if p.get("type") == "text"), ""
    )

    await chat_repo.add_message(db, chat.id, "user", user_text)

    ranked = []
    try:
        candidates = await get_relevant_chunks(db, user_text, user.organizationId)
        ranked = rank_by_relevance_and_recency(candidates)
    except Exception as e:  # noqa: BLE001
        print("RAG error:", e)

    facts = []
    try:
        facts = await get_active_facts(db, user.organizationId)
    except Exception as e:  # noqa: BLE001
        print("Fact lookup error:", e)

    from sqlalchemy import select as _select
    from app.models import OrganizationSettings as _OrgSettings
    settings = (
        await db.execute(
            _select(_OrgSettings).where(_OrgSettings.organizationId == user.organizationId)
        )
    ).scalars().first()
    ai_settings = {
        "aiName": settings.aiName if settings else "AI Assistant",
        "aiPersonality": settings.aiPersonality if settings else None,
        "responseLength": settings.responseLength if settings else "medium",
        "tone": settings.tone if settings else "friendly",
        "emojiUsage": settings.emojiUsage if settings else "moderate",
        "language": settings.language if settings else "en",
        "showAiDisclaimer": settings.showAiDisclaimer if settings else True,
    }
    system_prompt = build_system_prompt(ranked, facts, ai_settings)

    async def event_stream():
        collected = []
        async for token in stream_answer(system_prompt, messages):
            collected.append(token)
            yield f"data: {json.dumps({'text': token})}\n\n"
        full = "".join(collected)
        await chat_repo.add_message(db, chat.id, "ai", full)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---- Widget conversation visibility (dashboard-side) ----

@router.get("/widget-sessions")
async def list_widget_sessions(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    chats = await chat_repo.list_widget_chats(db, user.organizationId)
    result = []
    for c in chats:
        msgs = await chat_repo.list_messages(db, c.id)
        last = msgs[-1] if msgs else None
        result.append(
            {
                "chatId": c.id,
                "visitorId": c.visitorId,
                "createdAt": c.createdAt,
                "messageCount": len(msgs),
                "lastMessage": last.content if last else None,
                "lastSender": last.sender if last else None,
            }
        )
    return result


@router.get("/widget-sessions/{chat_id}")
async def get_widget_session(
    chat_id: str,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    chat = await chat_repo.get_chat_for_org(db, chat_id, user.organizationId)
    if chat is None or chat.source != "widget":
        raise HTTPException(404, "Conversation not found")
    msgs = await chat_repo.list_messages(db, chat.id)
    return {
        "chatId": chat.id,
        "visitorId": chat.visitorId,
        "createdAt": chat.createdAt,
        "messages": [
            {"sender": m.sender, "content": m.content, "createdAt": m.createdAt}
            for m in msgs
        ],
    }