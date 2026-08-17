# backend/app/api/v1/endpoints/chat.py
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org, require_role
from app.core.database import get_db
from app.models import User
from app.repositories import chat_repo
from app.schemas.chat import ChatInitOut, ChatRequest, MessageOut
from app.services.realtime import chat_channel, hub, org_channel, sse_stream
from app.schemas.escalation import (
    AgentReplyRequest,
    EscalatedChatOut,
    EscalatedChatDetail,
    EscalationResponse,
)
from app.services.ai.llm import stream_answer, LLMStreamError
from app.services.facts.service import get_active_facts
from app.services.rag.prompt import build_system_prompt
from app.services.rag.retrieval import retrieve_relevant_chunks

router = APIRouter()


@router.get("/events")
async def chat_events(
    user: User = Depends(require_org),
):
    """SSE stream of real-time escalation events for this org's dashboard.

    Emits ``chat_updated`` (escalation / claim / resolve) and ``message``
    (new visitor or agent message) events. Clients refetch the list (and the
    open detail) on each event to stay authoritative.
    """
    return StreamingResponse(
        sse_stream(org_channel(user.organizationId)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
        ranked = await retrieve_relevant_chunks(db, user_text, user.organizationId)
    except Exception as e:  # noqa: BLE001
        print("RAG error:", e)
         # --- TEMP DEBUG: inspect what got retrieved ---
    print(f"\n[DEBUG] Query: {user_text!r}")
    print(f"[DEBUG] Retrieved {len(ranked)} chunks")
    for i, chunk in enumerate(ranked):
        score = getattr(chunk, "score", None)
        rerank_score = getattr(chunk, "rerank_score", None)
        content = getattr(chunk, "content", str(chunk))
        print(f"  [{i}] score={score} rerank={rerank_score} | {content[:150]!r}")
    print("[DEBUG] --- end chunks ---\n")
    # --- END TEMP DEBUG ---

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

    FALLBACK_MESSAGE = (
    "Sorry, I'm having trouble answering right now. Please try again in a moment."
)

    async def event_stream():
        collected = []
        try:
            async for token in stream_answer(system_prompt, messages):
                collected.append(token)
                yield f"data: {json.dumps({'text': token})}\n\n"
        except LLMStreamError as e:
            print("Dashboard LLM stream failed:", repr(e))
            fallback = FALLBACK_MESSAGE
            yield f"data: {json.dumps({'text': fallback})}\n\n"
            await chat_repo.add_message(db, chat.id, "ai", fallback)
            yield "data: [DONE]\n\n"
            return

        full = "".join(collected)
        if full:
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


# ---- Human handoff / live agent takeover ----

@router.get("/escalated", response_model=list[EscalatedChatOut])
async def list_escalated_chats(
    user: User = Depends(require_role("owner", "admin", "agent")),
    db: AsyncSession = Depends(get_db),
):
    """List all escalated / human_active chats for the dashboard."""
    chats = await chat_repo.list_escalated_chats(db, user.organizationId)
    result = []
    for c in chats:
        msgs = await chat_repo.list_messages(db, c.id)
        last = msgs[-1] if msgs else None
        result.append(
            EscalatedChatOut(
                chatId=c.id,
                visitorId=c.visitorId,
                visitorName=c.visitorName,
                visitorEmail=c.visitorEmail,
                status=c.status,
                assignedAgentId=c.assignedAgentId,
                escalatedAt=c.escalatedAt,
                createdAt=c.createdAt,
                messageCount=len(msgs),
                lastMessage=last.content if last else None,
                lastSender=last.sender if last else None,
            )
        )
    return result


@router.get("/escalated/{chat_id}", response_model=EscalatedChatDetail)
async def get_escalated_chat(
    chat_id: str,
    user: User = Depends(require_role("owner", "admin", "agent")),
    db: AsyncSession = Depends(get_db),
):
    """Get full detail for an escalated conversation."""
    chat = await chat_repo.get_chat_for_org(db, chat_id, user.organizationId)
    if chat is None or chat.status not in ("escalated", "human_active"):
        raise HTTPException(404, "Escalated conversation not found")
    msgs = await chat_repo.list_messages(db, chat.id)
    return EscalatedChatDetail(
        chatId=chat.id,
        visitorId=chat.visitorId,
        visitorName=chat.visitorName,
        visitorEmail=chat.visitorEmail,
        status=chat.status,
        assignedAgentId=chat.assignedAgentId,
        escalatedAt=chat.escalatedAt,
        resolvedAt=chat.resolvedAt,
        createdAt=chat.createdAt,
        messages=[
            {"id": m.id, "sender": m.sender, "content": m.content, "createdAt": m.createdAt.isoformat()}
            for m in msgs
        ],
    )


@router.post("/{chat_id}/claim", response_model=EscalationResponse)
async def claim_chat(
    chat_id: str,
    user: User = Depends(require_role("owner", "admin", "agent")),
    db: AsyncSession = Depends(get_db),
):
    """Claim an escalated conversation as the current agent."""
    chat = await chat_repo.claim_chat(db, chat_id, user.id)
    if chat is None:
        chat_in_db = await chat_repo.get_chat_for_org(db, chat_id, user.organizationId)
        if chat_in_db is None:
            raise HTTPException(404, "Conversation not found")
        if chat_in_db.status != "escalated":
            raise HTTPException(409, "This conversation is no longer available to claim")
        raise HTTPException(409, "Could not claim this conversation")
    await _publish_status(chat.id, chat.status, user.organizationId)
    return EscalationResponse(success=True, chatId=chat.id, status=chat.status)


@router.post("/{chat_id}/agent-reply")
async def agent_reply(
    chat_id: str,
    body: AgentReplyRequest,
    user: User = Depends(require_role("owner", "admin", "agent")),
    db: AsyncSession = Depends(get_db),
):
    """Send a reply as an agent to a claimed conversation."""
    if not body.content.strip():
        raise HTTPException(400, "Reply content is required")

    chat = await chat_repo.get_chat_for_org(db, chat_id, user.organizationId)
    if chat is None:
        raise HTTPException(404, "Conversation not found")
    if chat.status != "human_active":
        raise HTTPException(400, "This conversation is not currently active with a human agent")
    if chat.assignedAgentId != user.id:
        raise HTTPException(403, "This conversation is claimed by another agent")

    msg = await chat_repo.add_message(db, chat.id, "agent", body.content)
    await _publish_message(chat.id, msg, user.organizationId)
    return {
        "success": True,
        "message": {
            "id": msg.id,
            "sender": msg.sender,
            "content": msg.content,
            "createdAt": msg.createdAt.isoformat(),
        },
    }


@router.post("/{chat_id}/resolve", response_model=EscalationResponse)
async def resolve_chat(
    chat_id: str,
    user: User = Depends(require_role("owner", "admin", "agent")),
    db: AsyncSession = Depends(get_db),
):
    """Mark a conversation as resolved."""
    chat = await chat_repo.get_chat_for_org(db, chat_id, user.organizationId)
    if chat is None:
        raise HTTPException(404, "Conversation not found")
    if chat.status not in ("escalated", "human_active"):
        raise HTTPException(400, "This conversation is not currently escalated")

    chat = await chat_repo.resolve_chat(db, chat.id)
    await _publish_status(chat.id, chat.status, user.organizationId)
    return EscalationResponse(success=True, chatId=chat.id, status=chat.status)


# ---- Real-time event publishing helpers ----

async def _publish_status(chat_id: str, status: str, org_id: str) -> None:
    """Broadcast a status change (escalated / human_active / resolved)."""
    event = {"type": "chat_updated", "chatId": chat_id, "status": status}
    await hub.publish(org_channel(org_id), event)
    await hub.publish(chat_channel(chat_id), event)


async def _publish_message(chat_id: str, msg, org_id: str) -> None:
    """Broadcast a newly stored message to the org + chat channels."""
    event = {
        "type": "message",
        "chatId": chat_id,
        "message": {
            "id": msg.id,
            "sender": msg.sender,
            "content": msg.content,
            "createdAt": msg.createdAt.isoformat(),
        },
    }
    await hub.publish(org_channel(org_id), event)
    await hub.publish(chat_channel(chat_id), event)