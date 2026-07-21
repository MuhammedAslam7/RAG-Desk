# backend/app/api/v1/endpoints/widget.py
import json
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Organization, OrganizationSettings
from app.repositories import chat_repo
from app.services.ai.llm import stream_answer
from app.services.facts.service import get_active_facts
from app.services.rag.prompt import build_system_prompt
from app.services.rag.retrieval import get_relevant_chunks, rank_by_relevance_and_recency
from app.schemas.organization import WidgetConfigOut

router = APIRouter()


class WidgetChatRequest(BaseModel):
    org: str
    message: str
    visitorId: str
    visitorName: str | None = None
    visitorEmail: str | None = None
    visitorPhone: str | None = None


def _origin_allowed(request: Request, allowed: list[str]) -> bool:
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if not origin:
        return False
    try:
        host = (urlparse(origin).hostname or "").lower()
    except Exception:  # noqa: BLE001
        return False
    for domain in allowed:
        domain = domain.lower().strip()
        if not domain:
            continue
        if host == domain or host.endswith("." + domain):
            return True
    return False


async def _get_org_and_settings(db: AsyncSession, slug: str):
    org = (
        await db.execute(select(Organization).where(Organization.slug == slug))
    ).scalars().first()
    if org is None:
        raise HTTPException(status_code=404, detail="Unknown organization")
    settings = (
        await db.execute(
            select(OrganizationSettings).where(OrganizationSettings.organizationId == org.id)
        )
    ).scalars().first()
    return org, settings


@router.post("/chat")
async def widget_chat(
    body: WidgetChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    org, settings = await _get_org_and_settings(db, body.org)

    if org.status != "active":
        raise HTTPException(status_code=403, detail="This assistant is currently unavailable")

    if settings and settings.allowedDomains:
        allowed = [d.strip() for d in settings.allowedDomains.split(",") if d.strip()]
        if allowed and not _origin_allowed(request, allowed):
            raise HTTPException(status_code=403, detail="Origin not allowed")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    if not body.visitorId.strip():
        raise HTTPException(status_code=400, detail="Missing visitor id")

    # Enforce required contact fields, if configured
    if settings and (settings.requireContactFields or not settings.allowAnonymousChat):
        missing = []
        if settings.askVisitorName and not (body.visitorName or "").strip():
            missing.append("name")
        if settings.askVisitorEmail and not (body.visitorEmail or "").strip():
            missing.append("email")
        if settings.askVisitorPhone and not (body.visitorPhone or "").strip():
            missing.append("phone")
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required field(s): {', '.join(missing)}")

    remember = settings.rememberConversations if settings else True
    persist = settings.saveVisitorHistory if settings else True

    chat = await chat_repo.get_or_create_widget_chat(
        db,
        org.id,
        body.visitorId,
        remember=remember,
        contact={
            "name": body.visitorName,
            "email": body.visitorEmail,
            "phone": body.visitorPhone,
        },
    )
    await chat_repo.add_message(db, chat.id, "user", body.message, persist=persist)

    ranked = rank_by_relevance_and_recency(
        await get_relevant_chunks(db, body.message, org.id)
    )
    facts = await get_active_facts(db, org.id)

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

    messages = [
        {"role": "user", "parts": [{"type": "text", "text": body.message}]}
    ]

    async def event_stream():
        collected = []
        async for token in stream_answer(system_prompt, messages):
            collected.append(token)
            yield f"data: {json.dumps({'text': token})}\n\n"

        full = "".join(collected)
        if full:
            await chat_repo.add_message(db, chat.id, "ai", full, persist=persist)

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/config", response_model=WidgetConfigOut)
async def widget_config(org: str, db: AsyncSession = Depends(get_db)):
    organization, settings = await _get_org_and_settings(db, org)

    def g(attr, default=None):
        return getattr(settings, attr) if settings else default

    suggested_raw = g("suggestedQuestions") or ""
    suggested = [q.strip() for q in suggested_raw.splitlines() if q.strip()]

    return WidgetConfigOut(
        orgName=organization.name,
        status=organization.status,

        color=g("widgetColor"),
        position=g("widgetPosition", "bottom-right"),
        theme=g("theme", "auto"),
        widgetWidth=g("widgetWidth", "medium"),
        widgetHeight=g("widgetHeight", "medium"),
        borderRadius=g("borderRadius", "rounded"),
        font=g("font", "inter"),
        showShadow=g("showShadow", True),
        animation=g("animation", "slide"),

        botName=g("botName", "Support AI"),
        botAvatarUrl=g("botAvatarUrl"),
        companyLogoUrl=g("companyLogoUrl"),
        headerBgColor=g("headerBgColor"),
        headerTextColor=g("headerTextColor"),
        showOnlineStatus=g("showOnlineStatus", True),
        statusText=g("statusText", "instant"),
        showCloseButton=g("showCloseButton", True),

        greeting=g("widgetGreeting"),
        welcomeTitle=g("welcomeTitle"),
        welcomeDescription=g("welcomeDescription"),
        suggestedQuestions=suggested,
        startChatButtonText=g("startChatButtonText", "Start Chat"),

        autoOpenSeconds=g("autoOpenSeconds"),
        autoOpenOnScroll=g("autoOpenOnScroll", False),
        autoOpenOnExitIntent=g("autoOpenOnExitIntent", False),
        minimizeAfterInactivitySeconds=g("minimizeAfterInactivitySeconds"),
        rememberConversations=g("rememberConversations", True),
        startMinimized=g("startMinimized", True),
        keepOpenAcrossPages=g("keepOpenAcrossPages", False),

        userBubbleColor=g("userBubbleColor"),
        aiBubbleColor=g("aiBubbleColor"),
        messageTextColor=g("messageTextColor"),
        showTimestamps=g("showTimestamps", False),
        showReadReceipts=g("showReadReceipts", False),
        showTypingIndicator=g("showTypingIndicator", True),
        aiThinkingAnimation=g("aiThinkingAnimation", True),

        aiName=g("aiName", "AI Assistant"),
        showAiDisclaimer=g("showAiDisclaimer", True),

        askVisitorName=g("askVisitorName", False),
        askVisitorEmail=g("askVisitorEmail", False),
        askVisitorPhone=g("askVisitorPhone", False),
        requireContactFields=g("requireContactFields", False),
        allowAnonymousChat=g("allowAnonymousChat", True),
    )