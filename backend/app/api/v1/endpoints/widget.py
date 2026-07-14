from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Organization, OrganizationSettings
from app.services.ai.llm import stream_answer
from app.services.facts.service import get_active_facts
from app.services.rag.prompt import build_system_prompt
from app.services.rag.retrieval import get_relevant_chunks, rank_by_relevance_and_recency

router = APIRouter()


class WidgetChatRequest(BaseModel):
    org: str
    message: str


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
        origin = request.headers.get("origin") or request.headers.get("referer") or ""
        if allowed and not any(domain in origin for domain in allowed):
            raise HTTPException(status_code=403, detail="Origin not allowed")

    # ... rest of the function unchanged (ranked chunks, facts, system_prompt, event_stream)