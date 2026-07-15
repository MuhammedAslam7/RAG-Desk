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


@router.post("/chat")
async def widget_chat(
    body: WidgetChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    org = (
        await db.execute(select(Organization).where(Organization.slug == body.org))
    ).scalars().first()

    if org is None:
        raise HTTPException(status_code=404, detail="Unknown organization")

    if org.status != "active":
        raise HTTPException(status_code=403, detail="This assistant is currently unavailable")

    settings = (
        await db.execute(
            select(OrganizationSettings).where(
                OrganizationSettings.organizationId == org.id
            )
        )
    ).scalars().first()

    if settings and settings.allowedDomains:
        allowed = [d.strip() for d in settings.allowedDomains.split(",") if d.strip()]
        if allowed and not _origin_allowed(request, allowed):
            raise HTTPException(status_code=403, detail="Origin not allowed")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    if not body.visitorId.strip():
        raise HTTPException(status_code=400, detail="Missing visitor id")

    chat = await chat_repo.get_or_create_widget_chat(db, org.id, body.visitorId)
    await chat_repo.add_message(db, chat.id, "user", body.message)

    ranked = rank_by_relevance_and_recency(
        await get_relevant_chunks(db, body.message, org.id)
    )

    facts = await get_active_facts(db, org.id)
    system_prompt = build_system_prompt(ranked, facts)

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
            await chat_repo.add_message(db, chat.id, "ai", full)

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
    )


@router.get("/config", response_model=WidgetConfigOut)
async def widget_config(org: str, db: AsyncSession = Depends(get_db)):
    organization = (
        await db.execute(select(Organization).where(Organization.slug == org))
    ).scalars().first()
    if organization is None:
        raise HTTPException(404, "Unknown organization")

    settings = (
        await db.execute(
            select(OrganizationSettings).where(
                OrganizationSettings.organizationId == organization.id
            )
        )
    ).scalars().first()

    return WidgetConfigOut(
        orgName=organization.name,
        status=organization.status,
        greeting=settings.widgetGreeting if settings else None,
        color=settings.widgetColor if settings else None,
        position=settings.widgetPosition if settings else "bottom-right",
    )
